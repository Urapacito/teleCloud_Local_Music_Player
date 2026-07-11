# Telecloud

Telecloud is a feature-rich, Electron-based desktop application designed for seamless music streaming and library management. Built with a modern React and Vite frontend, it integrates high-fidelity playback capabilities, Tidal API support, and Telegram integration.

## Project Overview

The core goal of Telecloud is to provide a unified listening experience by combining multiple audio sources:
- **Tidal Integration**: Native support for browsing and streaming from Tidal, including personalized playlists, albums, and artists.
- **Advanced Media Playback**: Utilizes `mpv` and `ffmpeg` under the hood to ensure robust audio decoding, enabling advanced features like EQ settings, audio spectrum visualization, and signal path monitoring.
- **Telegram Connectivity**: Integrates with Telegram to stream or manage media directly from your chats.

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

3. **Environment Setup**
   Ensure you have a `.env` file in the root directory configured with your necessary API keys (e.g., for Telegram or Tidal development if required).

4. **Run the Development Server**
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

## License

ISC
