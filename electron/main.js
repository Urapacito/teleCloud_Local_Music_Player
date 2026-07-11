const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
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

// IPC handler for fetching images and returning as base64
ipcMain.handle('fetch-image', async (event, url) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const mimeType = response.headers.get('content-type') || 'image/jpeg';
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error('Image fetch error:', error);
    return null; // Return null on error
  }
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
