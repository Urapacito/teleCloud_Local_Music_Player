import React, { useMemo, useState } from 'react';
import SongList from './SongList';

const ArtistsView = ({ musicFiles, currentFile, onPlay, onToggleFavorite, onAddPlaylist, favorites, onCheckSpectrum }) => {
  const [selectedArtist, setSelectedArtist] = useState(null);

  const artistsData = useMemo(() => {
    const artistMap = {};
    
    musicFiles.forEach(file => {
      let rawArtist = file.metadata?.artist || 'Unknown Artist';
      // Split by common delimiters
      const splitArtists = rawArtist.split(/,|\s+&\s+|\s+feat\.?\s+|\s+ft\.?\s+/i).map(a => a.trim()).filter(Boolean);
      
      splitArtists.forEach(artist => {
        if (!artistMap[artist]) {
          artistMap[artist] = { name: artist, songs: [] };
        }
        artistMap[artist].songs.push(file);
      });
    });
    
    return Object.values(artistMap).sort((a, b) => a.name.localeCompare(b.name));
  }, [musicFiles]);

  if (selectedArtist) {
    return (
      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', padding: '0 20px', paddingTop: '20px' }}>
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
        
        <div style={{ flex: 1, overflowY: 'auto' }}>
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
      <h2 style={{ margin: '0 0 20px 0', fontSize: '24px' }}>Artists</h2>
      
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
                <svg viewBox="0 0 24 24" width="50" height="50" fill="#777"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
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
