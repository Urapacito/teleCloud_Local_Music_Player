const { ipcMain, dialog, app } = require('electron');
const fs = require('fs');
const path = require('path');
const database = require('./database');


// Quick scan: only get file paths and basic stats (fast)
async function quickScanDirectory(dirPath) {
  let results = [];
  try {
    const list = fs.readdirSync(dirPath);
    for (const file of list) {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        const subResults = await quickScanDirectory(filePath);
        results = results.concat(subResults);
      } else {
        const ext = path.extname(file).toLowerCase();
        if (['.flac', '.mp3', '.wav', '.dsf', '.dff', '.m4a'].includes(ext)) {
          results.push({
            path: filePath,
            size: stat.size,
            mtime: stat.mtimeMs,
            name: file,
            ext: ext
          });
        }
      }
    }
  } catch (err) {
    console.error(`Error quick scanning directory ${dirPath}:`, err);
  }
  return results;
}

// Full scan with metadata parsing (slow, for new files only)
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
            // Cover extraction removed - using media:// protocol for on-demand loading
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
            cover: null  // Covers loaded on-demand via media:// protocol
          });
        }
      }
    }
  } catch (err) {
    console.error(`Error scanning directory ${dirPath}:`, err);
  }
  return results;
}

// Database-backed differential scanning with progress events
async function scanWithDatabaseCache(folders, progressCallback) {
  database.initDatabase();

  // Step 1: Fast directory traversal
  if (progressCallback) {
    progressCallback({ stage: 'indexing', current: 0, total: 0, message: 'Indexing files...' });
  }

  let allFiles = [];
  for (const folder of folders) {
    if (typeof folder === 'string' && folder) {
      const files = await quickScanDirectory(folder);
      allFiles = allFiles.concat(files);
    }
  }

  console.log(`[Scan] Found ${allFiles.length} music files on disk`);

  // Step 2: Check database cache
  const { needsUpdate, cached, deleted } = database.getFilesNeedingUpdate(allFiles);

  console.log(`[Scan] Cached: ${cached.length}, Needs update: ${needsUpdate.length}, Deleted: ${deleted.length}`);

  // Step 3: Delete removed files from database
  if (deleted.length > 0) {
    database.deleteFilesBatch(deleted);
  }

  // Step 4: Parse only files that need updating
  const parsedFiles = [];
  for (let i = 0; i < needsUpdate.length; i++) {
    const fileInfo = needsUpdate[i];

    if (progressCallback && i % 10 === 0) {
      progressCallback({
        stage: 'parsing',
        current: i,
        total: needsUpdate.length,
        message: `Parsing metadata (${i}/${needsUpdate.length})...`
      });
    }

    try {
      const mm = await import('music-metadata');
      const parsed = await mm.parseFile(fileInfo.path, { duration: true, skipCovers: false });

      let lyricsStr = '';
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

      if (!lyricsStr && parsed.native) {
        for (const tagType in parsed.native) {
          const tags = parsed.native[tagType];
          for (const tag of tags) {
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

      // Cover extraction removed - using media:// protocol for on-demand loading
      const hasCover = !!(parsed.common.picture && parsed.common.picture.length > 0);

      // Store in database
      const dbData = {
        path: fileInfo.path,
        mtime: fileInfo.mtime,
        size: fileInfo.size,
        title: parsed.common.title || fileInfo.name,
        artist: parsed.common.artist || 'Unknown Artist',
        album: parsed.common.album || 'Unknown Album',
        year: parsed.common.year || null,
        genre: (parsed.common.genre && parsed.common.genre[0]) || null,
        trackNumber: parsed.common.track?.no || null,
        discNumber: parsed.common.disk?.no || null,
        duration: parsed.format.duration || 0,
        bitrate: parsed.format.bitrate || 0,
        sampleRate: parsed.format.sampleRate || 0,
        bit_depth: parsed.format.bitsPerSample || 0,
        lyrics: lyricsStr,
        cover: null,  // Not storing covers - loaded via media:// protocol
        hasCover: hasCover
      };

      database.insertOrUpdateFile(dbData);

      // Prepare file object for frontend
      parsedFiles.push({
        name: fileInfo.name,
        path: fileInfo.path,
        ext: fileInfo.ext,
        size: fileInfo.size,
        mtime: fileInfo.mtime,
        metadata: {
          title: dbData.title,
          artist: dbData.artist,
          album: dbData.album,
          duration: dbData.duration,
          track: dbData.trackNumber || 0,
          bitrate: dbData.bitrate,
          sampleRate: dbData.sampleRate,
          bitsPerSample: parsed.format.bitsPerSample || 0,
          lyrics: dbData.lyrics
        },
        cover: null  // Covers loaded on-demand via media:// protocol
      });
    } catch (e) {
      console.error(`Error parsing ${fileInfo.name}:`, e);
      parsedFiles.push({
        name: fileInfo.name,
        path: fileInfo.path,
        ext: fileInfo.ext,
        size: fileInfo.size,
        mtime: fileInfo.mtime,
        metadata: { title: fileInfo.name, artist: 'Unknown Artist', album: 'Unknown Album', duration: 0 },
        cover: null
      });
    }
  }

  // Step 5: Convert cached database entries to frontend format
  const cachedFiles = cached.map(dbFile => ({
    name: path.basename(dbFile.path),
    path: dbFile.path,
    ext: path.extname(dbFile.path).toLowerCase(),
    size: dbFile.size,
    mtime: dbFile.mtime,
    metadata: {
      title: dbFile.title,
      artist: dbFile.artist,
      album: dbFile.album,
      duration: dbFile.duration,
      track: dbFile.track_number || 0,
      bitrate: dbFile.bitrate,
      sampleRate: dbFile.sample_rate,
      bitsPerSample: dbFile.bit_depth || 0,  // Fixed: use actual bit depth from database
      lyrics: dbFile.lyrics || ''
    },
    cover: dbFile.cover || null  // Use cached cover if available
  }));

  // Step 6: Combine and return
  let allResults = [...cachedFiles, ...parsedFiles];

  allResults.sort((a, b) => {
    const trackA = a.metadata?.track || 0;
    const trackB = b.metadata?.track || 0;
    if (trackA !== trackB) return trackA - trackB;
    return a.name.localeCompare(b.name);
  });

  if (progressCallback) {
    progressCallback({ stage: 'complete', current: allResults.length, total: allResults.length, message: 'Scan complete!' });
  }

  console.log(`[Scan] Returning ${allResults.length} total files (${cachedFiles.length} cached, ${parsedFiles.length} newly parsed)`);

  return allResults;
}

// New database-backed scan with progress events
ipcMain.handle('scan-local-music-cached', async (event, folderPath) => {
  const folders = Array.isArray(folderPath) ? folderPath : [folderPath];

  const progressCallback = (progress) => {
    event.sender.send('scan-progress', progress);
  };

  const results = await scanWithDatabaseCache(folders, progressCallback);
  return results;
});

// Smart scan: quick scan first, then only parse metadata for new/changed files
ipcMain.handle('scan-local-music', async (event, folderPath) => {
  const folders = Array.isArray(folderPath) ? folderPath : [folderPath];

  // Load existing library for comparison
  let existingLibrary = [];
  try {
    if (fs.existsSync(libraryPath)) {
      const data = fs.readFileSync(libraryPath, 'utf8');
      existingLibrary = JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading library for comparison:', err);
  }

  // Create a map of existing files by path for O(1) lookup
  const existingMap = new Map();
  for (const file of existingLibrary) {
    existingMap.set(file.path, file);
  }

  // Step 1: Quick scan - just get file paths and stats (FAST!)
  let quickScanResults = [];
  for (const folder of folders) {
    if (typeof folder === 'string' && folder) {
      const folderFiles = await quickScanDirectory(folder);
      quickScanResults = quickScanResults.concat(folderFiles);
    }
  }

  // Step 2: Determine which files need metadata parsing
  const filesToParse = [];
  const filesToKeep = [];

  for (const quickFile of quickScanResults) {
    const existing = existingMap.get(quickFile.path);

    // If file is new or has changed (different size/mtime), parse metadata
    // OR if file is missing cover/lyrics, also re-parse it
    const needsMetadata = existing && (!existing.cover || !existing.metadata?.lyrics);

    if (!existing || existing.size !== quickFile.size ||
      Math.abs((existing.mtime || 0) - quickFile.mtime) > 1000 || needsMetadata) {
      filesToParse.push(quickFile);
    } else {
      // File unchanged and has complete metadata, keep as-is
      filesToKeep.push(existing);
    }
  }

  // Step 3: Only parse metadata for new/changed files
  const parsedFiles = [];
  for (const quickFile of filesToParse) {
    try {
      const mm = await import('music-metadata');
      const parsed = await mm.parseFile(quickFile.path, { duration: true, skipCovers: false });

      let lyricsStr = '';
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

      if (!lyricsStr && parsed.native) {
        for (const tagType in parsed.native) {
          const tags = parsed.native[tagType];
          for (const tag of tags) {
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

      const metadata = {
        title: parsed.common.title || quickFile.name,
        artist: parsed.common.artist || 'Unknown Artist',
        album: parsed.common.album || 'Unknown Album',
        duration: parsed.format.duration || 0,
        track: parsed.common.track?.no || 0,
        bitrate: parsed.format.bitrate || 0,
        sampleRate: parsed.format.sampleRate || 0,
        bitsPerSample: parsed.format.bitsPerSample || 0,
        lyrics: lyricsStr
      };

      // Cover extraction removed - using media:// protocol for on-demand loading

      parsedFiles.push({
        name: quickFile.name,
        path: quickFile.path,
        ext: quickFile.ext,
        size: quickFile.size,
        mtime: quickFile.mtime,
        metadata,
        cover: null  // Covers loaded on-demand via media:// protocol
      });
    } catch (e) {
      console.error(`Error parsing metadata for ${quickFile.name}`, e);
      parsedFiles.push({
        name: quickFile.name,
        path: quickFile.path,
        ext: quickFile.ext,
        size: quickFile.size,
        mtime: quickFile.mtime,
        metadata: { title: quickFile.name, artist: 'Unknown Artist', album: 'Unknown Album', duration: 0 },
        cover: null
      });
    }
  }

  // Step 4: Combine unchanged files with newly parsed files
  let files = [...filesToKeep, ...parsedFiles];

  // Remove duplicates by path if any
  const seen = new Set();
  files = files.filter(f => {
    if (seen.has(f.path)) return false;
    seen.add(f.path);
    return true;
  });

  files.sort((a, b) => {
    const trackA = a.metadata?.track || 0;
    const trackB = b.metadata?.track || 0;
    if (trackA !== trackB) return trackA - trackB;
    return a.name.localeCompare(b.name);
  });

  return files;
});

// Fast refresh: check for new/deleted files (lightweight - no metadata re-parsing)
ipcMain.handle('refresh-library', async (event, folders) => {
  // Load existing library
  let existingLibrary = [];
  try {
    if (fs.existsSync(libraryPath)) {
      const data = fs.readFileSync(libraryPath, 'utf8');
      existingLibrary = JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading library for refresh:', err);
    return [];
  }

  // Build a map of existing files for quick lookup
  const existingMap = new Map();
  for (const file of existingLibrary) {
    existingMap.set(file.path, file);
  }

  // Quick scan to get current file paths (NO metadata parsing yet)
  let currentFiles = [];
  const folderList = Array.isArray(folders) ? folders : [folders];
  for (const folder of folderList) {
    if (typeof folder === 'string' && folder) {
      const scannedFiles = await quickScanDirectory(folder);
      currentFiles = currentFiles.concat(scannedFiles);
    }
  }

  // Build set of current paths for O(1) lookup
  const currentPaths = new Set(currentFiles.map(f => f.path));

  // Separate into: keep (unchanged), remove (missing), add (new)
  const filesToKeep = [];
  const filesToAdd = [];

  // Check existing library: keep files that still exist, discard missing ones
  for (const file of existingLibrary) {
    if (currentPaths.has(file.path)) {
      filesToKeep.push(file);
    }
    // else: file is missing, don't keep it
  }

  // Check current files: find new files not in library
  for (const currentFile of currentFiles) {
    if (!existingMap.has(currentFile.path)) {
      filesToAdd.push(currentFile);
    }
  }

  // Parse metadata ONLY for new files (minimal/fast - skip covers AND lyrics for refresh speed)
  const parsedNewFiles = [];
  for (const newFile of filesToAdd) {
    try {
      const mm = await import('music-metadata');
      // Fast parse: duration, basic tags only - NO covers, NO lyrics
      const parsed = await mm.parseFile(newFile.path, { duration: true, skipCovers: true, skipPostHeaders: true });

      const metadata = {
        title: parsed.common.title || newFile.name,
        artist: parsed.common.artist || 'Unknown Artist',
        album: parsed.common.album || 'Unknown Album',
        duration: parsed.format.duration || 0,
        track: parsed.common.track?.no || 0,
        bitrate: parsed.format.bitrate || 0,
        sampleRate: parsed.format.sampleRate || 0,
        bitsPerSample: parsed.format.bitsPerSample || 0,
        lyrics: '' // Skip lyrics during refresh for speed
      };

      parsedNewFiles.push({
        name: newFile.name,
        path: newFile.path,
        ext: newFile.ext,
        size: newFile.size,
        mtime: newFile.mtime,
        metadata,
        cover: null // Will be fetched in background
      });
    } catch (e) {
      console.error(`Error parsing metadata for new file ${newFile.name}`, e);
      parsedNewFiles.push({
        name: newFile.name,
        path: newFile.path,
        ext: newFile.ext,
        size: newFile.size,
        mtime: newFile.mtime,
        metadata: { title: newFile.name, artist: 'Unknown Artist', album: 'Unknown Album', duration: 0, lyrics: '' },
        cover: null
      });
    }
  }

  // Combine: existing files + new files
  const updatedLibrary = [...filesToKeep, ...parsedNewFiles];

  // Sort by track number
  updatedLibrary.sort((a, b) => {
    const trackA = a.metadata?.track || 0;
    const trackB = b.metadata?.track || 0;
    if (trackA !== trackB) return trackA - trackB;
    return a.name.localeCompare(b.name);
  });

  return updatedLibrary;
});

// Background metadata fetcher: fetch covers AND lyrics with incremental updates
ipcMain.handle('fetch-metadata-background', async (event, filePaths) => {
  const updatedFiles = [];

  for (let i = 0; i < filePaths.length; i++) {
    const filePath = filePaths[i];
    try {
      const mm = await import('music-metadata');
      const parsed = await mm.parseFile(filePath, { duration: false, skipCovers: false });

      // Cover extraction removed - using media:// protocol for on-demand loading

      // Extract lyrics
      let lyricsStr = '';
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

      if (!lyricsStr && parsed.native) {
        for (const tagType in parsed.native) {
          const tags = parsed.native[tagType];
          for (const tag of tags) {
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

      const metadata = {
        path: filePath,
        cover: null,  // Covers loaded via media:// protocol
        lyrics: lyricsStr
      };

      updatedFiles.push(metadata);

      // Send incremental update event
      event.sender.send('metadata-fetch-progress', {
        file: metadata,
        current: i + 1,
        total: filePaths.length
      });
    } catch (e) {
      console.error(`Error fetching metadata for ${filePath}`, e);
    }
  }

  return updatedFiles;
});

// Legacy: Background cover fetcher (kept for compatibility)
ipcMain.handle('fetch-covers-background', async (event, filePaths) => {
  // Just call the new metadata fetcher
  return await ipcMain.handle('fetch-metadata-background', event, filePaths);
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
