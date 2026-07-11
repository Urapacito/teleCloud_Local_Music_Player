import React from 'react';
import SongList from './SongList';

const RecentView = ({ recentPlayed, currentFile, onPlay, onToggleFavorite, onAddPlaylist, favorites }) => {
  return (
    <div style={{ display: 'flex', flex: 1, flexDirection: 'column', padding: '0 20px', paddingTop: '20px' }}>
      <h2 style={{ margin: '0 0 20px 0', fontSize: '24px' }}>Recently Played</h2>
      {recentPlayed.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>You haven't played any songs recently.</p>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <SongList 
            musicFiles={recentPlayed} 
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

export default RecentView;
