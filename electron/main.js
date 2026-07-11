const { app, BrowserWindow, ipcMain, session, net } = require('electron');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const tidal = require('./tidal.js');
require('./telegram.js');
require('./music.js');
require('./player.js');

const isDev = process.env.NODE_ENV !== 'production';

// Tidal IPC Handlers
ipcMain.handle('tidal:login', async () => {
  try {
    const session = await tidal.login();
    return { success: true, session };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('tidal:logout', async () => {
  try {
    const result = tidal.logout();
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('tidal:restoreSession', async () => {
  try {
    const session = await tidal.restoreSession();
    return { success: true, session };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('tidal:getSession', async () => {
  try {
    const session = tidal.getSession();
    return { success: true, session };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('tidal:getUserInfo', async () => {
  try {
    const userInfo = await tidal.getUserInfo();
    return { success: true, data: userInfo };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('tidal:getForYou', async () => {
  try {
    const data = await tidal.getForYou();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('tidal:getRecentPlayed', async (event, limit) => {
  try {
    const data = await tidal.getRecentPlayed(limit);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('tidal:getArtists', async (event, limit) => {
  try {
    const data = await tidal.getArtists(limit);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('tidal:getPlaylists', async (event, limit) => {
  try {
    const data = await tidal.getPlaylists(limit);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('tidal:getPlaylistTracks', async (event, { playlistId, limit }) => {
  try {
    const data = await tidal.getPlaylistTracks(playlistId, limit);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('tidal:getAlbums', async (event, limit) => {
  try {
    const data = await tidal.getAlbums(limit);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('tidal:getAlbumTracks', async (event, albumId) => {
  try {
    const data = await tidal.getAlbumTracks(albumId);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('tidal:getTracks', async (event, limit) => {
  try {
    const data = await tidal.getTracks(limit);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('tidal:getTracksPage', async (event, { cursor, limit } = {}) => {
  try {
    const data = await tidal.getTracksPage(cursor, limit);
    return { success: true, ...data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('tidal:getPlaylistsPage', async (event, { cursor, limit } = {}) => {
  try {
    const data = await tidal.getPlaylistsPage(cursor, limit);
    return { success: true, ...data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('tidal:getPlaylistTracksPage', async (event, { playlistId, cursor, limit } = {}) => {
  try {
    const data = await tidal.getPlaylistTracksPage(playlistId, cursor, limit);
    return { success: true, ...data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('tidal:search', async (event, { query, type, limit }) => {
  try {
    const data = await tidal.search(query, type, limit);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('tidal:getStreamUrl', async (event, { trackId, quality }) => {
  try {
    const data = await tidal.getStreamUrl(trackId, quality);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('tidal:getTrack', async (event, trackId) => {
  try {
    const data = await tidal.getTrack(trackId);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('tidal:getAlbum', async (event, albumId) => {
  try {
    const data = await tidal.getAlbum(albumId);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('tidal:getArtist', async (event, artistId) => {
  try {
    const data = await tidal.getArtist(artistId);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-dirname', async (event, filePath) => {
  return path.dirname(filePath);
});

ipcMain.handle('read-local-file', async (event, filePath) => {
  try {
    const buffer = await fs.promises.readFile(filePath);
    return { success: true, data: buffer.toString('base64') };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false, // Recommended for security
      contextIsolation: true, // Recommended for security
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:3000');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// IPC handler for fetching images — uses Electron net.request (Chromium network stack)
// This avoids CDN 403s that raw https.get and node-fetch trigger due to missing cookies/TLS fingerprint
ipcMain.handle('fetch-image', async (event, url) => {
  if (!url || !url.startsWith('http')) {
      console.log('[DEBUG fetch-image] Invalid URL provided:', url);
      return null;
  }
  console.log(`[DEBUG fetch-image] Attempting to fetch: ${url}`);
  return new Promise((resolve) => {
    try {
      const request = net.request({ url, method: 'GET' });
      request.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      request.setHeader('Accept', 'image/webp,image/apng,image/*,*/*;q=0.8');
      request.setHeader('Accept-Language', 'en-US,en;q=0.9');
      request.setHeader('Referer', 'https://listen.tidal.com/');

      const chunks = [];
      request.on('response', (response) => {
        if (response.statusCode !== 200) {
          console.error('Image fetch error: HTTP', response.statusCode, url.slice(0, 80));
          resolve(null);
          return;
        }
        response.on('data', chunk => chunks.push(chunk));
        response.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const base64 = buffer.toString('base64');
          const sig = buffer.slice(0, 4).toString('hex');
          let mimeType = 'image/jpeg';
          if (sig.startsWith('89504e47')) mimeType = 'image/png';
          else if (sig.startsWith('47494638')) mimeType = 'image/gif';
          else if (sig.startsWith('52494646')) mimeType = 'image/webp';
          resolve(`data:${mimeType};base64,${base64}`);
        });
        response.on('error', () => resolve(null));
      });
      request.on('error', (err) => {
        console.error('Image fetch error:', err.message);
        resolve(null);
      });
      request.end();
    } catch (err) {
      console.error('Image fetch error:', err.message);
      resolve(null);
    }
  });
});

app.whenReady().then(() => {
  // The onHeadersReceived logic is now removed.

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
