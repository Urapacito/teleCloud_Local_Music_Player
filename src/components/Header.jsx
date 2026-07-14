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
          {/* Buttons moved to Settings -> Files tab */}
        </div>
      </div>
    </div>
  );
};

export default Header;
