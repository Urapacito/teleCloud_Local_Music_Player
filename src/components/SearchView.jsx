import React, { useMemo } from 'react';

// Highlight matched text
const HighlightText = ({ text, highlight }) => {
  if (!text) return null;
  if (!highlight.trim()) return <span>{text}</span>;
  const regex = new RegExp(`(${highlight})`, 'gi');
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) => 
        regex.test(part) ? (
          <span key={i} style={{ backgroundColor: 'var(--accent-red)', color: 'var(--text-main)', borderRadius: '2px', padding: '0 2px' }}>
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
};

const SearchView = ({ searchQuery, musicFiles, playlists, recentPlayed, onPlay, onNavClick, setSelectedAlbum, setSearchQuery }) => {

  const results = useMemo(() => {
    const q = searchQuery.toLowerCase();
    
    // 1. Songs
    const songs = musicFiles.filter(file => 
      (file.metadata?.title || '').toLowerCase().includes(q) || 
      (file.name || '').toLowerCase().includes(q) ||
      (file.metadata?.artist || '').toLowerCase().includes(q) ||
      (file.metadata?.album || '').toLowerCase().includes(q)
    );

    // 2. Artists
    const artistSet = new Set();
    const artistMap = {};
    musicFiles.forEach(f => {
      const artist = f.metadata?.artist || 'Unknown Artist';
      if (artist.toLowerCase().includes(q)) {
        if (!artistSet.has(artist)) {
          artistSet.add(artist);
          artistMap[artist] = { name: artist, songs: [], cover: f.cover };
        }
        artistMap[artist].songs.push(f);
      }
    });
    const artists = Object.values(artistMap);

    // 3. Albums
    const albumSet = new Set();
    const albumMap = {};
    musicFiles.forEach(f => {
      const album = f.metadata?.album || 'Unknown Album';
      if (album.toLowerCase().includes(q) || (f.metadata?.artist || '').toLowerCase().includes(q)) {
        if (!albumSet.has(album)) {
          albumSet.add(album);
          albumMap[album] = { name: album, artist: f.metadata?.artist || 'Unknown Artist', songs: [], cover: f.cover };
        }
        albumMap[album].songs.push(f);
        if (!albumMap[album].cover && f.cover) albumMap[album].cover = f.cover;
      }
    });
    const albums = Object.values(albumMap);

    // 4. Playlists
    const matchedPlaylists = playlists.filter(p => (p.name || '').toLowerCase().includes(q));

    return { songs, artists, albums, playlists: matchedPlaylists };
  }, [searchQuery, musicFiles, playlists]);

  const handleAlbumClick = (album) => {
    setSelectedAlbum(album);
    setSearchQuery('');
    onNavClick('albums');
  };

  const handleArtistClick = (artist) => {
    setSearchQuery('');
    // For artists, currently we don't have a setSelectedArtist, but let's just navigate to artists tab
    onNavClick('artists');
  };

  const handlePlaylistClick = (playlist) => {
    setSearchQuery('');
    onNavClick('playlists');
  };

  return (
    <div style={{ padding: '0 20px', paddingTop: '20px', overflowY: 'auto', flex: 1, paddingBottom: '100px' }}>
      <h2 style={{ fontSize: '24px', marginBottom: '30px' }}>
        Search results for "{searchQuery}"
      </h2>

      {results.songs.length === 0 && results.artists.length === 0 && results.albums.length === 0 && results.playlists.length === 0 && (
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '50px' }}>No matches found for "{searchQuery}"</div>
      )}

      {/* Playlists */}
      {results.playlists.length > 0 && (
        <div style={{ marginBottom: '40px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '15px', color: 'var(--text-secondary)' }}>Playlists</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '20px' }}>
            {results.playlists.map(p => (
              <div 
                key={p.id}
                onClick={() => handlePlaylistClick(p)}
                style={{ background: 'var(--bg-secondary)', padding: '15px', borderRadius: '12px', cursor: 'pointer' }}
              >
                <div style={{ width: '100px', height: '100px', background: 'var(--bg-tertiary)', borderRadius: '8px', margin: '0 auto 15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg viewBox="0 0 24 24" width="40" height="40" fill="#777"><path d="M4 10h12v2H4zm0-4h12v2H4zm0 8h8v2H4zm10 0v6l5-3z"/></svg>
                </div>
                <div style={{ fontWeight: 'bold', textAlign: 'center' }}>
                  <HighlightText text={p.name} highlight={searchQuery} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Artists */}
      {results.artists.length > 0 && (
        <div style={{ marginBottom: '40px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '15px', color: 'var(--text-secondary)' }}>Artists</h3>
          <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '10px' }} className="hide-scrollbar">
            {results.artists.map((artist, idx) => (
              <div 
                key={idx}
                onClick={() => handleArtistClick(artist)}
                style={{ width: '140px', flexShrink: 0, cursor: 'pointer', background: 'var(--bg-secondary)', padding: '15px', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
              >
                <div style={{ width: '100px', height: '100px', borderRadius: '50%', backgroundColor: 'var(--bg-tertiary)', marginBottom: '15px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {artist.cover ? (
                    <img src={artist.cover} alt="artist cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <svg viewBox="0 0 24 24" width="50" height="50" fill="#777"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                  )}
                </div>
                <div style={{ fontWeight: 'bold', textAlign: 'center', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <HighlightText text={artist.name} highlight={searchQuery} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Albums */}
      {results.albums.length > 0 && (
        <div style={{ marginBottom: '40px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '15px', color: 'var(--text-secondary)' }}>Albums</h3>
          <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '10px' }} className="hide-scrollbar">
            {results.albums.map((album, idx) => (
              <div 
                key={idx}
                onClick={() => handleAlbumClick(album)}
                style={{ width: '140px', flexShrink: 0, cursor: 'pointer', background: 'var(--bg-secondary)', padding: '15px', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
              >
                <div style={{ width: '100px', height: '100px', borderRadius: '8px', backgroundColor: 'var(--bg-tertiary)', marginBottom: '15px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {album.cover ? (
                    <img src={album.cover} alt="album cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <svg viewBox="0 0 24 24" width="50" height="50" fill="#777"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/></svg>
                  )}
                </div>
                <div style={{ fontWeight: 'bold', fontSize: '13px', textAlign: 'center', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <HighlightText text={album.name} highlight={searchQuery} />
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'center', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <HighlightText text={album.artist} highlight={searchQuery} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Songs */}
      {results.songs.length > 0 && (
        <div style={{ marginBottom: '40px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '15px', color: 'var(--text-secondary)' }}>Songs</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {results.songs.slice(0, 50).map((file, idx) => (
              <div 
                key={idx}
                onClick={() => onPlay(file, idx, results.songs)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '10px 15px', 
                  background: 'var(--bg-secondary)', 
                  borderRadius: '8px', 
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseOut={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '4px', overflow: 'hidden', marginRight: '15px', background: 'var(--bg-tertiary)' }}>
                  {file.cover ? <img src={file.cover} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    <HighlightText text={file.metadata?.title || file.name} highlight={searchQuery} />
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    <HighlightText text={file.metadata?.artist || 'Unknown Artist'} highlight={searchQuery} /> 
                    {' • '}
                    <HighlightText text={file.metadata?.album || 'Unknown Album'} highlight={searchQuery} />
                  </div>
                </div>
              </div>
            ))}
            {results.songs.length > 50 && (
              <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '10px' }}>Showing first 50 songs...</div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default SearchView;
