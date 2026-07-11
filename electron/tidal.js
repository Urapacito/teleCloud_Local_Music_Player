const Store = require('electron-store').default;
const crypto = require('crypto');
const http = require('http');
const { URL } = require('url');

const TIDAL_API_URL = 'https://openapi.tidal.com/v2';
const TIDAL_AUTH_URL = 'https://login.tidal.com/authorize';
const TIDAL_TOKEN_URL = 'https://auth.tidal.com/v1/oauth2/token';
const TIDAL_SCOPES = process.env.TIDAL_SCOPES || [
    'user.read',
    'collection.read',
    'playlists.read',
    'playback',
    'recommendations.read',
    'search.read',
    'entitlements.read',
].join(' ');

const store = new Store({
    name: 'tidal-session',
    encryptionKey: 'telecloud-tidal-encryption-key-2024'
});

let currentSession = null;
let oauthState = null;
let oauthServer = null;
let oauthTimeout = null;

function closeOAuthServer() {
    if (oauthTimeout) {
        clearTimeout(oauthTimeout);
        oauthTimeout = null;
    }

    if (oauthServer) {
        try {
            oauthServer.close();
        } catch (err) {
            console.warn('Failed to close Tidal OAuth server:', err.message);
        }
        oauthServer = null;
    }
}

function getConfig() {
    const clientId = process.env.TIDAL_CLIENT_ID;
    const clientSecret = process.env.TIDAL_CLIENT_SECRET;
    const redirectUri = process.env.TIDAL_REDIRECT_URI || 'http://127.0.0.1:42813/callback';

    if (!clientId || !clientSecret) {
        throw new Error('Missing TIDAL_CLIENT_ID or TIDAL_CLIENT_SECRET in .env');
    }

    return { clientId, clientSecret, redirectUri };
}

function getBasicAuthHeader(clientId, clientSecret) {
    return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
}

function generatePkcePair() {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
        .createHash('sha256')
        .update(codeVerifier)
        .digest('base64url');
    return { codeVerifier, codeChallenge };
}

function saveSession(session) {
    currentSession = session;
    store.set('session', session);
}

function buildIncludedMap(included = []) {
    const map = new Map();
    for (const resource of included) {
        map.set(`${resource.type}:${resource.id}`, resource);
    }
    return map;
}

function resolveRelationship(resource, relationshipName, includedMap) {
    const rel = resource?.relationships?.[relationshipName]?.data;
    if (!rel) return null;
    const ref = Array.isArray(rel) ? rel[0] : rel;
    if (!ref) return null;
    return includedMap.get(`${ref.type}:${ref.id}`) || ref;
}

function getArtworkUrl(resource, includedMap, size = 640) {
    const artwork = resolveRelationship(resource, 'coverArt', includedMap)
        || resolveRelationship(resource, 'profileArt', includedMap)
        || resolveRelationship(resource, 'thumbnailArt', includedMap);
    if (!artwork) return null;

    // V2 API sometimes provides a direct url
    if (artwork.attributes?.url) {
        return artwork.attributes.url;
    }

    // V2 API often provides an array of 'files' with different sizes
    if (artwork.attributes?.files && Array.isArray(artwork.attributes.files) && artwork.attributes.files.length > 0) {
        // Try to find the exact or closest size
        let bestFile = artwork.attributes.files[0];
        let smallestDiff = Infinity;
        for (const file of artwork.attributes.files) {
            if (file.meta?.width) {
                const diff = Math.abs(file.meta.width - size);
                if (diff < smallestDiff) {
                    smallestDiff = diff;
                    bestFile = file;
                }
            }
        }
        return bestFile.href;
    }

    // Fallback: Legacy UUID construction if no direct URL is provided
    const mediaId = artwork.attributes?.mediaArtifactId || (artwork.id && artwork.id.includes('-') ? artwork.id : null);
    if (mediaId) {
        const path = mediaId.replace(/-/g, '/');
        return `https://resources.tidal.com/images/${path}/${size}x${size}.jpg`;
    }

    return null;
}

function parseIsoDuration(isoDuration) {
    if (!isoDuration || typeof isoDuration !== 'string') return null;
    // Parse ISO 8601 duration format like "PT2M30S" or "PT3M"
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/);
    if (!match) return null;
    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseFloat(match[3] || '0');
    return hours * 3600 + minutes * 60 + seconds;
}

