import React, { useState, useEffect } from 'react';
import ProxiedImage from './ProxiedImage';

const TidalPlaylists = ({ onPlay }) => {
    const [loading, setLoading] = useState(true);
    const [playlists, setPlaylists] = useState([]);
    const [selectedPlaylist, setSelectedPlaylist] = useState(null);
    const [playlistTracks, setPlaylistTracks] = useState([]);
    const [loadingTracks, setLoadingTracks] = useState(false);

    useEffect(() => {
        fetchPlaylists();
    }, []);

    const fetchPlaylists = async () => {
        setLoading(true);
        try {
            const ipcRenderer = window.ipcRenderer;
            const res = await ipcRenderer.invoke('tidal:getPlaylists', 50);
            if (res.success) {
                setPlaylists(res.data);
            }
        } catch (err) {
            console.error('Error fetching playlists:', err);
        }
        setLoading(false);
    };

    const fetchPlaylistTracks = async (playlistId) => {
        setLoadingTracks(true);
        try {
            const ipcRenderer = window.ipcRenderer;
            const res = await ipcRenderer.invoke('tidal:getPlaylistTracks', { playlistId, limit: 100 });
            if (res.success) {
                setPlaylistTracks(res.data);
            }
        } catch (err) {
            console.error('Error fetching playlist tracks:', err);
        }
        setLoadingTracks(false);
    };

    const handlePlaylistClick = (playlist) => {
        if (selectedPlaylist?.uuid === playlist.uuid) {
            setSelectedPlaylist(null);
            setPlaylistTracks([]);
        } else {
            setSelectedPlaylist(playlist);
            fetchPlaylistTracks(playlist.uuid);
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
                const coverUrl = actualTrack.album?.cover ? `https://resources.tidal.com/images/${actualTrack.album.cover.replace(/-/g, '/')}/640x640.jpg` : null;
                const tidalTrack = {
                    source: 'tidal',
                    tidalId: actualTrack.id,
                    name: actualTrack.title,
                    path: streamRes.data.url,
                    metadata: {
                        title: actualTrack.title,
                        artist: actualTrack.artist?.name || 'Unknown Artist',
                        album: actualTrack.album?.title || '',
                        duration: actualTrack.duration,
                        codec: streamRes.data.codec || 'AAC',
                        quality: streamRes.data.quality || 'HIGH'
                    },
                    cover: coverUrl
                };
                onPlay(tidalTrack, 0);
            }
        } catch (err) {
            console.error('Error playing track:', err);
        }
    };

    const formatDuration = (seconds) => {
        if (!seconds || isNaN(seconds) || seconds <= 0) return '--:--';
        const mins = Math.floor(Number(seconds) / 60);
        const secs = Math.floor(Number(seconds) % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ width: '50px', height: '50px', border: '4px solid var(--bg-hover)', borderTop: '4px solid var(--accent-red)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }}></div>
                    <p style={{ color: 'var(--text-secondary)' }}>Loading playlists...</p>
                </div>
            </div>
        );
    }

    if (playlists.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
                <svg viewBox="0 0 24 24" width="64" height="64" fill="currentColor" style={{ opacity: 0.3, marginBottom: '20px' }}>
                    <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
                </svg>
                <p style={{ fontSize: '16px' }}>No playlists</p>
                <p style={{ fontSize: '14px', marginTop: '8px' }}>Create playlists to see them here</p>
            </div>
        );
    }

    return (
        <div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>Your Playlists</h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                {playlists.map((playlist, idx) => (
                    <div key={idx} onClick={() => handlePlaylistClick(playlist)} style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', padding: '15px', cursor: 'pointer', transition: 'all 0.2s', border: selectedPlaylist?.uuid === playlist.uuid ? '2px solid var(--accent-red)' : '2px solid transparent' }} onMouseOver={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.transform = 'translateY(-4px)'; }} onMouseOut={(e) => { e.currentTarget.style.background = 'var(--bg-tertiary)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                        <div style={{ width: '100%', paddingTop: '100%', position: 'relative', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', overflow: 'hidden', marginBottom: '12px' }}>
                            <ProxiedImage src={playlist.image || playlist.squareImage} alt={playlist.title} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {playlist.title}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {playlist.numberOfTracks} tracks
                        </div>
                    </div>
                ))}
            </div>

            {selectedPlaylist && (
                <div style={{ marginTop: '20px', padding: '20px', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px' }}>
                        {selectedPlaylist.title}
                        <span style={{ fontSize: '14px', fontWeight: 'normal', color: 'var(--text-secondary)', marginLeft: '10px' }}>
                            {selectedPlaylist.numberOfTracks} tracks
                        </span>
                    </h3>

                    {loadingTracks ? (
                        <div style={{ textAlign: 'center', padding: '40px' }}>
                            <div style={{ width: '40px', height: '40px', border: '4px solid var(--bg-hover)', borderTop: '4px solid var(--accent-red)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }}></div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {playlistTracks.map((track, tidx) => {
                                const actualTrack = track.item || track;
                                const coverUrl = actualTrack.album?.cover ? `https://resources.tidal.com/images/${actualTrack.album.cover.replace(/-/g, '/')}/160x160.jpg` : null;
                                return (
                                    <div key={tidx} onClick={() => handlePlayTrack(track)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', background: 'var(--bg-tertiary)', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-hover)'} onMouseOut={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}>
                                        <div style={{ minWidth: '30px', textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                                            {tidx + 1}
                                        </div>
                                        <div style={{ width: '48px', height: '48px', borderRadius: '4px', overflow: 'hidden', backgroundColor: 'var(--bg-secondary)', flexShrink: 0 }}>
                                            <ProxiedImage src={coverUrl} alt={actualTrack.album.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {actualTrack.title}
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {actualTrack.artist?.name || 'Unknown Artist'}
                                                {actualTrack.album?.title && ` • ${actualTrack.album.title}`}
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500', minWidth: '50px', textAlign: 'right' }}>
                                            {formatDuration(actualTrack.duration)}
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
};

export default TidalPlaylists;
