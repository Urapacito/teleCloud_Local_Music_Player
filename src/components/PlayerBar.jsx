import React, { useState } from 'react';
import SignalPathModal from './SignalPathModal';

const PlayerBar = ({
  currentFile,
  isPlaying,
  currentTime,
  onSeek,
  onTogglePlay,
  onNext,
  onPrev,
  volume,
  onVolumeChange,
  devices,
  selectedDevice,
  onDeviceChange,
  loopMode,
  onToggleLoop,
  isShuffle,
  onToggleShuffle,
  onToggleQueue,
  onToggleFavorite,
  onAddPlaylist,
  isFavorite,
  isQueueOpen,
  queueFiles,
  onClearQueue,
  onRemoveFromQueue,
  onSaveQueueAsPlaylist,
  theme,
  eqEnabled,
  setEqEnabled
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeviceMenuOpen, setIsDeviceMenuOpen] = useState(false);
  const [isPlayerCollapsed, setIsPlayerCollapsed] = useState(false);
  const [isDecodeRouteOpen, setIsDecodeRouteOpen] = useState(false);
  const [isSignalPathOpen, setIsSignalPathOpen] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(volume || 100);

  const handleMuteToggle = () => {
    if (selectedDevice !== '-1') return; // Exclusive mode
    if (volume > 0) {
      setPreviousVolume(volume);
      onVolumeChange(0);
    } else {
      onVolumeChange(previousVolume);
    }
  };

  const defaultCover = 'data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22%3E%3Crect width=%2260%22 height=%2260%22 fill=%22%23333%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%2224%22 fill=%22%23888%22%3E%E2%99%AB%3C/text%3E%3C/svg%3E';

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '100px',
      background: theme === 'light' ? '#f8f9fa' : 'var(--bg-secondary)',
      color: theme === 'light' ? '#000000' : 'var(--text-main)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      boxShadow: '0 -5px 20px rgba(0,0,0,0.5)',
      zIndex: 100000,
      transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s, color 0.3s',
      transform: isPlayerCollapsed ? 'translateY(100px)' : 'translateY(0)'
    }}>

      {/* Collapse Toggle Bump */}
      <div
        onClick={() => setIsPlayerCollapsed(!isPlayerCollapsed)}
        style={{
          position: 'absolute',
          top: '-25px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '60px',
          height: '25px',
          backgroundColor: 'var(--bg-secondary)',
          borderTopLeftRadius: '30px',
          borderTopRightRadius: '30px',
          borderTop: '1px solid var(--bg-tertiary)',
          borderLeft: '1px solid var(--bg-tertiary)',
          borderRight: '1px solid var(--bg-tertiary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          borderBottom: 'none'
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width="20" height="20" fill="var(--text-muted)"
          style={{ transform: isPlayerCollapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}
        >
          <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
        </svg>
      </div>

      {/* Current Track Info - Red Card Style */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          width: isExpanded ? '900px' : '300px',
          background: 'linear-gradient(to right, #ff4157, var(--accent-red))',
          height: '100px',
          marginTop: '-10px',
          padding: '10px 20px',
          borderRadius: '0 10px 10px 0',
          marginLeft: '-20px',
          boxShadow: '0 -5px 20px rgba(230,57,70,0.3)',
          transition: 'width 0.3s ease',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        <img
          src={currentFile?.cover || defaultCover}
          alt="cover"
          style={{ width: '60px', height: '60px', borderRadius: '4px', marginRight: '15px', objectFit: 'cover', background: 'var(--text-main)', flexShrink: 0 }}
        />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h4 style={{ margin: '0 0 5px 0', fontSize: '16px', fontWeight: 'bold', color: 'var(--text-main)', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentFile?.metadata?.title || currentFile?.name || 'No song'}
          </h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <p style={{ margin: 0, fontSize: '12px', color: '#ffcccc', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
              {currentFile?.metadata?.artist || 'Unknown Artist'}
            </p>
            {currentFile && (
              <>
                <span style={{ color: '#ffcccc', fontSize: '10px' }}>•</span>
                <p style={{ margin: 0, fontSize: '10px', color: 'var(--text-main)', fontWeight: 'bold' }}>
                  {[currentFile.ext?.toUpperCase().replace('.', ''), currentFile.metadata?.bitsPerSample ? `${currentFile.metadata.bitsPerSample}-bit` : '', currentFile.metadata?.sampleRate ? `${Math.round(currentFile.metadata.sampleRate / 1000)}kHz` : '', currentFile.metadata?.bitrate ? `${Math.round(currentFile.metadata.bitrate / 1000)}kbps` : ''].filter(Boolean).join(' / ')}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Expanded Actions */}
        <div style={{
          display: isExpanded ? 'flex' : 'none',
          alignItems: 'center',
          opacity: isExpanded ? 1 : 0,
          transition: 'opacity 0.2s',
          marginLeft: '20px',
          gap: '15px',
          fontSize: '13px',
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
          paddingRight: '30px'
        }}>
          <span style={{ cursor: 'pointer' }}>⤓ Download Now</span>
          <span style={{ color: '#ffcccc', flexShrink: 0 }}>|</span>
          <span style={{ cursor: 'pointer', flexShrink: 0 }} onClick={() => currentFile && onToggleFavorite(currentFile)}>{isFavorite ? '♥ Remove Favourite' : '♡ Add To Favourites'}</span>
          <span style={{ color: '#ffcccc', flexShrink: 0 }}>|</span>
          <span style={{ cursor: 'pointer', flexShrink: 0 }} onClick={() => currentFile && onAddPlaylist(currentFile)}>☰ Add To Playlist</span>
        </div>

        <div
          onClick={() => setIsExpanded(!isExpanded)}
          style={{ cursor: 'pointer', border: '1px solid var(--text-main)', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'absolute', right: '10px', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}
        >
          ›
        </div>
      </div>

      {/* Controls */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 20px', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '10px' }}>
          <div style={{ position: 'relative', marginRight: '30px' }}>
            <button
              onClick={() => setIsSignalPathOpen(!isSignalPathOpen)}
              style={{ background: 'transparent', border: 'none', color: '#25b682', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', transition: 'background 0.2s' }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(37, 182, 130, 0.1)'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              title="Signal Path"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M16 3l-4 4h3v5c0 1.1-.9 2-2 2H9c-2.21 0-4 1.79-4 4v3H3v-3c0-1.1.9-2 2-2h4c2.21 0 4-1.79 4-4V7h3l-4-4zM7 3l4 4H8v3c0 1.1.9 2 2 2h3c2.21 0 4 1.79 4 4v3h2v-3c0-1.1-.9-2-2-2h-3c-2.21 0-4-1.79-4-4V7H7z" /></svg>
            </button>
            {isSignalPathOpen && (
              <div style={{ position: 'absolute', bottom: '60px', left: '0', zIndex: 10000 }}>
                <SignalPathModal
                  currentFile={currentFile}
                  selectedDevice={selectedDevice}
                  devices={devices}
                  eqEnabled={eqEnabled}
                  setEqEnabled={setEqEnabled}
                  onClose={() => setIsSignalPathOpen(false)}
                />
              </div>
            )}
          </div>
          <button onClick={onPrev} style={{ background: 'var(--bg-hover)', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" /></svg>
          </button>
          <button
            onClick={onTogglePlay}
            style={{
              background: 'linear-gradient(to right, #ff4157, var(--accent-red))', border: 'none', borderRadius: '50%', width: '56px', height: '56px', flexShrink: 0,
              color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(230,57,70,0.4)'
            }}
          >
            {isPlaying ? (
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            )}
          </button>
          <button onClick={onNext} style={{ background: 'var(--bg-hover)', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
          </button>
        </div>

        {/* Progress Bar */}
        <div style={{ display: 'flex', alignItems: 'center', width: '100%', maxWidth: '600px', gap: '15px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'bold' }}>
            {`${Math.floor((currentTime || 0) / 60)}:${String(Math.floor((currentTime || 0) % 60)).padStart(2, '0')}`}
          </span>
          <input
            type="range"
            min="0"
            max={currentFile?.metadata?.duration || 100}
            value={currentTime || 0}
            onChange={(e) => onSeek && onSeek(parseInt(e.target.value))}
            style={{ flex: 1, accentColor: 'var(--accent-red)', height: '4px', cursor: 'pointer', background: 'var(--bg-tertiary)', outline: 'none' }}
            disabled={!currentFile}
          />
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'bold' }}>
            {currentFile?.metadata?.duration ? `${Math.floor(currentFile.metadata.duration / 60)}:${String(Math.floor(currentFile.metadata.duration % 60)).padStart(2, '0')}` : '0:00'}
          </span>
        </div>
      </div>

      {/* Right Controls: Volume, Queue, Output */}
      <div style={{ display: 'flex', alignItems: 'center', width: '400px', justifyContent: 'flex-end', gap: '15px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div
            onClick={handleMuteToggle}
            style={{
              width: '40px', height: '40px', borderRadius: '50%', border: '2px solid var(--accent-red)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)',
              cursor: selectedDevice !== '-1' ? 'not-allowed' : 'pointer'
            }}
            title={selectedDevice !== '-1' ? 'Mute disabled in Exclusive Mode' : 'Toggle Mute'}
          >
            {volume === 0 ? (
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" /></svg>
            )}
          </div>
          <input
            type="range"
            min="0" max="100"
            value={volume}
            onChange={(e) => onVolumeChange(parseInt(e.target.value))}
            style={{ width: '80px', accentColor: 'var(--accent-red)', height: '4px' }}
            disabled={selectedDevice !== '-1'}
            title={selectedDevice !== '-1' ? "Volume locked in Exclusive Mode" : "Volume"}
          />
        </div>

        <button onClick={onToggleShuffle} style={{ background: 'var(--bg-hover)', border: 'none', color: isShuffle ? 'var(--accent-red)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0 }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" /></svg>
        </button>
        <button onClick={onToggleLoop} style={{ background: 'var(--bg-hover)', border: 'none', color: loopMode !== 'none' ? 'var(--accent-red)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0 }}>
          {loopMode === 'one' ? (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M13 15v-4h-2v4h2zm-1-11c-4.42 0-8 3.58-8 8 0 1.57.46 3.03 1.24 4.26l1.46-1.46C6.25 13.97 6 13.01 6 12c0-3.31 2.69-6 6-6v3l4-4-4-4v3zm8 8c0-1.57-.46-3.03-1.24-4.26l-1.46 1.46c.45.83.7 1.79.7 2.8 0 3.31-2.69 6-6 6v-3l-4 4 4 4v-3c4.42 0 8-3.58 8-8z" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" /></svg>
          )}
        </button>

        <div style={{ position: 'relative', display: 'flex', gap: '10px' }}>


          <button
            onClick={onToggleQueue}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'linear-gradient(to right, #ff4157, var(--accent-red))', border: 'none', borderRadius: '20px', padding: '8px 20px', color: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', flexShrink: 0 }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" /></svg>
            Queue
          </button>

          {isQueueOpen && (
            <div style={{ position: 'absolute', bottom: '50px', right: '0', background: 'var(--bg-card)', borderRadius: '12px', width: '320px', boxShadow: '0 -10px 40px rgba(0,0,0,0.8)', zIndex: 10000, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '15px', borderBottom: '1px solid var(--bg-tertiary)', textAlign: 'center', fontWeight: 'bold', letterSpacing: '1px' }}>QUEUE</div>

              <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                {queueFiles && queueFiles.length > 0 ? queueFiles.map((file, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', padding: '10px 15px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--bg-tertiary)', overflow: 'hidden', marginRight: '10px', flexShrink: 0 }}>
                      {file.cover ? (
                        <img src={file.cover} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg viewBox="0 0 24 24" width="20" height="20" fill="#777"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" /></svg></div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.metadata?.title || file.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.metadata?.artist || 'Unknown Artist'}</div>
                    </div>
                    <button
                      onClick={() => onRemoveFromQueue(idx)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '5px', borderRadius: '50%', flexShrink: 0 }}
                      onMouseOver={e => e.currentTarget.style.color = 'var(--text-main)'}
                      onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
                    </button>
                  </div>
                )) : (
                  <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Queue is empty.</div>
                )}
              </div>

              <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--bg-tertiary)' }}>
                <button
                  onClick={onSaveQueueAsPlaylist}
                  style={{ width: '100%', padding: '10px', borderRadius: '20px', background: 'linear-gradient(to right, #ff4157, var(--accent-red))', color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Save Playlist
                </button>
                <div style={{ padding: '15px' }}>
                  <button onClick={onClearQueue} style={{ width: '100%', padding: '8px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Clear Queue</button>
                </div>
              </div>
            </div>
          )}


        </div>

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setIsDeviceMenuOpen(!isDeviceMenuOpen)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-hover)', border: 'none', color: 'var(--text-main)', cursor: 'pointer', flexShrink: 0 }}
            title="Output Device"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 3a9 9 0 0 0-9 9v7c0 1.1.9 2 2 2h4v-8H5v-1c0-3.87 3.13-7 7-7s7 3.13 7 7v1h-4v8h4c1.1 0 2-.9 2-2v-7a9 9 0 0 0-9-9z" /></svg>
          </button>

          {isDeviceMenuOpen && (
            <div style={{ position: 'absolute', bottom: '50px', right: '0', background: 'var(--bg-hover)', borderRadius: '8px', padding: '10px', width: '350px', boxShadow: '0 -5px 20px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '250px', overflowY: 'auto', zIndex: 10000 }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', padding: '5px 10px', color: 'var(--text-muted)', borderBottom: '1px solid var(--bg-tertiary)', marginBottom: '5px' }}>Output Device</div>
              <div
                onClick={() => { onDeviceChange('-1'); setIsDeviceMenuOpen(false); }}
                style={{ padding: '8px 10px', fontSize: '12px', cursor: 'pointer', borderRadius: '4px', background: selectedDevice === '-1' ? 'linear-gradient(to right, #ff4157, var(--accent-red))' : 'transparent', color: selectedDevice === '-1' ? 'white' : 'var(--text-main)', flexShrink: 0 }}
              >
                Default (Shared)
              </div>
              {devices.map(dev => (
                <div
                  key={dev.id}
                  onClick={() => onDeviceChange(dev.id)}
                  style={{ padding: '8px 10px', fontSize: '12px', cursor: 'pointer', borderRadius: '4px', background: selectedDevice === dev.id ? 'linear-gradient(to right, #ff4157, var(--accent-red))' : 'transparent', color: selectedDevice === dev.id ? 'white' : 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 0 }}
                  title={dev.name}
                >
                  {dev.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default PlayerBar;
