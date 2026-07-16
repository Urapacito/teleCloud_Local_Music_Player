import React, { useMemo, useState, useRef, useEffect } from 'react';
import SongList from './SongList';

const ArtistsView = ({ musicFiles, currentFile, onPlay, onToggleFavorite, onAddPlaylist, favorites, onCheckSpectrum }) => {
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [sortBy, setSortBy] = useState('name'); // name, name-desc
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
    { value: 'name-desc', label: "Name (Ignore 'The')" }
  ];

  const currentSortLabel = sortOptions.find(opt => opt.value === sortBy)?.label || 'Sort';

  const artistsData = useMemo(() => {
    const artistMap = {};

    musicFiles.forEach(file => {
      let rawArtist = file.metadata?.artist || 'Unknown Artist';
      // Split by common delimiters
      const splitArtists = rawArtist.split(/,|\s+&\s+|\s+feat\.?\s+|\s+ft\.?\s+/i).map(a => a.trim()).filter(Boolean);

      splitArtists.forEach(artist => {
        if (!artistMap[artist]) {
          artistMap[artist] = { name: artist, songs: [], cover: file.path ? `media://${encodeURIComponent(file.path)}` : file.cover };
        }
        artistMap[artist].songs.push(file);
      });
    });

    const artists = Object.values(artistMap);
    return sortBy === 'name-desc'
      ? artists.sort((a, b) => b.name.localeCompare(a.name))
      : artists.sort((a, b) => a.name.localeCompare(b.name));
  }, [musicFiles, sortBy]);

  if (selectedArtist) {
    return (
      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', padding: '0 20px', paddingTop: '20px', minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', gap: '15px' }}>
          <button
            onClick={() => setSelectedArtist(null)}
            style={{ background: 'var(--bg-tertiary)', border: 'none', color: 'white', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ← Back
          </button>
          <h2 style={{ margin: 0, fontSize: '24px' }}>{selectedArtist.name}</h2>
          <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>{selectedArtist.songs.length} songs</span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <SongList
            musicFiles={selectedArtist.songs}
            currentFile={currentFile}
            onPlay={onPlay}
            onToggleFavorite={onToggleFavorite}
            onAddPlaylist={onAddPlaylist}
            favorites={favorites}
            onCheckSpectrum={onCheckSpectrum}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flex: 1, flexDirection: 'column', padding: '0 20px', paddingTop: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '24px' }}>Artists</h2>

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
          {artistsData.map((artist, idx) => (
            <div
              key={idx}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', padding: '15px', background: 'var(--bg-secondary)', borderRadius: '12px', transition: 'background 0.2s' }}
              onClick={() => setSelectedArtist(artist)}
              onMouseOver={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseOut={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
            >
              <div style={{ width: '100px', height: '100px', borderRadius: '50%', backgroundColor: 'var(--bg-tertiary)', marginBottom: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxShadow: '0 5px 15px rgba(0,0,0,0.3)' }}>
                {artist.cover ? (
                  <img src={artist.cover} alt="artist cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <svg viewBox="0 0 24 24" width="50" height="50" fill="#777"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
                )}
              </div>
              <div style={{ fontWeight: 'bold', textAlign: 'center', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{artist.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '5px' }}>{artist.songs.length} songs</div>
            </div>
          ))}
          {artistsData.length === 0 && (
            <div style={{ color: 'var(--text-muted)' }}>No artists found in your library.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArtistsView;