function normalizeTrack(resource, includedMap = new Map()) {
    if (!resource) return null;

    const attrs = resource.attributes || resource;
    const artistResource = resolveRelationship(resource, 'artists', includedMap);
    const albumResource = resolveRelationship(resource, 'albums', includedMap);
    const coverUrl = getArtworkUrl(albumResource, includedMap);

    // Parse duration - could be seconds or ISO 8601 format
    let duration = attrs.durationInSeconds || attrs.duration;
    if (typeof duration === 'string' && duration.startsWith('PT')) {
        duration = parseIsoDuration(duration);
    }

    return {
        id: resource.id || attrs.id,
        title: attrs.title || attrs.name,
        duration,
        trackNumber: attrs.trackNumber,
        artist: {
            id: artistResource?.id,
            name: artistResource?.attributes?.name || attrs.artist?.name || 'Unknown Artist'
        },
        album: {
            id: albumResource?.id,
            title: albumResource?.attributes?.title || attrs.album?.title || '',
            cover: coverUrl || null
        }
    };
}

function normalizeAlbum(resource, includedMap = new Map()) {
    if (!resource) return null;

    const attrs = resource.attributes || resource;
    const artistResource = resolveRelationship(resource, 'artists', includedMap);
    const coverUrl = getArtworkUrl(resource, includedMap);

    return {
        id: resource.id || attrs.id,
        title: attrs.title || attrs.name,
        cover: coverUrl || attrs.cover || null,
        numberOfTracks: attrs.numberOfTracks,
        artist: artistResource ? {
            id: artistResource.id,
            name: artistResource.attributes?.name
        } : attrs.artist
    };
}

function normalizeArtist(resource, includedMap = new Map()) {
    if (!resource) return null;

    const attrs = resource.attributes || resource;
    const pictureUrl = getArtworkUrl(resource, includedMap);

    return {
        id: resource.id || attrs.id,
        name: attrs.name,
        picture: pictureUrl || attrs.picture || null
    };
}

function normalizePlaylist(resource, includedMap = new Map()) {
    if (!resource) return null;

    const attrs = resource.attributes || resource;
    const coverUrl = getArtworkUrl(resource, includedMap);

    return {
        uuid: resource.id || attrs.uuid,
        title: attrs.title || attrs.name,
        description: attrs.description || '',
        numberOfTracks: attrs.numberOfItems || attrs.numberOfTracks || 0,
        image: coverUrl || attrs.image || null,
        squareImage: coverUrl || attrs.squareImage || null
    };
}

function wrapItems(items) {
    return items.filter(Boolean).map(item => ({ item }));
}

