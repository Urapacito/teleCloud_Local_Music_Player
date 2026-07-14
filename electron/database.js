const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');
const fs = require('fs');

let db = null;

/**
 * Initialize the SQLite database for music library caching
 * @returns {Database} The database instance
 */
function initDatabase() {
    if (db) return db;

    // Create database in user data directory
    const dbPath = path.join(app.getPath('userData'), 'music-library.db');
    console.log(`[Database] Initializing at: ${dbPath}`);

    db = new Database(dbPath);

    // Enable WAL mode for better concurrent performance
    db.pragma('journal_mode = WAL');

    // Create schema
    createSchema();

    console.log('[Database] Initialized successfully');
    return db;
}

/**
 * Create database schema with tables and indexes
 */
function createSchema() {
    const schema = `
    CREATE TABLE IF NOT EXISTS music_files (
      path TEXT PRIMARY KEY,
      mtime INTEGER NOT NULL,
      size INTEGER NOT NULL,
      title TEXT,
      artist TEXT,
      album TEXT,
      year INTEGER,
      genre TEXT,
      track_number INTEGER,
      disc_number INTEGER,
      duration REAL,
      bitrate INTEGER,
      sample_rate INTEGER,
      bit_depth INTEGER,
      lyrics TEXT,
      cover TEXT,
      has_cover INTEGER DEFAULT 0,
      cover_hash TEXT,
      last_scanned INTEGER,
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    );

    CREATE INDEX IF NOT EXISTS idx_artist ON music_files(artist);
    CREATE INDEX IF NOT EXISTS idx_album ON music_files(album);
    CREATE INDEX IF NOT EXISTS idx_mtime ON music_files(mtime);
    CREATE INDEX IF NOT EXISTS idx_has_cover ON music_files(has_cover);
  `;

    db.exec(schema);

    // Migration: Add missing columns to existing databases
    try {
        db.exec('ALTER TABLE music_files ADD COLUMN bit_depth INTEGER');
    } catch (e) {
        // Column already exists, ignore
    }
    try {
        db.exec('ALTER TABLE music_files ADD COLUMN cover TEXT');
    } catch (e) {
        // Column already exists, ignore
    }
}

/**
 * Get cached metadata for a specific file
 * @param {string} filePath - Absolute path to the file
 * @returns {Object|null} Cached file metadata or null if not found
 */
function getFileByPath(filePath) {
    if (!db) initDatabase();

    const stmt = db.prepare('SELECT * FROM music_files WHERE path = ?');
    return stmt.get(filePath);
}

/**
 * Insert or update file metadata in cache
 * @param {Object} fileData - File metadata object
 * @returns {void}
 */
function insertOrUpdateFile(fileData) {
    if (!db) initDatabase();

    const stmt = db.prepare(`
    INSERT INTO music_files (
      path, mtime, size, title, artist, album, year, genre,
      track_number, disc_number, duration, bitrate, sample_rate, bit_depth,
      lyrics, cover, has_cover, cover_hash, last_scanned
    ) VALUES (
      @path, @mtime, @size, @title, @artist, @album, @year, @genre,
      @trackNumber, @discNumber, @duration, @bitrate, @sampleRate, @bitDepth,
      @lyrics, @cover, @hasCover, @coverHash, @lastScanned
    )
    ON CONFLICT(path) DO UPDATE SET
      mtime = @mtime,
      size = @size,
      title = @title,
      artist = @artist,
      album = @album,
      year = @year,
      genre = @genre,
      track_number = @trackNumber,
      disc_number = @discNumber,
      duration = @duration,
      bitrate = @bitrate,
      sample_rate = @sampleRate,
      bit_depth = @bitDepth,
      lyrics = @lyrics,
      cover = @cover,
      has_cover = @hasCover,
      cover_hash = @coverHash,
      last_scanned = @lastScanned
  `);

    stmt.run({
        path: fileData.path,
        mtime: fileData.mtime || 0,
        size: fileData.size || 0,
        title: fileData.title || null,
        artist: fileData.artist || null,
        album: fileData.album || null,
        year: fileData.year || null,
        genre: fileData.genre || null,
        trackNumber: fileData.trackNumber || null,
        discNumber: fileData.discNumber || null,
        duration: fileData.duration || null,
        bitrate: fileData.bitrate || null,
        sampleRate: fileData.sampleRate || null,
        bitDepth: fileData.bitDepth || null,
        lyrics: fileData.lyrics || null,
        cover: fileData.cover || null,
        hasCover: fileData.hasCover ? 1 : 0,
        coverHash: fileData.coverHash || null,
        lastScanned: Date.now()
    });
}

/**
 * Insert multiple files in a transaction (much faster)
 * @param {Array} filesData - Array of file metadata objects
 * @returns {void}
 */
