# TeleCloud - Technical Documentation

> **📚 Developer & Technical Reference**

This is the technical documentation for TeleCloud. If you're looking for general information about the project, features, and installation instructions, please see the [main README](../README.md).

---

## Overview

Telecloud is a feature-rich, Electron-based desktop application designed for seamless music streaming and library management. Built with a modern React and Vite frontend, it integrates high-fidelity playback capabilities, Tidal API support, and Telegram integration.

## Project Overview

Telecloud is an audiophile-grade desktop music player that combines high-fidelity playback with modern streaming integration. Built on Electron and React, it leverages MPV for bit-perfect audio output while providing a sleek, feature-rich user interface.

## Features

### Core Playback
- **MPV Integration** - Professional-grade audio engine with bit-perfect output
- **Local File Playback** - Supports FLAC, ALAC, WAV, AIFF, APE, MP3, AAC, Opus, Vorbis, DSD (DSF/DFF)
- **Telegram Integration** - Full cloud storage and streaming via Telegram channels (✅ COMPLETE)
- **Queue Management** - Full queue control with add, remove, and reorder capabilities
- **Playback Controls** - Play, pause, seek, volume control with IPC communication

### Audio Quality
- **Bit-Perfect Playback** - WASAPI support for unmodified audio output
- **High-Resolution Audio** - Native support for 24/96, 24/192, 32/384, DSD64/128/256
- **31-Band Parametric EQ** - Professional-grade equalizer with customizable frequencies
- **Auto-EQ (Room Correction)** - Automated EQ calculation with target curve matching
- **Real-Time Spectrum Analyzer** - FFT-based frequency analysis with visualization
- **Signal Path Visualization** - Transparent display of audio processing chain
- **Automatic Sample Rate Switching** - Seamless adaptation to source material
- **Gapless Playback** - Uninterrupted transitions between tracks
- **ReplayGain Support** - Track and album normalization modes
- **Crossfade** - Configurable crossfade duration between tracks
- **Audio Device Selection** - Support for multiple output devices with WASAPI exclusive mode
- **Sample Rate Limiting** - Cap bit depth and sample rate for device compatibility

### User Interface
- **Dark/Light Theme** - Seamless theme switching with CSS variables
- **Modern Navigation** - Intuitive sidebar with view management
- **Advanced Search** - Filter across local library and Telegram sources
- **Playlist Management** - Create, edit, and organize playlists
- **Album/Artist Views** - Dedicated browsing interfaces
- **Lyrics Display** - Synchronized lyrics when available
- **Cover Art** - Embedded artwork extraction and display
- **Keyboard Shortcuts** - Fully customizable shortcuts for all playback functions
- **Custom Dropdowns** - Theme-adaptive UI components

### Streaming Integration
- **Tidal Browse** - OAuth integration for browsing Tidal's catalog
- **Tidal Metadata** - Access to playlists, albums, tracks, and artist information
- **Tidal Search** - Full-text search across Tidal's library

### TeleCloud Sync Features
- **Upload to Telegram** - Batch upload local files to private Telegram channels
- **Cloud Playback** - Download-then-play model with temporary file management
- **Library Restore** - Restore entire library from Telegram with placeholder paths
- **Complete Metadata Extraction** - Cover art, lyrics, and technical specs from cloud files
- **Smart Caching** - Database-backed cache_path tracking for instant subsequent playback
- **Hybrid Storage** - Files can exist locally, in cloud, or both (storage_type field)
- **Intelligent File Management** - Cloud-only deletion, temp file cleanup, React key props for UI updates

### Technical Features
- **Electron + React** - Native desktop application with modern web technologies
- **Vite Build System** - Fast development with hot module replacement
- **IPC Communication** - Secure main/renderer process communication
- **SQLite Database** - Local database for metadata caching and cloud sync tracking
- **Settings Persistence** - All configurations saved locally
- **Error Handling** - Comprehensive logging and error recovery

## Project Structure

The codebase is organized into a standard Electron + Vite project structure:

- **`/src/`**: Contains the React frontend code.
  - **`/src/components/`**: Houses all UI components, including:
    - Player controls (`PlayerBar.jsx`, `SongList.jsx`)
    - Tidal specific views (`TidalAlbums.jsx`, `TidalLogin.jsx`, `TidalView.jsx`, etc.)
    - Visualizers and audio tools (`EqSettingsView.jsx`, `SpectrumModal.jsx`, `SignalPathModal.jsx`)
    - Navigation and layout (`Sidebar.jsx`, `Header.jsx`, `RightPanel.jsx`)
  - **`/src/utils/`**: Helper functions and shared logic.