async function exchangeToken(body, clientId, clientSecret) {
    const response = await fetch(TIDAL_TOKEN_URL, {
        method: 'POST',
        headers: {
            'Authorization': getBasicAuthHeader(clientId, clientSecret),
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams(body).toString()
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const message = data.error_description || data.error || `Token request failed (${response.status})`;
        throw new Error(message);
    }
    return data;
}

async function refreshAccessToken() {
    if (!currentSession?.refreshToken) {
        throw new Error('Tidal session expired. Please log in again.');
    }

    const { clientId, clientSecret } = getConfig();
    const tokenData = await exchangeToken({
        grant_type: 'refresh_token',
        refresh_token: currentSession.refreshToken,
        client_id: clientId
    }, clientId, clientSecret);

    currentSession = {
        ...currentSession,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || currentSession.refreshToken,
        expiresAt: Date.now() + (tokenData.expires_in * 1000),
        scopes: tokenData.scope || currentSession.scopes
    };

    saveSession(currentSession);
    return currentSession;
}

async function ensureValidToken() {
    if (!currentSession?.accessToken) {
        throw new Error('Not authenticated with Tidal');
    }

    if (currentSession.expiresAt <= Date.now() + 60_000) {
        await refreshAccessToken();
    }
}

async function tidalRequest(path, options = {}) {
    await ensureValidToken();

    const url = new URL(path.startsWith('http') ? path : `${TIDAL_API_URL}${path}`);
    const params = new URLSearchParams(url.search);

    if (!params.has('countryCode') && currentSession.countryCode) {
        params.set('countryCode', currentSession.countryCode);
    }
    if (!params.has('locale')) {
        params.set('locale', DEFAULT_LOCALE);
    }
    if (options.limit && !params.has('page[limit]') && !params.has('limit')) {
        params.set('page[limit]', String(options.limit));
    }

    url.search = params.toString();

    const response = await fetch(url.toString(), {
        method: options.method || 'GET',
        headers: {
            'Authorization': `Bearer ${currentSession.accessToken}`,
            'Accept': 'application/vnd.api+json',
            'Content-Type': 'application/vnd.api+json',
            ...options.headers
        },
        body: options.body ? JSON.stringify(options.body) : undefined
    });

    const text = await response.text();
    let data = {};
    if (text) {
        try {
            data = JSON.parse(text);
        } catch {
            data = { raw: text };
        }
    }

    if (!response.ok) {
        if (response.status === 401) {
            await refreshAccessToken();
            return tidalRequest(path, options);
        }

        const detail = data?.errors?.[0]?.detail || data?.userMessage || data?.message || text;
        throw new Error(`Tidal API error (${response.status}): ${detail}`);
    }

    return data;
}

async function tidalV1Request(path, params = {}) {
    await ensureValidToken();

    const url = new URL(`${TIDAL_API_URL}${path.startsWith('/v1') ? path : `/v1${path}`}`);
    const search = new URLSearchParams(url.search);

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            search.set(key, String(value));
        }
    });

    if (!search.has('countryCode') && currentSession.countryCode) {
        search.set('countryCode', currentSession.countryCode);
    }

    url.search = search.toString();

    const response = await fetch(url.toString(), {
        headers: {
            'Authorization': `Bearer ${currentSession.accessToken}`,
            'Accept': 'application/json'
        }
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        if (response.status === 401) {
            await refreshAccessToken();
            return tidalV1Request(path, params);
        }
        const detail = data?.userMessage || data?.message || JSON.stringify(data);
        throw new Error(`Tidal API error (${response.status}): ${detail}`);
    }

    return data;
}

async function fetchCurrentUser() {
    const response = await tidalRequest('/users/me');
    const user = response.data;
    const attrs = user?.attributes || {};

    return {
        userId: user?.id,
        username: attrs.username || attrs.email,
        firstName: attrs.firstName,
        lastName: attrs.lastName,
        countryCode: attrs.country || attrs.countryCode || 'US'
    };
}

function waitForOAuthCallback(redirectUri) {
    closeOAuthServer();

    const redirect = new URL(redirectUri);
    const port = Number(redirect.port || 80);
    const expectedPath = redirect.pathname || '/callback';

    return new Promise((resolve, reject) => {
        const finish = (err, code) => {
            closeOAuthServer();
            if (err) reject(err);
            else resolve(code);
        };

        oauthServer = http.createServer((req, res) => {
            try {
                const reqUrl = new URL(req.url, redirectUri);

                if (reqUrl.pathname !== expectedPath) {
                    res.writeHead(404);
                    res.end('Not found');
                    return;
                }

                const error = reqUrl.searchParams.get('error');
                const errorDescription = reqUrl.searchParams.get('error_description');
                if (error) {
                    res.writeHead(400, { 'Content-Type': 'text/html' });
                    res.end('<h2>Tidal login failed</h2><p>You can close this window and return to teleCloud.</p>');
                    finish(new Error(errorDescription || error));
                    return;
                }

                const code = reqUrl.searchParams.get('code');
                const state = reqUrl.searchParams.get('state');

                if (!code) {
                    res.writeHead(400, { 'Content-Type': 'text/html' });
                    res.end('<h2>Missing authorization code</h2>');
                    return;
                }

                if (state !== oauthState) {
                    res.writeHead(400, { 'Content-Type': 'text/html' });
                    res.end('<h2>Invalid login state</h2>');
                    finish(new Error('OAuth state mismatch'));
                    return;
                }

                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end('<h2>Tidal login successful</h2><p>You can close this window and return to teleCloud.</p>');
                finish(null, code);
            } catch (err) {
                finish(err);
            }
        });

        oauthServer.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                finish(new Error('Tidal login port is busy. Close other teleCloud instances and try again.'));
                return;
            }
            finish(err);
        });

        oauthServer.listen(port, '127.0.0.1', () => {
            console.log(`Tidal OAuth callback listening on ${redirectUri}`);
        });

        oauthTimeout = setTimeout(() => {
            finish(new Error('Tidal login timed out after 5 minutes'));
        }, 5 * 60 * 1000);
    });
}

