const { ipcMain, dialog, app } = require('electron');
const fs = require('fs');
const path = require('path');


async function scanDirectory(dirPath) {
  let results = [];
  try {
    const list = fs.readdirSync(dirPath);
    for (const file of list) {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        const subResults = await scanDirectory(filePath);
        results = results.concat(subResults);
      } else {
        const ext = path.extname(file).toLowerCase();
        if (['.flac', '.mp3', '.wav', '.dsf', '.dff', '.m4a'].includes(ext)) {
          let metadata = {};
          let base64Cover = null;
          try {
            const mm = await import('music-metadata');
            const parsed = await mm.parseFile(filePath, { duration: true, skipCovers: false });
            let lyricsStr = '';

            // Check for lyrics in parsed.common.lyrics (LYRICS tag)
            if (parsed.common.lyrics && parsed.common.lyrics.length > 0) {
              lyricsStr = parsed.common.lyrics.map(l => {
                if (typeof l === 'string') return l;
                if (l && l.syncText) {
                  return l.syncText.map(t => {
                    const min = Math.floor(t.timestamp / 1000 / 60).toString().padStart(2, '0');
                    const sec = ((t.timestamp / 1000) % 60).toFixed(2).padStart(5, '0');
                    return `[${min}:${sec}]${t.text}`;
                  }).join('\n');
                }
                if (l && l.text) return l.text;
                return JSON.stringify(l);
              }).join('\n');
            }

            // Also check native tags for UNSYNCEDLYRICS or UNSYNCED LYRICS
            if (!lyricsStr && parsed.native) {
              for (const tagType in parsed.native) {
                const tags = parsed.native[tagType];
                for (const tag of tags) {
                  // Check for various unsynced lyrics tag names
                  if (tag.id && (
                    tag.id.toUpperCase() === 'UNSYNCEDLYRICS' ||
                    tag.id.toUpperCase() === 'UNSYNCED LYRICS' ||
                    tag.id.toUpperCase() === 'USLT' ||
                    tag.id.toUpperCase() === 'LYRICS'
                  )) {
                    if (typeof tag.value === 'string') {
                      lyricsStr = tag.value;
                      break;
                    } else if (tag.value && tag.value.text) {
                      lyricsStr = tag.value.text;
                      break;
                    }
                  }
                }
                if (lyricsStr) break;
              }
            }

            metadata = {
              title: parsed.common.title || file,
              artist: parsed.common.artist || 'Unknown Artist',
              album: parsed.common.album || 'Unknown Album',
              duration: parsed.format.duration || 0,
              track: parsed.common.track?.no || 0,
              bitrate: parsed.format.bitrate || 0,
              sampleRate: parsed.format.sampleRate || 0,
              bitsPerSample: parsed.format.bitsPerSample || 0,
              lyrics: lyricsStr
            };
            const cover = mm.selectCover(parsed.common.picture);
            if (cover) {
              base64Cover = `data:${cover.format};base64,${Buffer.from(cover.data).toString('base64')}`;
            }
          } catch (e) {
            console.error(`Error parsing metadata for ${file}`, e);
            metadata = { title: file, artist: 'Unknown Artist', album: 'Unknown Album', duration: 0 };
          }

          results.push({
            name: file,
            path: filePath,
            ext: ext,
            size: stat.size,
            metadata,
            cover: base64Cover
          });
        }
      }
    }
  } catch (err) {
    console.error(`Error scanning directory ${dirPath}:`, err);
  }
  return results;
}

ipcMain.handle('scan-local-music', async (event, folderPath) => {
  const files = await scanDirectory(folderPath);
  files.sort((a, b) => {
    const trackA = a.metadata?.track || 0;
    const trackB = b.metadata?.track || 0;
    if (trackA !== trackB) return trackA - trackB;
    return a.name.localeCompare(b.name);
  });
  return files;
});

ipcMain.handle('select-music-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

const libraryPath = path.join(app.getPath('userData'), 'library.json');

ipcMain.handle('load-library', async () => {
  try {
    if (fs.existsSync(libraryPath)) {
      const data = fs.readFileSync(libraryPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading library:', err);
  }
  return [];
});

ipcMain.handle('save-library', async (event, libraryData) => {
  try {
    fs.writeFileSync(libraryPath, JSON.stringify(libraryData), 'utf8');
    return true;
  } catch (err) {
    console.error('Error saving library:', err);
    return false;
  }
});

// Extra user data stores
const storePaths = {
  favorites: path.join(app.getPath('userData'), 'favorites.json'),
  playlists: path.join(app.getPath('userData'), 'playlists.json'),
  recent: path.join(app.getPath('userData'), 'recent.json'),
  settings: path.join(app.getPath('userData'), 'settings.json')
};

ipcMain.handle('load-store', async (event, storeName) => {
  try {
    const p = storePaths[storeName];
    if (p && fs.existsSync(p)) {
      const data = fs.readFileSync(p, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error(`Error loading store ${storeName}:`, err);
  }
  return [];
});

ipcMain.handle('save-store', async (event, storeName, data) => {
  try {
    const p = storePaths[storeName];
    if (p) {
      fs.writeFileSync(p, JSON.stringify(data), 'utf8');
      return true;
    }
  } catch (err) {
    console.error(`Error saving store ${storeName}:`, err);
    return false;
  }
});

ipcMain.handle('delete-song', async (event, file) => {
  try {
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    // Telegram deletion would go here if file.messageId exists
    // if (file.messageId) { await deleteFromTelegram(file.messageId); }
    return true;
  } catch (err) {
    console.error('Error deleting song:', err);
    return false;
  }
});

ipcMain.handle('download-song', async (event, file, downloadFolder) => {
  try {
    // Simulated download logic since telecloud integration is pending
    const destPath = path.join(downloadFolder, file.name);
    if (file.path !== destPath && fs.existsSync(file.path)) {
      fs.copyFileSync(file.path, destPath);
    }
    return true;
  } catch (err) {
    console.error('Error downloading song:', err);
    return false;
  }
});
