import React, { useMemo } from 'react';

const Homepage = ({ musicFiles, recentPlayed = [], onPlay, onNavClick, setSelectedAlbum }) => {

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
      composers: Math.floor(artists.size * 0.4) // Dummy data for composers just to match the visual
    };
  }, [musicFiles]);

  // Group by albums to show in "Recently Added"
  const recentAlbums = useMemo(() => {
    const uniqueAlbums = [];
    const albumNames = new Set();
    // Start from end assuming recent are at end of list
    for (let i = musicFiles.length - 1; i >= 0; i--) {
      const file = musicFiles[i];
      const album = file.metadata?.album || 'Unknown Album';
      if (!albumNames.has(album)) {
        albumNames.add(album);
        uniqueAlbums.push({
          name: album,
          artist: file.metadata?.artist || 'Unknown Artist',
          cover: file.cover,
          firstTrackIndex: i,
          file: file,
          songs: musicFiles.filter(f => (f.metadata?.album || 'Unknown Album') === album)
        });
      }
      if (uniqueAlbums.length >= 10) break;
    }
    return uniqueAlbums;
  }, [musicFiles]);

  return (
    <div style={{ boxSizing: 'border-box', padding: '30px', color: 'var(--text-main)', height: '100%', overflowY: 'auto', overflowX: 'hidden', paddingBottom: '100px', minWidth: 0 }} className="homepage-container">

      {/* Top Bar Stats */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 240px))', gap: '15px', marginBottom: '25px' }}>

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', margin: 0, fontWeight: 'bold' }}>Recently Added</h2>
          {recentAlbums.length > 4 && (
            <button
              onClick={() => onNavClick('albums')}
              style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', padding: '6px 16px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', border: 'none', cursor: 'pointer', transition: 'all 0.2s', letterSpacing: '1px' }}
              onMouseOver={e => { e.currentTarget.style.background = 'var(--bg-tertiary)'; e.currentTarget.style.color = 'var(--text-main)'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              VIEW MORE
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '10px' }} className="hide-scrollbar">
          {recentAlbums.slice(0, 8).map((album, idx) => (
            <div
              key={idx}
              style={{ width: '160px', flexShrink: 0, cursor: 'pointer' }}
              onClick={() => {
                setSelectedAlbum(album);
                onNavClick('albums');
              }}
            >
              <div style={{ width: '160px', height: '160px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', overflow: 'hidden', marginBottom: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                {album.cover ? (
                  <img src={album.cover} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>No Cover</div>
                )}
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', margin: 0, fontWeight: 'bold' }}>Recently Played</h2>
          {recentPlayed.length > 4 && (
            <button
              onClick={() => onNavClick('recent')}
              style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', padding: '6px 16px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', border: 'none', cursor: 'pointer', transition: 'all 0.2s', letterSpacing: '1px' }}
              onMouseOver={e => { e.currentTarget.style.background = 'var(--bg-tertiary)'; e.currentTarget.style.color = 'var(--text-main)'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              VIEW MORE
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '10px' }} className="hide-scrollbar">
          {recentPlayed.slice(0, 8).map((file, idx) => (
            <div
              key={idx}
              style={{ width: '160px', flexShrink: 0, cursor: 'pointer' }}
              onClick={() => onPlay(file, musicFiles.findIndex(f => f.path === file.path) !== -1 ? musicFiles.findIndex(f => f.path === file.path) : 0)}
            >
              <div style={{ width: '160px', height: '160px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', overflow: 'hidden', marginBottom: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                {file.cover ? (
                  <img src={file.cover} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>No Cover</div>
                )}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.metadata?.title || file.name}</div>
              <div style={{ fontSize: '12px', color: '#ddd', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.metadata?.artist || 'Unknown'}</div>
            </div>
          ))}
          {recentPlayed.length === 0 && (
            <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No recently played music found.</div>
          )}
        </div>
      </div>

      <style>
        {`
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
          
          @media (max-width: 1200px) {
            .homepage-container {
              padding: 25px !important;
            }
          }
          
          @media (max-width: 900px) {
            .homepage-container {
              padding: 20px !important;
            }
            .stats-grid {
              grid-template-columns: repeat(auto-fit, minmax(160px, 220px)) !important;
            }
          }
          
          @media (max-width: 600px) {
            .homepage-container {
              padding: 15px !important;
            }
            .stats-grid {
              grid-template-columns: repeat(auto-fit, minmax(140px, 200px)) !important;
              gap: 12px !important;
            }
          }
          
          @media (max-width: 480px) {
            .stats-grid {
              grid-template-columns: 1fr !important;
              gap: 10px !important;
            }
          }
        `}
      </style>
    </div>
  );
};

export default Homepage;
