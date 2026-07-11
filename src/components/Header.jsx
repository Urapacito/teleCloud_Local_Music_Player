import React from 'react';

const Header = ({ searchQuery, onSearchChange, onAddFolder, onRefreshFolder, hasFolder }) => {
  return (
    <div className="ms_header">
      <div className="ms_header_inner">
        <div className="ms_top_left">
          <div className="ms_top_search">
            <input 
              type="text" 
              className="form-control" 
              placeholder="Search for Song, Artists, Playlists and More..." 
              value={searchQuery || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-main)', border: 'none' }}
            />
            <span className="search_icon"><img src="/assets/images/svg/search.svg" alt="search" /></span>
          </div>
        </div>
        <div className="ms_top_right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {hasFolder && (
            <button 
              onClick={onRefreshFolder}
              title="Refresh Folder"
              style={{
                background: 'var(--bg-hover)',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
              }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
            </button>
          )}
          <button 
            onClick={onAddFolder}
            style={{
              background: 'linear-gradient(to right, #ff4157, var(--accent-red))',
              border: 'none',
              borderRadius: '20px',
              padding: '8px 24px',
              color: 'white',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(230,57,70,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            Add Folder
          </button>
        </div>
      </div>
    </div>
  );
};

export default Header;