async function login() {
    closeOAuthServer();

    const { clientId, clientSecret, redirectUri } = getConfig();
    const { codeVerifier, codeChallenge } = generatePkcePair();
    oauthState = crypto.randomBytes(16).toString('hex');

    const authUrl = new URL(TIDAL_AUTH_URL);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', TIDAL_SCOPES);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('state', oauthState);

    try {
        const callbackPromise = waitForOAuthCallback(redirectUri);
        const { shell } = require('electron');
        const loginUrl = authUrl.toString();
        console.log('Opening Tidal OAuth URL:', loginUrl);
        console.log('Expected redirect URI:', redirectUri);
        console.log('Requested scopes:', TIDAL_SCOPES);
        await shell.openExternal(loginUrl);

        const code = await callbackPromise;
        const tokenData = await exchangeToken({
            grant_type: 'authorization_code',
            client_id: clientId,
            code,
            redirect_uri: redirectUri,
            code_verifier: codeVerifier
        }, clientId, clientSecret);

        currentSession = {
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            expiresAt: Date.now() + (tokenData.expires_in * 1000),
            scopes: tokenData.scope || TIDAL_SCOPES
        };

        const user = await fetchCurrentUser();
        currentSession = {
            ...currentSession,
            userId: user.userId,
            username: user.username,
            countryCode: user.countryCode
        };

        saveSession(currentSession);
        console.log('Tidal OAuth login successful for', currentSession.username);
        return currentSession;
    } finally {
        closeOAuthServer();
    }
}

function logout() {
    closeOAuthServer();
    currentSession = null;
    oauthState = null;
    store.delete('session');
    return { success: true };
}

async function restoreSession() {
    const savedSession = store.get('session');
    if (!savedSession?.accessToken && !savedSession?.refreshToken) {
        return null;
    }

    currentSession = savedSession;

    if (!savedSession.expiresAt || savedSession.expiresAt <= Date.now() + 60_000) {
        try {
            await refreshAccessToken();
            console.log('Tidal session refreshed');
        } catch (err) {
            console.error('Failed to refresh Tidal session:', err.message);
            currentSession = null;
            store.delete('session');
            return null;
        }
    } else {
        console.log('Tidal session restored');
    }

    return currentSession;
}

const COLLECTION_RESOURCES = {
    tracks: 'userCollectionTracks',
    albums: 'userCollectionAlbums',
    artists: 'userCollectionArtists',
    playlists: 'userCollectionPlaylists'
};

const DEFAULT_LOCALE = 'en_US';

function getSession() {
    return currentSession;
}

function parseCollectionResponse(response, relationship) {
    const includedMap = buildIncludedMap(response.included);
    const refs = Array.isArray(response.data) ? response.data : [response.data].filter(Boolean);

    return refs.map(ref => {
        const resource = includedMap.get(`${ref.type}:${ref.id}`) || ref;

        if (relationship === 'tracks') {
            return { item: normalizeTrack(resource, includedMap) };
        }
        if (relationship === 'albums') {
            return normalizeAlbum(resource, includedMap);
        }
        if (relationship === 'artists') {
            return normalizeArtist(resource, includedMap);
        }
        if (relationship === 'playlists') {
            return normalizePlaylist(resource, includedMap);
        }
        return resource;
    }).filter(Boolean);
}

async function getCollectionItems(relationship, limit = 50, include = '') {
    if (!currentSession?.userId) throw new Error('Not logged in');

    const resourceType = COLLECTION_RESOURCES[relationship];
    if (!resourceType) {
        throw new Error(`Unknown collection type: ${relationship}`);
    }

    // For tracks: the endpoint returns a SINGLE collection object.
    // Track IDs are in data.relationships.items.data — we must then batch-fetch full details.
    if (relationship === 'tracks') {
        // Step 1: Get collection to retrieve track ID list
        const collectionResponse = await tidalRequest(`/${resourceType}/me?include=items`);

        // data is a single object, not an array
        const trackRefs = collectionResponse.data?.relationships?.items?.data || [];
        if (trackRefs.length === 0) return [];

        // Step 2: Batch fetch full track details (artists, albums, cover art)
        const trackIds = trackRefs.map(ref => ref.id).slice(0, limit);
        const BATCH_SIZE = 20;
        let allTracks = [];

        for (let i = 0; i < trackIds.length; i += BATCH_SIZE) {
            const batch = trackIds.slice(i, i + BATCH_SIZE);
            try {
                const trackResponse = await tidalRequest(
                    `/tracks?filter[id]=${batch.join(',')}&include=artists,albums,coverArt`
                );
                const includedMap = buildIncludedMap(trackResponse.included);
                const tracks = (Array.isArray(trackResponse.data) ? trackResponse.data : [])
                    .map(track => normalizeTrack(track, includedMap))
                    .filter(Boolean);
                allTracks.push(...tracks);
            } catch (err) {
                console.warn(`Failed to fetch track batch at index ${i}:`, err.message);
            }
        }

        return wrapItems(allTracks);
    }

    // For other types like albums and artists, the old method works.
    const includeParam = include ? `&include=${include}` : '';
    const response = await tidalRequest(
        `/${resourceType}/${currentSession.userId}/items?page[limit]=${limit}${includeParam}`
    );

    return parseCollectionResponse(response, relationship);
}

