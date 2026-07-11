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

  currentPlayProcess.on('error', (err) => {
    console.error('MPV error:', err);
  });

  currentPlayProcess.on('exit', () => {
    // Notify frontend that track ended
    const win = require('electron').BrowserWindow.getAllWindows()[0];
    if (win) win.webContents.send('track-ended');
  });

  // Connect to MPV IPC after a short delay
  const connectWithRetry = (retries = 10, targetPipe = currentIpcPipe) => {
    try {
      mpvSocket = net.createConnection(targetPipe);
      mpvSocket.on('error', (err) => {
        if (retries > 0 && currentPlayProcess && targetPipe === currentIpcPipe) {
          setTimeout(() => connectWithRetry(retries - 1, targetPipe), 500);
        } else {
          console.log('MPV IPC Error:', err.message);
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

  setTimeout(() => connectWithRetry(10, currentIpcPipe), 500);

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

