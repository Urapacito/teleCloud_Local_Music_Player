import React, { useState, useEffect, useRef, useCallback } from 'react';
import ProxiedImage from './ProxiedImage';

const TidalTracks = ({ onPlay }) => {
    const [tracks, setTracks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [nextCursor, setNextCursor] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const sentinelRef = useRef(null);
    const observerRef = useRef(null);

    const fetchPage = useCallback(async (cursor = null) => {
        try {
            const res = await window.ipcRenderer.invoke('tidal:getTracksPage', { cursor, limit: 30 });
            if (res.success) {
                setTracks(prev => cursor ? [...prev, ...(res.tracks || [])] : (res.tracks || []));
                setNextCursor(res.nextCursor || null);
                setHasMore(!!res.nextCursor);
            } else {
                console.error('getTracksPage error:', res.error);
                setHasMore(false);
            }
        } catch (err) {
            console.error('Error fetching tracks page:', err);
            setHasMore(false);
        }
    }, []);

    // Initial load
    useEffect(() => {
        setLoading(true);
        fetchPage(null).finally(() => setLoading(false));
    }, [fetchPage]);

    // Infinite scroll — observe sentinel element
    useEffect(() => {
        if (observerRef.current) observerRef.current.disconnect();

        observerRef.current = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loadingMore) {
                    setLoadingMore(true);
                    fetchPage(nextCursor).finally(() => setLoadingMore(false));
                }
            },
            { threshold: 0.5 }
        );

        if (sentinelRef.current) {
            observerRef.current.observe(sentinelRef.current);
        }

        return () => observerRef.current?.disconnect();
    }, [hasMore, loadingMore, nextCursor, fetchPage]);

    const handlePlayTrack = async (item) => {
        const track = item.item || item;
        try {
            const streamRes = await window.ipcRenderer.invoke('tidal:getStreamUrl', {
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
                    cover: track.album?.cover || null
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
                        width: '50px', height: '50px',
                        border: '4px solid var(--bg-hover)',
                        borderTop: '4px solid var(--accent-red)',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 20px'
                    }} />
                    <p style={{ color: 'var(--text-secondary)' }}>Loading favorite tracks...</p>
                    <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                </div>
            </div>
        );
    }

    if (tracks.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
                <svg viewBox="0 0 24 24" width="64" height="64" fill="currentColor" style={{ opacity: 0.3, marginBottom: '20px' }}>
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
                <p style={{ fontSize: '16px' }}>No favorite tracks</p>
                <p style={{ fontSize: '14px', marginTop: '8px' }}>Add tracks to your favorites on Tidal</p>
            </div>
        );
    }

    return (
        <div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>
                Your Favorite Tracks
                <span style={{ fontSize: '13px', fontWeight: 'normal', color: 'var(--text-secondary)', marginLeft: '10px' }}>
                    {tracks.length} loaded{hasMore ? ' · scroll for more' : ''}
                </span>
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {tracks.map((item, idx) => {
                    const track = item.item || item;
                    const coverUrl = track.album?.cover || null;
                    return (
                        <div
                            key={`${track.id}-${idx}`}
                            onClick={() => handlePlayTrack(item)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '14px',
                                padding: '10px 12px',
                                background: 'var(--bg-tertiary)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                            }}
                            onMouseOver={e => {
                                e.currentTarget.style.background = 'var(--bg-hover)';
                                e.currentTarget.style.transform = 'translateX(3px)';
                            }}
                            onMouseOut={e => {
                                e.currentTarget.style.background = 'var(--bg-tertiary)';
                                e.currentTarget.style.transform = 'translateX(0)';
                            }}
                        >
                            {/* Index */}
                            <div style={{ minWidth: '28px', textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                {idx + 1}
                            </div>

                            {/* Album Cover */}
                            <div style={{ width: '48px', height: '48px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, backgroundColor: 'var(--bg-secondary)' }}>
                                <ProxiedImage
                                    src={coverUrl}
                                    alt={track.title}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            </div>

                            {/* Track Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                    fontSize: '14px', fontWeight: '600', marginBottom: '3px',
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                }}>
                                    {track.title}
                                </div>
                                <div style={{
                                    fontSize: '12px', color: 'var(--text-secondary)',
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                }}>
                                    {track.artist?.name || 'Unknown Artist'}
                                    {track.album?.title && ` · ${track.album.title}`}
                                </div>
                            </div>

                            {/* Duration */}
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', minWidth: '45px', textAlign: 'right' }}>
                                {track.duration
                                    ? `${Math.floor(track.duration / 60)}:${String(Math.floor(track.duration % 60)).padStart(2, '0')}`
                                    : '--:--'}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} style={{ height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {loadingMore && (
                    <div style={{
                        width: '28px', height: '28px',
                        border: '3px solid var(--bg-hover)',
                        borderTop: '3px solid var(--accent-red)',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite'
                    }} />
                )}
                {!hasMore && tracks.length > 0 && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>All {tracks.length} tracks loaded</p>
                )}
            </div>
        </div>
    );
};

export default TidalTracks;
