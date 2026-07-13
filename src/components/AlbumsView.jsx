import React, { useMemo, useState, useRef, useEffect } from 'react';
import SongList from './SongList';

const AlbumsView = ({ musicFiles, currentFile, onPlay, onToggleFavorite, onAddPlaylist, favorites, onCheckSpectrum, selectedAlbum, setSelectedAlbum, onDeleteSong, onDeleteAlbum, onDownloadSong }) => {
  const [sortBy, setSortBy] = useState('name'); // name, name-desc, artist
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const sortMenuRef = useRef(null);

  // Click outside to close sort menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target)) {
        setSortMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'name-desc', label: "Name (Ignore 'The')" },
    { value: 'artist', label: 'Artist' }
  ];

  const currentSortLabel = sortOptions.find(opt => opt.value === sortBy)?.label || 'Sort';

  const albumsData = useMemo(() => {
    const albumMap = {};

    musicFiles.forEach(file => {
      let rawAlbum = file.metadata?.album || 'Unknown Album';

      if (!albumMap[rawAlbum]) {
        albumMap[rawAlbum] = { name: rawAlbum, songs: [], cover: file.cover };
      }
      albumMap[rawAlbum].songs.push(file);
      // Try to get a cover if we don't have one yet
      if (!albumMap[rawAlbum].cover && file.cover) {
        albumMap[rawAlbum].cover = file.cover;
      }
    });

    const albums = Object.values(albumMap);
    switch (sortBy) {
      case 'name-desc':
        return albums.sort((a, b) => b.name.localeCompare(a.name));
      case 'artist':
        return albums.sort((a, b) => {
          const artistA = (a.songs[0]?.metadata?.artist || 'Unknown').toLowerCase();
          const artistB = (b.songs[0]?.metadata?.artist || 'Unknown').toLowerCase();
          return artistA.localeCompare(artistB);
        });
      case 'name':
      default:
        return albums.sort((a, b) => a.name.localeCompare(b.name));
    }
  }, [musicFiles, sortBy]);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  if (selectedAlbum) {
    const currentAlbumSongs = selectedAlbum.songs;
    return (
      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', padding: '0 20px', paddingTop: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px', gap: '20px' }}>
          <button
            onClick={() => setSelectedAlbum(null)}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--text-main)',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              flexShrink: 0
            }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            title="Back"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
          </button>

          <span style={{ color: 'var(--text-muted)', fontSize: '14px', flexShrink: 0 }}>
            <span style={{ color: 'var(--text-main)', fontWeight: 'bold' }}>{selectedAlbum.songs.length}</span> songs
          </span>

          <h2 style={{ margin: 0, fontSize: '28px', color: 'var(--accent-red)', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedAlbum.name}</h2>

          <div style={{ position: 'relative', marginLeft: 'auto', flexShrink: 0 }} ref={menuRef}>
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-main)',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s'
              }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              title="Menu"
            >
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" /></svg>
            </button>

            {menuOpen && (
              <div style={{ position: 'absolute', right: 0, top: '100%', background: 'var(--bg-secondary)', borderRadius: '8px', padding: '10px 0', minWidth: '180px', boxShadow: '0 5px 20px rgba(0,0,0,0.5)', zIndex: 100 }}>
                <div
                  onClick={() => {
                    if (onDownloadSong) selectedAlbum.songs.forEach(song => onDownloadSong(song));
                    setMenuOpen(false);
                  }}
                  style={{ padding: '10px 20px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)' }}
                  onMouseOver={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-main)'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  <span style={{ fontSize: '16px' }}>⤓</span> Download Album
                </div>
                <div
                  onClick={() => {
                    if (onAddPlaylist) onAddPlaylist(selectedAlbum.songs[0], selectedAlbum.songs); // App.jsx handleAddPlaylist may need to handle arrays, but usually handles one file. We'll pass the first file for now, App.jsx might need tweaking to add an album.
                    setMenuOpen(false);
                  }}
                  style={{ padding: '10px 20px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)' }}
                  onMouseOver={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-main)'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  <span style={{ fontSize: '16px' }}>☰</span> Add Album to Playlist
                </div>
                <div
                  onClick={() => {
                    if (onDeleteAlbum) {
                      onDeleteAlbum(selectedAlbum);
                    }
                    setMenuOpen(false);
                  }}
                  style={{ padding: '10px 20px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-red)' }}
                  onMouseOver={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ fontSize: '16px' }}>🗑</span> Delete Album
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <SongList
            musicFiles={currentAlbumSongs}
            currentFile={currentFile}
            onPlay={(file, idx) => onPlay(file, idx, currentAlbumSongs)}
            onToggleFavorite={onToggleFavorite}
            onAddPlaylist={onAddPlaylist}
            favorites={favorites}
            onCheckSpectrum={onCheckSpectrum}
            onDeleteSong={onDeleteSong}
            onDownloadSong={onDownloadSong}
            title={null}
            showSort={false}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flex: 1, flexDirection: 'column', padding: '0 20px', paddingTop: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '24px' }}>Albums</h2>

        {/* Custom Sort Dropdown */}
        <div ref={sortMenuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setSortMenuOpen(!sortMenuOpen)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: 'none',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              minWidth: '140px',
              justifyContent: 'space-between'
            }}
          >
            <span>{currentSortLabel}</span>
            <span style={{ fontSize: '10px' }}>▼</span>
          </button>

          {sortMenuOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '4px',
              background: 'var(--bg-tertiary)',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              zIndex: 1000,
              minWidth: '180px'
            }}>
              {sortOptions.map(option => (
                <div
                  key={option.value}
                  onClick={() => {
                    setSortBy(option.value);
                    setSortMenuOpen(false);
                  }}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    background: sortBy === option.value ? 'var(--accent-red)' : 'transparent',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (sortBy !== option.value) {
                      e.currentTarget.style.background = 'var(--bg-hover)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (sortBy !== option.value) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {option.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '20px' }}>
          {albumsData.map((album, idx) => (
            <div
              key={idx}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', padding: '15px', background: 'var(--bg-secondary)', borderRadius: '12px', transition: 'background 0.2s' }}
              onClick={() => setSelectedAlbum(album)}
              onMouseOver={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseOut={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
            >
              <div style={{ width: '100px', height: '100px', borderRadius: '8px', backgroundColor: 'var(--bg-tertiary)', marginBottom: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxShadow: '0 5px 15px rgba(0,0,0,0.3)' }}>
                {album.cover ? (
                  <img src={album.cover} alt="album cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <svg viewBox="0 0 24 24" width="50" height="50" fill="#777"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z" /></svg>
                )}
              </div>
              <div style={{ fontWeight: 'bold', textAlign: 'center', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{album.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '5px' }}>{album.songs.length} songs</div>
            </div>
          ))}
          {albumsData.length === 0 && (
            <div style={{ color: 'var(--text-muted)' }}>No albums found in your library.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlbumsView;
