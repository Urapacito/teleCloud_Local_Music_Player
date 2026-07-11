import React, { useState, useEffect, useRef } from 'react';
// import * as tidalPlayer from '@tidal-music/player'; // No longer using the web player SDK
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './components/Login';
import SongList from './components/SongList';
import PlayerBar from './components/PlayerBar';
import Homepage from './components/Homepage';
import FavoritesView from './components/FavoritesView';
import RecentView from './components/RecentView';
import PlaylistsView from './components/PlaylistsView';
import ArtistsView from './components/ArtistsView';
import AlbumsView from './components/AlbumsView';
import SpectrumModal from './components/SpectrumModal';
import LyricsView from './components/LyricsView';
import RightPanel from './components/RightPanel';
import SearchView from './components/SearchView';
import SettingsView from './components/SettingsView';
import EqSettingsView from './components/EqSettingsView';
import TidalLogin from './components/TidalLogin';
import TidalView from './components/TidalView';
import { STANDARD_FREQUENCIES, DEFAULT_Q, buildFfmpegEqString } from './utils/autoEqMath';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const handleTrackEndedRef = useRef(null); // Stable ref to handleTrackEnded to avoid stale closures
  const tidalPlayerEventsRef = useRef(null);
  const [musicFiles, setMusicFiles] = useState([]);
  const [playQueue, setPlayQueue] = useState([]);
  const [currentFile, setCurrentFile] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('-1');
  const [volume, setVolume] = useState(100);

  const [loopMode, setLoopMode] = useState('none'); // 'none', 'all', 'one'
  const [isShuffle, setIsShuffle] = useState(false);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [downloadToasts, setDownloadToasts] = useState([]);
  const [currentView, setCurrentView] = useState('home');

  const [favorites, setFavorites] = useState([]);
  const [recentPlayed, setRecentPlayed] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [disabledDevices, setDisabledDevices] = useState([]);

  const [currentFolderPath, setCurrentFolderPath] = useState(localStorage.getItem('musicFolderPath') || '');

  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [playlistModalData, setPlaylistModalData] = useState(null);
  const [spectrumFile, setSpectrumFile] = useState(null);
  const [showLyrics, setShowLyrics] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [theme, setTheme] = useState('dark');
  const [tidalSession, setTidalSession] = useState(null);
  // const [isTidalPlayerReady, setIsTidalPlayerReady] = useState(false); // No longer needed

  // EQ State
  const [eqEnabled, setEqEnabled] = useState(false);
  const [currentEqBands, setCurrentEqBands] = useState(
    STANDARD_FREQUENCIES.map(f => ({ freq: f, q: DEFAULT_Q, gain: 0, type: 'Peak' }))
  );

  // EQ Persistence State
  const [eqMeasurement, setEqMeasurement] = useState(null);
  const [eqTarget, setEqTarget] = useState(null);
  const [eqMeasurementName, setEqMeasurementName] = useState('Measurement');
  const [eqTargetName, setEqTargetName] = useState('Target');
  const [eqHistory, setEqHistory] = useState([]);
  const [eqMinFreq, setEqMinFreq] = useState(20);
  const [eqMaxFreq, setEqMaxFreq] = useState(10000);
  const [eqMaxGain, setEqMaxGain] = useState(12);
  const [eqMaxQ, setEqMaxQ] = useState(2.0);
  const [eqNormalizeMode, setEqNormalizeMode] = useState('dB');
  const [eqNormalizeDbValue, setEqNormalizeDbValue] = useState(70);
  const [eqNormalizeHzValue, setEqNormalizeHzValue] = useState(500);
  const [eqSmoothFactor, setEqSmoothFactor] = useState(5);
  const [eqPreamp, setEqPreamp] = useState(0);

  // Set EQ in IPC whenever it changes (with debounce to prevent mpv lag)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const filterString = eqEnabled ? buildFfmpegEqString(currentEqBands, eqPreamp) : '';
      window.ipcRenderer.invoke('set-eq', filterString);
    }, 250); // 250ms debounce
    return () => clearTimeout(timeoutId);
  }, [eqEnabled, currentEqBands]);

  // Expose global function to open EQ
  useEffect(() => {
    window.openEqSettings = () => {
      setCurrentView('settings');
      // Wait a tick for SettingsView to render, but it doesn't support active tab routing easily, so we just set currentView to 'eq-settings'
      setCurrentView('eq-settings');
    };
    return () => { delete window.openEqSettings; };
  }, []);

  const showToast = (msg, type = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => { setToastMessage(''); setToastType('success'); }, 3000);
  };

  useEffect(() => {
    const ipcRenderer = window.ipcRenderer;
    ipcRenderer.invoke('telegram-check-auth').then(isAuth => {
      if (isAuth) {
        setIsAuthenticated(true);
      }
      setIsCheckingAuth(false);
    });

    // Restore Tidal session if available
    ipcRenderer.invoke('tidal:restoreSession').then(res => {
      if (res.success && res.session) {
        setTidalSession(res.session);
      }
    });

    // The Tidal Web Player SDK has been removed. MPV will be used for all playback.
  }, []);

  // The time ticker is now fully event-driven by the 'time-pos' event from player.js
  // The polling useEffect hook has been removed.

  // Removed all Tidal Web Player SDK event listeners.
  // Playback state is now managed universally by the MPV backend via IPC events.

  useEffect(() => {
    if (isAuthenticated) {
      const ipcRenderer = window.ipcRenderer;
      ipcRenderer.invoke('get-audio-devices').then(devs => setDevices(devs));

      // Listen for time position updates from the MPV player
      ipcRenderer.on('time-pos', (event, position) => {
        setCurrentTime(position);
      });

      ipcRenderer.invoke('load-library').then(savedFiles => {
        if (savedFiles && savedFiles.length > 0) {
          setMusicFiles(savedFiles);
        }
      });
      ipcRenderer.invoke('load-store', 'favorites').then(data => setFavorites(data || []));
      ipcRenderer.invoke('load-store', 'recent').then(data => setRecentPlayed(data || []));
      ipcRenderer.invoke('load-store', 'playlists').then(data => setPlaylists(data || []));
      ipcRenderer.invoke('load-store', 'settings').then(settings => {
        if (settings && settings.disabledDevices) {
          setDisabledDevices(settings.disabledDevices);
        }
      });

      ipcRenderer.on('track-ended', () => {
        handleTrackEndedRef.current?.();
      });

      return () => {
        ipcRenderer.removeAllListeners('track-ended');
        ipcRenderer.removeAllListeners('time-pos');
      };
    }
  }, [isAuthenticated, currentFile, musicFiles, loopMode, isShuffle]);

  const handleAddFolder = async () => {
    try {
      const ipcRenderer = window.ipcRenderer;
      const folderPath = await ipcRenderer.invoke('select-music-folder');
      if (folderPath) {
        showToast("Indexing songs from folder...");
        localStorage.setItem('musicFolderPath', folderPath);
        setCurrentFolderPath(folderPath);
        const files = await ipcRenderer.invoke('scan-local-music', folderPath);
        if (files && files.length > 0) {
          setMusicFiles(files);
          await ipcRenderer.invoke('save-library', files);
          showToast(`Done indexing! Found ${files.length} songs.`);
        } else {
          showToast("No music files found in folder.");
        }
      }
    } catch (err) {
      console.error(err);
      showToast("Error adding folder.");
    }
  };

  const handleRefreshFolder = async () => {
    let folder = currentFolderPath;
    if (!folder && musicFiles.length > 0) {
      const ipcRenderer = window.ipcRenderer;
      folder = await ipcRenderer.invoke('get-dirname', musicFiles[0].path);
      setCurrentFolderPath(folder);
      localStorage.setItem('musicFolderPath', folder);
    }

    if (folder) {
      try {
        showToast("Refreshing folder...");
        const ipcRenderer = window.ipcRenderer;
        const files = await ipcRenderer.invoke('scan-local-music', folder);
        if (files && files.length > 0) {
          setMusicFiles(files);
          await ipcRenderer.invoke('save-library', files);
          showToast("Done refreshing!");
        } else {
          showToast("Refresh complete, but no files found.");
        }
      } catch (err) {
        console.error(err);
        showToast("Error refreshing folder.");
      }
    } else {
      showToast("No folder added yet.");
    }
  };

  const handleToggleFavorite = (file) => {
    let newFavs;
    if (favorites.some(f => f.path === file.path)) {
      newFavs = favorites.filter(f => f.path !== file.path);
      showToast('Removed from favorites');
    } else {
      newFavs = [...favorites, file];
      showToast('Added to favorites');
    }
    setFavorites(newFavs);
    window.ipcRenderer.invoke('save-store', 'favorites', newFavs);
  };

  const handleAddPlaylist = (file) => {
    if (playlists.length === 0) {
      showToast("Please create a playlist first in the Playlists tab.");
      return;
    }
    setPlaylistModalData(file);
  };

  const confirmAddPlaylist = (playlistId, file) => {
    const target = playlists.find(p => p.id === playlistId);
    if (target && !target.songs.some(s => s.path === file.path)) {
      const newPlaylists = playlists.map(p => {
        if (p.id === target.id) {
          return { ...p, songs: [...p.songs, file] };
        }
        return p;
      });
      setPlaylists(newPlaylists);
      window.ipcRenderer.invoke('save-store', 'playlists', newPlaylists);
      showToast(`Added to playlist: ${target.name}`);
    } else {
      showToast("Song is already in the playlist.");
    }
    setPlaylistModalData(null);
  };

  const playMusic = async (file, index, contextList = null) => {
    try {
      // FIX: If playing a Tidal track without a specific context list,
      // default to a queue of just that single song, NOT the entire local music library.
      // The contextList should be passed from the component that calls playMusic.
      const listToPlay = contextList || (file.source === 'tidal' ? [file] : musicFiles);
      const ipcRenderer = window.ipcRenderer;
      let filePath = file.path;

      if (file.source === 'tidal') {
        // --- TIDAL: Get stream URL and play with MPV ---
        showToast('Fetching Tidal stream...', 'info');
        const trackId = file.tidalId || (file.id_links && file.id_links.tidal) || file.path.split('/').pop();
        const result = await ipcRenderer.invoke('tidal:getStreamUrl', { trackId });

        if (!result.success || !result.data?.url) {
          showToast(`Could not get Tidal stream: ${result.error || 'Unknown error'}`, 'error');
          return;
        }
        showToast('Playing Tidal stream...', 'success');
        filePath = result.data.url; // Use the direct stream URL
      }

      // --- Play with MPV (works for local files and URLs) ---
      await ipcRenderer.invoke('play-audio', { filePath, deviceId: selectedDevice });

      // Volume for exclusive vs software
      if (selectedDevice !== '-1') {
        ipcRenderer.invoke('set-volume', 100);
      } else {
        ipcRenderer.invoke('set-volume', volume);
      }

      setCurrentFile(file);
      setPlayQueue(listToPlay);
      setCurrentIndex(index);
      setIsPlaying(true);
      setCurrentTime(0);

      const newRecent = [file, ...recentPlayed.filter(f => f.path !== file.path)].slice(0, 50);
      setRecentPlayed(newRecent);
      ipcRenderer.invoke('save-store', 'recent', newRecent);
    } catch (err) {
      console.error(err);
    }
  };

  const handleTogglePlay = async () => {
    if (!currentFile) return;
    // MPV handles both Tidal streams and local files universally
    const ipcRenderer = window.ipcRenderer;
    if (isPlaying) {
      await ipcRenderer.invoke('pause-audio', true);
    } else {
      await ipcRenderer.invoke('pause-audio', false);
    }
    setIsPlaying(prev => !prev);
  };

  const handleNext = () => {
    if (playQueue.length === 0) return;
    let nextIdx = currentIndex + 1;

    if (isShuffle) {
      nextIdx = Math.floor(Math.random() * playQueue.length);
    } else if (nextIdx >= playQueue.length) {
      if (loopMode === 'all') nextIdx = 0;
      else {
        setIsPlaying(false);
        return; // end of list
      }
    }

    playMusic(playQueue[nextIdx], nextIdx, playQueue);
  };

  const handlePrev = () => {
    if (playQueue.length === 0) return;
    let prevIdx = currentIndex - 1;
    if (prevIdx < 0) prevIdx = playQueue.length - 1;
    playMusic(playQueue[prevIdx], prevIdx, playQueue);
  };

  const handleTrackEnded = () => {
    if (loopMode === 'one' && currentFile) {
      playMusic(currentFile, currentIndex, playQueue);
    } else {
      handleNext();
    }
  };
  // Keep ref in sync every render so audio's 'ended' listener always calls latest version
  handleTrackEndedRef.current = handleTrackEnded;

  const handleVolumeChange = (newVol) => {
    if (selectedDevice !== '-1') return; // Locked at 100% in exclusive mode
    setVolume(newVol);
    window.ipcRenderer.invoke('set-volume', newVol); // Works for both via MPV
  };

  const handleToggleLoop = () => {
    if (loopMode === 'none') setLoopMode('all');
    else if (loopMode === 'all') setLoopMode('one');
    else setLoopMode('none');
  };

  const handleDeviceChange = async (deviceId) => {
    setSelectedDevice(deviceId);
    try {
      await window.ipcRenderer.invoke('set-audio-device', deviceId);
    } catch (err) {
      console.error("Error setting audio device on the fly:", err);
    }
  };

  const handleSeek = (timePos) => {
    setCurrentTime(timePos);
    window.ipcRenderer.invoke('seek-audio', timePos); // Works for both via MPV
  };

  const handleDeleteSong = async (file, skipConfirm = false) => {
    if (skipConfirm || window.confirm(`Are you sure you want to delete "${file.metadata?.title || file.name}" from your local library and Telecloud? This cannot be undone.`)) {
      const ipcRenderer = window.ipcRenderer;
      const success = await ipcRenderer.invoke('delete-song', file);
      if (success) {
        setMusicFiles(prev => prev.filter(f => f.path !== file.path));
        // Remove from playlists/favorites if needed, or rely on next refresh
      }
    }
  };

  const handleDeleteAlbum = async (album) => {
    if (window.confirm(`Are you sure you want to delete the entire album "${album.name}"? This will delete all its songs from your library and Telecloud.`)) {
      const songsToDelete = [...album.songs]; // copy array
      for (const song of songsToDelete) {
        await handleDeleteSong(song, true);
      }
      setSelectedAlbum(null);
    }
  };

  const handleDownloadSong = async (file) => {
    const ipcRenderer = window.ipcRenderer;
    const settings = await ipcRenderer.invoke('load-store', 'settings');
    if (!settings || !settings.downloadFolder) {
      alert('Please set a default Download Location in Settings first.');
      setCurrentView('settings');
      return;
    }
    const toastId = Date.now() + Math.random();
    setDownloadToasts(prev => [...prev, { id: toastId, name: file.metadata?.title || file.name, progress: 0 }]);

    // Simulate download progress since local copy is instant
    for (let i = 1; i <= 10; i++) {
      await new Promise(r => setTimeout(r, 100));
      setDownloadToasts(prev => prev.map(t => t.id === toastId ? { ...t, progress: i * 10 } : t));
    }

    await ipcRenderer.invoke('download-song', file, settings.downloadFolder);

    setTimeout(() => {
      setDownloadToasts(prev => prev.filter(t => t.id !== toastId));
    }, 3000); // Hide after 3 seconds
  };

  const handleTidalLoginSuccess = (session) => {
    setTidalSession(session);
    showToast('Successfully logged in to Tidal!');
    // No need to provide credentials to the web player anymore
  };

  const handleTidalLogout = () => {
    setTidalSession(null);
    showToast('Logged out from Tidal');
  };

  if (isCheckingAuth) {
    return <div style={{ display: 'flex', height: '100vh', backgroundColor: 'var(--bg-main)', color: 'white', alignItems: 'center', justifyContent: 'center' }}>Checking authentication...</div>;
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  const filteredMusicFiles = musicFiles.filter(file => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (file.metadata?.title?.toLowerCase().includes(q) || file.metadata?.artist?.toLowerCase().includes(q));
  });

  const handleClearQueue = () => {
    setPlayQueue(playQueue.slice(0, currentIndex + 1));
    showToast("Queue cleared.");
  };

  const handleRemoveFromQueue = (indexOffset) => {
    const targetIndex = currentIndex + 1 + indexOffset;
    const newQueue = [...playQueue];
    newQueue.splice(targetIndex, 1);
    setPlayQueue(newQueue);
  };

  const handleSaveQueueAsPlaylist = () => {
    const queueFiles = playQueue.slice(currentIndex + 1);
    if (queueFiles.length === 0) {
      showToast("Queue is empty.");
      return;
    }
    const newPlaylist = { id: Date.now().toString(), name: `Queue Playlist`, songs: queueFiles };
    const newPlaylists = [...playlists, newPlaylist];
    setPlaylists(newPlaylists);
    window.ipcRenderer.invoke('save-store', 'playlists', newPlaylists);
    showToast(`Saved as Queue Playlist`);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', fontFamily: 'Inter, sans-serif', overflow: 'hidden', transition: 'background-color 0.3s, color 0.3s' }} data-theme={theme}>
      <style>
        {`
          :root {
            --bg-main: #121216;
            --bg-secondary: #1b1b22;
            --bg-tertiary: #1e1e24;
            --bg-hover: #2a2a35;
            --bg-card: #22222b;
            --text-main: #ffffff;
            --text-secondary: #cccccc;
            --text-muted: #888888;
            --accent-red: #e63946;
          }
          [data-theme="light"] {
            --bg-main: #ffffff;
            --bg-secondary: #f4f6f8;
            --bg-tertiary: #e9ecef;
            --bg-hover: #dee2e6;
            --bg-card: #e9ecef;
            --text-main: #212529;
            --text-secondary: #495057;
            --text-muted: #6c757d;
            --accent-red: #e63946;
          }
          body {
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: var(--bg-main);
            color: var(--text-main);
            overflow: hidden;
          }
          ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          ::-webkit-scrollbar-track {
            background: var(--bg-tertiary);
          }
          ::-webkit-scrollbar-thumb {
            background: var(--accent-red);
            border-radius: 4px;
          }
          ::-webkit-scrollbar-corner {
            background: var(--bg-tertiary);
          }
        `}
      </style>
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        currentView={currentView}
        onNavClick={(view) => {
          setCurrentView(view);
          setSearchQuery('');
        }}
        theme={theme}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', marginLeft: isSidebarCollapsed ? '80px' : '250px', paddingTop: '80px', paddingBottom: '100px', transition: 'margin-left 0.3s ease' }}>
        <Header searchQuery={searchQuery} onSearchChange={setSearchQuery} onAddFolder={handleAddFolder} onRefreshFolder={handleRefreshFolder} hasFolder={true} />

        {searchQuery ? (
          <SearchView
            searchQuery={searchQuery}
            musicFiles={musicFiles}
            playlists={playlists}
            recentPlayed={recentPlayed}
            onPlay={playMusic}
            onNavClick={setCurrentView}
            setSelectedAlbum={setSelectedAlbum}
            setSearchQuery={setSearchQuery}
          />
        ) : currentView === 'settings' ? (
          <SettingsView currentView={currentView} theme={theme} setTheme={setTheme} setDisabledDevices={setDisabledDevices} />
        ) : currentView === 'eq-settings' ? (
          <EqSettingsView
            onBack={() => setCurrentView('settings')}
            currentEqBands={currentEqBands}
            setCurrentEqBands={setCurrentEqBands}
            eqEnabled={eqEnabled}
            setEqEnabled={setEqEnabled}
            measurement={eqMeasurement} setMeasurement={setEqMeasurement}
            target={eqTarget} setTarget={setEqTarget}
            measurementName={eqMeasurementName} setMeasurementName={setEqMeasurementName}
            targetName={eqTargetName} setTargetName={setEqTargetName}
            history={eqHistory} setHistory={setEqHistory}
            minFreq={eqMinFreq} setMinFreq={setEqMinFreq}
            maxFreq={eqMaxFreq} setMaxFreq={setEqMaxFreq}
            maxGain={eqMaxGain} setMaxGain={setEqMaxGain}
            maxQ={eqMaxQ} setMaxQ={setEqMaxQ}
            normalizeMode={eqNormalizeMode} setNormalizeMode={setEqNormalizeMode}
            normalizeDbValue={eqNormalizeDbValue} setNormalizeDbValue={setEqNormalizeDbValue}
            normalizeHzValue={eqNormalizeHzValue} setNormalizeHzValue={setEqNormalizeHzValue}
            smoothFactor={eqSmoothFactor} setSmoothFactor={setEqSmoothFactor}
            preamp={eqPreamp} setPreamp={setEqPreamp}
            theme={theme}
          />
        ) : currentView === 'home' ? (
          <Homepage
            musicFiles={musicFiles}
            recentPlayed={recentPlayed}
            onPlay={playMusic}
            onNavClick={setCurrentView}
            setSelectedAlbum={setSelectedAlbum}
          />
        ) : currentView === 'favorites' ? (
          <FavoritesView favorites={favorites} currentFile={currentFile} onPlay={playMusic} onToggleFavorite={handleToggleFavorite} onAddPlaylist={handleAddPlaylist} onDeleteSong={handleDeleteSong} onDownloadSong={handleDownloadSong} />
        ) : currentView === 'recent' ? (
          <RecentView recentPlayed={recentPlayed} currentFile={currentFile} onPlay={playMusic} onToggleFavorite={handleToggleFavorite} onAddPlaylist={handleAddPlaylist} favorites={favorites} onDeleteSong={handleDeleteSong} onDownloadSong={handleDownloadSong} />
        ) : currentView === 'playlists' ? (
          <PlaylistsView playlists={playlists} setPlaylists={setPlaylists} onSavePlaylists={data => window.ipcRenderer.invoke('save-store', 'playlists', data)} currentFile={currentFile} onPlay={playMusic} onToggleFavorite={handleToggleFavorite} favorites={favorites} onDeleteSong={handleDeleteSong} onDownloadSong={handleDownloadSong} />
        ) : currentView === 'artists' ? (
          <ArtistsView musicFiles={musicFiles} currentFile={currentFile} onPlay={playMusic} onToggleFavorite={handleToggleFavorite} onAddPlaylist={handleAddPlaylist} favorites={favorites} onCheckSpectrum={setSpectrumFile} onDeleteSong={handleDeleteSong} onDownloadSong={handleDownloadSong} />
        ) : currentView === 'tidal' ? (
          tidalSession ? (
            <TidalView session={tidalSession} onLogout={handleTidalLogout} onPlay={playMusic} />
          ) : (
            <TidalLogin onLoginSuccess={handleTidalLoginSuccess} />
          )
        ) : currentView === 'albums' ? (
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
              <AlbumsView
                musicFiles={musicFiles}
                currentFile={currentFile}
                onPlay={playMusic}
                onToggleFavorite={handleToggleFavorite}
                onAddPlaylist={handleAddPlaylist}
                favorites={favorites}
                onCheckSpectrum={setSpectrumFile}
                selectedAlbum={selectedAlbum}
                setSelectedAlbum={setSelectedAlbum}
                onDeleteSong={handleDeleteSong}
                onDeleteAlbum={handleDeleteAlbum}
                onDownloadSong={handleDownloadSong}
              />
            </div>
            <RightPanel currentFile={currentFile} showLyrics={showLyrics} setShowLyrics={setShowLyrics} currentTime={currentTime} />
          </div>
        ) : (
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '0 20px', paddingTop: '20px' }}>
            {/* Left half: Song List */}
            <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
              <SongList
                musicFiles={filteredMusicFiles}
                currentFile={currentFile}
                onPlay={playMusic}
                onToggleFavorite={handleToggleFavorite}
                onAddPlaylist={handleAddPlaylist}
                onDeleteSong={handleDeleteSong}
                onDownloadSong={handleDownloadSong}
                favorites={favorites}
                onCheckSpectrum={setSpectrumFile}
                title="Your Music"
                showSort={true}
              />
            </div>

            {/* Right half: Large Cover */}
            <RightPanel currentFile={currentFile} showLyrics={showLyrics} setShowLyrics={setShowLyrics} currentTime={currentTime} />
          </div>
        )}
      </div>

      <PlayerBar
        currentFile={currentFile}
        isPlaying={isPlaying}
        currentTime={currentTime}
        onSeek={handleSeek}
        onTogglePlay={handleTogglePlay}
        onNext={handleNext}
        onPrev={handlePrev}
        volume={volume}
        onVolumeChange={handleVolumeChange}
        devices={devices.filter(d => !disabledDevices.includes(d.deviceId || d.id))}
        selectedDevice={selectedDevice}
        onDeviceChange={handleDeviceChange}
        loopMode={loopMode}
        onToggleLoop={handleToggleLoop}
        isShuffle={isShuffle}
        onToggleShuffle={() => setIsShuffle(!isShuffle)}
        onToggleQueue={() => setIsQueueOpen(!isQueueOpen)}
        onToggleFavorite={handleToggleFavorite}
        onAddPlaylist={handleAddPlaylist}
        isFavorite={currentFile ? favorites.some(f => f.path === currentFile.path) : false}
        isQueueOpen={isQueueOpen}
        queueFiles={playQueue.slice(currentIndex + 1)}
        onClearQueue={handleClearQueue}
        onRemoveFromQueue={handleRemoveFromQueue}
        onSaveQueueAsPlaylist={handleSaveQueueAsPlaylist}
        theme={theme}
        eqEnabled={eqEnabled}
        setEqEnabled={setEqEnabled}
      />

      {/* Modern Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed', bottom: '130px', left: '50%', transform: 'translateX(-50%)',
          background: toastType === 'error' ? 'linear-gradient(to right, var(--accent-red), #c1121f)' : 'linear-gradient(to right, #4caf50, #388e3c)', color: 'white', padding: '10px 20px',
          borderRadius: '20px', boxShadow: `0 5px 15px ${toastType === 'error' ? 'rgba(230,57,70,0.4)' : 'rgba(76,175,80,0.4)'}`, zIndex: 1000000,
          fontWeight: 'bold', fontSize: '14px', animation: 'fadeIn 0.3s ease-out'
        }}>
          {toastMessage}
        </div>
      )}

      {/* Playlist Selection Modal */}
      {playlistModalData && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000000
        }}>
          <div style={{
            background: 'var(--bg-secondary)', borderRadius: '15px', padding: '20px', width: '300px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
          }}>
            <h3 style={{ margin: '0 0 15px 0', textAlign: 'center' }}>Add to Playlist</h3>
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {playlists.map(p => (
                <div
                  key={p.id}
                  onClick={() => confirmAddPlaylist(p.id, playlistModalData)}
                  style={{
                    padding: '10px 15px', background: 'var(--bg-hover)', marginBottom: '8px', borderRadius: '8px',
                    cursor: 'pointer', transition: 'background 0.2s', textAlign: 'center'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseOut={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                >
                  {p.name}
                </div>
              ))}
            </div>
            <button
              onClick={() => setPlaylistModalData(null)}
              style={{
                width: '100%', padding: '10px', marginTop: '10px', background: 'transparent',
                border: '1px solid var(--accent-red)', color: 'var(--accent-red)', borderRadius: '8px', cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Spectrum Modal */}
      {spectrumFile && (
        <SpectrumModal file={spectrumFile} onClose={() => setSpectrumFile(null)} />
      )}

      {/* Download Toasts Container */}
      <div style={{ position: 'fixed', bottom: '120px', right: '30px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {downloadToasts.map(toast => (
          <div key={toast.id} style={{ background: 'var(--bg-secondary)', padding: '15px 20px', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', border: '1px solid var(--bg-hover)', width: '300px', animation: 'slideIn 0.3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '13px' }}>
              <span style={{ fontWeight: 'bold', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, paddingRight: '10px' }}>
                {toast.progress === 100 ? '✅ Download Complete' : '⤓ Downloading...'}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>{toast.progress}%</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {toast.name}
            </div>
            <div style={{ width: '100%', height: '4px', background: 'var(--bg-tertiary)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: toast.progress === 100 ? '#4caf50' : 'var(--accent-red)', width: `${toast.progress}%`, transition: 'width 0.2s, background 0.3s' }}></div>
            </div>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default App;
