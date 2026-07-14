import React, { useMemo } from 'react';

const Homepage = ({ musicFiles, recentPlayed = [], onPlay, onNavClick, setSelectedAlbum, theme }) => {

  // Calculate Stats
  const stats = useMemo(() => {
    const artists = new Set();
    const albums = new Set();
    musicFiles.forEach(file => {
      if (file.metadata?.artist) artists.add(file.metadata.artist);
      if (file.metadata?.album) albums.add(file.metadata.album);
    });
    return {
      artists: artists.size,
      albums: albums.size,
      tracks: musicFiles.length,
      composers: Math.floor(artists.size * 0.4)
    };
  }, [musicFiles]);

  // Group by albums to show in "Recently Added"
  const recentAlbums = useMemo(() => {
    const uniqueAlbums = [];
    const albumNames = new Set();
    for (let i = musicFiles.length - 1; i >= 0; i--) {
      const file = musicFiles[i];
      const album = file.metadata?.album || 'Unknown Album';
      if (!albumNames.has(album)) {
        albumNames.add(album);
        uniqueAlbums.push({
          name: album,
          artist: file.metadata?.artist || 'Unknown Artist',
          cover: file.path ? `media://${encodeURIComponent(file.path)}` : file.cover,
          firstTrackIndex: i,
          file: file,
          songs: musicFiles.filter(f => (f.metadata?.album || 'Unknown Album') === album)
        });
      }
      if (uniqueAlbums.length >= 10) break;
    }
    return uniqueAlbums;
  }, [musicFiles]);

  // Shared button style to guarantee visibility across different screen sizes
  const viewMoreButtonStyle = theme === 'light' ? {
    background: 'rgba(0, 0, 0, 0.08)',
    color: '#333333',
    padding: '6px 16px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: 'bold',
    border: '1px solid rgba(0, 0, 0, 0.15)',
    cursor: 'pointer',
    transition: 'all 0.2s',
    letterSpacing: '1px',
    flexShrink: 0,
    whiteSpace: 'nowrap'
  } : {
    background: 'rgba(255, 255, 255, 0.1)',
    color: '#ffffff',
    padding: '6px 16px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: 'bold',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
    letterSpacing: '1px',
    flexShrink: 0,
    whiteSpace: 'nowrap'
  };

  return (
    <div style={{ boxSizing: 'border-box', padding: '30px', color: 'var(--text-main)', height: '100%', overflowY: 'auto', overflowX: 'hidden', paddingBottom: '100px', minWidth: 0 }} className="homepage-container">

      {/* Top Bar Stats */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '25px' }}>
        <div style={{ background: 'var(--bg-card)', borderRadius: '8px', padding: '20px', display: 'flex', alignItems: 'center', gap: '15px', minWidth: 0 }}>
          <svg viewBox="0 0 24 24" width="40" height="40" fill="var(--text-muted)" style={{ flexShrink: 0 }}><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.artists}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Artists</div>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', borderRadius: '8px', padding: '20px', display: 'flex', alignItems: 'center', gap: '15px', minWidth: 0 }}>
          <svg viewBox="0 0 24 24" width="40" height="40" fill="var(--text-muted)" style={{ flexShrink: 0 }}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z" /></svg>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.albums}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Albums</div>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', borderRadius: '8px', padding: '20px', display: 'flex', alignItems: 'center', gap: '15px', minWidth: 0 }}>
          <svg viewBox="0 0 24 24" width="40" height="40" fill="var(--text-muted)" style={{ flexShrink: 0 }}><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" /></svg>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.tracks}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Tracks</div>
          </div>
        </div>
      </div>

      {/* Recently Added Section */}
      <div style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', padding: '30px', maxWidth: '100%', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', width: '100%', flexWrap: 'nowrap', gap: '15px' }}>
          <h2 style={{ fontSize: '20px', margin: 0, fontWeight: 'bold', minWidth: 0, flex: '1' }}>Recently Added</h2>
          {recentAlbums.length > 0 && (
            <button
              onClick={() => onNavClick('albums')}
              style={viewMoreButtonStyle}
              onMouseOver={e => { e.currentTarget.style.background = theme === 'light' ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)'; }}
              onMouseOut={e => { e.currentTarget.style.background = theme === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'; }}
            >
              VIEW MORE
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '20px', paddingBottom: '10px' }}>
          {recentAlbums.slice(0, 8).map((album, idx) => (
            <div
              key={idx}
              style={{ cursor: 'pointer', minWidth: 0 }}
              onClick={() => {
                setSelectedAlbum(album);
                onNavClick('albums');
              }}
            >
              <div style={{ width: '100%', paddingBottom: '100%', position: 'relative', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', overflow: 'hidden', marginBottom: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                  {album.cover ? (
                    <img src={album.cover} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>No Cover</div>
                  )}
                </div>
              </div>
              <div style={{ fontWeight: 'bold', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{album.name}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{album.artist}</div>
            </div>
          ))}
          {recentAlbums.length === 0 && (
            <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No recently added music found.</div>
          )}
        </div>
      </div>

      {/* Recently Played Section */}
      <div style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', padding: '30px', marginTop: '30px', maxWidth: '100%', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', width: '100%', flexWrap: 'nowrap', gap: '15px' }}>
          <h2 style={{ fontSize: '20px', margin: 0, fontWeight: 'bold', minWidth: 0, flex: '1' }}>Recently Played</h2>
          {recentPlayed.length > 0 && (
            <button
              onClick={() => onNavClick('recent')}
              style={viewMoreButtonStyle}
              onMouseOver={e => { e.currentTarget.style.background = theme === 'light' ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)'; }}
              onMouseOut={e => { e.currentTarget.style.background = theme === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'; }}
            >
              VIEW MORE
            </button>
          )}
        </div>

        {/* CHANGED TO RESPONSIVE GRID MATCHING THE RECENTLY ADDED SECTION */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '20px', paddingBottom: '10px' }}>
          {recentPlayed.slice(0, 8).map((file, idx) => (
            <div
              key={idx}
              style={{ cursor: 'pointer', minWidth: 0 }}
              onClick={() => onPlay(file, musicFiles.findIndex(f => f.path === file.path) !== -1 ? musicFiles.findIndex(f => f.path === file.path) : 0)}
            >
              <div style={{ width: '100%', paddingBottom: '100%', position: 'relative', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', overflow: 'hidden', marginBottom: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                  {(file.path || file.cover) ? (
                    <img src={file.path ? `media://${encodeURIComponent(file.path)}` : file.cover} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>No Cover</div>
                  )}
                </div>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.metadata?.title || file.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.metadata?.artist || 'Unknown'}</div>
            </div>
          ))}
          {recentPlayed.length === 0 && (
            <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No recently played music found.</div>
          )}
        </div>
      </div>

      <style>
        {`
          @media (max-width: 1200px) {
            .homepage-container {
              padding: 25px !important;
            }
          }
          @media (max-width: 900px) {
            .homepage-container {
              padding: 20px !important;
            }
          }
          @media (max-width: 600px) {
            .homepage-container {
              padding: 15px !important;
            }
          }
        `}
      </style>
    </div>
  );
};

export default Homepage;