async function getUserInfo() {
    if (!currentSession) throw new Error('Not logged in');
    const user = await fetchCurrentUser();
    return {
        userId: user.userId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        countryCode: user.countryCode
    };
}

// Track if we've already warned about mixes being unavailable
let mixWarningShown = false;

async function getForYou() {
    if (!currentSession) throw new Error('Not logged in');

    // Try the recommendations endpoint first (v2 API spec)
    try {
        const response = await tidalRequest('/recommendations?include=items&page[limit]=50');
        const includedMap = buildIncludedMap(response.included);
        const trackItems = (response.included || [])
            .filter(r => r.type === 'tracks')
            .map(track => ({ item: normalizeTrack(track, includedMap) }));

        if (trackItems.length > 0) {
            return {
                mixes: Array.isArray(response.data) ? response.data : [response.data].filter(Boolean),
                recommendations: trackItems
            };
        }
    } catch (err) {
        console.log('Recommendations endpoint unavailable:', err.message);
    }

    // Fallback to older endpoints
    const mixEndpoints = [
        `/userDailyMixes/${currentSession.userId}/relationships/items?include=items&page[limit]=50`,
        `/userRecommendations/${currentSession.userId}/discoveryMixes?include=discoveryMixes&page[limit]=10`
    ];

    for (const endpoint of mixEndpoints) {
        try {
            const response = await tidalRequest(endpoint);
            const includedMap = buildIncludedMap(response.included);
            const trackItems = (response.included || [])
                .filter(r => r.type === 'tracks')
                .map(track => ({ item: normalizeTrack(track, includedMap) }));

            if (trackItems.length > 0) {
                return {
                    mixes: Array.isArray(response.data) ? response.data : [response.data].filter(Boolean),
                    recommendations: trackItems
                };
            }
        } catch (err) {
            // Silently try next endpoint
            continue;
        }
    }

    // Only warn once per session about unavailable mixes
    if (!mixWarningShown) {
        console.log('Tidal mixes/recommendations not available for this account, showing favorite tracks instead');
        mixWarningShown = true;
    }

    return {
        mixes: [],
        recommendations: await getTracks(50)
    };
}

async function getRecentPlayed() {
    try {
        const response = await tidalRequest('/history/tracks?include=items&page[limit]=50');
        const includedMap = buildIncludedMap(response.included);
        const tracks = (response.included || [])
            .filter(r => r.type === 'tracks')
            .map(track => ({ item: normalizeTrack(track, includedMap) }));
        return tracks;
    } catch (err) {
        console.warn('Recent played history unavailable:', err.message);
        return [];
    }
}

async function getArtists(limit = 50) {
    return getCollectionItems('artists', limit);
}

async function getPlaylists(limit = 50) {
    try {
        const response = await tidalRequest(
            `/playlists?filter[r.owners.id]=${currentSession.userId}&include=coverArt,thumbnailArt&page[limit]=${limit}&sort=-lastModifiedAt`
        );
        const includedMap = buildIncludedMap(response.included);
        const playlists = Array.isArray(response.data) ? response.data : [response.data].filter(Boolean);
        return playlists.map(playlist => normalizePlaylist(playlist, includedMap));
    } catch (err) {
        console.warn('Playlist fetch failed, trying alternative endpoint:', err.message);
        const response = await tidalRequest(
            `/users/${currentSession.userId}/playlistsAndFavoritePlaylists?include=coverArt&page[limit]=${limit}`
        );
        const includedMap = buildIncludedMap(response.included);
        const playlists = Array.isArray(response.data) ? response.data : [response.data].filter(Boolean);
        return playlists.map(playlist => normalizePlaylist(playlist, includedMap));
    }
}

