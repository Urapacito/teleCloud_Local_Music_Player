const { ipcMain } = require('electron');
const { spawn, execSync } = require('child_process');
const path = require('path');
const net = require('net');

const mpvPath = path.join(process.cwd(), 'mpv.exe');
let currentPlayProcess = null;
let mpvSocket = null;
let mpvDevices = [];
let currentIpcPipe = '';
let currentEqFilter = '';
let lastTimePos = 0; // Store last known time

// Audio settings
let currentAudioSettings = {
  replayGain: 'no',
  crossfade: 0,
  maxBitDepth: null,
  maxSampleRate: null
};

ipcMain.handle('get-audio-devices', () => {
  try {
    const output = execSync(`"${mpvPath}" --audio-device=help`, { encoding: 'utf8' });
    const lines = output.split('\n');
    mpvDevices = [];

    for (const line of lines) {
      // Look for lines like:   'wasapi/{guid}' (Device Name)
      const match = line.match(/^\s*'([^']+)'\s+\((.+)\)/);
      if (match) {
        const id = match[1];
        let name = match[2];
        if (id.startsWith('wasapi')) {
          name = name + ' (WASAPI)';
        }
        mpvDevices.push({ id, name });
      }
    }
    return mpvDevices;
  } catch (err) {
    console.error('Error fetching mpv devices:', err);
    return [];
  }
});

ipcMain.handle('play-audio', (event, { filePath, deviceId }) => {
  lastTimePos = 0; // Reset time on new track
  if (currentPlayProcess) {
    currentPlayProcess.removeAllListeners('exit');
    try { currentPlayProcess.kill('SIGKILL'); } catch (e) { }
    currentPlayProcess = null;
  }
  if (mpvSocket) {
    try { mpvSocket.destroy(); } catch (e) { }
    mpvSocket = null;
  }

  currentIpcPipe = '\\\\.\\pipe\\telecloud-mpv-' + Date.now();

  const args = [
    '--no-video',
    `--input-ipc-server=${currentIpcPipe}`,
    '--ytdl=no',

    // --- FIXES FOR STREAMING AUDIO ---
    '--initial-audio-sync=no',       // FIX: Stops MPV from jumping 10-15 seconds ahead at the start
    '--audio-stream-silence=yes',    // FIX: Keeps the audio device alive during network lags instead of stutter/skipping
    '--gapless-audio=yes',           // Smooth transitions between tracking streams

    // --- TUNED BUFFERING & CACHE ---
    '--cache=yes',
    '--demuxer-readahead-secs=20',   // Keeps a healthy 20-second download pipeline ahead of playback
    '--cache-pause=no',              // Prevents MPV from hard-freezing your player UI during minor drops
    '--demuxer-max-bytes=30M',       // Audio streams don't need 150MB. 30MB is plenty for uncompressed FLAC caching.
    '--demuxer-max-back-bytes=10M',  // Limit reverse cache size

    filePath
  ];

  // Apply ReplayGain
  if (currentAudioSettings.replayGain && currentAudioSettings.replayGain !== 'no') {
    args.unshift(`--replaygain=${currentAudioSettings.replayGain}`);
  }

  // Apply max sampling settings
  // Note: Use s32 for 24-bit because Windows doesn't support packed s24 format well
  if (currentAudioSettings.maxBitDepth) {
    const formatMap = { 16: 's16', 24: 's32', 32: 's32' };
    const format = formatMap[currentAudioSettings.maxBitDepth] || 's32';
    args.unshift(`--audio-format=${format}`);
  }
  if (currentAudioSettings.maxSampleRate) {
    args.unshift(`--audio-samplerate=${currentAudioSettings.maxSampleRate * 1000}`);
  }

  if (deviceId && deviceId !== '-1' && deviceId !== -1) {
    args.unshift(`--audio-device=${deviceId}`);
    args.unshift('--audio-exclusive=yes');
  }

  if (currentEqFilter) {
    args.unshift(`--af=${currentEqFilter}`);
  }

  currentPlayProcess = spawn(mpvPath, args, {
    windowsHide: true
  });

  // Capture stderr to log MPV errors
  let stderrOutput = '';
  if (currentPlayProcess.stderr) {
    currentPlayProcess.stderr.on('data', (data) => {
      stderrOutput += data.toString();
    });
  }

  currentPlayProcess.on('error', (err) => {
    console.error('MPV spawn error:', err);
    const win = require('electron').BrowserWindow.getAllWindows()[0];
    if (win) win.webContents.send('playback-error', { error: err.message });
  });

  currentPlayProcess.on('exit', (code, signal) => {
    const win = require('electron').BrowserWindow.getAllWindows()[0];

    // Only send track-ended if it's a normal exit (code 0)
    // If MPV crashed or failed (non-zero code), log the error
    if (code === 0 || code === null) {
      // Normal exit - track finished playing
      if (win) win.webContents.send('track-ended');
    } else {
      // MPV crashed or failed to start
      console.error(`MPV exited with code ${code}, signal ${signal}`);
      if (stderrOutput) {
        console.error('MPV stderr:', stderrOutput.substring(0, 500));
      }
      console.error('Failed MPV arguments:', args.join(' '));

      // Send error to frontend to prevent infinite loop
      if (win) {
        win.webContents.send('playback-error', {
          error: `MPV failed with code ${code}`,
          details: stderrOutput.substring(0, 200)
        });
      }
    }
  });

  // Connect to MPV IPC after a short delay
  // Increase retries and delay when sampling rate conversion is active (takes longer to initialize)
  const hasResampling = currentAudioSettings.maxBitDepth || currentAudioSettings.maxSampleRate;
  const maxRetries = hasResampling ? 20 : 10;  // 20 retries = 10 seconds for resampling
  const retryDelay = hasResampling ? 500 : 500;

  const connectWithRetry = (retries = maxRetries, targetPipe = currentIpcPipe) => {
    try {
      mpvSocket = net.createConnection(targetPipe);
      mpvSocket.on('error', (err) => {
        if (retries > 0 && currentPlayProcess && targetPipe === currentIpcPipe) {
          setTimeout(() => connectWithRetry(retries - 1, targetPipe), retryDelay);
        } else {
          console.log('MPV IPC Error:', err.message);
          // If we still can't connect after all retries, MPV likely crashed
          if (currentPlayProcess && currentPlayProcess.exitCode === null) {
            console.error('MPV process is running but IPC connection failed after', maxRetries, 'attempts');
          }
        }
      });
      mpvSocket.on('connect', () => {
        const win = require('electron').BrowserWindow.getAllWindows()[0];

        // Observe the time-pos property. MPV will now emit events when it changes.
        mpvSocket.write(JSON.stringify({ command: ["observe_property", 1, "time-pos"] }) + '\n');
        mpvSocket.write(JSON.stringify({ command: ["observe_property", 2, "pause"] }) + '\n');

        // Handle data from MPV (events, responses)
        mpvSocket.on('data', (data) => {
          const lines = data.toString('utf-8').split('\n');
          for (const line of lines) {
            if (!line) continue;
            try {
              const msg = JSON.parse(line);
              if (msg.event === 'property-change' && msg.id === 1 && msg.data !== undefined) {
                const time = Math.floor(msg.data);
                lastTimePos = time;
                if (win) win.webContents.send('time-pos', time);
              }
            } catch (e) {
              // Not a JSON event, ignore.
            }
          }
        });
      });
    } catch (e) { }
  };

  setTimeout(() => connectWithRetry(maxRetries, currentIpcPipe), 500);

  return { success: true };
});

