import React, { useState, useEffect } from 'react';
import ProxiedImage from './ProxiedImage';

const TidalAlbums = ({ onPlay }) => {
    const [loading, setLoading] = useState(true);
    const [albums, setAlbums] = useState([]);
    const [selectedAlbum, setSelectedAlbum] = useState(null);
    const [albumTracks, setAlbumTracks] = useState([]);
    const [loadingTracks, setLoadingTracks] = useState(false);

    useEffect(() => {
        fetchAlbums();
    }, []);

    const fetchAlbums = async () => {
        setLoading(true);
        try {
            const ipcRenderer = window.ipcRenderer;
            const res = await ipcRenderer.invoke('tidal:getAlbums', 50);
            if (res.success) {
                setAlbums(res.data);
            }
        } catch (err) {
            console.error('Error fetching albums:', err);
        }
        setLoading(false);
    };

    const fetchAlbumTracks = async (albumId) => {
        setLoadingTracks(true);
        try {
            const ipcRenderer = window.ipcRenderer;
            const res = await ipcRenderer.invoke('tidal:getAlbumTracks', albumId);
            if (res.success) {
                setAlbumTracks(res.data);
            }
        } catch (err) {
            console.error('Error fetching album tracks:', err);
        }
        setLoadingTracks(false);
    };

    const handleAlbumClick = (album) => {
        if (selectedAlbum?.id === album.id) {
            setSelectedAlbum(null);
            setAlbumTracks([]);
        } else {
            setSelectedAlbum(album);
            fetchAlbumTracks(album.id);
        }
    };

    const handlePlayTrack = async (track) => {
        const actualTrack = track.item || track;
        try {
            const ipcRenderer = window.ipcRenderer;
            const streamRes = await ipcRenderer.invoke('tidal:getStreamUrl', {
                trackId: actualTrack.id,
                quality: 'HIGH'
            });

            if (streamRes.success && onPlay) {
                const tidalTrack = {
                    source: 'tidal',
                    tidalId: actualTrack.id,
                    name: actualTrack.title,
                    path: streamRes.data.url,
                    metadata: {
                        title: actualTrack.title,
                        artist: actualTrack.artist?.name || selectedAlbum?.artist?.name || 'Unknown Artist',
                        album: selectedAlbum?.title || '',
                        duration: actualTrack.duration
                    },
                    cover: selectedAlbum?.cover ? `https://resources.tidal.com/images/${selectedAlbum.cover.replace(/-/g, '/')}/640x640.jpg` : null
                };
                onPlay(tidalTrack, 0);
            }
        } catch (err) {
            console.error('Error playing track:', err);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '50px',
                        height: '50px',
                        border: '4px solid var(--bg-hover)',
                        borderTop: '4px solid var(--accent-red)',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 20px'
                    }}></div>
                    <p style={{ color: 'var(--text-secondary)' }}>Loading albums...</p>
                </div>
            </div>
        );
    }

    if (albums.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
                <svg viewBox="0 0 24 24" width="64" height="64" fill="currentColor" style={{ opacity: 0.3, marginBottom: '20px' }}>
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z" />
                </svg>
                <p style={{ fontSize: '16px' }}>No favorite albums</p>
                <p style={{ fontSize: '14px', marginTop: '8px' }}>Add albums to your favorites</p>
            </div>
        );
    }

    return (
        <div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>Your Albums</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
                {albums.map((item, idx) => {
                    const album = item.item || item;
                    return (
                        <div key={idx}>
                            <div
                                onClick={() => handleAlbumClick(album)}
                                style={{
                                    background: 'var(--bg-tertiary)',
                                    borderRadius: '12px',
                                    padding: '15px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    border: selectedAlbum?.id === album.id ? '2px solid var(--accent-red)' : '2px solid transparent'
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
                                        src={album.cover ? `https://resources.tidal.com/images/${album.cover.replace(/-/g, '/')}/320x320.jpg` : null}
                                        alt={album.title}
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
                                    {album.title}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {album.artist?.name || 'Unknown Artist'}
                                </div>
                            </div>

                            {/* Album Tracks (expanded) */}
                            {selectedAlbum?.id === album.id && (
                                <div style={{ marginTop: '15px', padding: '15px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                                    {loadingTracks ? (
                                        <div style={{ textAlign: 'center', padding: '20px' }}>
                                            <div style={{
                                                width: '30px',
                                                height: '30px',
                                                border: '3px solid var(--bg-hover)',
                                                borderTop: '3px solid var(--accent-red)',
                                                borderRadius: '50%',
                                                animation: 'spin 1s linear infinite',
                                                margin: '0 auto'
                                            }}></div>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {albumTracks.map((track, tidx) => {
                                                const actualTrack = track.item || track;
                                                return (
                                                    <div
                                                        key={tidx}
                                                        onClick={() => handlePlayTrack(track)}
                                                        style={{
                                                            padding: '8px',
                                                            background: 'var(--bg-tertiary)',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            transition: 'background 0.2s',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '10px'
                                                        }}
                                                        onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                                                        onMouseOut={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                                                    >
                                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', width: '25px' }}>
                                                            {actualTrack.trackNumber || tidx + 1}
                                                        </div>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontSize: '13px', fontWeight: '600' }}>{actualTrack.title}</div>
                                                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                                {actualTrack.duration ? `${Math.floor(actualTrack.duration / 60)}:${String(actualTrack.duration % 60).padStart(2, '0')}` : ''}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TidalAlbums;
