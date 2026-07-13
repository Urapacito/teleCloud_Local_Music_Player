import React from 'react';

const Sidebar = ({ isCollapsed, onToggle, currentView, onNavClick, theme }) => {
  return (
    <div
      className={`ms_sidemenu_wrapper ${isCollapsed ? 'open_menu' : ''}`}
      style={{
        width: isCollapsed ? '80px' : '250px',
        transition: 'width 0.3s, background-color 0.3s',
        backgroundColor: 'var(--bg-main)',
        backgroundImage: 'none'
      }}
    >
      {/* Heavy-duty CSS override block to smash through template defaults */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .ms_sidemenu_wrapper {
          height: 100vh !important;
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          bottom: 0 !important;
          z-index: 99999 !important; /* Ensures it sits above main content panels */
          overflow: visible !important; /* Prevents the toggle arrow from getting clipped */
        }

        .ms_sidemenu_inner {
          min-height: 100vh !important;
          height: auto !important;
          display: flex !important;
          flex-direction: column !important;
          overflow-y: auto !important; /* Force vertical scrolling capability */
          overflow-x: hidden !important;
          scrollbar-width: none !important; /* Firefox */
          -ms-overflow-style: none !important; /* IE/Edge */
        }
        
        /* Hide scrollbars completely across WebKit engines */
        .ms_sidemenu_inner::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }

        .settings-link { color: var(--text-muted); transition: all 0.2s; }
        .settings-link:hover, .settings-link.active { color: var(--accent-red); }
        .settings-link .nav_text { transition: color 0.2s; }
        .settings-link:hover .nav_text, .settings-link.active .nav_text { color: var(--accent-red); }
      `}} />

      {/* Persistent Toggle Handle — Placed outside the inner scroll wrapper so it stays static */}
      <div
        onClick={onToggle}
        style={{
          cursor: 'pointer',
          position: 'absolute',
          right: '-15px',
          top: '50%',
          background: 'var(--bg-secondary)',
          borderRadius: '50%',
          width: '30px',
          height: '30px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100000,
          transform: 'translateY(-50%)',
          boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
        }}
      >
        <span style={{ transform: isCollapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s', color: 'var(--text-main)', fontSize: '18px', fontWeight: 'bold' }}>‹</span>
      </div>

      {/* Scroll-Activated Inner Container Layout */}
      <div className="ms_sidemenu_inner" style={{ paddingBottom: '250px' }}>
        <div className="ms_logo_inner">
          <div className="ms_logo" style={{ display: isCollapsed ? 'none' : 'block' }}>
            <a href="#" onClick={(e) => { e.preventDefault(); onNavClick('home'); }}>
              <img src="/assets/images/logo.png" alt="logo" className="img-fluid" style={{ filter: theme === 'light' ? 'invert(1) hue-rotate(180deg)' : 'none', transition: 'filter 0.3s' }} />
            </a>
          </div>
          <div className="ms_logo_mini" style={{ display: isCollapsed ? 'block' : 'none' }}>
            <a href="#" onClick={(e) => { e.preventDefault(); onNavClick('home'); }}>
              <img src="/assets/images/mini_logo.png" alt="mini_logo" className="img-fluid" style={{ filter: theme === 'light' ? 'invert(1) hue-rotate(180deg)' : 'none', transition: 'filter 0.3s' }} />
            </a>
          </div>
        </div>

        <div className="ms_nav_wrapper">
          <h4 className="nav_heading" style={{ display: isCollapsed ? 'none' : 'block' }}>Browse Music</h4>
          <ul>
            <li><a href="#" className={currentView === 'home' ? 'active' : ''} onClick={(e) => { e.preventDefault(); onNavClick('home'); }} title="Discover"><span className="nav_icon"><span className="icon icon_discover"></span></span><span className="nav_text" style={{ display: isCollapsed ? 'none' : 'block' }}>discover</span></a></li>
            <li><a href="#" className={currentView === 'library' ? 'active' : ''} onClick={(e) => { e.preventDefault(); onNavClick('library'); }} title="Library"><span className="nav_icon"><span className="icon icon_music"></span></span><span className="nav_text" style={{ display: isCollapsed ? 'none' : 'block' }}>library</span></a></li>
          </ul>

          <h4 className="nav_heading" style={{ display: isCollapsed ? 'none' : 'block', marginTop: '20px' }}>Streaming</h4>
          <ul>
            <li>
              <a href="#" className={currentView === 'tidal' ? 'active' : ''} onClick={(e) => { e.preventDefault(); onNavClick('tidal'); }} title="Tidal">
                <span className="nav_icon">
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', transform: 'rotate(180deg)' }}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d="M12.012 3.992L8.008 7.996 12.012 12l4.004-4.004L12.012 3.992zm0 8.016L8.008 16.012l4.004 4.004 4.004-4.004-4.004-4.004zm-8.016 0l-4.004 4.004L4.004 20l4.004-4.004-4.004-4.004zm16.032 0l-4.004 4.004L20.028 20l4.004-4.004-4.004-4.004z" />
                    </svg>
                  </span>
                </span>
                <span className="nav_text" style={{ display: isCollapsed ? 'none' : 'block' }}>tidal</span>
              </a>
            </li>
          </ul>

          <h4 className="nav_heading" style={{ display: isCollapsed ? 'none' : 'block', marginTop: '20px' }}>Your Library</h4>
          <ul>
            <li><a href="#" className={currentView === 'recent' ? 'active' : ''} onClick={(e) => { e.preventDefault(); onNavClick('recent'); }} title="Recently Played"><span className="nav_icon"><span className="icon icon_history"></span></span><span className="nav_text" style={{ display: isCollapsed ? 'none' : 'block' }}>recently played</span></a></li>
            <li><a href="#" className={currentView === 'favorites' ? 'active' : ''} onClick={(e) => { e.preventDefault(); onNavClick('favorites'); }} title="Favorites"><span className="nav_icon"><span className="icon icon_favourite"></span></span><span className="nav_text" style={{ display: isCollapsed ? 'none' : 'block' }}>favorites</span></a></li>
            <li><a href="#" className={currentView === 'playlists' ? 'active' : ''} onClick={(e) => { e.preventDefault(); onNavClick('playlists'); }} title="Playlists"><span className="nav_icon"><span className="icon icon_station"></span></span><span className="nav_text" style={{ display: isCollapsed ? 'none' : 'block' }}>playlists</span></a></li>
            <li><a href="#" className={currentView === 'artists' ? 'active' : ''} onClick={(e) => { e.preventDefault(); onNavClick('artists'); }} title="Artists"><span className="nav_icon"><span className="icon icon_artists"></span></span><span className="nav_text" style={{ display: isCollapsed ? 'none' : 'block' }}>artists</span></a></li>
            <li><a href="#" className={currentView === 'albums' ? 'active' : ''} onClick={(e) => { e.preventDefault(); onNavClick('albums'); }} title="Albums"><span className="nav_icon"><span className="icon icon_albums"></span></span><span className="nav_text" style={{ display: isCollapsed ? 'none' : 'block' }}>albums</span></a></li>
          </ul>

          <h4 className="nav_heading" style={{ display: isCollapsed ? 'none' : 'block', marginTop: '20px' }}>System</h4>
          <ul>
            <li>
              <a href="#" className={`settings-link ${currentView === 'settings' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); onNavClick('settings'); }} title="Settings">
                <span className="nav_icon">
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px' }}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.73 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .43-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.49-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
                    </svg>
                  </span>
                </span>
                <span className="nav_text" style={{ display: isCollapsed ? 'none' : 'block' }}>settings</span>
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;