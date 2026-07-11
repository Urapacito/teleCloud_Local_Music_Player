import React from 'react';
import SongList from './SongList';

const FavoritesView = ({ favorites, currentFile, onPlay, onToggleFavorite, onAddPlaylist }) => {
  return (
    <div style={{ display: 'flex', flex: 1, flexDirection: 'column', padding: '0 20px', paddingTop: '20px' }}>
      <h2 style={{ margin: '0 0 20px 0', fontSize: '24px' }}>Favorites</h2>
      {favorites.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>You haven't added any favorite songs yet.</p>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <SongList 
            musicFiles={favorites} 
            currentFile={currentFile} 
            onPlay={onPlay} 
            onToggleFavorite={onToggleFavorite}
            onAddPlaylist={onAddPlaylist}
            favorites={favorites}
          />
        </div>
      )}
    </div>
  );
};

export default FavoritesView;