// Cursor-based paginated playlists fetch for infinite scroll
async function getPlaylistsPage(cursor = null, limit = 15) {
    if (!currentSession?.userId) throw new Error('Not logged in');

    let url;
    if (cursor) {
        url = cursor.startsWith('http') ? new URL(cursor).pathname + new URL(cursor).search : cursor;
    } else {
        url = `/playlists?filter[r.owners.id]=${currentSession.userId}&include=coverArt,thumbnailArt&page[limit]=${limit}&sort=-lastModifiedAt`;
    }

    try {
        const response = await tidalRequest(url);
        const includedMap = buildIncludedMap(response.included);
        const playlists = Array.isArray(response.data) ? response.data : [response.data].filter(Boolean);
        const nextCursor = response.links?.next || null;
        return {
            playlists: playlists.map(playlist => normalizePlaylist(playlist, includedMap)),
            nextCursor
        };
    } catch (err) {
        console.warn('Paginated playlist fetch failed:', err.message);
        return { playlists: [], nextCursor: null };
    }
}


async function getPlaylistTracks(playlistId, limit = 100) {
    let allTracks = [];
    let nextUrl = `/playlists/${playlistId}/relationships/items?include=items,items.artists,items.albums,items.albums.coverArt&page[limit]=100`;

    while (nextUrl) {
        const response = await tidalRequest(nextUrl);
        const includedMap = buildIncludedMap(response.included);
        const refs = Array.isArray(response.data) ? response.data : [];

        const tracks = refs.map(ref => {
            const resource = includedMap.get(`${ref.type}:${ref.id}`) || ref;
            return normalizeTrack(resource, includedMap);
        });

        allTracks.push(...tracks);

        const nextLink = response.links?.next;
        nextUrl = nextLink ? (nextLink.startsWith('http') ? new URL(nextLink).pathname + new URL(nextLink).search : nextLink) : null;
    }

    return wrapItems(allTracks);
}

// Cursor-based paginated playlist tracks for infinite scroll
async function getPlaylistTracksPage(playlistId, cursor = null, limit = 30) {
    if (!currentSession?.userId) throw new Error('Not logged in');

    let url;
    if (cursor) {
        url = cursor.startsWith('http') ? new URL(cursor).pathname + new URL(cursor).search : cursor;
    } else {
        url = `/playlists/${playlistId}/relationships/items?include=items,items.artists,items.albums,items.albums.coverArt&page[limit]=${limit}`;
    }

    try {
        const response = await tidalRequest(url);
        const includedMap = buildIncludedMap(response.included);
        const refs = Array.isArray(response.data) ? response.data : [];

        const tracks = refs.map(ref => {
            const resource = includedMap.get(`${ref.type}:${ref.id}`) || ref;
            return normalizeTrack(resource, includedMap);
        });

        const nextLink = response.links?.next;
        const nextCursor = nextLink ? (nextLink.startsWith('http') ? new URL(nextLink).pathname + new URL(nextLink).search : nextLink) : null;

        return {
            tracks: wrapItems(tracks),
            nextCursor
        };
    } catch (err) {
        console.warn('Paginated playlist tracks fetch failed:', err.message);
        return { tracks: [], nextCursor: null };
    }
}

async function getAlbums(limit = 50) {
    return getCollectionItems('albums', limit);
}

async function getAlbumTracks(albumId) {
    const response = await tidalRequest(
        `/albums/${albumId}/relationships/items?include=items&page[limit]=100`
    );
    const includedMap = buildIncludedMap(response.included);
    const refs = Array.isArray(response.data) ? response.data : [];
    return wrapItems(refs.map(ref => {
        const resource = includedMap.get(`${ref.type}:${ref.id}`) || ref;
        return normalizeTrack(resource, includedMap);
    }));
}

async function getTracks(limit = 50) {
    return getCollectionItems('tracks', limit);
}