- **`/electron/`**: Contains the Electron main process code (`main.js`) that manages the application lifecycle, native windows, and IPC communication with the frontend.
- **`/dist/` & `/release/`**: Generated build output directories.

## Core Modules

- **React + Vite Frontend**: Ensures a snappy, responsive UI with fast hot-module replacement during development.
- **Electron**: Wraps the web app in a native desktop shell, providing access to local file systems and system-level APIs.
- **`mpv` & `fluent-ffmpeg`**: The backbone of the audio engine, handling playback of various formats and providing data for visualizers.
- **`tidalapi-ts`**: Typescript client used for authenticating and fetching data from Tidal.
- **`telegram` (GramJS)**: Client for interacting with the Telegram API, used for TeleCloud Sync features.
- **`music-metadata`**: Metadata extraction library for audio files (tags, cover art, lyrics, technical specs).
- **`better-sqlite3`**: High-performance SQLite database for metadata caching and cloud sync tracking.

## TeleCloud Sync - Technical Implementation

### Architecture Overview

TeleCloud Sync implements a **download-then-play** model with intelligent caching:

1. **Upload Phase**: Local files uploaded to private Telegram channels
2. **Cloud Storage**: Files stored in Telegram with message_id tracking
3. **Download Phase**: Files download to %TEMP% on first play
4. **Metadata Extraction**: Complete metadata extracted after download
5. **Caching**: Database tracks cache_path for instant subsequent access
6. **Cleanup**: Temp files deleted on app close, metadata persists

### Streaming Philosophy: Why Download-Then-Play?

**TeleCloud does NOT use traditional streaming.** Instead, we download files to %TEMP% before playback. Here's why:

**Security & Privacy:**
- **No External Servers**: All data flows directly between your device and Telegram
- **No Middleman**: We never route your music through third-party streaming servers
- **Zero Tracking**: No analytics, no user behavior monitoring
- **End-to-End**: Your Telegram session is yours - we don't have access to your account

**Audio Quality:**
- **Bit-Perfect Playback**: Can't achieve with real-time streaming buffering
- **No Transcoding**: Files played exactly as stored (FLAC/ALAC remain lossless)
- **No Compression**: Streaming typically requires on-the-fly compression
- **Gapless Transitions**: Only possible with complete file access

**Technical Benefits:**
- **Metadata Extraction**: Requires full file access (cover art, lyrics, tags)
- **MPV Integration**: MPV player needs seekable local files
- **Instant Replay**: Cached files = instant subsequent playback
- **Offline After First Play**: File stays in cache until app closes

**Performance:**
- First play: Download time (~30s for 30MB FLAC)
- Subsequent plays: Instant (0s load time)
- Better than streaming for repeated listening

**Cache Management:**
```
Current: Temp files deleted based on windows cleanup (or you can clear it yourself)
Coming Soon: Thinking of apply clear cache whens close app (cached data from cloud saved to path) and maybe manual clear in settings as well.
```

**Why Not Real Streaming?**
- Would require proxy server → privacy concerns
- Can't maintain bit-perfect audio quality
- Telegram's chunked download is optimized for whole files
- More complex = more failure points

**The Bottom Line:**
Download-then-play gives you the security of local files with the convenience of cloud storage, without compromising audio quality or your privacy.

### Key Implementation Files

- **`electron/telegramSync.js`** - Upload, restore, and channel management
- **`electron/telegram.js`** - Telegram client initialization and auth
- **`electron/database.js`** - SQLite database with cloud metadata tracking
- **`electron/music.js`** - Metadata extraction (extract-and-cache-metadata handler)
- **`electron/main.js`** - media:// protocol with cache_path resolution
- **`src/App.jsx`** - Cloud playback logic in playMusic function
- **`src/components/TeleCloudSyncSettings.jsx`** - UI for sync management
- **`src/components/SongList.jsx`** - React key prop for cover art updates

### Database Schema

Cloud-related fields in the `music_files` table:

```sql
storage_type TEXT DEFAULT 'local',           -- 'local', 'cloud', 'both'
telegram_message_id INTEGER,                 -- Message ID in Telegram channel
telegram_channel_id TEXT,                    -- Channel/chat ID
cache_path TEXT,                             -- Path to temp file in %TEMP%
cloud_checksum TEXT,                         -- MD5 checksum for verification
last_synced_at INTEGER                       -- Unix timestamp of last sync
```

