import React, { useState, useEffect, useRef } from 'react';
import TeleCloudSyncSettings from './TeleCloudSyncSettings';

// Custom Dropdown Component
const CustomDropdown = ({ value, onChange, options, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '14px 16px',
          borderRadius: '10px',
          border: '2px solid var(--bg-tertiary)',
          background: 'var(--bg-secondary)',
          color: 'var(--text-main)',
          fontSize: '15px',
          cursor: 'pointer',
          fontWeight: '600',
          outline: 'none',
          textAlign: 'left',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          transition: 'all 0.2s'
        }}
      >
        <span>{selectedOption?.label || value}</span>
        <svg
          width="12"
          height="8"
          viewBox="0 0 12 8"
          fill="none"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s'
          }}
        >
          <path d="M1 1L6 6L11 1" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: 'var(--bg-secondary)',
            border: '2px solid var(--bg-tertiary)',
            borderRadius: '10px',
            overflow: 'hidden',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
          }}
        >
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              style={{
                width: '100%',
                padding: '14px 16px',
                border: 'none',
                background: value === option.value ? 'var(--accent-red)' : 'transparent',
                color: value === option.value ? 'white' : 'var(--text-main)',
                fontSize: '15px',
                fontWeight: value === option.value ? '600' : 'normal',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
                outline: 'none'
              }}
              onMouseEnter={(e) => {
                if (value !== option.value) {
                  e.currentTarget.style.background = 'var(--bg-hover)';
                }
              }}
              onMouseLeave={(e) => {
                if (value !== option.value) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const SettingsView = ({
  currentView,
  theme,
  setTheme,
  setDisabledDevices: setAppDisabledDevices,
  musicFolderList,
  setMusicFolderList,
  onRefreshFolder,
  setMusicFiles
}) => {
  const [activeTab, setActiveTab] = useState('Downloads');
  const [downloadFolder, setDownloadFolder] = useState('');
  const [audioDevices, setAudioDevices] = useState([]);
  const [disabledDevices, setDisabledDevices] = useState([]);

  // Add CSS for slider styling
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .settings-slider {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 6px;
        background: linear-gradient(to right, var(--accent-red) 0%, var(--accent-red) var(--value), var(--bg-tertiary) var(--value), var(--bg-tertiary) 100%);
        border-radius: 3px;
        outline: none;
        cursor: pointer;
      }
      .settings-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: var(--accent-red);
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        border: 3px solid white;
        margin-top: -6px;
      }
      .settings-slider::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: var(--accent-red);
        cursor: pointer;
        border: 3px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      }
      .settings-slider::-webkit-slider-runnable-track {
        width: 100%;
        height: 6px;
        cursor: pointer;
        background: transparent;
        border-radius: 3px;
      }
      .settings-slider::-moz-range-track {
        width: 100%;
        height: 6px;
        cursor: pointer;
        background: var(--bg-tertiary);
        border-radius: 3px;
      }
      .themed-select {
        width: 100%;
        padding: 14px 16px;
        border-radius: 10px;
        border: 2px solid var(--accent-red);
        background: linear-gradient(135deg, rgba(230, 57, 70, 0.15) 0%, rgba(230, 57, 70, 0.05) 100%);
        color: var(--text-main);
        font-size: 15px;
        cursor: pointer;
        font-weight: 600;
        outline: none;
        appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='%23e63946' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 16px center;
        transition: all 0.2s;
        box-shadow: 0 2px 8px rgba(230, 57, 70, 0.15);
      }
      .themed-select:hover {
        border-color: var(--accent-red);
        background: linear-gradient(135deg, rgba(230, 57, 70, 0.2) 0%, rgba(230, 57, 70, 0.1) 100%);
        box-shadow: 0 4px 12px rgba(230, 57, 70, 0.25);
        transform: translateY(-1px);
      }
      .themed-select:focus {
        border-color: var(--accent-red);
        box-shadow: 0 0 0 3px rgba(230, 57, 70, 0.2);
      }
      .themed-select option {
        background: var(--bg-main);
        color: var(--text-main);
        padding: 12px;
        font-weight: normal;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Audio settings
  const [replayGainEnabled, setReplayGainEnabled] = useState(false);
  const [replayGainMode, setReplayGainMode] = useState('track');
  const [crossfadeEnabled, setCrossfadeEnabled] = useState(false);
  const [crossfadeDuration, setCrossfadeDuration] = useState(3);
  const [maxSamplingEnabled, setMaxSamplingEnabled] = useState(false);
  const [maxBitDepth, setMaxBitDepth] = useState(24);
  const [maxSampleRate, setMaxSampleRate] = useState(192);

  // Keyboard shortcuts
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
  const [editingShortcut, setEditingShortcut] = useState(null);

  // Clear cache & database modal states
  const [showClearInfoModal, setShowClearInfoModal] = useState(false);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const ipcRenderer = window.ipcRenderer;
      const settings = await ipcRenderer.invoke('load-store', 'settings');
      if (settings && settings.downloadFolder) {
        setDownloadFolder(settings.downloadFolder);
      }
      if (settings && settings.disabledDevices) {
        setDisabledDevices(settings.disabledDevices);
      }

      // Load audio settings
      if (settings && settings.replayGainEnabled !== undefined) setReplayGainEnabled(settings.replayGainEnabled);
      if (settings && settings.replayGainMode) setReplayGainMode(settings.replayGainMode);
      if (settings && settings.crossfadeEnabled !== undefined) setCrossfadeEnabled(settings.crossfadeEnabled);
      if (settings && settings.crossfadeDuration) setCrossfadeDuration(settings.crossfadeDuration);
      if (settings && settings.maxSamplingEnabled !== undefined) setMaxSamplingEnabled(settings.maxSamplingEnabled);
      if (settings && settings.maxBitDepth) setMaxBitDepth(settings.maxBitDepth);
      if (settings && settings.maxSampleRate) setMaxSampleRate(settings.maxSampleRate);

      // Load keyboard shortcuts
      if (settings && settings.keyboardShortcuts) setKeyboardShortcuts(settings.keyboardShortcuts);

      try {
        const devs = await window.ipcRenderer.invoke('get-audio-devices');
        // Auto is default, filter out empty names or irrelevant
        const outputs = devs.filter(d => d.id !== 'auto' && d.name);
        outputs.unshift({ id: '-1', name: 'System Default' });
        setAudioDevices(outputs);
      } catch (e) {
        console.error('Error fetching audio devices', e);
      }
    };
    fetchSettings();
  }, []);

  // Save audio settings when they change
  useEffect(() => {
    const saveAudioSettings = async () => {
      const ipcRenderer = window.ipcRenderer;
      const settings = await ipcRenderer.invoke('load-store', 'settings') || {};
      const newSettings = Array.isArray(settings) ? {} : settings;
      newSettings.replayGainEnabled = replayGainEnabled;
      newSettings.replayGainMode = replayGainMode;
      newSettings.crossfadeEnabled = crossfadeEnabled;
      newSettings.crossfadeDuration = crossfadeDuration;
      newSettings.maxSamplingEnabled = maxSamplingEnabled;
      newSettings.maxBitDepth = maxBitDepth;
      newSettings.maxSampleRate = maxSampleRate;
      newSettings.keyboardShortcuts = keyboardShortcuts;
      await ipcRenderer.invoke('save-store', 'settings', newSettings);

      // Apply settings to MPV
      await ipcRenderer.invoke('apply-audio-settings', {
        replayGain: replayGainEnabled ? replayGainMode : 'no',
        crossfade: crossfadeEnabled ? crossfadeDuration : 0,
        maxBitDepth: maxSamplingEnabled ? maxBitDepth : null,
        maxSampleRate: maxSamplingEnabled ? maxSampleRate : null
      });
    };
    saveAudioSettings();
  }, [replayGainEnabled, replayGainMode, crossfadeEnabled, crossfadeDuration, maxSamplingEnabled, maxBitDepth, maxSampleRate, keyboardShortcuts]);

  const toggleDevice = async (deviceId) => {
    const ipcRenderer = window.ipcRenderer;
    let newDisabled = [...disabledDevices];
    if (newDisabled.includes(deviceId)) {
      newDisabled = newDisabled.filter(id => id !== deviceId);
    } else {
      newDisabled.push(deviceId);
    }
    setDisabledDevices(newDisabled);
    if (setAppDisabledDevices) {
      setAppDisabledDevices(newDisabled);
    }
    const settings = await ipcRenderer.invoke('load-store', 'settings') || {};
    const newSettings = Array.isArray(settings) ? {} : settings;
    newSettings.disabledDevices = newDisabled;
    await ipcRenderer.invoke('save-store', 'settings', newSettings);
  };

  const handleChangeLocation = async () => {
    const ipcRenderer = window.ipcRenderer;
    const folderPath = await ipcRenderer.invoke('select-music-folder');
    if (folderPath) {
      setDownloadFolder(folderPath);
      const settings = await ipcRenderer.invoke('load-store', 'settings') || {};
      const newSettings = Array.isArray(settings) ? {} : settings;
      newSettings.downloadFolder = folderPath;
      await ipcRenderer.invoke('save-store', 'settings', newSettings);
    }
  };

  const handleAddFolder = async () => {
    const ipcRenderer = window.ipcRenderer;
    const folderPath = await ipcRenderer.invoke('select-music-folder');
    if (folderPath) {
      if (musicFolderList.includes(folderPath)) return;
      const newList = [...musicFolderList, folderPath];
      setMusicFolderList(newList);
      const settings = await ipcRenderer.invoke('load-store', 'settings') || {};
      settings.musicFolderList = newList;
      await ipcRenderer.invoke('save-store', 'settings', settings);

      // Trigger scan after adding
      const files = await ipcRenderer.invoke('scan-local-music-cached', newList);
      setMusicFiles(files);
      await ipcRenderer.invoke('save-library', files);
    }
  };

  const handleRemoveFolder = async (pathToRemove) => {
    const newList = musicFolderList.filter(p => p !== pathToRemove);
    setMusicFolderList(newList);
    const settings = await window.ipcRenderer.invoke('load-store', 'settings') || {};
    settings.musicFolderList = newList;
    await window.ipcRenderer.invoke('save-store', 'settings', settings);

    // After removing, we should probably re-scan to update the library
    if (newList.length > 0) {
      const files = await window.ipcRenderer.invoke('scan-local-music-cached', newList);
      setMusicFiles(files);
      await window.ipcRenderer.invoke('save-library', files);
    } else {
      setMusicFiles([]);
      await window.ipcRenderer.invoke('save-library', []);
    }
  };

  const handleClearCache = async () => {
    setIsClearing(true);
    setShowClearConfirmModal(false);

    try {
      const result = await window.electronAPI.clearDatabaseAndCache();

      if (result.success) {
        // Clear the current music files list
        setMusicFiles([]);

        // Show success message
        alert('✅ Cache and database cleared successfully!\n\nPlease do a full scan to rebuild your library.');
      } else {
        alert('❌ Error clearing cache: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      alert('❌ Error clearing cache: ' + error.message);
    } finally {
      setIsClearing(false);
    }
  };

  const tabs = ['General', 'Files', 'Audio', 'Advanced Audio', 'Keyboard', 'Downloads', 'TeleCloud Sync', 'Network', 'About'];

  return (
    <div style={{ display: 'flex', height: '100%', color: 'var(--text-main)', padding: '30px' }}>

      {/* Left Sidebar */}
      <div style={{ width: '250px', borderRight: '1px solid var(--bg-tertiary)', paddingRight: '20px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '30px' }}>Settings</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {tabs.map(tab => (
            <li key={tab}>
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); setActiveTab(tab); }}
                style={{
                  display: 'block',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  color: activeTab === tab ? 'var(--accent-red)' : 'var(--text-muted)',
                  background: activeTab === tab ? 'rgba(230, 57, 70, 0.1)' : 'transparent',
                  textDecoration: 'none',
                  fontWeight: activeTab === tab ? 'bold' : 'normal',
                  marginBottom: '5px',
                  transition: 'all 0.2s'
                }}
              >
                {tab}
              </a>
            </li>
          ))}
        </ul>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, paddingLeft: '40px', overflowY: 'auto' }}>

        {activeTab === 'Files' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <h3 style={{ fontSize: '20px', margin: 0, fontWeight: 'bold' }}>File Management</h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => onRefreshFolder(true)}
                  style={{
                    background: 'var(--bg-hover)',
                    color: 'var(--text-main)',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                  </svg>
                  Scan List
                </button>
                <button
                  onClick={() => onRefreshFolder(false)}
                  style={{
                    background: 'var(--bg-hover)',
                    color: 'var(--text-main)',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                  </svg>
                  Refresh List
                </button>
                <button
                  onClick={handleAddFolder}
                  style={{
                    background: 'var(--accent-red)',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Add Folder
                </button>
              </div>
            </div>

            <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--bg-tertiary)', overflow: 'hidden' }}>
              {musicFolderList.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No music folders added yet.
                </div>
              ) : (
                musicFolderList.map((folder, idx) => (
                  <div
                    key={folder}
                    style={{
                      padding: '20px 25px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: idx < musicFolderList.length - 1 ? '1px solid var(--bg-tertiary)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', overflow: 'hidden' }}>
                      <div style={{ minWidth: '40px', height: '40px', background: 'var(--bg-main)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="var(--text-muted)"><path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z" /></svg>
                      </div>
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{folder}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginLeft: '20px' }}>
                      <button
                        onClick={() => {
                          // Trigger full scan for this folder
                          onRefreshFolder(true);
                        }}
                        style={{
                          background: 'var(--bg-hover)',
                          border: '1px solid var(--bg-tertiary)',
                          color: 'var(--text-main)',
                          padding: '6px 12px',
                          borderRadius: '15px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="11" cy="11" r="8"></circle>
                          <path d="m21 21-4.35-4.35"></path>
                        </svg>
                        Scan
                      </button>
                      <button
                        onClick={() => {
                          // Trigger fast refresh for this folder
                          onRefreshFolder(false);
                        }}
                        style={{
                          background: 'var(--bg-hover)',
                          border: '1px solid var(--bg-tertiary)',
                          color: 'var(--text-main)',
                          padding: '6px 12px',
                          borderRadius: '15px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="23 4 23 10 17 10"></polyline>
                          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                        </svg>
                        Refresh
                      </button>
                      <button
                        onClick={() => handleRemoveFolder(folder)}
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--accent-red)',
                          color: 'var(--accent-red)',
                          padding: '6px 12px',
                          borderRadius: '15px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cache & Database Management */}
            <h3 style={{ fontSize: '18px', marginTop: '40px', marginBottom: '20px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
              Cache & Database Management
              <button
                onClick={() => setShowClearInfoModal(true)}
                style={{
                  background: 'var(--bg-hover)',
                  border: '1px solid var(--bg-tertiary)',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: 'var(--text-muted)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--accent-red)';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--bg-hover)';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }}
                title="What gets cleared?"
              >
                i
              </button>
            </h3>
            <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--bg-tertiary)', padding: '25px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '6px' }}>Clear Cached Data & Database</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                    Remove all cached music metadata and force a fresh library scan.
                    <br />
                    <span style={{ fontSize: '12px', color: 'var(--text-main)', opacity: 0.7 }}>
                      ✓ Your music files will NOT be deleted - only cached information is cleared.
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowClearConfirmModal(true)}
                  disabled={isClearing}
                  style={{
                    background: isClearing ? 'var(--bg-hover)' : 'transparent',
                    border: '1px solid var(--accent-red)',
                    color: isClearing ? 'var(--text-muted)' : 'var(--accent-red)',
                    padding: '10px 24px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: isClearing ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    if (!isClearing) {
                      e.currentTarget.style.background = 'var(--accent-red)';
                      e.currentTarget.style.color = 'white';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isClearing) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--accent-red)';
                    }
                  }}
                >
                  {isClearing ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                      Clearing...
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                      Clear Cache & Database
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Downloads' && (
          <div>
            <h3 style={{ fontSize: '20px', marginBottom: '30px', fontWeight: 'bold' }}>Download Management</h3>

            <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--bg-tertiary)', overflow: 'hidden' }}>
              <div style={{ padding: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ width: '50px', height: '50px', background: 'var(--bg-secondary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="var(--text-muted)"><path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z" /></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>Default Download Location</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {downloadFolder || 'No location set. Downloads will prompt for a folder.'}
                    </div>
                  </div>
                </div>
                <div>
                  <button
                    onClick={handleChangeLocation}
                    style={{
                      background: 'var(--accent-red)',
                      color: 'white',
                      border: 'none',
                      padding: '10px 24px',
                      borderRadius: '20px',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onMouseOver={e => e.currentTarget.style.background = '#c1121f'}
                    onMouseOut={e => e.currentTarget.style.background = 'var(--accent-red)'}
                  >
                    Change Location
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}

        {activeTab === 'General' && (
          <div>
            <h3 style={{ fontSize: '20px', marginBottom: '30px', fontWeight: 'bold' }}>General Settings</h3>
            <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--bg-tertiary)', overflow: 'hidden', padding: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>Theme</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Switch between Dark and Light mode</div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setTheme('dark')}
                  style={{ background: theme === 'dark' ? 'var(--accent-red)' : 'var(--bg-hover)', color: 'var(--text-main)', border: 'none', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Dark
                </button>
                <button
                  onClick={() => setTheme('light')}
                  style={{ background: theme === 'light' ? 'var(--accent-red)' : 'var(--bg-hover)', color: 'var(--text-main)', border: 'none', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Light
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Audio' && (
          <div>
            <h3 style={{ fontSize: '20px', marginBottom: '30px', fontWeight: 'bold' }}>Audio Output Devices</h3>
            <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--bg-tertiary)', overflow: 'hidden', marginBottom: '20px' }}>
              {audioDevices.map((device, idx) => (
                <div key={device.id} style={{ padding: '20px 25px', borderBottom: idx < audioDevices.length - 1 ? '1px solid var(--bg-tertiary)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '4px', color: disabledDevices.includes(device.id) ? 'var(--text-muted)' : 'var(--text-main)' }}>
                      {device.name}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleDevice(device.id)}
                    style={{
                      background: disabledDevices.includes(device.id) ? 'var(--bg-hover)' : 'transparent',
                      border: `1px solid ${disabledDevices.includes(device.id) ? 'var(--bg-tertiary)' : 'var(--accent-red)'}`,
                      color: disabledDevices.includes(device.id) ? 'var(--text-muted)' : 'var(--accent-red)',
                      padding: '6px 16px',
                      borderRadius: '15px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    {disabledDevices.includes(device.id) ? 'Enable' : 'Disable'}
                  </button>
                </div>
              ))}
            </div>

            {/* ReplayGain */}
            <h3 style={{ fontSize: '18px', marginTop: '30px', marginBottom: '20px', fontWeight: 'bold' }}>ReplayGain</h3>
            <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--bg-tertiary)', padding: '25px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>Enable ReplayGain</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Automatic volume normalization based on track metadata</div>
                </div>
                <button
                  onClick={() => setReplayGainEnabled(!replayGainEnabled)}
                  style={{
                    background: replayGainEnabled ? 'var(--accent-red)' : 'var(--bg-hover)',
                    color: replayGainEnabled ? 'white' : 'var(--text-muted)',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '13px'
                  }}
                >
                  {replayGainEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>
              {replayGainEnabled && (
                <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                  <button
                    onClick={() => setReplayGainMode('track')}
                    style={{
                      background: replayGainMode === 'track' ? 'var(--accent-red)' : 'var(--bg-hover)',
                      color: replayGainMode === 'track' ? 'white' : 'var(--text-main)',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '20px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    Track Mode
                  </button>
                  <button
                    onClick={() => setReplayGainMode('album')}
                    style={{
                      background: replayGainMode === 'album' ? 'var(--accent-red)' : 'var(--bg-hover)',
                      color: replayGainMode === 'album' ? 'white' : 'var(--text-main)',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '20px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    Album Mode
                  </button>
                </div>
              )}
            </div>

            {/* Crossfade */}
            <h3 style={{ fontSize: '18px', marginBottom: '20px', fontWeight: 'bold' }}>Crossfade</h3>
            <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--bg-tertiary)', padding: '25px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>Enable Crossfade</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Smooth transition between tracks</div>
                  <div style={{ fontSize: '11px', color: '#f59e0b', marginTop: '4px' }}>⚠️ Note: Crossfade is currently in development and not fully functional</div>
                </div>
                <button
                  onClick={() => setCrossfadeEnabled(!crossfadeEnabled)}
                  style={{
                    background: crossfadeEnabled ? 'var(--accent-red)' : 'var(--bg-hover)',
                    color: crossfadeEnabled ? 'white' : 'var(--text-muted)',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '13px'
                  }}
                >
                  {crossfadeEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>
              {crossfadeEnabled && (
                <div>
                  <label style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>
                    Crossfade Duration: {crossfadeDuration} seconds
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={crossfadeDuration}
                    onChange={(e) => setCrossfadeDuration(Number(e.target.value))}
                    className="settings-slider"
                    style={{ '--value': `${((crossfadeDuration - 1) / 9) * 100}%` }}
                  />
                </div>
              )}
            </div>

            {/* Max Sampling */}
            <h3 style={{ fontSize: '18px', marginBottom: '20px', fontWeight: 'bold' }}>Maximum Sampling Rate</h3>
            <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--bg-tertiary)', padding: '25px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>Limit Sampling Rate</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Cap maximum bit depth and sample rate for compatibility</div>
                </div>
                <button
                  onClick={() => setMaxSamplingEnabled(!maxSamplingEnabled)}
                  style={{
                    background: maxSamplingEnabled ? 'var(--accent-red)' : 'var(--bg-hover)',
                    color: maxSamplingEnabled ? 'white' : 'var(--text-muted)',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '13px'
                  }}
                >
                  {maxSamplingEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>
              {maxSamplingEnabled && (
                <div>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>
                      Max Bit Depth: {maxBitDepth} bit
                    </label>
                    <CustomDropdown
                      value={maxBitDepth}
                      onChange={(val) => setMaxBitDepth(val)}
                      options={[
                        { value: 16, label: '16 bit' },
                        { value: 24, label: '24 bit' },
                        { value: 32, label: '32 bit' }
                      ]}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>
                      Max Sample Rate: {maxSampleRate} kHz
                    </label>
                    <CustomDropdown
                      value={maxSampleRate}
                      onChange={(val) => setMaxSampleRate(val)}
                      options={[
                        { value: 44.1, label: '44.1 kHz' },
                        { value: 48, label: '48 kHz' },
                        { value: 88.2, label: '88.2 kHz' },
                        { value: 96, label: '96 kHz' },
                        { value: 176.4, label: '176.4 kHz' },
                        { value: 192, label: '192 kHz' },
                        { value: 384, label: '384 kHz' }
                      ]}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'Keyboard' && (
          <div>
            <h3 style={{ fontSize: '20px', marginBottom: '30px', fontWeight: 'bold' }}>Keyboard Shortcuts</h3>
            <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--bg-tertiary)', padding: '25px' }}>
              <div style={{ marginBottom: '15px', fontSize: '13px', color: 'var(--text-muted)' }}>
                Click on a key combination to edit. Press ESC to cancel.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                {Object.entries({
                  playPause: 'Play / Pause',
                  next: 'Next Track',
                  previous: 'Previous Track',
                  volumeUp: 'Volume Up',
                  volumeDown: 'Volume Down',
                  seekForward: 'Seek Forward (5s)',
                  seekBackward: 'Seek Backward (5s)',
                  toggleMute: 'Toggle Mute'
                }).map(([key, label]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', background: 'var(--bg-main)', borderRadius: '8px', border: '1px solid var(--bg-tertiary)' }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{label}</div>
                    <button
                      onClick={() => setEditingShortcut(key)}
                      onKeyDown={(e) => {
                        if (editingShortcut === key) {
                          e.preventDefault();
                          if (e.key === 'Escape') {
                            setEditingShortcut(null);
                            return;
                          }
                          const keys = [];
                          if (e.ctrlKey) keys.push('Ctrl');
                          if (e.shiftKey) keys.push('Shift');
                          if (e.altKey) keys.push('Alt');
                          if (!['Control', 'Shift', 'Alt'].includes(e.key)) {
                            keys.push(e.key === ' ' ? 'Space' : e.key);
                          }
                          const newKey = keys.join('+');

                          // Validate: check if key combo is already used
                          const isDuplicate = Object.entries(keyboardShortcuts).some(
                            ([k, v]) => k !== key && v === newKey
                          );

                          if (isDuplicate) {
                            alert(`Key combination "${newKey}" is already assigned to another action.`);
                          } else if (keys.length > 0 && keys[keys.length - 1] !== 'Control' && keys[keys.length - 1] !== 'Shift' && keys[keys.length - 1] !== 'Alt') {
                            setKeyboardShortcuts({ ...keyboardShortcuts, [key]: newKey });
                            setEditingShortcut(null);
                          }
                        }
                      }}
                      style={{
                        background: editingShortcut === key ? 'var(--accent-red)' : 'var(--bg-tertiary)',
                        color: editingShortcut === key ? 'white' : 'var(--text-main)',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontFamily: 'monospace',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        minWidth: '120px',
                        textAlign: 'center'
                      }}
                    >
                      {editingShortcut === key ? 'Press key...' : keyboardShortcuts[key]}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'TeleCloud Sync' && (
          <TeleCloudSyncSettings />
        )}

        {['Network', 'About'].includes(activeTab) && (
          <div style={{ color: 'var(--text-muted)', marginTop: '50px' }}>
            {activeTab} settings coming soon.
          </div>
        )}

        {activeTab === 'Advanced Audio' && (
          <div>
            <h3 style={{ fontSize: '20px', marginBottom: '30px', fontWeight: 'bold' }}>Advanced Audio</h3>

            <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--bg-tertiary)', overflow: 'hidden' }}>

              <div style={{ padding: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--bg-tertiary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ width: '40px', height: '40px', background: 'var(--bg-main)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-main)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z"></path><path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z"></path><path d="M16 17h4"></path><path d="M4 13h4"></path></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>Parametric EQ & AutoEQ</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Advanced 31-band PEQ with automated target matching</div>
                  </div>
                </div>
                <div>
                  <button
                    onClick={() => { if (window.openEqSettings) window.openEqSettings(); }}
                    style={{
                      background: 'var(--accent-red)',
                      color: 'white',
                      border: 'none',
                      padding: '10px 24px',
                      borderRadius: '20px',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onMouseOver={e => e.currentTarget.style.background = '#c1121f'}
                    onMouseOut={e => e.currentTarget.style.background = 'var(--accent-red)'}
                  >
                    Open EQ Settings
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Info Modal */}
      {showClearInfoModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}
          onClick={() => setShowClearInfoModal(false)}
        >
          <div
            style={{
              background: 'var(--bg-secondary)',
              borderRadius: '16px',
              padding: '30px',
              maxWidth: '600px',
              width: '90%',
              border: '2px solid var(--bg-tertiary)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '20px', color: 'var(--text-main)' }}>
              What Gets Cleared?
            </h2>

            <div style={{ fontSize: '14px', color: 'var(--text-main)', lineHeight: '1.8' }}>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '16px' }}>📦 Cache</div>
                <div style={{ color: 'var(--text-muted)', paddingLeft: '20px' }}>
                  • Album cover art extracted from music files<br />
                  • Temporary image files stored locally
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '16px' }}>🗄️ Database</div>
                <div style={{ color: 'var(--text-muted)', paddingLeft: '20px' }}>
                  • Song metadata (title, artist, album, genre)<br />
                  • File information (bitrate, sample rate, duration)<br />
                  • Scan timestamps and file modification dates
                </div>
              </div>

              <div style={{ background: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.3)', borderRadius: '8px', padding: '15px', marginBottom: '20px' }}>
                <div style={{ fontWeight: 'bold', color: '#4ade80', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>✓</span>
                  <span>Your Music Files Are Safe</span>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                  Only cached information is deleted. Your actual music files (.flac, .mp3, etc.) remain untouched in their original locations.
                </div>
              </div>

              <div style={{ marginBottom: '0' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '16px' }}>🔄 After Clearing</div>
                <div style={{ color: 'var(--text-muted)', paddingLeft: '20px' }}>
                  • Library will appear empty until you scan again<br />
                  • All files will be treated as "new" on next scan<br />
                  • Metadata will be re-extracted from files<br />
                  • Cover art will be re-cached as needed
                </div>
              </div>
            </div>

            <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowClearInfoModal(false)}
                style={{
                  background: 'var(--accent-red)',
                  color: 'white',
                  border: 'none',
                  padding: '10px 24px',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#c1121f'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent-red)'; }}
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showClearConfirmModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}
          onClick={() => setShowClearConfirmModal(false)}
        >
          <div
            style={{
              background: 'var(--bg-secondary)',
              borderRadius: '16px',
              padding: '30px',
              maxWidth: '500px',
              width: '90%',
              border: '2px solid var(--bg-tertiary)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '15px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '28px' }}>⚠️</span>
              Clear Cache & Database?
            </h2>

            <p style={{ fontSize: '15px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: '1.6' }}>
              This will remove all cached music metadata and cover art. Your library will appear empty until you perform a full scan.
            </p>

            <div style={{ background: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.3)', borderRadius: '8px', padding: '12px', marginBottom: '25px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-main)' }}>
                <strong style={{ color: '#4ade80' }}>✓ Don't worry:</strong> Your music files will NOT be deleted
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowClearConfirmModal(false)}
                style={{
                  background: 'var(--bg-hover)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--bg-tertiary)',
                  padding: '10px 24px',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
              >
                Cancel
              </button>
              <button
                onClick={handleClearCache}
                style={{
                  background: 'var(--accent-red)',
                  color: 'white',
                  border: 'none',
                  padding: '10px 24px',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#c1121f'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent-red)'; }}
              >
                Yes, Clear Everything
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SettingsView;