// Cursor-based paginated track fetch for infinite scroll
async function getTracksPage(cursor = null, limit = 30) {
    if (!currentSession?.userId) throw new Error('Not logged in');

    const resourceType = COLLECTION_RESOURCES['tracks'];

    // Step 1: Get a page of track IDs from the collection
    let url;
    if (cursor) {
        // cursor is the full 'next' link path from previous response
        url = cursor.startsWith('http') ? new URL(cursor).pathname + new URL(cursor).search : cursor;
    } else {
        url = `/${resourceType}/me/relationships/items?page[limit]=${limit}`;
    }

    const collectionResponse = await tidalRequest(url);
    const trackRefs = Array.isArray(collectionResponse.data) ? collectionResponse.data : [];
    const nextCursor = collectionResponse.links?.next || null;

    if (trackRefs.length === 0) return { tracks: [], nextCursor: null };

    // Preserve original order from collection
    const orderedIds = trackRefs.map(ref => ref.id);

    // Step 2: Batch-fetch full track details
    const BATCH_SIZE = 20;
    const trackMap = new Map();

    for (let i = 0; i < orderedIds.length; i += BATCH_SIZE) {
        const batch = orderedIds.slice(i, i + BATCH_SIZE);
        try {
            const trackResponse = await tidalRequest(
                `/tracks?filter[id]=${batch.join(',')}&include=artists,albums,albums.coverArt`
            );
            const includedMap = buildIncludedMap(trackResponse.included);
            (Array.isArray(trackResponse.data) ? trackResponse.data : []).forEach(track => {
                const normalized = normalizeTrack(track, includedMap);
                if (normalized) trackMap.set(normalized.id, normalized);
            });
        } catch (err) {
            console.warn('Track batch fetch error:', err.message);
        }
    }

    // Return in original collection order
    const tracks = orderedIds.map(id => trackMap.get(id)).filter(Boolean);
    return {
        tracks: wrapItems(tracks),
        nextCursor
    };
}

async function search(query, type = 'TRACKS,ALBUMS,ARTISTS,PLAYLISTS', limit = 50) {
    if (!currentSession) throw new Error('Not logged in');

    const encodedQuery = encodeURIComponent(query);
    const include = ['tracks', 'albums', 'artists', 'playlists'].join(',');
    const response = await tidalRequest(`/searchResults/${encodedQuery}?include=${include}&page[limit]=${limit}`);
    const includedMap = buildIncludedMap(response.included);

    const result = {};
    const requestedTypes = type.split(',').map(t => t.trim().toUpperCase());

    if (requestedTypes.includes('TRACKS')) {
        result.tracks = { items: wrapItems((response.included || []).filter(r => r.type === 'tracks').map(r => normalizeTrack(r, includedMap))) };
    }
    if (requestedTypes.includes('ALBUMS')) {
        result.albums = { items: (response.included || []).filter(r => r.type === 'albums').map(r => normalizeAlbum(r, includedMap)) };
    }
    if (requestedTypes.includes('ARTISTS')) {
        result.artists = { items: (response.included || []).filter(r => r.type === 'artists').map(r => normalizeArtist(r, includedMap)) };
    }
    if (requestedTypes.includes('PLAYLISTS')) {
        result.playlists = { items: (response.included || []).filter(r => r.type === 'playlists').map(r => normalizePlaylist(r, includedMap)) };
    }

    return result;
}

function parsePlaybackManifest(manifestBase64) {
    const manifestBuffer = Buffer.from(manifestBase64, 'base64');
    const manifestText = manifestBuffer.toString('utf8');

    if (manifestText.includes('urn:mpeg:dash')) {
        // Try to extract a direct URL from the DASH manifest
        const directUrl = extractDashAudioUrl(manifestText);
        return { url: directUrl, codec: 'AAC', manifest: manifestText, type: directUrl ? 'direct' : 'dash' };
    }

    const manifest = JSON.parse(manifestText);
    return {
        url: manifest.urls?.[0] || null,
        codec: manifest.codecs || 'aac',
        quality: manifest.audioQuality,
        type: manifest.urls?.[0] ? 'direct' : 'manifest'
    };
}

// Extract a playable URL from a DASH manifest XML string
function extractDashAudioUrl(dashXml) {
    // Tidal DASH manifests typically have a BaseURL element with the CDN root
    // and SegmentTemplate with the initialization URL
    const baseUrlMatch = dashXml.match(/<BaseURL[^>]*>([^<]+)<\/BaseURL>/i);
    const baseUrl = baseUrlMatch?.[1]?.trim();

    if (baseUrl && baseUrl.startsWith('http')) {
        return baseUrl;
    }

    // Try extracting initialization from SegmentTemplate
    const initMatch = dashXml.match(/initialization="([^"]+)"/i);
    if (initMatch) {
        const init = initMatch[1].replace('$RepresentationID$', '0');
        if (init.startsWith('http')) return init;
        if (baseUrl) return baseUrl + init;
    }

    return null;
}

