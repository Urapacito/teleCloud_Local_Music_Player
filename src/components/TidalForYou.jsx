import React, { useState, useEffect } from 'react';
import ProxiedImage from './ProxiedImage';

const TidalForYou = ({ onPlay }) => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({ mixes: [], recommendations: [] });

    useEffect(() => {
        fetchForYouData();
    }, []);

    const fetchForYouData = async () => {
        setLoading(true);
        try {
            const ipcRenderer = window.ipcRenderer;
            const res = await ipcRenderer.invoke('tidal:getForYou');
            if (res.success) {
                setData(res.data);
            }
        } catch (err) {
            console.error('Error fetching For You:', err);
        }
        setLoading(false);
    };

    const handlePlayTrack = async (track) => {
        if (onPlay) {
            const tidalTrack = {
                source: 'tidal',
                tidalId: track.id,
                name: track.title,
                path: `tidal://track/${track.id}`,
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
                    <p style={{ color: 'var(--text-secondary)' }}>Loading recommendations...</p>
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

    return (
        <div>
            {/* Mixes Section */}
            {data.mixes && data.mixes.length > 0 && (
                <div style={{ marginBottom: '40px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>Your Mixes</h2>
                    <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '10px' }} className="hide-scrollbar">
                        {data.mixes.map((mix, idx) => (
                            <div
                                key={idx}
                                style={{
                                    minWidth: '180px',
                                    maxWidth: '180px',
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                <div style={{
                                    width: '180px',
                                    height: '180px',
                                    backgroundColor: 'var(--bg-tertiary)',
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                    marginBottom: '12px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                                }}>
                                    <ProxiedImage
                                        src={mix.images?.[0]?.url}
                                        alt={mix.title}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                </div>
                                <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {mix.title || 'Mix'}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {mix.subTitle || 'Tidal Mix'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recommended Tracks */}
            {data.recommendations && data.recommendations.length > 0 && (
                <div>
                    <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>Recommended for You</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
                        {data.recommendations.slice(0, 20).map((track, idx) => (
                            <div
                                key={idx}
                                onClick={() => handlePlayTrack(track)}
                                style={{
                                    background: 'var(--bg-tertiary)',
                                    borderRadius: '12px',
                                    padding: '15px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.background = 'var(--bg-hover)';
                                    e.currentTarget.style.transform = 'translateY(-4px)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.background = 'var(--bg-tertiary)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}
                            >
                                <div style={{
                                    width: '100%',
                                    paddingTop: '100%',
                                    position: 'relative',
                                    backgroundColor: 'var(--bg-secondary)',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    marginBottom: '12px'
                                }}>
                                    <ProxiedImage
                                        src={track.album?.cover ? `https://resources.tidal.com/images/${track.album.cover.replace(/-/g, '/')}/320x320.jpg` : null}
                                        alt={track.title}
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover'
                                        }}
                                    />
                                </div>
                                <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {track.title}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {track.artist?.name || 'Unknown Artist'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!loading && (!data.mixes || data.mixes.length === 0) && (!data.recommendations || data.recommendations.length === 0) && (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
                    <svg viewBox="0 0 24 24" width="64" height="64" fill="currentColor" style={{ opacity: 0.3, marginBottom: '20px' }}>
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                    </svg>
                    <p style={{ fontSize: '16px' }}>No recommendations available</p>
                    <p style={{ fontSize: '14px', marginTop: '8px' }}>Start listening to music to get personalized recommendations</p>
                </div>
            )}

            <style>{`
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </div>
    );
};

export default TidalForYou;
