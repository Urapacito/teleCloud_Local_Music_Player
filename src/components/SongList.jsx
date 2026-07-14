import React, { useState, useMemo } from 'react';

const SongList = ({ musicFiles, currentFile, onPlay, onToggleFavorite, onAddPlaylist, onCheckSpectrum, onDeleteSong, onDownloadSong, favorites = [], title, showSort = false }) => {
  const [menuOpenIdx, setMenuOpenIdx] = useState(null);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [sortOption, setSortOption] = useState(showSort ? 'latest' : 'default');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

  const toggleMenu = (e, idx) => {
    e.stopPropagation();
    if (menuOpenIdx === idx) {
      setMenuOpenIdx(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      let x = rect.left - 180;
      let y = rect.bottom + 5;
      if (window.innerHeight - rect.bottom < 250) {
        y = rect.top - 250;
      }
      setMenuPos({ x, y });
      setMenuOpenIdx(idx);
    }
  };

  const sortedMusicFiles = useMemo(() => {
    let sorted = [...musicFiles];
    if (sortOption === 'name') {
      sorted.sort((a, b) => (a.metadata?.title || a.name).localeCompare(b.metadata?.title || b.name));
    } else if (sortOption === 'name_ignore_the') {
      const getComparableName = (file) => {
        let name = (file.metadata?.title || file.name || '').toLowerCase();
        if (name.startsWith('the ')) {
          name = name.substring(4);
        }
        return name;
      };
      sorted.sort((a, b) => getComparableName(a).localeCompare(getComparableName(b)));
    } else if (sortOption === 'artist') {
      sorted.sort((a, b) => (a.metadata?.artist || 'Unknown').localeCompare(b.metadata?.artist || 'Unknown'));
    } else if (sortOption === 'album') {
      sorted.sort((a, b) => (a.metadata?.album || 'Unknown').localeCompare(b.metadata?.album || 'Unknown'));
    } else if (sortOption === 'latest') {
      sorted = sorted.reverse();
    }
    // if sortOption is 'default', do nothing and keep original array
    return sorted;
  }, [musicFiles, sortOption]);

  return (
    <div className="song-list-wrapper" style={{ position: 'relative', height: '100%', paddingRight: '10px' }} onClick={() => { setIsSortMenuOpen(false); setMenuOpenIdx(null); }}>
      <style>
        {`
          .song-list-wrapper:hover .list-bottom-blur {
            opacity: 0;
          }
          .song-list-container::-webkit-scrollbar {
            width: 8px;
          }
          .song-list-container::-webkit-scrollbar-track {
            background: var(--bg-tertiary);
          }
          .song-list-container::-webkit-scrollbar-thumb {
            background: var(--accent-red);
            border-radius: 4px;
          }
          .song-item {
            display: flex;
            align-items: center;
            padding: 10px 20px;
            margin-bottom: 10px;
            margin-right: 15px;
            background: var(--bg-secondary);
            border-radius: 8px;
            cursor: pointer;
            transition: background 0.2s;
            color: var(--text-main);
            position: relative;
          }
          .song-item:hover {
            background: var(--bg-hover);
          }
          .song-item.active {
            background: linear-gradient(to right, #ff4157, var(--accent-red));
            color: white;
          }
          .cover-art {
            width: 50px;
            height: 50px;
            border-radius: 8px;
            margin-right: 20px;
            object-fit: cover;
            background: var(--text-main);
          }
          .song-info {
            flex: 1;
            min-width: 0;
          }
          .song-title {
            font-weight: bold;
            font-size: 16px;
            margin: 0 0 5px 0;
            line-height: 1.3;
          }
          .song-artist {
            font-size: 12px;
            color: var(--text-muted);
            margin: 0;
            line-height: 1.3;
          }
          .song-item.active .song-artist {
            color: #ffcccc;
          }
          .song-number {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 30px;
            margin-right: 15px;
            color: var(--text-muted);
            font-weight: bold;
          }
          .song-item.active .song-number {
            color: var(--text-main);
          }
          .song-play-btn {
            display: none;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.2);
            align-items: center;
            justify-content: center;
            margin-right: 15px;
          }
          .song-item:hover .song-number {
            display: none;
          }
          .song-item:hover .song-play-btn {
            display: flex;
          }
          
          .song-actions {
            display: flex;
            align-items: center;
            gap: 15px;
          }
          
          .song-actions svg {
            cursor: pointer;
            fill: var(--text-muted);
            transition: fill 0.2s;
          }
          .song-item.active .song-actions svg {
            fill: var(--text-main);
          }
          .song-actions svg:hover {
            fill: var(--text-main);
          }
          .context-menu {
            position: fixed;
            background: var(--bg-secondary);
            border: 1px solid var(--bg-tertiary);
            border-radius: 8px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            padding: 10px 0;
            z-index: 100000;
            width: 200px;
          }
          .context-menu-item {
            padding: 10px 20px;
            display: flex;
            align-items: center;
            gap: 10px;
            color: var(--text-main);
            cursor: pointer;
          }
          .context-menu-item:hover {
            background: var(--bg-hover);
            color: var(--text-main)!important;
          }
        `}
      </style>

      <div className="song-list-container" style={{ height: '100%', overflowY: 'auto', paddingBottom: '80px' }}>
        {title && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingRight: '20px' }}>
            <h2 style={{ color: 'var(--text-main)', margin: 0, fontSize: '24px' }}>{title}</h2>
            {showSort && (
              <div style={{ position: 'relative' }}>
                <div
                  onClick={(e) => { e.stopPropagation(); setIsSortMenuOpen(!isSortMenuOpen); }}
                  style={{
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--bg-tertiary)',
                    padding: '8px 35px 8px 15px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'background 0.2s',
                    minWidth: '160px'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseOut={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                >
                  <span style={{ flex: 1 }}>
                    {sortOption === 'latest' ? 'Latest Added' : sortOption === 'name' ? 'Name' : sortOption === 'name_ignore_the' ? 'Name (Ignore \'The\')' : sortOption === 'artist' ? 'Artist' : sortOption === 'album' ? 'Album' : 'Default'}
                  </span>
                  <svg style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} viewBox="0 0 24 24" width="16" height="16" fill="var(--text-muted)">
                    <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
                  </svg>
                </div>

                {isSortMenuOpen && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 5px)',
                    right: '0',
                    background: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                    padding: '10px 0',
                    zIndex: 1000,
                    width: '200px'
                  }}>
                    {[
                      { id: 'latest', label: 'Latest Added' },
                      { id: 'name', label: 'Name' },
                      { id: 'name_ignore_the', label: "Name (Ignore 'The')" },
                      { id: 'artist', label: 'Artist' },
                      { id: 'album', label: 'Album' }
                    ].map(opt => (
                      <div
                        key={opt.id}
                        onClick={() => { setSortOption(opt.id); setIsSortMenuOpen(false); }}
                        style={{
                          padding: '10px 20px',
                          color: sortOption === opt.id ? 'var(--text-main)' : 'var(--text-secondary)',
                          background: sortOption === opt.id ? 'var(--accent-red)' : 'transparent',
                          cursor: 'pointer',
                          fontSize: '13px'
                        }}
                        onMouseOver={e => { if (sortOption !== opt.id) e.currentTarget.style.background = 'var(--bg-hover)' }}
                        onMouseOut={e => { if (sortOption !== opt.id) e.currentTarget.style.background = 'transparent' }}
                      >
                        {opt.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {sortedMusicFiles.map((file, idx) => {
          const bitDepth = file.metadata?.bitsPerSample;
          const sampleRate = file.metadata?.sampleRate ? `${Math.round(file.metadata.sampleRate / 1000)}kHz` : '';
          const bitrateStr = file.metadata?.bitrate ? `${Math.round(file.metadata.bitrate / 1000)}kbps` : '';
          const qualityString = [file.ext?.toUpperCase().replace('.', ''), bitDepth ? `${bitDepth}-bit` : '', sampleRate, bitrateStr].filter(Boolean).join(' / ');
          const isActive = currentFile && currentFile.path === file.path;
          const isFav = favorites.some(f => f.path === file.path);

          let pillBg = 'rgba(0,0,0,0.3)';
          let pillText = 'var(--text-secondary)';
          const extL = file.ext?.toLowerCase();
          const isLossless = extL === '.flac' || extL === '.wav' || extL === '.alac';
          const sRate = file.metadata?.sampleRate || 0;
          const bDepth = file.metadata?.bitsPerSample || 0;

          if (isLossless) {
            if (bDepth > 16 || sRate > 48000) {
              pillBg = 'rgba(229, 192, 123, 0.15)';
              pillText = '#e5c07b';
            } else if (bDepth === 16 && sRate >= 44100) {
              pillBg = 'rgba(37, 182, 130, 0.15)';
              pillText = '#25b682';
            }
          }

          return (
            <div
              key={file.path}
              className={`song-item ${isActive ? 'active' : ''}`}
              onClick={() => onPlay(file, idx, sortedMusicFiles)}
            >
              <div className="song-number">
                {String(idx + 1).padStart(2, '0')}
              </div>
              <div className="song-play-btn">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="white"><path d="M8 5v14l11-7z" /></svg>
              </div>

              <img
                src={file.path ? `media://${encodeURIComponent(file.path)}` : (file.cover || 'data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2250%22 height=%2250%22 viewBox=%220 0 50 50%22%3E%3Crect width=%2250%22 height=%2250%22 fill=%22%23333%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%2220%22 fill=%22%23888%22%3E%E2%99%AB%3C/text%3E%3C/svg%3E')}
                alt="cover"
                loading="lazy"
                className="cover-art"
              />

              <div className="song-info">
                <p className="song-title">{file.metadata?.title || file.name}</p>
                <p className="song-artist">
                  {file.metadata?.artist || 'Unknown'}
                  <br />
                  {qualityString && <span style={{ display: 'inline-block', marginTop: '4px', fontSize: '10px', background: pillBg, padding: '4px 8px', borderRadius: '4px', color: pillText, fontWeight: pillText !== 'var(--text-secondary)' ? 'bold' : 'normal' }}>{qualityString}</span>}
                </p>
              </div>

              <div className="song-actions">
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  onClick={(e) => { e.stopPropagation(); onToggleFavorite(file); }}
                  style={{ fill: isFav ? 'var(--accent-red)' : (isActive ? 'var(--text-main)' : 'var(--text-muted)'), stroke: isFav ? 'var(--text-main)' : 'none', strokeWidth: isFav ? '1.5' : '0', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
                <span style={{ fontSize: '14px', width: '45px', textAlign: 'right' }}>
                  {file.metadata?.duration ?
                    `${Math.floor(file.metadata.duration / 60)}:${String(Math.floor(file.metadata.duration % 60)).padStart(2, '0')}`
                    : '00:00'
                  }
                </span>
                <div style={{ position: 'relative' }} onClick={(e) => toggleMenu(e, idx)}>
                  <svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" /></svg>

                  {menuOpenIdx === idx && (
                    <div
                      className="context-menu"
                      style={{
                        top: menuPos.y,
                        left: menuPos.x
                      }}
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="context-menu-item" onClick={() => { onToggleFavorite(file); setMenuOpenIdx(null); }} style={{ color: isFav ? 'var(--accent-red)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                        <span style={{ width: '24px', textAlign: 'center', marginRight: '8px' }}>♡</span> {isFav ? 'Remove Favourite' : 'Favourites'}
                      </div>
                      <div className="context-menu-item" style={{ display: 'flex', alignItems: 'center' }} onClick={() => { onCheckSpectrum && onCheckSpectrum(file); setMenuOpenIdx(null); }}>
                        <span style={{ width: '24px', textAlign: 'center', marginRight: '8px', display: 'flex', justifyContent: 'center', color: 'var(--text-main)' }}>
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 10v4h3v-4H6zm5-6v16h3V4h-3zm5 8v8h3v-8h-3z" /></svg>
                        </span>
                        Check Spectrum
                      </div>
                      <div className="context-menu-item" style={{ display: 'flex', alignItems: 'center' }} onClick={() => { onDownloadSong && onDownloadSong(file); setMenuOpenIdx(null); }}>
                        <span style={{ width: '24px', textAlign: 'center', marginRight: '8px' }}>⤓</span> Download Now
                      </div>
                      <div className="context-menu-item" style={{ display: 'flex', alignItems: 'center' }} onClick={() => { onAddPlaylist(file); setMenuOpenIdx(null); }}>
                        <span style={{ width: '24px', textAlign: 'center', marginRight: '8px' }}>☰</span> Add to Playlist
                      </div>
                      <div className="context-menu-item" style={{ display: 'flex', alignItems: 'center', color: 'var(--accent-red)' }} onClick={() => { onDeleteSong && onDeleteSong(file); setMenuOpenIdx(null); }}>
                        <span style={{ width: '24px', textAlign: 'center', marginRight: '8px' }}>🗑</span> Delete from Library
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div
        className="list-bottom-blur"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '100px',
          background: 'linear-gradient(to bottom, transparent, var(--bg-main))',
          pointerEvents: 'none',
          transition: 'opacity 0.3s'
        }}
      />
    </div>
  );
};

export default SongList;