async function getStreamUrl(trackId, quality = 'HIGH') {
    if (!currentSession) throw new Error('Not logged in');

    const audioQuality = {
        LOW: 'LOW',
        HIGH: 'HIGH',
        LOSSLESS: 'LOSSLESS',
        HIFI: 'LOSSLESS',
        MASTER: 'HI_RES_LOSSLESS'
    }[quality] || 'HIGH';

    // Try BTS (Beat The Stream) manifest — returns a direct CDN URL playable by HTML5 audio
    try {
        const response = await tidalV1Request(`/tracks/${trackId}/playbackinfopostpaywall`, {
            audioQuality: audioQuality,
            assetpresentation: 'FULL',
            playbackmode: 'STREAM'
        });

        const parsed = parsePlaybackManifest(response.manifest);
        if (parsed.url) {
            console.log('[Tidal] Got direct stream URL, codec:', parsed.codec);
            return {
                url: parsed.url,
                codec: parsed.codec,
                quality: audioQuality,
                type: 'direct'
            };
        }
        // It was a DASH manifest — save it for MPV fallback
        if (parsed.type === 'dash') {
            console.log('[Tidal] Got DASH manifest (30s cap), returning as-is for MPV');
            return {
                url: parsed.manifest,
                codec: 'DASH',
                quality: audioQuality,
                type: 'dash'
            };
        }
    } catch (err) {
        console.warn('Legacy playback endpoint failed:', err.message);
    }

    // Last resort: v2 trackManifests (MPEG_DASH URI — not playable in HTML5 audio)
    const qualityFormats = {
        LOW: ['HEAACV1'],
        HIGH: ['AACLC'],
        LOSSLESS: ['FLAC'],
        HIFI: ['FLAC'],
        MASTER: ['FLAC_HIRES']
    };
    const formats = (qualityFormats[quality] || qualityFormats.HIGH);
    const params = new URLSearchParams({
        usage: 'PLAYBACK',
        manifestType: 'MPEG_DASH',
        uriScheme: 'HTTPS',
        adaptive: 'true'
    });
    formats.forEach(format => params.append('formats', format));

    const v2Response = await tidalRequest(`/trackManifests/${trackId}?${params.toString()}`);
    const uri = v2Response.data?.attributes?.uri;
    if (uri) {
        return { url: uri, codec: formats[0], quality, type: 'dash' };
    }

    throw new Error('No playable stream URL returned by Tidal');
}

async function getTracksByIds(trackIds) {
    if (trackIds.length === 0) return [];

    // Use filter[id] for v2 API
    const response = await tidalRequest(`/tracks?filter[id]=${trackIds.join(',')}&include=artists,albums,coverArt`);
    const includedMap = buildIncludedMap(response.included);

    // Create a map to preserve order
    const tracksById = new Map(response.data.map(track => [track.id, normalizeTrack(track, includedMap)]));

    // Return in the original order
    return trackIds.map(id => tracksById.get(id)).filter(Boolean);
}

async function getTrack(trackId) {
    const response = await tidalRequest(`/tracks/${trackId}?include=artists,albums`);
    return normalizeTrack(response.data, buildIncludedMap(response.included));
}

async function getAlbum(albumId) {
    const response = await tidalRequest(`/albums/${albumId}?include=artists,coverArt`);
    return normalizeAlbum(response.data, buildIncludedMap(response.included));
}

async function getArtist(artistId) {
    const response = await tidalRequest(`/artists/${artistId}?include=profileArt`);
    return normalizeArtist(response.data, buildIncludedMap(response.included));
}

module.exports = {
    login,
    logout,
    restoreSession,
    getSession,
    getUserInfo,
    getForYou,
    getRecentPlayed,
    getArtists,
    getPlaylists,
    getPlaylistsPage,
    getPlaylistTracks,
    getPlaylistTracksPage,
    getAlbums,
    getAlbumTracks,
    getTracks,
    getTracksPage,
    search,
    getStreamUrl,
    getTrack,
    getAlbum,
    getArtist
};
