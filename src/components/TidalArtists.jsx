import React, { useState, useEffect } from 'react';
import ProxiedImage from './ProxiedImage';

const TidalArtists = () => {
    const [loading, setLoading] = useState(true);
    const [artists, setArtists] = useState([]);

    useEffect(() => {
        fetchArtists();
    }, []);

    const fetchArtists = async () => {
        setLoading(true);
        try {
            const ipcRenderer = window.ipcRenderer;
            const res = await ipcRenderer.invoke('tidal:getArtists', 50);
            if (res.success) {
                setArtists(res.data);
            }
        } catch (err) {
            console.error('Error fetching artists:', err);
        }
        setLoading(false);
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
                    <p style={{ color: 'var(--text-secondary)' }}>Loading artists...</p>
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

    if (artists.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
                <svg viewBox="0 0 24 24" width="64" height="64" fill="currentColor" style={{ opacity: 0.3, marginBottom: '20px' }}>
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
                <p style={{ fontSize: '16px' }}>No favorite artists</p>
                <p style={{ fontSize: '14px', marginTop: '8px' }}>Follow artists to see them here</p>
            </div>
        );
    }

    return (
        <div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>Your Artists</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '24px' }}>
                {artists.map((item, idx) => {
                    const artist = item.item || item;
                    return (
                        <div
                            key={idx}
                            style={{
                                textAlign: 'center',
                                cursor: 'pointer',
                                transition: 'transform 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <div style={{
                                width: '180px',
                                height: '180px',
                                backgroundColor: 'var(--bg-tertiary)',
                                borderRadius: '50%',
                                overflow: 'hidden',
                                marginBottom: '15px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                margin: '0 auto 15px'
                            }}>
                                {artist.picture ? (
                                    <ProxiedImage
                                        src={`https://resources.tidal.com/images/${artist.picture.replace(/-/g, '/')}/320x320.jpg`}
                                        alt={artist.name}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                                    />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                        <svg viewBox="0 0 24 24" width="64" height="64" fill="currentColor">
                                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                            <div style={{
                                fontSize: '15px',
                                fontWeight: '600',
                                marginBottom: '4px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}>
                                {artist.name}
                            </div>
                            {artist.popularity && (
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                    {artist.popularity.toLocaleString()} followers
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TidalArtists;