function insertOrUpdateFilesBatch(filesData) {
    if (!db) initDatabase();
    if (!filesData || filesData.length === 0) return;

    const stmt = db.prepare(`
    INSERT INTO music_files (
      path, mtime, size, title, artist, album, year, genre,
      track_number, disc_number, duration, bitrate, sample_rate,
      lyrics, has_cover, cover_hash, last_scanned
    ) VALUES (
      @path, @mtime, @size, @title, @artist, @album, @year, @genre,
      @trackNumber, @discNumber, @duration, @bitrate, @sampleRate,
      @lyrics, @hasCover, @coverHash, @lastScanned
    )
    ON CONFLICT(path) DO UPDATE SET
      mtime = @mtime,
      size = @size,
      title = @title,
      artist = @artist,
      album = @album,
      year = @year,
      genre = @genre,
      track_number = @trackNumber,
      disc_number = @discNumber,
      duration = @duration,
      bitrate = @bitrate,
      sample_rate = @sampleRate,
      lyrics = @lyrics,
      has_cover = @hasCover,
      cover_hash = @coverHash,
      last_scanned = @lastScanned
  `);

    const insertMany = db.transaction((files) => {
        for (const fileData of files) {
            stmt.run({
                path: fileData.path,
                mtime: fileData.mtime || 0,
                size: fileData.size || 0,
                title: fileData.title || null,
                artist: fileData.artist || null,
                album: fileData.album || null,
                year: fileData.year || null,
                genre: fileData.genre || null,
                trackNumber: fileData.trackNumber || null,
                discNumber: fileData.discNumber || null,
                duration: fileData.duration || null,
                bitrate: fileData.bitrate || null,
                sampleRate: fileData.sampleRate || null,
                lyrics: fileData.lyrics || null,
                hasCover: fileData.hasCover ? 1 : 0,
                coverHash: fileData.coverHash || null,
                lastScanned: Date.now()
            });
        }
    });

    insertMany(filesData);
}

/**
 * Delete a file from cache
 * @param {string} filePath - Absolute path to the file
 * @returns {void}
 */
function deleteFile(filePath) {
    if (!db) initDatabase();

    const stmt = db.prepare('DELETE FROM music_files WHERE path = ?');
    stmt.run(filePath);
}

/**
 * Delete multiple files in a transaction
 * @param {Array<string>} filePaths - Array of file paths to delete
 * @returns {void}
 */
function deleteFilesBatch(filePaths) {
    if (!db) initDatabase();
    if (!filePaths || filePaths.length === 0) return;

    const stmt = db.prepare('DELETE FROM music_files WHERE path = ?');

    const deleteMany = db.transaction((paths) => {
        for (const path of paths) {
            stmt.run(path);
        }
    });

    deleteMany(filePaths);
}

/**
 * Get all cached files
 * @returns {Array<Object>} Array of all cached file metadata
 */
function getAllFiles() {
    if (!db) initDatabase();

    const stmt = db.prepare('SELECT * FROM music_files');
    return stmt.all();
}

/**
 * Get files that need updating based on mtime comparison
 * @param {Array<Object>} currentFiles - Array of {path, mtime, size} from disk
 * @returns {Object} { needsUpdate: Array, cached: Array, deleted: Array }
 */
function getFilesNeedingUpdate(currentFiles) {
    if (!db) initDatabase();

    const needsUpdate = [];
    const cached = [];
    const diskPaths = new Set();

    // Build a map of current files on disk
    const diskMap = {};
    for (const file of currentFiles) {
        diskMap[file.path] = file;
        diskPaths.add(file.path);
    }

    // Get all cached files
    const cachedFiles = getAllFiles();
    const cachedPaths = new Set(cachedFiles.map(f => f.path));

    // Check each file on disk
    for (const file of currentFiles) {
        const cachedFile = cachedFiles.find(cf => cf.path === file.path);

        if (!cachedFile) {
            // New file - needs parsing
            needsUpdate.push(file);
        } else if (cachedFile.mtime !== file.mtime) {
            // File modified - needs re-parsing
            needsUpdate.push(file);
        } else {
            // File unchanged - use cached data
            cached.push(cachedFile);
        }
    }

    // Find deleted files (in cache but not on disk)
    const deleted = cachedFiles
        .filter(cf => !diskPaths.has(cf.path))
        .map(cf => cf.path);

    return { needsUpdate, cached, deleted };
}

/**
 * Clear all data from database (for debugging)
 * @returns {void}
 */
function clearDatabase() {
    if (!db) initDatabase();

    db.prepare('DELETE FROM music_files').run();
    console.log('[Database] All data cleared');
}

/**
 * Get database statistics
 * @returns {Object} Database statistics
 */
function getStats() {
    if (!db) initDatabase();

    const totalFiles = db.prepare('SELECT COUNT(*) as count FROM music_files').get().count;
    const filesWithCovers = db.prepare('SELECT COUNT(*) as count FROM music_files WHERE has_cover = 1').get().count;
    const filesWithLyrics = db.prepare('SELECT COUNT(*) as count FROM music_files WHERE lyrics IS NOT NULL AND lyrics != ""').get().count;

    return {
        totalFiles,
        filesWithCovers,
        filesWithLyrics
    };
}

/**
 * Close database connection
 */
function closeDatabase() {
    if (db) {
        db.close();
        db = null;
        console.log('[Database] Connection closed');
    }
}

module.exports = {
    initDatabase,
    getFileByPath,
    insertOrUpdateFile,
    insertOrUpdateFilesBatch,
    deleteFile,
    deleteFilesBatch,
    getAllFiles,
    getFilesNeedingUpdate,
    clearDatabase,
    getStats,
    closeDatabase
};
