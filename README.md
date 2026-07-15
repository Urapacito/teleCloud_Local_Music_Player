# TeleCloud

> **Audiophile-grade music player with cloud storage integration**

TeleCloud is a modern desktop music player that combines high-fidelity audio playback with seamless cloud integration. Built for music enthusiasts who demand exceptional sound quality and convenient access to their music library from anywhere.

---

## What is TeleCloud?

TeleCloud is an Electron-based music player that brings together:
- **Hi-Fi Audio Playback** - Bit-perfect output for audiophiles
- **Cloud Storage Integration** - Access your music via Telegram (coming soon)
- **Streaming Services** - Native Tidal integration (Still working on this but basic version works)
- **Modern Interface** - Beautiful, intuitive design with light/dark themes

Whether you're a casual listener or an audiophile with a collection of high-resolution FLAC files, TeleCloud provides the tools you need for the ultimate listening experience.

---

## Key Features

### Audiophile-Grade Playback
- **Bit-Perfect Audio** - WASAPI exclusive mode for unmodified output
- **High-Resolution Support** - 24/96, 24/192, 32/384, DSD64/128/256
- **31-Band Parametric EQ** - Professional equalizer with room correction
- **Gapless Playback** - Seamless transitions between tracks
- **ReplayGain** - Automatic volume normalization

### Extensive Format Support
- Lossless: FLAC, ALAC, WAV, AIFF, APE, DSD (DSF/DFF)
- Lossy: MP3, AAC, Opus, Vorbis
- And more...

### Beautiful Interface
- **Modern Design** - Clean, intuitive layout
- **Dark & Light Themes** - Seamless theme switching
- **Album Art Display** - Large cover art with synchronized lyrics
- **Smart Navigation** - Browse by songs, albums, artists, or playlists
- **Advanced Search** - Find tracks instantly across your entire library

### Music Management
- **Local Library** - Organize your music files with automatic metadata extraction
- **Playlists** - Create and manage unlimited playlists
- **Favorites** - Quick access to your most-loved tracks
- **Recent Played** - Never lose track of what you've been listening to
- **Smart Sorting** - Sort by title, artist, album, duration, or format

### Streaming Integration
- **Tidal** - Browse and stream from Tidal's catalog (HiFi quality)
- **Tidal Search** - Search across millions of tracks
- **Tidal Playlists** - Access your Tidal playlists and favorites

### Advanced Audio Tools
- **Spectrum Analyzer** - Real-time frequency visualization
- **Signal Path Display** - See exactly how your audio is being processed
- **Auto-EQ** - Automated room correction with target curve matching
- **Device Selection** - Switch between multiple audio outputs
- **Sample Rate Limiting** - Cap quality for device compatibility

### Power User Features
- **Keyboard Shortcuts** - Fully customizable shortcuts for all functions
- **Queue Management** - Full control over playback queue
- **File Watcher** - Automatic library updates when files change
- **Multiple Folders** - Scan and manage music from multiple locations
- **Download to Library** - Save cloud tracks locally

---

## Coming Soon

I'm constantly improving TeleCloud. Here's what's on the roadmap:

### Telegram Personal Cloud Storage
- **Store Music in Telegram** - Upload your music library to Telegram chats/channels
- **Stream from Telegram** - Access your music from anywhere without local storage
- **Automatic Sync** - Keep your cloud library in sync with local files
- **Private Channels** - Use your own private Telegram channels as storage
- **Bandwidth Efficient** - Smart caching and progressive loading

### Additional Features
- **Last.fm Scrobbling** - Track your listening history
- **Cross-Platform Support** - Linux and macOS versions
- **Mobile Companion App** - Control playback from your phone
- **Audio Effects** - Additional DSP effects and filters

---

## Installation

### For Users (Recommended)

**Windows Installer** - Coming Soon!

Once I complete testing and stabilize the core features, TeleCloud will be available as a simple Windows installer (.exe):

1. **Download** the installer from the [Releases](https://github.com/your-username/telecloud/releases) page
2. **Run** the installer - it will automatically include MPV and all dependencies
3. **Launch** TeleCloud from your desktop or Start menu
4. **Login** with your Telegram account
5. **Add your music library** and start listening!

**Note:** Currently in development. For now, please use the developer installation method below.

### For Developers (Build from Source)

If you want to contribute or try the latest features:

1. **Prerequisites:**
   - [Node.js](https://nodejs.org/) v16 or higher
   - [Git](https://git-scm.com/)
   - [MPV](https://mpv.io/installation/) - Download and place `mpv.exe` and `mpv.com` in the project root

2. **Clone and install:**
   ```bash
   git clone https://github.com/your-username/telecloud.git
   cd telecloud
   npm install
   ```

3. **Run in development mode:**
   ```bash
   npm run dev
   ```

### First-Time Setup

1. **Settings** → **Add Music Folder** - Select your music directory
2. **Wait for scan** - TeleCloud will index your music files
3. **Configure Audio** - Select your preferred audio device in Settings
4. **Optional: Login to Tidal** - For streaming integration

---

## Keyboard Shortcuts

| Action | Default Shortcut |
|--------|-----------------|
| Play/Pause | `Space` |
| Next Track | `→` |
| Previous Track | `←` |
| Volume Up | `↑` |
| Volume Down | `↓` |
| Seek Forward | `Ctrl + →` |
| Seek Backward | `Ctrl + ←` |
| Toggle Mute | `M` |

*All shortcuts are customizable in Settings*

---

## Technology Stack

TeleCloud is built with modern, proven technologies:

- **Electron** - Cross-platform desktop framework
- **React** - Modern UI library
- **Vite** - Lightning-fast build tool
- **MPV** - Professional audio engine
- **Telegram API** - Cloud integration
- **Tidal API** - Streaming integration

---

## For Developers

Want to contribute or understand the codebase better?

**[Technical Documentation & Developer Guide](src/README.md)**

The technical README includes:
- Detailed project structure
- Architecture overview
- API documentation
- Build instructions
- Contribution guidelines



## License

ISC License - See LICENSE file for details

---

## Support

- **Issues & Bug Reports**: [GitHub Issues](#)
- **Feature Requests**: [GitHub Discussions](#)
- **Documentation**: [Wiki](#)

---

## Acknowledgments

TeleCloud is built on the shoulders of giants:
- [MPV](https://mpv.io/) - The best media player
- [Electron](https://www.electronjs.org/) - Desktop framework
- [React](https://react.dev/) - UI library
- [Tidal](https://tidal.com/) - Music streaming service

---

## Disclaimer

**Solo Developer Project**: TeleCloud is developed and maintained by a single developer. While I'm committed to improving and maintaining this project, updates may come at a slower pace than larger team projects. I appreciate your patience and understanding, and I'll do my best to keep TeleCloud stable, feature-rich, and up-to-date.

If you encounter any bugs or have feature requests, please feel free to open an issue. Contributions from the community are always welcome!

---

**Made with care for music lovers and audiophiles**
