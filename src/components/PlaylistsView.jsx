import React, { useState } from 'react';
import SongList from './SongList';

const PlaylistsView = ({ playlists, setPlaylists, onSavePlaylists, currentFile, onPlay, onToggleFavorite, favorites }) => {
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const handleCreatePlaylistSubmit = (e) => {
    e.preventDefault();
    if (newPlaylistName.trim()) {
      const newPlaylist = { id: Date.now().toString(), name: newPlaylistName.trim(), songs: [] };
      const newPlaylists = [...playlists, newPlaylist];
      setPlaylists(newPlaylists);
      onSavePlaylists(newPlaylists);
      setNewPlaylistName('');
      setIsCreating(false);
    }
  };

  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const handleDeletePlaylist = (id) => {
    setDeleteConfirmId(id);
  };

  const confirmDeletePlaylist = () => {
    if (deleteConfirmId) {
      const newPlaylists = playlists.filter(p => p.id !== deleteConfirmId);
      setPlaylists(newPlaylists);
      onSavePlaylists(newPlaylists);
      if (selectedPlaylistId === deleteConfirmId) setSelectedPlaylistId(null);
      setDeleteConfirmId(null);
    }
  };

  const selectedPlaylist = playlists.find(p => p.id === selectedPlaylistId);

  return (
    <div style={{ display: 'flex', flex: 1, padding: '0 20px', paddingTop: '20px', gap: '20px' }}>
      <div style={{ width: '250px', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ margin: '0 0 20px 0', fontSize: '24px' }}>Playlists</h2>
        {!isCreating ? (
          <button 
            onClick={() => setIsCreating(true)}
            style={{ background: 'linear-gradient(to right, #ff4157, var(--accent-red))', border: 'none', borderRadius: '20px', padding: '10px', color: 'white', fontWeight: 'bold', cursor: 'pointer', marginBottom: '20px' }}
          >
            + New Playlist
          </button>
        ) : (
          <form onSubmit={handleCreatePlaylistSubmit} style={{ display: 'flex', gap: '5px', marginBottom: '20px' }}>
            <input 
              autoFocus
              type="text" 
              value={newPlaylistName} 
              onChange={e => setNewPlaylistName(e.target.value)} 
              placeholder="Name..." 
              style={{ flex: 1, padding: '8px', borderRadius: '4px', border: 'none', background: 'var(--bg-tertiary)', color: 'white', outline: 'none' }}
            />
            <button type="submit" style={{ background: '#25b682', border: 'none', borderRadius: '4px', padding: '0 10px', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>✓</button>
            <button type="button" onClick={() => { setIsCreating(false); setNewPlaylistName(''); }} style={{ background: 'var(--bg-tertiary)', border: 'none', borderRadius: '4px', padding: '0 10px', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 'bold' }}>✗</button>
          </form>
        )}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {playlists.map(p => (
            <div 
              key={p.id} 
              style={{ padding: '15px', background: selectedPlaylistId === p.id ? 'var(--bg-hover)' : 'var(--bg-secondary)', marginBottom: '10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              onClick={() => setSelectedPlaylistId(p.id)}
            >
              <div style={{ fontWeight: 'bold', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{p.name}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{p.songs.length}</div>
            </div>
          ))}
        </div>
      </div>
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', borderRadius: '15px', padding: '20px' }}>
        {selectedPlaylist ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '24px' }}>{selectedPlaylist.name}</h2>
              <button 
                onClick={() => handleDeletePlaylist(selectedPlaylist.id)}
                style={{ background: 'transparent', border: '1px solid var(--accent-red)', color: 'var(--accent-red)', padding: '5px 15px', borderRadius: '15px', cursor: 'pointer' }}
              >
                Delete Playlist
              </button>
            </div>
            {selectedPlaylist.songs.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No songs in this playlist. Add some from your library!</p>
            ) : (
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <SongList 
                  musicFiles={selectedPlaylist.songs} 
                  currentFile={currentFile} 
                  onPlay={onPlay} 
                  onToggleFavorite={onToggleFavorite}
                  onAddPlaylist={() => {}} 
                  favorites={favorites}
                />
              </div>
            )}
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            Select a playlist to view its songs
          </div>
        )}
      </div>

      {/* Modern Confirm Modal */}
      {deleteConfirmId && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000000
        }}>
          <div style={{
            background: 'var(--bg-secondary)', borderRadius: '15px', padding: '25px', width: '320px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)', textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 10px 0', color: 'white' }}>Delete Playlist?</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '14px' }}>Are you sure you want to delete this playlist? This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => setDeleteConfirmId(null)}
                style={{ flex: 1, padding: '10px', background: 'var(--bg-tertiary)', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeletePlaylist}
                style={{ flex: 1, padding: '10px', background: 'linear-gradient(to right, #ff4157, var(--accent-red))', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlaylistsView;
