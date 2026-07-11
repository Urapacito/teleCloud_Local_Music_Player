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
  if (currentPlayProcess) {
    currentPlayProcess.removeAllListeners('exit');
    try { currentPlayProcess.kill('SIGKILL'); } catch(e) {}
    currentPlayProcess = null;
  }
  if (mpvSocket) {
    try { mpvSocket.destroy(); } catch(e) {}
    mpvSocket = null;
  }

  currentIpcPipe = '\\\\.\\pipe\\telecloud-mpv-' + Date.now();

  const args = [
    '--no-video',
    `--input-ipc-server=${currentIpcPipe}`,
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
        // Apply initial volume if not exclusive
        if (!deviceId || deviceId === '-1' || deviceId === -1) {
          const win = require('electron').BrowserWindow.getAllWindows()[0];
          // Frontend should send volume, but we can set default
        }
      });
    } catch(e) {}
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

ipcMain.handle('stop-audio', () => {
  if (mpvSocket) {
    try { mpvSocket.destroy(); } catch(e) {}
    mpvSocket = null;
  }
  if (currentPlayProcess) {
    currentPlayProcess.removeAllListeners('exit');
    try { currentPlayProcess.kill('SIGKILL'); } catch(e) {}
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

