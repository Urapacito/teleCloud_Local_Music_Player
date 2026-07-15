const { app, BrowserWindow, ipcMain, session, net, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const dotenv = require('dotenv');
const crypto = require('crypto');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Cover cache directory
const COVER_CACHE_DIR = path.join(app.getPath('userData'), 'cover-cache');

const tidal = require('./tidal.js');
require('./telegram.js');
const MusicFolderWatcher = require('./watcher.js');

// File system watcher instance
let folderWatcher = null;
let currentlyWatchedPaths = null; // Track currently watched paths to prevent unnecessary restarts
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

// 🔍 SUBSCRIPTION VERIFICATION: Get track manifest
ipcMain.handle('tidal:getTrackManifest', async (event, { trackId, format }) => {
  try {
    const data = await tidal.getTrackManifest(trackId, format);
    return data; // Already has success/error structure
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 🔍 SUBSCRIPTION VERIFICATION: Test subscription status
ipcMain.handle('tidal:testSubscription', async (event, { trackId } = {}) => {
  try {
    const data = await tidal.testSubscription(trackId);
    return data; // Already has success/error structure
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

ipcMain.handle('apply-audio-settings', async (event, settings) => {
  try {
    const { applyAudioSettings } = require('./player');
    await applyAudioSettings(settings);
    return { success: true };
  } catch (err) {
    console.error('Error applying audio settings:', err);
    return { success: false, error: err.message };
  }
});

// File System Watcher Handlers
ipcMain.handle('start-watching', async (event, folders) => {
  try {
    console.log('[Main] start-watching called with folders:', folders);

    // 🛡️ GUARD: Check if paths are identical to prevent unnecessary restarts
    if (currentlyWatchedPaths && folderWatcher) {
      const pathsIdentical =
        currentlyWatchedPaths.length === folders.length &&
        currentlyWatchedPaths.every((path, index) => path === folders[index]);

      if (pathsIdentical) {
        console.log('[Main] ✓ Paths unchanged, skipping watcher restart (already watching)');
        return { success: true, skipped: true, message: 'Already watching these paths' };
      }
      console.log('[Main] Paths changed, restarting watcher');
    }

    // Stop existing watcher if paths changed
    if (folderWatcher) {
      console.log('[Main] Stopping existing watcher');
      folderWatcher.stop();
      folderWatcher = null;
    }

    if (folders && folders.length > 0) {
      console.log('[Main] Creating new watcher for', folders.length, 'folder(s)');

      // Update tracked paths BEFORE starting watcher
      currentlyWatchedPaths = [...folders];

      folderWatcher = new MusicFolderWatcher(folders, async (action, filePath) => {
        console.log(`[Main] Watcher callback triggered: ${action} - ${filePath}`);
        await handleFileChange(action, filePath);
      });
      folderWatcher.start();
      console.log('[Main] Watcher started successfully');
      return { success: true };
    } else {
      console.log('[Main] No folders provided to watch');
      currentlyWatchedPaths = null; // Clear tracked paths
      return { success: false, error: 'No folders provided' };
    }
  } catch (err) {
    console.error('[Main] Error starting file watcher:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('stop-watching', async () => {
  try {
    if (folderWatcher) {
      folderWatcher.stop();
      folderWatcher = null;
    }
    // Clear tracked paths when watcher is stopped
    currentlyWatchedPaths = null;
    console.log('[Main] Watcher stopped and tracked paths cleared');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Clear database and cache - start fresh
ipcMain.handle('clear-database-and-cache', async () => {
  try {
    const { clearDatabase, closeDatabase } = require('./database');

    // Clear all data from database
    clearDatabase();

    // Close database connection
    closeDatabase();

    // Delete the actual database files
    const dbPath = path.join(app.getPath('userData'), 'music-library.db');
    const walPath = dbPath + '-wal';
    const shmPath = dbPath + '-shm';

    // Delete files if they exist
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

    console.log('[Database] Database and cache cleared successfully');
    return { success: true, message: 'Database and cache cleared. Please restart the app and do a full scan.' };
  } catch (err) {
    console.error('[Database] Error clearing database:', err);
    return { success: false, error: err.message };
  }
});

// Handle individual file changes detected by watcher
async function handleFileChange(action, filePath) {
  try {
    // Get the current window's webContents
    const windows = BrowserWindow.getAllWindows();
    if (windows.length === 0) {
      console.log('[Watcher] No windows available to send update');
      return;
    }
    const mainWindow = windows[0];

    const { insertOrUpdateFile, deleteFile } = require('./database');

    if (action === 'add' || action === 'change') {
      console.log(`[Watcher] Processing ${action}: ${filePath}`);

      // Parse the new/changed file metadata
      const mm = await import('music-metadata');
      const stats = fs.statSync(filePath);
      const metadata = await mm.parseFile(filePath, { duration: true, skipCovers: true });

      // Extract metadata with proper fallbacks
      const title = metadata.common.title || path.basename(filePath, path.extname(filePath));
      const artist = metadata.common.artist || 'Unknown';
      const album = metadata.common.album || 'Unknown';
      const year = metadata.common.year || null;
      const genre = metadata.common.genre ? metadata.common.genre.join(', ') : null;
      const duration = metadata.format.duration || 0;
      const bitrate = metadata.format.bitrate || 0;
      const sampleRate = metadata.format.sampleRate || 0;
      const bitsPerSample = metadata.format.bitsPerSample || 0;

      // Create database format (flat structure)
      const dbData = {
        path: filePath,
        name: path.basename(filePath),
        ext: path.extname(filePath),
        size: stats.size,
        mtime: stats.mtimeMs,
        title,
        artist,
        album,
        year,
        genre,
        trackNumber: metadata.common.track?.no || null,
        discNumber: metadata.common.disk?.no || null,
        duration,
        bitrate,
        sampleRate,
        bit_depth: bitsPerSample,  // Database uses bit_depth
        lyrics: '',
        cover: null,
        hasCover: false
      };

      // Create frontend format (nested metadata structure)
      const frontendData = {
        path: filePath,
        name: path.basename(filePath),
        ext: path.extname(filePath),
        size: stats.size,
        mtime: stats.mtimeMs,
        metadata: {
          title,
          artist,
          album,
          year,
          genre,
          duration,
          bitrate,
          sampleRate,
          bitsPerSample
        },
        cover: null,
        hasCover: false
      };

      // Update database with flat structure
      insertOrUpdateFile(dbData);

      console.log(`[Watcher] ✅ Added to DB: "${title}" by ${artist} (${bitsPerSample}-bit/${sampleRate}Hz)`);
      console.log(`[Watcher] Sending ${action} update to renderer`);

      // Notify renderer with nested structure
      mainWindow.webContents.send('library-updated', {
        type: action === 'add' ? 'add' : 'update',
        file: frontendData
      });

    } else if (action === 'delete') {
      console.log(`[Watcher] Processing delete: ${filePath}`);

      // Remove from database
      deleteFile(filePath);

      console.log('[Watcher] Sending delete update to renderer');
      // Notify renderer
      mainWindow.webContents.send('library-updated', {
        type: 'delete',
        path: filePath
      });
    }
  } catch (err) {
    console.error(`[Watcher] Error handling ${action} for ${filePath}:`, err.message);
  }
}

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
  if (!url || !url.startsWith('http')) return null;
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

app.whenReady().then(async () => {
  // Create cover cache directory if it doesn't exist
  if (!fs.existsSync(COVER_CACHE_DIR)) {
    fs.mkdirSync(COVER_CACHE_DIR, { recursive: true });
  }

  // Register media:// protocol for on-demand cover art loading
  protocol.handle('media', async (request) => {
    try {
      const urlPath = request.url.replace('media://', '');
      const songPath = decodeURIComponent(urlPath);

      // Generate cache filename from song path hash
      const hash = crypto.createHash('md5').update(songPath).digest('hex');
      const cacheFile = path.join(COVER_CACHE_DIR, `${hash}.jpg`);

      // Check if already cached on disk
      if (fs.existsSync(cacheFile)) {
        const buffer = fs.readFileSync(cacheFile);
        return new Response(buffer, {
          headers: { 'Content-Type': 'image/jpeg' }
        });
      }

      // Extract from file
      const mm = await import('music-metadata');
      const metadata = await mm.parseFile(songPath, { duration: false, skipCovers: false, skipPostHeaders: true });
      const cover = mm.selectCover(metadata.common.picture);

      if (cover) {
        // Save to disk cache
        fs.writeFileSync(cacheFile, cover.data);

        return new Response(cover.data, {
          headers: { 'Content-Type': cover.format || 'image/jpeg' }
        });
      }

      // No cover found - return placeholder
      return new Response('', { status: 404 });

    } catch (err) {
      console.error('[media://] Cover extraction error:', err.message);
      return new Response('', { status: 404 });
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