ipcMain.handle('set-volume', (event, vol) => {
  if (mpvSocket && !mpvSocket.destroyed) {
    const cmd = { command: ["set_property", "volume", vol] };
    mpvSocket.write(JSON.stringify(cmd) + '\n');
  }
});

ipcMain.handle('seek-audio', (event, timePos) => {
  if (mpvSocket && !mpvSocket.destroyed) {
    const cmd = { command: ["set_property", "time-pos", timePos] };
    mpvSocket.write(JSON.stringify(cmd) + '\n');
  }
});

ipcMain.handle('pause-audio', (event, paused) => {
  if (mpvSocket && !mpvSocket.destroyed) {
    const cmd = { command: ["set_property", "pause", paused] };
    mpvSocket.write(JSON.stringify(cmd) + '\n');
  }
});

// The frontend polls this, but we're moving to event-based updates.
// Keep the handler to prevent crashes, but it can be empty.
ipcMain.handle('get-time-pos', () => {
  return lastTimePos;
});

ipcMain.handle('stop-audio', () => {
  lastTimePos = 0;
  if (mpvSocket) {
    try { mpvSocket.destroy(); } catch (e) { }
    mpvSocket = null;
  }
  if (currentPlayProcess) {
    currentPlayProcess.removeAllListeners('exit');
    try { currentPlayProcess.kill('SIGKILL'); } catch (e) { }
    currentPlayProcess = null;
  }
  return { success: true };
});

ipcMain.handle('set-audio-device', (event, deviceId) => {
  if (mpvSocket && !mpvSocket.destroyed) {
    const isExclusive = (deviceId && deviceId !== '-1' && deviceId !== -1) ? "yes" : "no";
    const audioDev = (deviceId && deviceId !== '-1' && deviceId !== -1) ? deviceId : "auto";

    mpvSocket.write(JSON.stringify({ command: ["set_property", "audio-device", audioDev] }) + '\n');
    mpvSocket.write(JSON.stringify({ command: ["set_property", "audio-exclusive", isExclusive] }) + '\n');
  }
});

ipcMain.handle('set-eq', (event, filterString) => {
  currentEqFilter = filterString || '';
  if (mpvSocket && !mpvSocket.destroyed) {
    const cmd = { command: ["set_property", "af", currentEqFilter] };
    mpvSocket.write(JSON.stringify(cmd) + '\n');
  }
});

// Apply audio settings (called from settings view)
function applyAudioSettings(settings) {
  const newSettings = {
    replayGain: settings.replayGain || 'no',
    crossfade: settings.crossfade || 0,
    maxBitDepth: settings.maxBitDepth || null,
    maxSampleRate: settings.maxSampleRate || null
  };

  // Only log if settings actually changed
  const hasChanged =
    newSettings.replayGain !== currentAudioSettings.replayGain ||
    newSettings.crossfade !== currentAudioSettings.crossfade ||
    newSettings.maxBitDepth !== currentAudioSettings.maxBitDepth ||
    newSettings.maxSampleRate !== currentAudioSettings.maxSampleRate;

  currentAudioSettings = newSettings;

  if (hasChanged) {
    console.log('Applied audio settings:', currentAudioSettings);
  }
}

// Get current audio settings for signal path display
ipcMain.handle('get-audio-settings', () => {
  return currentAudioSettings;
});

// Export for use in main.js
module.exports = {
  applyAudioSettings
};

