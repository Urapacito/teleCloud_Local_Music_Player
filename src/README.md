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
- **Telegram Music Bot** - Stream music directly from Telegram chats and channels (not done core yet, will update after done others)
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

### Technical Features
- **Electron + React** - Native desktop application with modern web technologies
- **Vite Build System** - Fast development with hot module replacement
- **IPC Communication** - Secure main/renderer process communication
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
- **`telegram`**: Client for interacting with the Telegram API.

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