### Download-Then-Play Data Flow

```
1. User clicks play on cloud file
   └─> src/App.jsx: playMusic() detects storage_type='cloud'

2. Check if already downloaded
   └─> Query database for cache_path
   └─> If cache_path exists and file present → Play immediately
   └─> If not → Proceed to download

3. Download from Telegram
   └─> electron/telegram.js: downloadFile(message_id)
   └─> Save to: %TEMP%/telecloud_[timestamp]_[filename]
   └─> Return temp file path

4. Extract metadata
   └─> electron/music.js: extract-and-cache-metadata IPC handler
   └─> Parse file with music-metadata library
   └─> Extract: bitrate, sample rate, bit depth, duration, lyrics
   └─> Update database with cache_path and complete metadata

5. Play file
   └─> electron/player.js: Play temp file via MPV
   └─> Cover art accessible via media:// protocol

6. Update UI
   └─> Update React state with new metadata and cache_path
   └─> React key prop forces image reload: key={file.path + file.cache_path}
```

### Metadata Extraction Process

When a cloud file is first played, `extract-and-cache-metadata` extracts:

**Technical Metadata:**
- Bitrate (kbps)
- Sample Rate (Hz)
- Bit Depth (bits per sample)
- Duration (seconds)

**Tags:**
- Title, Artist, Album
- Year, Genre, Track/Disc numbers

**Embedded Content:**
- **Cover Art**: Not extracted to database, accessed via media:// protocol
- **Lyrics**: Extracted from LYRICS, UNSYNCEDLYRICS, UNSYNCED LYRICS, USLT tags

**Implementation:**
```javascript
// electron/music.js - extract-and-cache-metadata handler
const parsed = await mm.parseFile(tempFilePath, { duration: true, skipCovers: false });

// Extract lyrics
let lyricsStr = '';
if (parsed.common.lyrics && parsed.common.lyrics.length > 0) {
  // Handle LYRICS tag
}
if (!lyricsStr && parsed.native) {
  // Fallback to UNSYNCEDLYRICS, USLT, etc.
}

// Store in database
database.insertOrUpdateFile({ /* metadata */ });
database.updateCloudMetadata(originalPath, { cache_path: tempFilePath });
```

### Cover Art Strategy (media:// Protocol)

Instead of storing covers in the database, TeleCloud uses a custom protocol:

**Protocol Handler** (`electron/main.js`):
```javascript
protocol.handle('media', async (request) => {
  const songPath = decodeURIComponent(request.url.slice('media://'.length));
  
  // Smart path resolution
  const dbFile = database.getFileByPath(songPath);
  if (dbFile?.cache_path && fs.existsSync(dbFile.cache_path)) {
    actualFilePath = dbFile.cache_path; // Use temp file
  } else {
    actualFilePath = songPath; // Use original path
  }
  
  // Extract and return cover
  const parsed = await mm.parseFile(actualFilePath);
  return new Response(parsed.common.picture[0].data);
});
```

**Benefits:**
- No database bloat from large cover images
- On-demand extraction only when needed
- Works for both local and cloud files
- Automatic fallback to cache_path for cloud files

### File Management Strategy

**Cloud-Only Files:**
- Path: Placeholder like `restored/Artist - Album/Track.flac`
- Disk: File doesn't exist locally (storage_type='cloud')
- Deletion: Remove from database only, skip disk deletion

**Temp Files:**
- Location: `%TEMP%/telecloud_[timestamp]_[filename]`
- Lifetime: Deleted on app close via cleanup routine
- Metadata: Persists in database even after temp deletion

**Hybrid Files:**
- storage_type='both': File exists locally AND in cloud
- Deletion: Remove from disk, update storage_type to 'cloud'

**React UI Updates:**
```javascript
// Force image reload when cache_path changes
<img
  key={file.path + (file.cache_path || '')}
  src={`media://${encodeURIComponent(file.path)}`}
