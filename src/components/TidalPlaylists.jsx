import React, { useState, useEffect, useRef, useCallback } from 'react';
import ProxiedImage from './ProxiedImage';

const TidalPlaylists = ({ onPlay }) => {
    // Playlists list state
    const [loading, setLoading] = useState(true);
    const [playlists, setPlaylists] = useState([]);
    const [loadingMore, setLoadingMore] = useState(false);
    const [nextCursor, setNextCursor] = useState(null);
    const [hasMore, setHasMore] = useState(true);

    // Selected playlist tracks state
    const [selectedPlaylist, setSelectedPlaylist] = useState(null);
    const [playlistTracks, setPlaylistTracks] = useState([]);
    const [loadingTracks, setLoadingTracks] = useState(false);
    const [loadingMoreTracks, setLoadingMoreTracks] = useState(false);
    const [nextTracksCursor, setNextTracksCursor] = useState(null);
    const [hasMoreTracks, setHasMoreTracks] = useState(false);

    const playlistsObserverRef = useRef(null);
    const playlistsSentinelRef = useRef(null);

    const tracksObserverRef = useRef(null);
    const tracksSentinelRef = useRef(null);

    // --- Playlists Pagination ---
    const fetchPage = useCallback(async (cursor = null) => {
        try {
            const res = await window.ipcRenderer.invoke('tidal:getPlaylistsPage', { cursor, limit: 15 });
            if (res.success) {
                setPlaylists(prev => cursor ? [...prev, ...(res.playlists || [])] : (res.playlists || []));
                setNextCursor(res.nextCursor || null);
                setHasMore(!!res.nextCursor);
            } else {
                console.error('getPlaylistsPage error:', res.error);
                setHasMore(false);
            }
        } catch (err) {
            console.error('Error fetching playlists page:', err);
            setHasMore(false);
        }
    }, []);

    useEffect(() => {
        setLoading(true);
        fetchPage(null).finally(() => setLoading(false));
    }, [fetchPage]);

    useEffect(() => {
        if (playlistsObserverRef.current) playlistsObserverRef.current.disconnect();

        // Only observe if no playlist is selected, to avoid unnecessary fetching while viewing tracks
        if (selectedPlaylist) return;

        playlistsObserverRef.current = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loadingMore) {
                    setLoadingMore(true);
                    fetchPage(nextCursor).finally(() => setLoadingMore(false));
                }
            },
            { threshold: 0.5 }
        );

        if (playlistsSentinelRef.current) {
            playlistsObserverRef.current.observe(playlistsSentinelRef.current);
        }

        return () => playlistsObserverRef.current?.disconnect();
    }, [hasMore, loadingMore, nextCursor, fetchPage, selectedPlaylist]);

    // --- Playlist Tracks Pagination ---
    const fetchTracksPage = useCallback(async (playlistId, cursor = null) => {
        try {
            const res = await window.ipcRenderer.invoke('tidal:getPlaylistTracksPage', { playlistId, cursor, limit: 30 });
            if (res.success) {
                setPlaylistTracks(prev => cursor ? [...prev, ...(res.tracks || [])] : (res.tracks || []));
                setNextTracksCursor(res.nextCursor || null);
                setHasMoreTracks(!!res.nextCursor);
            } else {
                console.error('getPlaylistTracksPage error:', res.error);
                setHasMoreTracks(false);
            }
        } catch (err) {
            console.error('Error fetching playlist tracks page:', err);
            setHasMoreTracks(false);
        }
    }, []);

    const handlePlaylistClick = (playlist) => {
        if (selectedPlaylist?.uuid === playlist.uuid) {
            // Deselect
            setSelectedPlaylist(null);
            setPlaylistTracks([]);
            setHasMoreTracks(false);
            setNextTracksCursor(null);
        } else {
            // Select and load first page
            setSelectedPlaylist(playlist);
            setPlaylistTracks([]);
            setHasMoreTracks(false);
            setNextTracksCursor(null);

            setLoadingTracks(true);
            fetchTracksPage(playlist.uuid, null).finally(() => setLoadingTracks(false));
        }
    };

    useEffect(() => {
        if (tracksObserverRef.current) tracksObserverRef.current.disconnect();

        if (!selectedPlaylist) return;

        tracksObserverRef.current = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMoreTracks && !loadingMoreTracks) {
                    setLoadingMoreTracks(true);
                    fetchTracksPage(selectedPlaylist.uuid, nextTracksCursor).finally(() => setLoadingMoreTracks(false));
                }
            },
            { threshold: 0.5 }
        );

        if (tracksSentinelRef.current) {
            tracksObserverRef.current.observe(tracksSentinelRef.current);
        }

        return () => tracksObserverRef.current?.disconnect();
    }, [hasMoreTracks, loadingMoreTracks, nextTracksCursor, fetchTracksPage, selectedPlaylist]);

    // --- Playback ---
    const handlePlayTrack = async (track, index) => {
        const actualTrack = track.item || track;
        if (onPlay) {
            // Create the track object for the song that was clicked
            const tidalTrack = {
                source: 'tidal',
                tidalId: actualTrack.id,
                name: actualTrack.title,
                path: `tidal://track/${actualTrack.id}`,
                metadata: {
                    title: actualTrack.title,
                    artist: actualTrack.artist?.name || 'Unknown Artist',
                    album: actualTrack.album?.title || '',
                    duration: actualTrack.duration,
                    cover: actualTrack.album?.cover || null
                },
                cover: actualTrack.album?.cover || null
            };

            // Create the full context list for the queue
            const contextList = playlistTracks.map(t => {
                const item = t.item || t;
                return {
                    source: 'tidal',
                    tidalId: item.id,
                    name: item.title,
                    path: `tidal://track/${item.id}`,
                    metadata: {
                        title: item.title,
                        artist: item.artist?.name || 'Unknown Artist',
                        album: item.album?.title || '',
                        duration: item.duration,
                        cover: item.album?.cover || null
                    },
                    cover: item.album?.cover || null
                };
            });

            onPlay(tidalTrack, index, contextList);
        }
    };

    const formatDuration = (seconds) => {
        if (!seconds || isNaN(seconds) || seconds <= 0) return '--:--';
        const mins = Math.floor(Number(seconds) / 60);
        const secs = Math.floor(Number(seconds) % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // --- Render ---
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

            {/* Playlists infinite scroll sentinel */}
            {!selectedPlaylist && (
                <div ref={playlistsSentinelRef} style={{ height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {loadingMore && (
                        <div style={{ width: '28px', height: '28px', border: '3px solid var(--bg-hover)', borderTop: '3px solid var(--accent-red)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    )}
                    {!hasMore && playlists.length > 0 && (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>All {playlists.length} playlists loaded</p>
                    )}
                </div>
            )}

            {selectedPlaylist && (
                <div style={{ marginTop: '20px', padding: '20px', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px' }}>
                        {selectedPlaylist.title}
                        <span style={{ fontSize: '14px', fontWeight: 'normal', color: 'var(--text-secondary)', marginLeft: '10px' }}>
                            {selectedPlaylist.numberOfTracks} tracks
                        </span>
                    </h3>

                    {loadingTracks && playlistTracks.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px' }}>
                            <div style={{ width: '40px', height: '40px', border: '4px solid var(--bg-hover)', borderTop: '4px solid var(--accent-red)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }}></div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {playlistTracks.map((track, tidx) => {
                                const actualTrack = track.item || track;
                                return (
                                    <div key={`${actualTrack.id}-${tidx}`} onClick={() => handlePlayTrack(track, tidx)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', background: 'var(--bg-tertiary)', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-hover)'} onMouseOut={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}>
                                        <div style={{ minWidth: '30px', textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                                            {tidx + 1}
                                        </div>
                                        <div style={{ width: '48px', height: '48px', borderRadius: '4px', overflow: 'hidden', backgroundColor: 'var(--bg-secondary)', flexShrink: 0 }}>
                                            <ProxiedImage src={actualTrack.album?.cover || null} alt={actualTrack.album?.title || 'Unknown'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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

                            {/* Tracks infinite scroll sentinel */}
                            <div ref={tracksSentinelRef} style={{ height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '10px' }}>
                                {loadingMoreTracks && (
                                    <div style={{ width: '24px', height: '24px', border: '3px solid var(--bg-hover)', borderTop: '3px solid var(--accent-red)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                )}
                                {!hasMoreTracks && playlistTracks.length > 0 && (
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>End of playlist</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default TidalPlaylists;
