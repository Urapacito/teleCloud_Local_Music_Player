import React, { useState, useEffect } from 'react';
import TidalForYou from './TidalForYou';
import TidalRecentPlayed from './TidalRecentPlayed';
import TidalArtists from './TidalArtists';
import TidalPlaylists from './TidalPlaylists';
import TidalAlbums from './TidalAlbums';
import TidalTracks from './TidalTracks';

const TidalView = ({ session, onLogout, onPlay }) => {
    const [activeTab, setActiveTab] = useState('playlists');
    const [userInfo, setUserInfo] = useState(null);

    useEffect(() => {
        fetchUserInfo();
    }, [session]);

    const fetchUserInfo = async () => {
        try {
            const ipcRenderer = window.ipcRenderer;
            const res = await ipcRenderer.invoke('tidal:getUserInfo');
            if (res.success) {
                setUserInfo(res.data);
            }
        } catch (err) {
            console.error('Error fetching user info:', err);
        }
    };

    const handleLogout = () => {
        const ipcRenderer = window.ipcRenderer;
        ipcRenderer.invoke('tidal:logout');
        onLogout();
    };

    const tabs = [
        { id: 'playlists', label: 'Playlists' },
        { id: 'tracks', label: 'Tracks' }
    ];

    return (
        <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'var(--bg-main)',
            color: 'var(--text-main)',
            overflow: 'hidden'
        }}>
            {/* Header with Tabs and User Info */}
            <div style={{
                padding: '20px 30px',
                borderBottom: '1px solid var(--bg-hover)',
                background: 'var(--bg-secondary)'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <svg viewBox="0 0 24 24" width="32" height="32" fill="var(--accent-red)">
                            <path d="M12.012 3.992L8.008 7.996 12.012 12l4.004-4.004L12.012 3.992zm0 8.016L8.008 16.012l4.004 4.004 4.004-4.004-4.004-4.004zm-8.016 0l-4.004 4.004L4.004 20l4.004-4.004-4.004-4.004zm16.032 0l-4.004 4.004L20.028 20l4.004-4.004-4.004-4.004z" />
                        </svg>
                        <div>
                            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>Tidal</h1>
                            {userInfo && (
                                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                    {userInfo.firstName || userInfo.username || session.username}
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        style={{
                            padding: '8px 16px',
                            background: 'var(--bg-hover)',
                            border: 'none',
                            borderRadius: '6px',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '500',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => {
                            e.target.style.background = 'var(--bg-tertiary)';
                            e.target.style.color = 'var(--text-main)';
                        }}
                        onMouseOut={(e) => {
                            e.target.style.background = 'var(--bg-hover)';
                            e.target.style.color = 'var(--text-secondary)';
                        }}
                    >
                        Logout
                    </button>
                </div>

                {/* Tab Navigation */}
                <div style={{ display: 'flex', gap: '10px', overflowX: 'auto' }}>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                padding: '10px 20px',
                                background: activeTab === tab.id ? 'var(--accent-red)' : 'transparent',
                                color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '500',
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap'
                            }}
                            onMouseOver={(e) => {
                                if (activeTab !== tab.id) {
                                    e.target.style.background = 'var(--bg-hover)';
                                    e.target.style.color = 'var(--text-main)';
                                }
                            }}
                            onMouseOut={(e) => {
                                if (activeTab !== tab.id) {
                                    e.target.style.background = 'transparent';
                                    e.target.style.color = 'var(--text-secondary)';
                                }
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div style={{
                flex: 1,
                overflow: 'auto',
                padding: '30px',
                paddingBottom: '100px'
            }}>
                {activeTab === 'foryou' && <TidalForYou onPlay={onPlay} />}
                {activeTab === 'recent' && <TidalRecentPlayed onPlay={onPlay} />}
                {activeTab === 'artists' && <TidalArtists />}
                {activeTab === 'playlists' && <TidalPlaylists onPlay={onPlay} />}
                {activeTab === 'albums' && <TidalAlbums onPlay={onPlay} />}
                {activeTab === 'tracks' && <TidalTracks onPlay={onPlay} />}
            </div>
        </div>
    );
};

export default TidalView;
