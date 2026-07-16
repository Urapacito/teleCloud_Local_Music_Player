import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  const toastTimeoutRef = useRef(null); // Ref to store toast timeout ID
  const isScanningRef = useRef(false); // Ref to prevent concurrent scans
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
  const [musicFolderList, setMusicFolderList] = useState([]);

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

  // Keyboard shortcuts state
  const [keyboardShortcuts, setKeyboardShortcuts] = useState({
    playPause: 'Space',
    next: 'ArrowRight',
    previous: 'ArrowLeft',
    volumeUp: 'ArrowUp',
    volumeDown: 'ArrowDown',
    seekForward: 'Ctrl+ArrowRight',
    seekBackward: 'Ctrl+ArrowLeft',
    toggleMute: 'M'
  });
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(100);
  const [eqMaxQ, setEqMaxQ] = useState(2.0);
  const [eqNormalizeMode, setEqNormalizeMode] = useState('dB');
  const [eqNormalizeDbValue, setEqNormalizeDbValue] = useState(70);
  const [eqNormalizeHzValue, setEqNormalizeHzValue] = useState(500);
  const [eqSmoothFactor, setEqSmoothFactor] = useState(5);
  const [eqPreamp, setEqPreamp] = useState(0);

  // Scan progress state
  const [scanProgress, setScanProgress] = useState(null); // { type: 'scanning'|'refreshing', status: 'inProgress'|'done', message: string }

  // 🛡️ Ref to track previous folder list and prevent unnecessary watcher restarts
  const previousFoldersRef = useRef(null);

  // 🛡️ Ref to track current file for event listeners (avoids re-registering on every track change)
  const currentFileRef = useRef(currentFile);

  // Keep currentFileRef in sync with currentFile
  useEffect(() => {
    currentFileRef.current = currentFile;
  }, [currentFile]);

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

  // Load keyboard shortcuts from settings
  useEffect(() => {
    const loadShortcuts = async () => {
      const settings = await window.ipcRenderer.invoke('load-store', 'settings');
      if (settings && settings.keyboardShortcuts) {
        setKeyboardShortcuts(settings.keyboardShortcuts);
      }
    };
    loadShortcuts();
  }, []);

  // File System Watcher - Start watching when folders are set
  useEffect(() => {
    // 🛡️ VALUE COMPARISON: Check if folder list actually changed (not just reference)
    const foldersChanged = !previousFoldersRef.current ||
      previousFoldersRef.current.length !== musicFolderList.length ||
      previousFoldersRef.current.some((path, i) => path !== musicFolderList[i]);

    if (!foldersChanged) {
      console.log('[App] Folder list unchanged (same values), skipping watcher restart');
      return; // Skip if folders haven't changed
    }

    // Update ref to track current folders
    previousFoldersRef.current = musicFolderList;

    const startWatcher = async () => {
      if (musicFolderList && musicFolderList.length > 0) {
        try {
          console.log('[App] Folder list changed, starting watcher for:', musicFolderList);
          await window.ipcRenderer.invoke('start-watching', musicFolderList);
        } catch (err) {
          console.error('[App] Error starting file watcher:', err);
        }
      }
    };
    startWatcher();

    // Cleanup: stop watcher when component unmounts
    return () => {
      window.ipcRenderer.invoke('stop-watching');
    };
  }, [musicFolderList]);

  // Listen for real-time library updates from file watcher
  // 🛡️ OPTIMIZATION: Register listener only once (not on every track change)
  useEffect(() => {
    const handleLibraryUpdate = (event, update) => {
      if (update.type === 'add') {
        setMusicFiles(prev => [...prev, update.file]);
        showToast(`New song added: ${update.file.metadata?.title || update.file.name}`, 'info');
      } else if (update.type === 'update') {
        setMusicFiles(prev => prev.map(f =>
          f.path === update.file.path ? update.file : f
        ));
      } else if (update.type === 'delete') {
        setMusicFiles(prev => prev.filter(f => f.path !== update.path));

        // If deleted file was playing, stop playback (use ref to avoid stale closure)
        const current = currentFileRef.current;
        if (current && current.path === update.path) {
          window.ipcRenderer.invoke('stop-playback');
          setIsPlaying(false);
          setCurrentFile(null);
        }

        showToast('Song removed from library', 'info');
      }
    };

    window.ipcRenderer.on('library-updated', handleLibraryUpdate);

    return () => {
      window.ipcRenderer.removeAllListeners('library-updated');
    };
  }, []); // Empty array - register only once, use ref for currentFile

  // Global keyboard event listener (must be before any conditional returns)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger shortcuts if user is typing in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return;
      }

      // Build the current key combination
      const keys = [];
      if (e.ctrlKey) keys.push('Ctrl');
      if (e.shiftKey) keys.push('Shift');
      if (e.altKey) keys.push('Alt');
      let keyName = e.key === ' ' ? 'Space' : e.key;
      // Normalize single letter keys to uppercase for case-insensitive comparison
      if (keyName.length === 1 && /[a-zA-Z]/.test(keyName)) {
        keyName = keyName.toUpperCase();
      }
      if (!['Control', 'Shift', 'Alt'].includes(e.key)) {
        keys.push(keyName);
      }
      const combination = keys.join('+');

      // Only process shortcuts if authenticated and have a current file for some actions
      if (combination === keyboardShortcuts.playPause && currentFile) {
        e.preventDefault();
        const ipcRenderer = window.ipcRenderer;
        if (isPlaying) {
          ipcRenderer.invoke('pause-audio', true);
        } else {
          ipcRenderer.invoke('pause-audio', false);
        }
        setIsPlaying(prev => !prev);
      } else if (combination === keyboardShortcuts.next && playQueue.length > 0) {
        e.preventDefault();
        let nextIdx = currentIndex + 1;
        if (isShuffle) {
          nextIdx = Math.floor(Math.random() * playQueue.length);
        } else if (nextIdx >= playQueue.length) {
          if (loopMode === 'all') nextIdx = 0;
          else return;
        }
        // Can't call handleNext here, so inline the logic
        const file = playQueue[nextIdx];
        if (file) {
          const ipcRenderer = window.ipcRenderer;
          ipcRenderer.invoke('play-audio', { filePath: file.path, deviceId: selectedDevice });
          setCurrentFile(file);
          setCurrentIndex(nextIdx);
          setIsPlaying(true);
        }
      } else if (combination === keyboardShortcuts.previous && playQueue.length > 0) {
        e.preventDefault();
        let prevIdx = currentIndex - 1;
        if (prevIdx < 0) prevIdx = playQueue.length - 1;
        const file = playQueue[prevIdx];
        if (file) {
          const ipcRenderer = window.ipcRenderer;
          ipcRenderer.invoke('play-audio', { filePath: file.path, deviceId: selectedDevice });
          setCurrentFile(file);
          setCurrentIndex(prevIdx);
          setIsPlaying(true);
        }
      } else if (combination === keyboardShortcuts.volumeUp && selectedDevice === '-1') {
        e.preventDefault();
        const newVol = Math.min(100, volume + 5);
        setVolume(newVol);
        window.ipcRenderer.invoke('set-volume', newVol);
      } else if (combination === keyboardShortcuts.volumeDown && selectedDevice === '-1') {
        e.preventDefault();
        const newVol = Math.max(0, volume - 5);
        setVolume(newVol);
        window.ipcRenderer.invoke('set-volume', newVol);
      } else if (combination === keyboardShortcuts.seekForward && currentFile) {
        e.preventDefault();
        const newTime = currentTime + 5;
        setCurrentTime(newTime);
        window.ipcRenderer.invoke('seek-audio', newTime);
      } else if (combination === keyboardShortcuts.seekBackward && currentFile) {
        e.preventDefault();
        const newTime = Math.max(0, currentTime - 5);
        setCurrentTime(newTime);
        window.ipcRenderer.invoke('seek-audio', newTime);
      } else if (combination === keyboardShortcuts.toggleMute && selectedDevice === '-1') {
        e.preventDefault();
        if (volume > 0) {
          setPreviousVolume(volume);
          setVolume(0);
          window.ipcRenderer.invoke('set-volume', 0);
          setIsMuted(true);
        } else {
          setVolume(previousVolume);
          window.ipcRenderer.invoke('set-volume', previousVolume);
          setIsMuted(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [keyboardShortcuts, volume, currentTime, currentFile, isPlaying, playQueue, currentIndex, isShuffle, loopMode, selectedDevice, isMuted, previousVolume]);

  const showToast = (msg, type = 'success') => {
    // Clear any existing toast timeout
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    setToastMessage(msg);
    setToastType(type);

    // Set new timeout and store its ID
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage('');
      setToastType('success');
      toastTimeoutRef.current = null;
    }, 3000);
  };

  useEffect(() => {
    // Skip Telegram auth check - app now works without mandatory Telegram login
    // TeleCloud Sync is now optional via Settings
    setIsAuthenticated(true);
    setIsCheckingAuth(false);

    const ipcRenderer = window.ipcRenderer;
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

  // 🛡️ OPTIMIZATION: Load settings only once on authentication (not on every render)
  useEffect(() => {
    if (!isAuthenticated) return;

    const ipcRenderer = window.ipcRenderer;
    ipcRenderer.invoke('load-store', 'settings').then(settings => {
      if (settings?.disabledDevices) {
        setDisabledDevices(settings.disabledDevices);
      }
      if (settings?.musicFolderList) {
        setMusicFolderList(settings.musicFolderList);
      }
    });
  }, [isAuthenticated]); // Only run when authentication changes

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
      ipcRenderer.invoke('load-store', 'recent').then(data => {
        // Filter recent played to only include files that still exist in library
        const recent = data || [];
        setRecentPlayed(recent);
      });
      ipcRenderer.invoke('load-store', 'playlists').then(data => setPlaylists(data || []));

      ipcRenderer.on('track-ended', () => {
        handleTrackEndedRef.current?.();
      });

      // Listen for scan progress events
      ipcRenderer.on('scan-progress', (event, progress) => {
        if (progress.stage === 'indexing') {
          setScanProgress({
            type: 'scanning',
            status: 'inProgress',
            message: progress.message || 'Indexing files...'
          });
        } else if (progress.stage === 'parsing') {
          setScanProgress({
            type: 'scanning',
            status: 'inProgress',
            message: progress.message || `Parsing metadata (${progress.current}/${progress.total})...`
          });
        } else if (progress.stage === 'complete') {
          setScanProgress({
            type: 'scanning',
            status: 'done',
            message: progress.message || 'Scan complete!'
          });
          setTimeout(() => setScanProgress(null), 3000);
        }
      });

      // Listen for incremental metadata fetch progress
      const metadataUpdates = new Map();
      let saveTimeout = null;

      ipcRenderer.on('metadata-fetch-progress', (event, data) => {
        const { file, current, total } = data;

        // Update UI immediately
        setMusicFiles(prevFiles => {
          return prevFiles.map(f => {
            if (f.path === file.path) {
              return {
                ...f,
                cover: file.cover || f.cover,
                metadata: {
                  ...f.metadata,
                  lyrics: file.lyrics || f.metadata?.lyrics || ''
                }
              };
            }
            return f;
          });
        });

        // Store update in memory
        metadataUpdates.set(file.path, file);

        // Debounce disk writes - only save every 2 seconds or when complete
        if (saveTimeout) clearTimeout(saveTimeout);

        if (current === total) {
          // Last file - save immediately
          saveBatchedMetadata();
        } else {
          // Batch save after 2 seconds of inactivity
          saveTimeout = setTimeout(saveBatchedMetadata, 2000);
        }
      });

      async function saveBatchedMetadata() {
        if (metadataUpdates.size === 0) return;

        const lib = await ipcRenderer.invoke('load-library');
        const updatedLib = lib.map(libFile => {
          const update = metadataUpdates.get(libFile.path);
          if (update) {
            return {
              ...libFile,
              cover: update.cover || libFile.cover,
              metadata: {
                ...libFile.metadata,
                lyrics: update.lyrics || libFile.metadata?.lyrics || ''
              }
            };
          }
          return libFile;
        });

        await ipcRenderer.invoke('save-library', updatedLib);
        metadataUpdates.clear();
      }

      return () => {
        ipcRenderer.removeAllListeners('track-ended');
        ipcRenderer.removeAllListeners('time-pos');
        ipcRenderer.removeAllListeners('scan-progress');
        ipcRenderer.removeAllListeners('metadata-fetch-progress');
      };
    }
  }, [isAuthenticated, currentFile, musicFiles, loopMode, isShuffle]);

  // Filter recentPlayed to only include files that exist in current library
  useEffect(() => {
    if (isAuthenticated && musicFiles.length > 0 && recentPlayed.length > 0) {
      const validPaths = new Set(musicFiles.map(f => f.path));
      const filteredRecent = recentPlayed.filter(f => f && f.path && validPaths.has(f.path));

      if (filteredRecent.length !== recentPlayed.length) {
        // Clean up stale/invalid paths from recentPlayed
        setRecentPlayed(filteredRecent);
        window.ipcRenderer.invoke('save-store', 'recent', filteredRecent);
        console.log(`[Recent] Cleaned up ${recentPlayed.length - filteredRecent.length} invalid file(s)`);
      }
    }
  }, [musicFiles.length, recentPlayed.length, isAuthenticated]); // Run when either changes

  // Auto-refresh on app startup (silent background check for new/deleted songs)
  useEffect(() => {
    if (isAuthenticated && musicFolderList.length > 0 && musicFiles.length > 0) {
      // Delay to let the UI load first
      const timer = setTimeout(async () => {
        try {
          const ipcRenderer = window.ipcRenderer;
          const oldCount = musicFiles.length;

          // Silent refresh - check for new/deleted files
          const files = await ipcRenderer.invoke('refresh-library', musicFolderList);

          if (files && files.length !== oldCount) {
            const newCount = files.length;
            setMusicFiles(files);
            await ipcRenderer.invoke('save-library', files);

            // Show a subtle notification only if there were changes
            if (newCount > oldCount) {
              showToast(`Auto-refresh: Added ${newCount - oldCount} new ${(newCount - oldCount) === 1 ? 'song' : 'songs'}!`);
            } else if (newCount < oldCount) {
              const removed = oldCount - newCount;
              showToast(`Auto-refresh: Removed ${removed} missing ${removed === 1 ? 'file' : 'files'}.`);
            }
          }
        } catch (err) {
          console.error('Auto-refresh error:', err);
        }
      }, 2000); // 2 second delay after app loads

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, musicFolderList.length]); // Only run once when authenticated and folders are loaded

  const handleAddFolder = async () => {
    try {
      const ipcRenderer = window.ipcRenderer;
      const folderPath = await ipcRenderer.invoke('select-music-folder');
      if (folderPath) {
        if (musicFolderList.includes(folderPath)) {
          showToast("Folder already in list.");
          return;
        }

        const newList = [...musicFolderList, folderPath];
        setMusicFolderList(newList);

        // Save to settings
        const settings = await ipcRenderer.invoke('load-store', 'settings') || {};
        settings.musicFolderList = newList;
        await ipcRenderer.invoke('save-store', 'settings', settings);

        showToast("Indexing songs from folders...");
        const files = await ipcRenderer.invoke('scan-local-music-cached', newList);
        if (files && files.length > 0) {
          setMusicFiles(files);
          await ipcRenderer.invoke('save-library', files);
          showToast(`Done indexing! Found ${files.length} songs.`);
        } else {
          showToast("No music files found in folders.");
        }
      }
    } catch (err) {
      console.error(err);
      showToast("Error adding folder.");
    }
  };

  const handleRefreshFolder = async (isFullScan = false) => {
    // Prevent concurrent operations
    if (isScanningRef.current) {
      showToast("Operation already in progress, please wait...", 'info');
      return;
    }

    if (musicFolderList.length > 0) {
      try {
        isScanningRef.current = true;
        const oldCount = musicFiles.length; // Capture count BEFORE starting

        const ipcRenderer = window.ipcRenderer;
        let files;

        if (isFullScan) {
          // FULL SCAN: Directory traversal + metadata parsing with database caching
          setScanProgress({ type: 'scanning', status: 'inProgress', message: 'Scanning folders...' });
          files = await ipcRenderer.invoke('scan-local-music-cached', musicFolderList);
        } else {
          // FAST REFRESH: Check for new/deleted files (fast)
          setScanProgress({ type: 'refreshing', status: 'inProgress', message: 'Refreshing library...' });
          files = await ipcRenderer.invoke('refresh-library', musicFolderList);
        }

        if (files && files.length > 0) {
          const newCount = files.length;

          setMusicFiles(files);
          await ipcRenderer.invoke('save-library', files);

          let resultMessage = '';
          if (newCount === oldCount) {
            resultMessage = isFullScan ? "No changes detected." : "All files still present.";
          } else if (newCount > oldCount) {
            resultMessage = `Added ${newCount - oldCount} new ${(newCount - oldCount) === 1 ? 'song' : 'songs'}!`;
          } else {
            const removed = oldCount - newCount;
            resultMessage = `Removed ${removed} missing ${removed === 1 ? 'file' : 'files'}. Library now has ${newCount} ${newCount === 1 ? 'song' : 'songs'}.`;
          }

          // Show completion popup
          setScanProgress({
            type: isFullScan ? 'scanning' : 'refreshing',
            status: 'done',
            message: `${isFullScan ? 'Scan' : 'Refresh'} complete. ${resultMessage}`
          });

          // Hide after 3 seconds
          setTimeout(() => setScanProgress(null), 3000);

          // Background metadata fetching for refresh operation (covers + lyrics) - incremental updates
          if (!isFullScan) {
            // Find files that need metadata (no cover or no lyrics)
            const filesNeedingMetadata = files.filter(f => !f.cover || !f.metadata?.lyrics).map(f => f.path);

            if (filesNeedingMetadata.length > 0) {
              // Fetch metadata in background (don't await - let it run async)
              ipcRenderer.invoke('fetch-metadata-background', filesNeedingMetadata).catch(err => {
                console.error('Background metadata fetch error:', err);
              });
            }
          }
        } else {
          setScanProgress({
            type: isFullScan ? 'scanning' : 'refreshing',
            status: 'done',
            message: `${isFullScan ? 'Scan' : 'Refresh'} complete, but no files found.`
          });
          setTimeout(() => setScanProgress(null), 3000);
        }
      } catch (err) {
        console.error(err);
        setScanProgress({
          type: isFullScan ? 'scanning' : 'refreshing',
          status: 'done',
          message: 'Error during operation.'
        });
        setTimeout(() => setScanProgress(null), 3000);
      } finally {
        isScanningRef.current = false; // Always reset the flag
      }
    } else {
      showToast("No folders added yet.");
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
      let filePath = null; // Don't pre-initialize with file.path - must explicitly set valid path

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
      } else {
        // --- SMART PLAYBACK PRIORITY: Local → Cached → Stream ---
        const storageType = file.storage_type || 'local';

        if (storageType === 'local' || storageType === 'both') {
          // Try local file first using IPC
          const localExists = await ipcRenderer.invoke('check-file-exists', file.path);
          if (localExists) {
            filePath = file.path; // Local file exists
          } else {
            // Local file not found, try cache if available
            if (file.cache_path) {
              const cacheExists = await ipcRenderer.invoke('check-file-exists', file.cache_path);
              if (cacheExists) {
                filePath = file.cache_path;
                showToast('Playing from cache', 'info');
              } else {
                // Cache not found either
                if (file.telegram_message_id) {
                  showToast('Streaming from Telegram...', 'info');
                  const tempPath = await ipcRenderer.invoke('get-temp-path', `telecloud_${Date.now()}.flac`);
                  const downloadResult = await ipcRenderer.invoke('telecloud-sync:download-track', {
                    metadata: file,
                    targetPath: tempPath
                  });
                  if (downloadResult.success) {
                    filePath = tempPath;
                    // Extract metadata and update database
                    const metadataResult = await ipcRenderer.invoke('extract-and-cache-metadata', {
                      tempFilePath: tempPath,
                      originalPath: file.path
                    });
                    if (metadataResult.success) {
                      file.cache_path = metadataResult.cache_path;
                      file.metadata = { ...file.metadata, ...metadataResult.metadata };
                      // Update library state to refresh UI and cover art
                      setMusicFiles(prev => prev.map(f =>
                        f.path === file.path ? { ...f, cache_path: metadataResult.cache_path, metadata: { ...f.metadata, ...metadataResult.metadata } } : f
                      ));
                    }
                  } else {
                    throw new Error('Failed to stream from Telegram');
                  }
                } else {
                  throw new Error('File not found locally, in cache, or on cloud');
                }
              }
            } else if (file.telegram_message_id) {
              // No cache, try streaming
              showToast('Streaming from Telegram...', 'info');
              const tempPath = await ipcRenderer.invoke('get-temp-path', `telecloud_${Date.now()}.flac`);
              const downloadResult = await ipcRenderer.invoke('telecloud-sync:download-track', {
                metadata: file,
                targetPath: tempPath
              });
              if (downloadResult.success) {
                filePath = tempPath;
                // Extract metadata and update database
                const metadataResult = await ipcRenderer.invoke('extract-and-cache-metadata', {
                  tempFilePath: tempPath,
                  originalPath: file.path
                });
                if (metadataResult.success) {
                  file.cache_path = metadataResult.cache_path;
                  file.metadata = { ...file.metadata, ...metadataResult.metadata };
                }
              } else {
                throw new Error('Failed to stream from Telegram');
              }
            }
          }
        } else if (storageType === 'cloud') {
          // Cloud-only file: check cache first, then stream
          if (file.cache_path) {
            const cacheExists = await ipcRenderer.invoke('check-file-exists', file.cache_path);
            if (cacheExists) {
              filePath = file.cache_path;
              showToast('Playing from cache', 'info');
            } else {
              // Download to cache and play
              showToast('Downloading to cache...', 'info');
              const downloadResult = await ipcRenderer.invoke('telecloud-sync:download-track', {
                metadata: file,
                targetPath: file.cache_path
              });
              if (downloadResult.success) {
                filePath = file.cache_path;
              } else {
                throw new Error('Failed to download from Telegram');
              }
            }
          } else {
            // No cache path set, download to temp
            showToast('Streaming from Telegram...', 'info');
            const tempPath = await ipcRenderer.invoke('get-temp-path', `telecloud_${Date.now()}.flac`);
            const downloadResult = await ipcRenderer.invoke('telecloud-sync:download-track', {
              metadata: file,
              targetPath: tempPath
            });
            if (downloadResult.success) {
              filePath = tempPath;
              // Extract metadata and update database
              const metadataResult = await ipcRenderer.invoke('extract-and-cache-metadata', {
                tempFilePath: tempPath,
                originalPath: file.path
              });
              if (metadataResult.success) {
                file.cache_path = metadataResult.cache_path;
                file.metadata = { ...file.metadata, ...metadataResult.metadata };
              }
            } else {
              throw new Error('Failed to stream from Telegram');
            }
          }
        }
      }

      // --- Validate we have a valid path before playing ---
      if (!filePath) {
        throw new Error('Could not determine file path - file not available locally, in cache, or on cloud');
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
      showToast(`Playback error: ${err.message}`, 'error');
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

  const handleToggleMute = () => {
    if (selectedDevice !== '-1') return; // Can't mute in exclusive mode
    if (isMuted) {
      setVolume(previousVolume);
      window.ipcRenderer.invoke('set-volume', previousVolume);
      setIsMuted(false);
    } else {
      setPreviousVolume(volume);
      setVolume(0);
      window.ipcRenderer.invoke('set-volume', 0);
      setIsMuted(true);
    }
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
        // Remove from library
        setMusicFiles(prev => prev.filter(f => f.path !== file.path));

        // Remove from favorites if present
        setFavorites(prev => {
          const updated = prev.filter(f => f.path !== file.path);
          if (updated.length !== prev.length) {
            ipcRenderer.invoke('save-store', 'favorites', updated);
          }
          return updated;
        });

        // Remove from all playlists if present
        setPlaylists(prev => {
          const updated = prev.map(playlist => ({
            ...playlist,
            songs: playlist.songs.filter(s => s.path !== file.path)
          }));
          // Check if any playlist was modified
          if (JSON.stringify(updated) !== JSON.stringify(prev)) {
            ipcRenderer.invoke('save-store', 'playlists', updated);
          }
          return updated;
        });

        showToast('Song deleted successfully', 'success');
      } else {
        showToast('Failed to delete song', 'error');
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
    const storageType = file.storage_type || 'local';

    // --- CONTEXT-AWARE DOWNLOAD BEHAVIOR ---
    if (storageType === 'local') {
      // Local file: Backup to download folder
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
      }, 3000);
    } else if (storageType === 'cloud') {
      // Cloud-only file: Download to cache for offline playback
      if (!file.telegram_message_id) {
        showToast('Cloud file not found', 'error');
        return;
      }

      const cachePath = require('path').join(require('os').tmpdir(), 'telecloud_cache', `${Date.now()}_${require('path').basename(file.path)}`);

      showToast('Downloading to cache...', 'info');
      const result = await ipcRenderer.invoke('telecloud-sync:download-track', {
        metadata: file,
        targetPath: cachePath
      });

      if (result.success) {
        // Update file metadata with cache path
        file.cache_path = cachePath;
        showToast('Downloaded to cache successfully', 'success');
      } else {
        showToast(`Download failed: ${result.error}`, 'error');
      }
    } else if (storageType === 'both') {
      // File exists both locally and in cloud
      if (file.cache_path) {
        // Already cached - offer to manage cache
        if (window.confirm('This file is already cached. Do you want to clear the cache?')) {
          try {
            await require('fs').promises.unlink(file.cache_path);
            file.cache_path = null;
            showToast('Cache cleared', 'success');
          } catch (err) {
            showToast(`Failed to clear cache: ${err.message}`, 'error');
          }
        }
      } else {
        // Not cached - offer to download to download folder as backup
        const settings = await ipcRenderer.invoke('load-store', 'settings');
        if (!settings || !settings.downloadFolder) {
          alert('Please set a default Download Location in Settings first.');
          setCurrentView('settings');
          return;
        }

        const toastId = Date.now() + Math.random();
        setDownloadToasts(prev => [...prev, { id: toastId, name: file.metadata?.title || file.name, progress: 0 }]);

        for (let i = 1; i <= 10; i++) {
          await new Promise(r => setTimeout(r, 100));
          setDownloadToasts(prev => prev.map(t => t.id === toastId ? { ...t, progress: i * 10 } : t));
        }

        await ipcRenderer.invoke('download-song', file, settings.downloadFolder);

        setTimeout(() => {
          setDownloadToasts(prev => prev.filter(t => t.id !== toastId));
        }, 3000);
      }
    }
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
            tidalSession={tidalSession}
          />
        ) : currentView === 'settings' ? (
          <SettingsView
            currentView={currentView}
            theme={theme}
            setTheme={setTheme}
            setDisabledDevices={setDisabledDevices}
            musicFolderList={musicFolderList}
            setMusicFolderList={setMusicFolderList}
            onRefreshFolder={handleRefreshFolder}
            setMusicFiles={setMusicFiles}
          />
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
            theme={theme}
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
        <SpectrumModal file={spectrumFile} onClose={() => setSpectrumFile(null)} theme={theme} />
      )}

      {/* Scan Progress Popup */}
      {scanProgress && (
        <div style={{
          position: 'fixed',
          bottom: '120px',
          right: '30px',
          background: 'var(--bg-secondary)',
          padding: '15px 20px',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          border: '1px solid var(--bg-hover)',
          width: '300px',
          zIndex: 10000,
          animation: 'slideIn 0.3s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {scanProgress.status === 'inProgress' && (
              <div style={{
                width: '20px',
                height: '20px',
                border: '3px solid var(--bg-tertiary)',
                borderTop: '3px solid var(--accent-red)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
            )}
            {scanProgress.status === 'done' && (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--accent-red)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '4px' }}>
                {scanProgress.status === 'inProgress'
                  ? (scanProgress.type === 'scanning' ? 'Scanning...' : 'Refreshing...')
                  : (scanProgress.type === 'scanning' ? 'Scan Complete' : 'Refresh Complete')}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {scanProgress.message}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Download Toasts Container */}
      <div style={{ position: 'fixed', bottom: scanProgress ? '250px' : '120px', right: '30px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px', transition: 'bottom 0.3s ease' }}>
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
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default App;
