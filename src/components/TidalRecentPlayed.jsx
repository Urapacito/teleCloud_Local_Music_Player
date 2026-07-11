import React, { useState, useEffect } from 'react';
import ProxiedImage from './ProxiedImage';

const TidalRecentPlayed = ({ onPlay }) => {
    const [loading, setLoading] = useState(true);
    const [tracks, setTracks] = useState([]);

    useEffect(() => {
        fetchRecentPlayed();
    }, []);

    const fetchRecentPlayed = async () => {
        setLoading(true);
        try {
            const ipcRenderer = window.require('electron').ipcRenderer;
            const res = await ipcRenderer.invoke('tidal:getRecentPlayed', 50);
            if (res.success) {
                setTracks(res.data);
            }
        } catch (err) {
            console.error('Error fetching recent played:', err);
        }
        setLoading(false);
    };

    const handlePlayTrack = async (item) => {
        const track = item.item || item;
        try {
            const ipcRenderer = window.require('electron').ipcRenderer;
            const streamRes = await ipcRenderer.invoke('tidal:getStreamUrl', {
                trackId: track.id,
                quality: 'HIGH'
            });

            if (streamRes.success && onPlay) {
                const tidalTrack = {
                    source: 'tidal',
                    tidalId: track.id,
                    name: track.title,
                    path: streamRes.data.url,
                    metadata: {
                        title: track.title,
                        artist: track.artist?.name || 'Unknown Artist',
                        album: track.album?.title || '',
                        duration: track.duration
                    },
                    cover: track.album?.cover ? `https://resources.tidal.com/images/${track.album.cover.replace(/-/g, '/')}/640x640.jpg` : null
                };
                onPlay(tidalTrack, 0);
            }
        } catch (err) {
            console.error('Error playing track:', err);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 60) return `${diffMins} minutes ago`;
        if (diffHours < 24) return `${diffHours} hours ago`;
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString();
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="spinner" style={{
                        width: '50px',
                        height: '50px',
                        border: '4px solid var(--bg-hover)',
                        borderTop: '4px solid var(--accent-red)',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 20px'
                    }}></div>
                    <p style={{ color: 'var(--text-secondary)' }}>Loading recent played...</p>
                    <style>{`
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    `}</style>
                </div>
            </div>
        );
    }

    if (tracks.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
                <svg viewBox="0 0 24 24" width="64" height="64" fill="currentColor" style={{ opacity: 0.3, marginBottom: '20px' }}>
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                </svg>
                <p style={{ fontSize: '16px' }}>No recently played tracks</p>
                <p style={{ fontSize: '14px', marginTop: '8px' }}>Start listening to build your history</p>
            </div>
        );
    }

    return (
        <div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>Recently Played</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {tracks.map((item, idx) => {
                    const track = item.item || item;
                    return (
                        <div
                            key={idx}
                            onClick={() => handlePlayTrack(item)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '15px',
                                padding: '12px',
                                background: 'var(--bg-tertiary)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.background = 'var(--bg-hover)';
                                e.currentTarget.style.transform = 'translateX(4px)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.background = 'var(--bg-tertiary)';
                                e.currentTarget.style.transform = 'translateX(0)';
                            }}
                        >
                            {/* Album Cover */}
                            <div style={{
                                width: '60px',
                                height: '60px',
                                backgroundColor: 'var(--bg-secondary)',
                                borderRadius: '6px',
                                overflow: 'hidden',
                                flexShrink: 0
                            }}>
                                <ProxiedImage
                                    src={track.album?.cover ? `https://resources.tidal.com/images/${track.album.cover.replace(/-/g, '/')}/160x160.jpg` : null}
                                    alt={track.title}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            </div>

                            {/* Track Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                    fontSize: '15px',
                                    fontWeight: '600',
                                    marginBottom: '4px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {track.title}
                                </div>
                                <div style={{
                                    fontSize: '13px',
                                    color: 'var(--text-secondary)',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {track.artist?.name || 'Unknown Artist'} • {track.album?.title || 'Unknown Album'}
                                </div>
                            </div>

                            {/* Played Time */}
                            <div style={{
                                fontSize: '12px',
                                color: 'var(--text-muted)',
                                whiteSpace: 'nowrap',
                                marginLeft: '15px'
                            }}>
                                {item.lastPlaybackDate ? formatDate(item.lastPlaybackDate) : ''}
                            </div>

                            {/* Duration */}
                            <div style={{
                                fontSize: '13px',
                                color: 'var(--text-secondary)',
                                whiteSpace: 'nowrap',
                                marginLeft: '15px',
                                minWidth: '45px',
                                textAlign: 'right'
                            }}>
                                {track.duration ? `${Math.floor(track.duration / 60)}:${String(track.duration % 60).padStart(2, '0')}` : ''}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TidalRecentPlayed;