/>
```

When cache_path changes from `null` → temp path, the key changes, forcing React to remount the img element and reload the cover.

### Error Handling

**Download Failures:**
- Telegram API errors logged and displayed to user
- Entity resolution for channels/messages
- Retry mechanism for network failures

**Metadata Extraction Failures:**
- Graceful degradation to minimal metadata
- Errors logged but don't block playback
- Cover art 404s silenced for expected cloud file cases

**Database Consistency:**
- Transactions for batch operations
- Foreign key constraints for data integrity
- Automatic cleanup of orphaned records

### Performance Optimizations

1. **Database Indexing**: Indexes on path, telegram_message_id for fast lookups
2. **Batch Operations**: insertOrUpdateFilesBatch for bulk updates
3. **Incremental UI Updates**: React state updates only for affected files
4. **Lazy Loading**: Cover art extracted only when visible
5. **Temp File Reuse**: cache_path checked before re-downloading

### Security Considerations

- Telegram session stored encrypted via credentialManager
- API credentials in .env file (not committed)
- Temp files isolated per session with unique timestamps
- No sensitive data in file paths or database plaintext

---

## Setup and Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- Git
- **mpv Media Player** (Required for audio playback and WASAPI support)

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/telecloud.git
   cd telecloud
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up mpv binaries (Windows)**
   For the audio engine (and WASAPI bit-perfect playback) to function, you need to place the `mpv` executable files in the root folder of this project:
   - Download the latest Windows 64-bit build of `mpv` (e.g., from the [mpv.io installation page](https://mpv.io/installation/)).
   - Extract the archive and copy `mpv.exe` and `mpv.com` directly into the root `telecloud` folder.

4. **Environment Setup**
   Ensure you have a `.env` file in the root directory configured with your necessary API keys (e.g., for Telegram or Tidal development if required).

5. **Run the Development Server**
   Start both the Vite development server and the Electron app simultaneously:
   ```bash
   npm run dev
   ```

## Building for Production

To package the application for distribution:

```bash
npm run build
```
This will compile the frontend and use `electron-builder` to create an executable file in the build/release directory.

---

## Building Windows Installer

### Prerequisites for Building

Before creating the distribution package, ensure you have:
- Completed the developer installation steps above
- MPV binaries (`mpv.exe` and `mpv.com`) in the project root directory
- All dependencies installed (`npm install`)

### Step 1: Configure electron-builder

Add the following configuration to your `package.json` file (if not already present):

```json
{
  "build": {
    "appId": "com.telecloud.app",
    "productName": "TeleCloud",
    "directories": {
      "output": "dist"
    },
    "files": [
      "dist-electron/**/*",
      "dist/**/*",
      "electron/**/*",
      "node_modules/**/*",
      "package.json",
      "mpv.exe",
      "mpv.com"
    ],
    "extraResources": [
      {
        "from": "mpv.exe",
        "to": "mpv.exe"
      },
      {
        "from": "mpv.com",
        "to": "mpv.com"
      }
    ],
    "win": {
      "target": [
        {
          "target": "nsis",
          "arch": ["x64"]
        }
      ],
      "icon": "public/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true,
      "shortcutName": "TeleCloud"
    }
  }
}
```

### Step 2: Build the Application

Run the build command:

```bash
npm run build
```

This will:
1. Build the React frontend with Vite
2. Package the Electron app with electron-builder
3. Create a Windows installer in the `dist` folder

### Step 3: Locate the Installer

After building, you'll find the installer at:
- **Installer**: `dist/TeleCloud Setup x.x.x.exe` (NSIS installer)
- **Unpacked**: `dist/win-unpacked/` (portable version)

### Distribution Notes

**What gets included:**
- TeleCloud application
- MPV player (bundled)
- All Node.js dependencies
- Electron runtime

**Installer features:**
- Custom installation directory selection
- Desktop and Start Menu shortcuts
- Automatic uninstaller
- Windows registry integration

**File size:** Expect the installer to be ~200-300MB due to:
- Electron runtime (~150MB)
- Node modules with native bindings
- MPV player (~30MB)
- Application code and assets

### Troubleshooting Build Issues

**Issue: MPV files not found**
- Solution: Ensure `mpv.exe` and `mpv.com` are in the project root

**Issue: Native modules fail**
- Solution: Run `npm run rebuild` or `electron-rebuild` before building

**Issue: Build fails on Windows**
- Solution: Install Windows Build Tools: `npm install --global windows-build-tools`

**Issue: Installer too large**
- Solution: Review included files, exclude dev dependencies in production

### Testing the Installer

Before distributing:
1. Install on a clean Windows machine (no Node.js/dev tools)
2. Test all features: playback, Telegram login, Tidal integration
3. Verify MPV integration works correctly
4. Check file associations and shortcuts
5. Test uninstaller

---

## License

ISC
