// TeleCloud Sync - IPC Handlers
// Handles Telegram authentication and sync operations for TeleCloud Sync feature

const { ipcMain, shell } = require('electron');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { Api } = require('telegram/tl');
const { CustomFile } = require('telegram/client/uploads'); // FIX: Added to prevent Object type issues
const ElectronStore = require('electron-store');
const CredentialManager = require('../src/utils/credentialManager');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const crypto = require('crypto');
const os = require('os');

// NOTE: Top-level database imports are REMOVED here to prevent Case A circular dependency loops.
// Instead, they are imported dynamically ("lazy loaded") inside the specific functions.

// Initialize secure store for TeleCloud Sync
const store = new ElectronStore.default({
    name: 'telecloud-sync',
    encryptionKey: 'telecloud-sync-secure-key-v1'
});

// Initialize credential manager
const credentialManager = new CredentialManager(store);

// Telegram client instance (persistent)
let telegramClient = null;
let tempCredentials = {}; // Temporary storage during setup
let isSyncInProgress = false; // Track sync state
let shouldStopSync = false; // Flag to stop sync operation
let syncProgressCallback = null; // Callback for sync progress updates

/**
 * Initialize TeleCloud Sync IPC handlers
 */
function setupTeleCloudSyncHandlers() {
    console.log('[TeleCloudSync] Setting up IPC handlers...');

    // Open external URL
    ipcMain.handle('open-external', async (event, url) => {
        try {
            await shell.openExternal(url);
            return { success: true };
        } catch (error) {
            console.error('[TeleCloudSync] Error opening URL:', error);
            return { success: false, error: error.message };
        }
    });

    // Check if user is authenticated
    ipcMain.handle('telecloud-sync:check-auth', async () => {
        try {
            const isAuthenticated = credentialManager.isAuthenticated();
            if (isAuthenticated) {
                const creds = credentialManager.getCredentials();

                // Calculate actual synced items and storage
                // ☁️ TeleCloud Sync: Count from sync_state to be most accurate for total library status
                const { getSyncState } = require('./database');
                const allSyncState = getSyncState();
                const syncedFiles = allSyncState.filter(s => s.sync_status === 'synced');

                // Get sizes from music_files for storage calculation
                const { getAllFiles } = require('./database');
                const allFiles = getAllFiles();
                const fileMap = new Map(allFiles.map(f => [f.path, f]));

                const storageUsed = syncedFiles.reduce((total, s) => {
                    const file = fileMap.get(s.file_path);
                    return total + (file ? (file.size || 0) : 0);
                }, 0);

                return {
                    success: true,
                    isAuthenticated: true,
                    phoneNumber: creds.phoneNumber,
                    lastSync: creds.lastSync,
                    syncedItems: syncedFiles.length,
                    storageUsed: storageUsed,
                    storageLocation: creds.storageLocation || 'saved_messages'
                };
            }
            return { success: true, isAuthenticated: false };
        } catch (error) {
            console.error('[TeleCloudSync] Error checking auth:', error);
            return { success: false, error: error.message };
        }
    });

    // Save temporary credentials during setup
    ipcMain.handle('telecloud-sync:save-temp-credentials', async (event, { apiId, apiHash }) => {
        try {
            tempCredentials = { apiId, apiHash };
            return { success: true };
        } catch (error) {
            console.error('[TeleCloudSync] Error saving temp credentials:', error);
            return { success: false, error: error.message };
        }
    });

    // Send verification code
    ipcMain.handle('telecloud-sync:send-code', async (event, { phoneNumber, apiId, apiHash }) => {
        try {
            console.log('[TeleCloudSync] Sending verification code to:', phoneNumber);

            // Use temp credentials if provided, otherwise from args
            const finalApiId = apiId || tempCredentials.apiId;
            const finalApiHash = apiHash || tempCredentials.apiHash;

            if (!finalApiId || !finalApiHash) {
                throw new Error('API credentials not provided');
            }

            // Create new Telegram client with empty session
            const session = new StringSession('');
            telegramClient = new TelegramClient(
                session,
                parseInt(finalApiId),
                finalApiHash,
                {
                    connectionRetries: 5,
                }
            );

            await telegramClient.connect();

            // Send code and store the phoneCodeHash
            const result = await telegramClient.sendCode(
                {
                    apiId: parseInt(finalApiId),
                    apiHash: finalApiHash
                },
                phoneNumber
            );

            // Store phone number and phoneCodeHash temporarily
            tempCredentials.phoneNumber = phoneNumber;
            tempCredentials.phoneCodeHash = result.phoneCodeHash;

            return { success: true };
        } catch (error) {
            console.error('[TeleCloudSync] Error sending code:', error);
            if (telegramClient) {
                try {
                    await telegramClient.disconnect();
                } catch (e) {
                    console.error('[TeleCloudSync] Error disconnecting:', e);
                }
                telegramClient = null;
            }
            return { success: false, error: error.message || 'Failed to send verification code' };
        }
    });

    // Verify code and complete authentication
    ipcMain.handle('telecloud-sync:verify-code', async (event, { code, phoneNumber }) => {
        try {
            console.log('[TeleCloudSync] Verifying code...');

            if (!telegramClient) {
                throw new Error('No active Telegram session');
            }

            if (!tempCredentials.phoneCodeHash) {
                throw new Error('Phone code hash not found. Please request a new code.');
            }

            // Sign in with the code using raw Telegram API
            await telegramClient.invoke(
                new Api.auth.SignIn({
                    phoneNumber: phoneNumber,
                    phoneCodeHash: tempCredentials.phoneCodeHash,
                    phoneCode: code
                })
            );

            console.log('[TeleCloudSync] Authentication successful!');

            // Get the session string for persistence
            const sessionString = telegramClient.session.save();

            // Store credentials temporarily (will be saved permanently in complete-setup)
            tempCredentials.session = sessionString;
            tempCredentials.phoneNumber = phoneNumber;

            return { success: true };
        } catch (error) {
            console.error('[TeleCloudSync] Error verifying code:', error);
            return { success: false, error: error.message || 'Invalid verification code' };
        }
    });

    // Complete setup and save configuration
    ipcMain.handle('telecloud-sync:complete-setup', async (event, config) => {
        try {
            console.log('[TeleCloudSync] Completing setup...');

            // Save all credentials permanently
            credentialManager.saveCredentials({
                apiId: tempCredentials.apiId,
                apiHash: tempCredentials.apiHash,
                phoneNumber: tempCredentials.phoneNumber,
                session: tempCredentials.session,
                enabled: true,
                autoSync: config.syncMode === 'auto',
                syncAudioFiles: config.syncAudioFiles,
                storageLocation: config.storageLocation,
                channelId: config.customChannelId,
                playbackMode: config.playbackMode,
                cacheLimit: config.cacheLimit,
                lastSync: null,
                musicFolders: config.musicFolders // FIX: Persist music folders
            });

            // Clear temp credentials
            tempCredentials = {};

            // If private channel is selected, create it
            if (config.storageLocation === 'private_channel' && telegramClient) {
                try {
                    const channelResult = await createPrivateChannel();
                    if (channelResult.success) {
                        console.log('[TeleCloudSync] Created private channel:', channelResult.channelId);
                    }
                } catch (channelError) {
                    console.error('[TeleCloudSync] Error creating channel:', channelError);
                    // Don't fail the setup if channel creation fails
                }
            }

            return { success: true };
        } catch (error) {
            console.error('[TeleCloudSync] Error completing setup:', error);
            return { success: false, error: error.message };
        }
    });

    // Disconnect and clear credentials
    ipcMain.handle('telecloud-sync:disconnect', async () => {
        try {
            console.log('[TeleCloudSync] Disconnecting...');

            if (telegramClient) {
                await telegramClient.disconnect();
                telegramClient = null;
            }

            credentialManager.deleteCredentials();
            tempCredentials = {};

            return { success: true };
        } catch (error) {
            console.error('[TeleCloudSync] Error disconnecting:', error);
            return { success: false, error: error.message };
        }
    });

    // Check sync status
    ipcMain.handle('telecloud-sync:check-sync-status', async () => {
        return { isSyncing: isSyncInProgress };
    });

    // Stop sync (manual trigger)
    ipcMain.handle('telecloud-sync:stop-sync', async () => {
        try {
            if (!isSyncInProgress) {
                return { success: false, error: 'No sync in progress' };
            }
            console.log('[TeleCloudSync] Stop sync requested');
            shouldStopSync = true;
            return { success: true };
        } catch (error) {
            console.error('[TeleCloudSync] Error stopping sync:', error);
            return { success: false, error: error.message };
        }
    });

    // Sync now (manual trigger)
    ipcMain.handle('telecloud-sync:sync-now', async (event) => {
        try {
            // Prevent concurrent syncs
            if (isSyncInProgress) {
                return { success: false, error: 'Sync already in progress' };
            }

            isSyncInProgress = true;
            console.log('[TeleCloudSync] Starting manual sync...');

            // Check if authenticated
            if (!credentialManager.isAuthenticated()) {
                throw new Error('Not authenticated');
            }

            // Reconnect if needed
            if (!telegramClient) {
                const creds = credentialManager.getCredentials();
                const session = new StringSession(creds.session);
                telegramClient = new TelegramClient(
                    session,
                    parseInt(creds.apiId),
                    creds.apiHash,
                    { connectionRetries: 5 }
                );
                await telegramClient.connect();
            }

            // Get credentials
            const creds = credentialManager.getCredentials();
            if (!creds.channelId) {
                throw new Error('No channel ID configured. Please complete setup first.');
            }

            // FIX: Lazy-load database to break circular import cycle
            const { getAllFiles, getSyncState } = require('./database');
            let localFiles = getAllFiles();

            // If the database is empty, it's likely after a 'Delete All'.
            // Trigger a library scan to repopulate the database before syncing.
            if (localFiles.length === 0) {
                console.log('[TeleCloudSync] Database is empty. Triggering a library scan before sync...');
                // We need to get the music folders from settings.
                const musicFolders = credentialManager.getCredentials()?.musicFolders || [];
                if (musicFolders.length > 0) {
                    const { scanWithDatabaseCache } = require('./music');
                    await scanWithDatabaseCache(musicFolders, null); // Run scan silently
                    localFiles = getAllFiles(); // Re-fetch files after scan
                    console.log(`[TeleCloudSync] Library scan complete. Found ${localFiles.length} files.`);
                } else {
                    console.warn('[TeleCloudSync] Cannot scan library: No music folders configured.');
                }
            }

            // Filter audio files only
            const audioFiles = localFiles.filter(f => {
                const ext = path.extname(f.path).toLowerCase();
                return ['.flac', '.mp3', '.wav', '.m4a', '.ogg'].includes(ext);
            });

            // Filter to only files that need syncing (exclude only successfully synced files)
            const MAX_RETRIES = 3;
            const filesToSync = audioFiles.filter(f => {
                // ☁️ FIX: Don't try to "upload" cloud-only files that are just placeholders
                if (f.storage_type === 'cloud') {
                    return false;
                }
                const syncState = getSyncState(f.path);
                // Include all files except those that are successfully synced
                return !syncState || syncState.sync_status !== 'synced';
            });

            console.log(`[TeleCloudSync] Found ${audioFiles.length} audio files (${filesToSync.length} need syncing)`);
            console.log('[TeleCloudSync] ==========================================');

            // --- Pre-flight check: Fetch existing cloud files to avoid duplicates ---
            let channelEntity;
            try {
                channelEntity = await telegramClient.getEntity(parseInt(creds.channelId));
            } catch (e) {
                channelEntity = await telegramClient.getEntity(parseInt(`-100${creds.channelId}`));
            }

            console.log(`[TeleCloudSync] Fetching cloud index from channel to prevent duplicates...`);
            const messages = await telegramClient.getMessages(channelEntity, { limit: null });

            // Map of checksum -> messageId
            const cloudFilesMap = new Map();
            for (const msg of messages) {
                if (msg.media && msg.message) {
                    try {
                        const meta = JSON.parse(msg.message);
                        if (meta.checksum) {
                            cloudFilesMap.set(meta.checksum, msg.id);
                        }
                    } catch (e) { /* ignore */ }
                }
            }
            console.log(`[TeleCloudSync] Built cloud index with ${cloudFilesMap.size} existing files.`);
            // -------------------------------------------------------------------------

            // Upload files that aren't synced yet
            let uploadedCount = 0;
            let failedCount = 0;
            let skippedCount = audioFiles.length - filesToSync.length;
            let linkedCount = 0;
            const failedFiles = [];

            for (let i = 0; i < filesToSync.length; i++) {
                // Check if stop was requested (silent check, event sent in catch block)
                if (shouldStopSync) {
                    console.log('\n[TeleCloudSync] Sync stopped by user');
                    break;
                }

                const file = filesToSync[i];
                const fileName = path.basename(file.path);

                const syncState = getSyncState(file.path);
                const shouldUpload = !syncState ||
                    syncState.sync_status === 'pending_upload' ||
                    (syncState.sync_status === 'error' && (syncState.retry_count || 0) < MAX_RETRIES);

                if (shouldUpload) {
                    // Send progress update to frontend (initial state, 0% upload)
                    event.sender.send('telecloud-sync:progress', {
                        currentFile: fileName,
                        current: uploadedCount + linkedCount + 1,
                        total: filesToSync.length,
                        uploadProgress: 0
                    });

                    try {
                        // Calculate checksum to check against cloud index
                        const localChecksum = await calculateChecksum(file.path);

                        if (cloudFilesMap.has(localChecksum)) {
                            // File already exists in the cloud, link it without re-uploading
                            const existingMessageId = cloudFilesMap.get(localChecksum);

                            const { updateSyncState, updateCloudMetadata } = require('./database');
                            updateSyncState(file.path, {
                                telegram_message_id: existingMessageId,
                                telegram_channel_id: creds.channelId,
                                cloud_checksum: localChecksum,
                                sync_status: 'synced',
                                upload_progress: 100,
                                last_synced_at: new Date().toISOString(),
                                error_message: null
                            });

                            updateCloudMetadata(file.path, {
                                storage_type: 'both',
                                telegram_message_id: existingMessageId,
                                telegram_channel_id: creds.channelId,
                                cloud_checksum: localChecksum,
                                last_synced_at: new Date().toISOString()
                            });

                            linkedCount++;
                            console.log(`\r[${uploadedCount + linkedCount}/${filesToSync.length}] ${fileName} ✓ ALREADY IN CLOUD (Linked)`);
                            continue;
                        }

                        const result = await uploadTrack(file, creds.channelId, (progress) => {
                            // Check stop flag during upload
                            if (shouldStopSync) {
                                throw new Error('STOP_REQUESTED');
                            }

                            // Progress bar: [1/67] Song.flac [=====>    ] 45%
                            const barLength = 20;
                            const filled = Math.floor((progress / 100) * barLength);
                            const empty = barLength - filled;
                            const bar = '='.repeat(filled) + '>'.padEnd(empty, ' ');
                            process.stdout.write(`\r[${uploadedCount + linkedCount + 1}/${filesToSync.length}] ${fileName} [${bar}] ${progress}%`);

                            // Send detailed progress to frontend
                            event.sender.send('telecloud-sync:progress', {
                                currentFile: fileName,
                                current: uploadedCount + linkedCount + 1,
                                total: filesToSync.length,
                                uploadProgress: progress
                            });
                        });

                        if (result.success) {
                            uploadedCount++;
                            console.log(`\r[${uploadedCount + linkedCount}/${filesToSync.length}] ${fileName} ✓ SUCCESS`);
                        } else {
                            failedCount++;
                            failedFiles.push({ file: fileName, error: result.error });
                            console.log(`\r[${uploadedCount + linkedCount + 1}/${filesToSync.length}] ${fileName} ✗ FAILED: ${result.error}`);
                        }
                    } catch (error) {
                        // Check if stop was requested
                        if (error.message === 'STOP_REQUESTED' || shouldStopSync) {
                            console.log('\n[TeleCloudSync] Sync stopped during upload');
                            event.sender.send('telecloud-sync:stopped');
                            break;
                        }

                        failedCount++;
                        failedFiles.push({ file: fileName, error: error.message });
                        console.log(`\r[${uploadedCount + linkedCount + 1}/${filesToSync.length}] ${fileName} ✗ ERROR: ${error.message}`);
                    }
                } else if (syncState && syncState.sync_status === 'synced') {
                    skippedCount++;
                } else {
                    skippedCount++;
                }
            }

            console.log('\n[TeleCloudSync] ==========================================');
            console.log(`[TeleCloudSync] Sync Complete:`);
            console.log(`[TeleCloudSync]   ✓ Uploaded: ${uploadedCount} files`);
            console.log(`[TeleCloudSync]   ✓ Linked (already in cloud): ${linkedCount} files`);
            console.log(`[TeleCloudSync]   ✗ Failed: ${failedCount} files`);
            console.log(`[TeleCloudSync]   ⊘ Skipped: ${skippedCount} files`);

            if (failedFiles.length > 0) {
                console.log('\n[TeleCloudSync] Failed Files:');
                failedFiles.forEach(({ file, error }) => {
                    console.log(`[TeleCloudSync]   - ${file}: ${error}`);
                });
            }

            console.log('[TeleCloudSync] ==========================================\n');

            // Update last sync time
            credentialManager.updateCredentials({
                lastSync: new Date().toISOString()
            });

            return { success: true, uploadedCount };
        } catch (error) {
            console.error('[TeleCloudSync] Error during sync:', error);
            return { success: false, error: error.message };
        } finally {
            isSyncInProgress = false;
            shouldStopSync = false; // Reset stop flag
            console.log('[TeleCloudSync] Sync state cleared');
        }
    });

    // Upload track to Telegram
    ipcMain.handle('telecloud-sync:upload-track', async (event, track) => {
        try {
            const creds = credentialManager.getCredentials();
            if (!creds || !creds.channelId) {
                return { success: false, error: 'No channel ID configured' };
            }

            return await uploadTrack(track, creds.channelId, (progress) => {
                event.sender.send('telecloud-sync:upload-progress', { path: track.path, progress });
            });
        } catch (error) {
            console.error('[TeleCloudSync] Upload track error:', error);
            return { success: false, error: error.message };
        }
    });

    // Download track from Telegram
    ipcMain.handle('telecloud-sync:download-track', async (event, { metadata, targetPath }) => {
        try {
            return await downloadTrack(metadata, targetPath, (progress) => {
                event.sender.send('telecloud-sync:download-progress', { path: metadata.path, progress });
            });
        } catch (error) {
            console.error('[TeleCloudSync] Download track error:', error);
            return { success: false, error: error.message };
        }
    });

    // Get stream URL for track
    ipcMain.handle('telecloud-sync:get-stream-url', async (event, file) => {
        try {
            return await getTelegramStreamUrl(file);
        } catch (error) {
            console.error('[TeleCloudSync] Get stream URL error:', error);
            return { success: false, error: error.message };
        }
    });

    // Delete all files from channel AND local database (the big reset button)
    ipcMain.handle('telecloud-sync:delete-all', async () => {
        try {
            console.log('[TeleCloudSync] DELETING ALL TELECLOUD DATA...');

            const creds = credentialManager.getCredentials();
            if (!creds || !creds.channelId) {
                // Even if no channel is configured, we should still wipe the local DB tables.
                console.log('[TeleCloudSync] No channel configured, but clearing local sync database...');
                const { clearSyncData } = require('./database');
                clearSyncData();
                return { success: true, deletedCount: 0, dbCleared: true };
            }

            await ensureConnected();

            // Get channel entity
            let channelEntity;
            try {
                channelEntity = await telegramClient.getEntity(parseInt(creds.channelId));
            } catch (entityError) {
                // Try again with the format for private channels
                channelEntity = await telegramClient.getEntity(parseInt(`-100${creds.channelId}`));
            }

            // Fetch ALL message IDs from the channel
            const messageIds = [];
            const messagesIterator = telegramClient.iterMessages(channelEntity, { limit: 100 });
            for await (const message of messagesIterator) {
                messageIds.push(message.id);
            }
            console.log(`[TeleCloudSync] Found ${messageIds.length} messages to delete from Telegram channel.`);

            // Delete messages in chunks of 100 (API limit)
            let deletedCount = 0;
            for (let i = 0; i < messageIds.length; i += 100) {
                const chunk = messageIds.slice(i, i + 100);
                await telegramClient.deleteMessages(channelEntity, chunk, { revoke: true });
                deletedCount += chunk.length;
                console.log(`[TeleCloudSync] Deleted ${deletedCount}/${messageIds.length} messages...`);
            }

            // NUKE THE DATABASE TABLES
            // This is the critical fix: ensure the database is completely empty for a true fresh start.
            const { clearSyncData } = require('./database');
            clearSyncData();

            console.log(`[TeleCloudSync] Successfully deleted ${deletedCount} messages and cleared local database.`);
            return { success: true, deletedCount, dbCleared: true };
        } catch (error) {
            console.error('[TeleCloudSync] Error deleting all data:', error);

            // Even if Telegram deletion fails, try to clear the DB as a fallback.
            try {
                const { clearSyncData } = require('./database');
                clearSyncData();
                console.log('[TeleCloudSync] Telegram deletion failed, but local database was cleared.');
            } catch (dbError) {
                console.error('[TeleCloudSync] Critical error: Failed to delete from Telegram AND failed to clear database:', dbError);
            }

            return { success: false, error: error.message };
        }
    });

    // Restore library from cloud
    ipcMain.handle('telecloud-sync:restore-from-cloud', async () => {
        try {
            console.log('[TeleCloudSync] Starting restore from cloud...');
            const result = await restoreFromCloud();
            console.log('[TeleCloudSync] Restore from cloud finished.');
            return result;
        } catch (error) {
            console.error('[TeleCloudSync] Error restoring from cloud:', error);
            return { success: false, error: error.message };
        }
    });

    console.log('[TeleCloudSync] IPC handlers registered successfully');
}

/**
 * Calculate SHA256 checksum of a file
 */
async function calculateChecksum(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fsSync.createReadStream(filePath);

        stream.on('data', chunk => hash.update(chunk));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
    });
}

/**
 * Ensure Telegram client is connected
 */
async function ensureConnected() {
    if (!telegramClient || !telegramClient.connected) {
        const creds = credentialManager.getCredentials();
        if (!creds || !creds.session) {
            throw new Error('No saved session found');
        }

        const session = new StringSession(creds.session);
        telegramClient = new TelegramClient(
            session,
            parseInt(creds.apiId),
            creds.apiHash,
            { connectionRetries: 5 }
        );
        await telegramClient.connect();
        console.log('[TeleCloudSync] Reconnected to Telegram');
    }
    return telegramClient;
}

/**
 * Create a private channel for TeleCloud storage
 */
async function createPrivateChannel(channelName = 'TeleCloud Music Library') {
    try {
        await ensureConnected();

        const result = await telegramClient.invoke(
            new Api.channels.CreateChannel({
                title: channelName,
                about: 'Private music library storage for TeleCloud',
                megagroup: false,
                broadcast: true
            })
        );

        const channelId = result.chats[0].id.toString();
        console.log('[TeleCloudSync] Created private channel:', channelId);

        // Update credentials with channel ID
        credentialManager.updateCredentials({ channelId });

        return { success: true, channelId };
    } catch (error) {
        console.error('[TeleCloudSync] Error creating channel:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Upload a track to Telegram
 * @param {Object} track - Track metadata with path
 * @param {string} channelId - Target channel ID
 * @param {Function} onProgress - Progress callback
 */
async function uploadTrack(track, channelId, onProgress) {
    // FIX: Lazy-load database to prevent circular dependency at initial boot
    const { updateSyncState, getSyncState } = require('./database');

    try {
        await ensureConnected();

        const filePath = track.path;
        const fileName = path.basename(filePath);
        const fileSize = (await fs.stat(filePath)).size;

        // FIX: Read file buffer once, then calculate checksum directly from buffer (speeds up upload)
        const fileBuffer = await fs.readFile(filePath);
        const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

        // Update sync state
        updateSyncState(filePath, {
            sync_status: 'uploading',
            local_checksum: checksum,
            upload_progress: 0
        });

        // FIX: Wrap inside CustomFile to resolve Electron type detector object failures
        const customFile = new CustomFile(fileName, fileSize, filePath, fileBuffer);

        // FIX: Handle both flat (database) and nested (frontend) metadata structures
        const title = track.metadata?.title || track.title || fileName;
        const artist = track.metadata?.artist || track.artist || 'Unknown';
        const album = track.metadata?.album || track.album || 'Unknown';
        const duration = track.metadata?.duration || track.duration || 0;

        // Send to channel with metadata as caption
        const caption = JSON.stringify({
            title,
            artist,
            album,
            duration,
            checksum: checksum
        });

        // Get channel entity first (required for proper peer resolution)
        let channelEntity;
        try {
            channelEntity = await telegramClient.getEntity(channelId);
        } catch (entityError) {
            const channelPeerId = `-100${channelId}`;
            channelEntity = await telegramClient.getEntity(channelPeerId);
        }

        const message = await telegramClient.sendFile(channelEntity, {
            file: customFile,
            caption: caption,
            forceDocument: true,
            progressCallback: (progressFraction) => {
                if (onProgress) {
                    // GramJS progress callback returns float between 0.0 and 1.0
                    onProgress(Math.round(progressFraction * 100));
                }
            },
            attributes: [new Api.DocumentAttributeFilename({ fileName })]
        });

        const messageId = message.id;

        // Update sync state with success
        updateSyncState(filePath, {
            telegram_message_id: messageId,
            telegram_channel_id: channelId,
            cloud_checksum: checksum,
            sync_status: 'synced',
            upload_progress: 100,
            last_synced_at: new Date().toISOString(),
            error_message: null
        });

        // Update cloud metadata in music_files table
        const { updateCloudMetadata } = require('./database');
        updateCloudMetadata(filePath, {
            storage_type: 'both', // File exists locally and on cloud
            telegram_message_id: messageId,
            telegram_channel_id: channelId,
            cloud_checksum: checksum,
            last_synced_at: new Date().toISOString()
        });

        return { success: true, messageId, checksum };
    } catch (error) {
        console.error('[TeleCloudSync] Upload error:', error);

        // Update sync state with error
        updateSyncState(track.path, {
            sync_status: 'error',
            error_message: error.message,
            retry_count: (getSyncState(track.path)?.retry_count || 0) + 1
        });

        return { success: false, error: error.message };
    }
}

/**
 * Download a track from Telegram
 * @param {Object} metadata - Track metadata with telegram_message_id
 * @param {string} targetPath - Download destination path
 * @param {Function} onProgress - Progress callback
 */
async function downloadTrack(metadata, targetPath, onProgress) {
    // FIX: Lazy-load database to prevent circular dependency
    const { updateSyncState, getSyncState } = require('./database');

    try {
        await ensureConnected();

        const messageId = metadata.telegram_message_id;
        const channelId = metadata.telegram_channel_id;

        if (!messageId || !channelId) {
            throw new Error('Missing Telegram message ID or channel ID');
        }

        console.log(`[TeleCloudSync] Downloading message ${messageId} from channel ${channelId}`);

        // Update sync state
        updateSyncState(metadata.path, {
            sync_status: 'downloading',
            download_progress: 0
        });

        // Get channel entity first (required for proper peer resolution)
        let channelEntity;
        try {
            channelEntity = await telegramClient.getEntity(parseInt(channelId));
        } catch (entityError) {
            const channelPeerId = `-100${channelId}`;
            channelEntity = await telegramClient.getEntity(parseInt(channelPeerId));
        }

        // Get the message
        const messages = await telegramClient.getMessages(channelEntity, {
            ids: [messageId]
        });

        if (!messages || messages.length === 0) {
            throw new Error('Message not found');
        }

        const message = messages[0];
        if (!message.media) {
            throw new Error('No media in message');
        }

        // Progress threshold safeguard to avoid spamming SQLite database with micro-updates
        let lastLoggedProgress = 0;

        // Download file with progress tracking
        const buffer = await telegramClient.downloadMedia(message.media, {
            progressCallback: (downloaded, total) => {
                const progress = Math.round((downloaded / total) * 100);
                if (onProgress) onProgress(progress);

                // Update database only when progress reaches next 10% bracket
                if (progress >= lastLoggedProgress + 10) {
                    lastLoggedProgress = Math.floor(progress / 10) * 10;
                    updateSyncState(metadata.path, {
                        download_progress: lastLoggedProgress
                    });
                }
            }
        });

        // Write to file
        await fs.writeFile(targetPath, buffer);

        // Verify checksum
        const downloadedChecksum = await calculateChecksum(targetPath);
        if (metadata.cloud_checksum && downloadedChecksum !== metadata.cloud_checksum) {
            await fs.unlink(targetPath); // Delete corrupted file
            throw new Error('Checksum mismatch - file may be corrupted');
        }

        // Update sync state
        updateSyncState(metadata.path, {
            sync_status: 'cached',
            download_progress: 100,
            error_message: null
        });

        console.log(`[TeleCloudSync] Downloaded successfully to: ${targetPath}`);

        return { success: true, path: targetPath, checksum: downloadedChecksum };
    } catch (error) {
        console.error('[TeleCloudSync] Download error:', error);

        // Update sync state with error
        updateSyncState(metadata.path, {
            sync_status: 'error',
            error_message: error.message,
            retry_count: (getSyncState(metadata.path)?.retry_count || 0) + 1
        });

        return { success: false, error: error.message };
    }
}

/**
 * Get a streaming URL for a Telegram file (for direct playback without download)
 * @param {Object} file - Track metadata with telegram_message_id
 */
async function getTelegramStreamUrl(file) {
    try {
        await ensureConnected();

        const messageId = file.telegram_message_id;
        const channelId = file.telegram_channel_id;

        if (!messageId || !channelId) {
            throw new Error('Missing Telegram message ID or channel ID');
        }

        // Get the message
        const messages = await telegramClient.getMessages(channelId, {
            ids: [messageId]
        });

        if (!messages || messages.length === 0) {
            throw new Error('Message not found');
        }

        const message = messages[0];
        if (!message.media || !message.media.document) {
            throw new Error('No document in message');
        }

        // Return the file reference details that can be utilized with downloadMedia locally
        return {
            success: true,
            fileReference: {
                messageId,
                channelId,
                fileId: message.media.document.id.toString(),
                accessHash: message.media.document.accessHash.toString()
            }
        };
    } catch (error) {
        console.error('[TeleCloudSync] Error getting stream URL:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Store metadata in Telegram Saved Messages
 * @param {Object} trackMetadata - Track metadata to store
 */
async function storeMetadata(trackMetadata) {
    try {
        await ensureConnected();

        // Send metadata as JSON to Saved Messages
        await telegramClient.sendMessage('me', {
            message: JSON.stringify(trackMetadata, null, 2)
        });

        console.log('[TeleCloudSync] Stored metadata for:', trackMetadata.path);
        return { success: true };
    } catch (error) {
        console.error('[TeleCloudSync] Error storing metadata:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get all cloud metadata from Telegram Saved Messages
 */
async function getCloudMetadata() {
    try {
        await ensureConnected();

        // Fetch messages from Saved Messages
        const messages = await telegramClient.getMessages('me', { limit: 100 });

        const metadata = [];
        for (const msg of messages) {
            if (msg.message) {
                try {
                    const data = JSON.parse(msg.message);
                    if (data.path && data.telegram_message_id) {
                        metadata.push(data);
                    }
                } catch (e) {
                    // Skip non-JSON messages
                }
            }
        }

        console.log(`[TeleCloudSync] Retrieved ${metadata.length} metadata entries`);
        return { success: true, metadata };
    } catch (error) {
        console.error('[TeleCloudSync] Error getting metadata:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Restore music library from Telegram
 */
async function restoreFromCloud() {
    const { insertOrUpdateFile, updateCloudMetadata, getAllFiles } = require('./database');

    try {
        await ensureConnected();

        const creds = credentialManager.getCredentials();
        if (!creds || !creds.channelId) {
            throw new Error('No channel ID configured for restore.');
        }

        console.log(`[TeleCloudSync] Attempting to get entity for channel ID: ${creds.channelId}`);
        let channelEntity;
        try {
            // gram-js can be picky. Try to parse to number.
            channelEntity = await telegramClient.getEntity(parseInt(creds.channelId));
        } catch (entityError) {
            console.warn(`[TeleCloudSync] Could not get entity with standard ID. Trying peer ID format.`);
            const channelPeerId = `-100${creds.channelId}`;
            channelEntity = await telegramClient.getEntity(parseInt(channelPeerId));
        }
        console.log(`[TeleCloudSync] Successfully got channel entity:`, channelEntity?.id?.toString());

        console.log(`[TeleCloudSync] Fetching messages from channel: ${creds.channelId}`);
        const messages = await telegramClient.getMessages(channelEntity, { limit: null }); // Fetch all messages
        console.log(`[TeleCloudSync] Found ${messages.length} total messages in the cloud.`);

        // Get all existing files to check for duplicates by telegram_message_id
        const allFiles = getAllFiles();
        const existingMessageIds = new Set(allFiles.filter(f => f.telegram_message_id).map(f => f.telegram_message_id));

        let restoredCount = 0;
        let skippedCount = 0;

        for (const message of messages) {
            console.log(`[TeleCloudSync] Processing message ${message.id}: Media=${!!message.media}, Message=${!!message.message}`);
            if (message.media && message.message) {
                try {
                    const cloudMeta = JSON.parse(message.message);
                    const fileName = message.document?.attributes.find(attr => attr.className === 'DocumentAttributeFilename')?.fileName;

                    if (!fileName) {
                        skippedCount++;
                        console.warn(`[TeleCloudSync] Message ${message.id}: Skipping, no filename found.`);
                        continue;
                    }
                    console.log(`[TeleCloudSync] Message ${message.id}: Extracted filename: ${fileName}`);

                    // Check if this telegram_message_id already exists in the database
                    if (existingMessageIds.has(message.id)) {
                        console.log(`[TeleCloudSync] Message ${message.id}: Skipping, already exists in database.`);
                        skippedCount++;
                        continue;
                    }

                    // The path is not stored in cloud meta, so we construct a placeholder
                    const placeholderPath = path.join('restored', fileName);

                    console.log(`[TeleCloudSync] Message ${message.id}: Restoring file to database.`);

                    // Insert basic file metadata
                    insertOrUpdateFile({
                        path: placeholderPath,
                        mtime: 0,
                        size: 0,
                        title: cloudMeta.title,
                        artist: cloudMeta.artist,
                        album: cloudMeta.album,
                        duration: cloudMeta.duration,
                    });

                    // Update cloud-specific metadata
                    updateCloudMetadata(placeholderPath, {
                        storage_type: 'cloud',
                        telegram_message_id: message.id,
                        telegram_channel_id: creds.channelId,
                        cloud_checksum: cloudMeta.checksum,
                        last_synced_at: new Date(message.date * 1000).toISOString(),
                    });

                    // ☁️ FIX: Also create a 'synced' record in the sync_state table
                    const { updateSyncState } = require('./database');
                    updateSyncState(placeholderPath, {
                        telegram_message_id: message.id,
                        telegram_channel_id: creds.channelId,
                        cloud_checksum: cloudMeta.checksum,
                        sync_status: 'synced',
                        last_synced_at: new Date(message.date * 1000).toISOString(),
                    });

                    restoredCount++;
                } catch (parseError) {
                    console.warn(`[TeleCloudSync] Message ${message.id}: Skipping, invalid caption JSON:`, parseError.message);
                    skippedCount++;
                }
            } else {
                skippedCount++;
            }
        }

        console.log(`[TeleCloudSync] Restore complete. Restored: ${restoredCount}, Skipped: ${skippedCount} of ${messages.length} total.`);
        return { success: true, restoredCount, skippedCount };

    } catch (error) {
        console.error('[TeleCloudSync] Restore error:', error);
        return { success: false, error: error.message };
    }
}


// Cleanup on app exit
function cleanupTeleCloudSync() {
    if (telegramClient) {
        try {
            telegramClient.disconnect();
            console.log('[TeleCloudSync] Disconnected on cleanup');
        } catch (error) {
            console.error('[TeleCloudSync] Error during cleanup:', error);
        }
    }
}

module.exports = {
    setupTeleCloudSyncHandlers,
    cleanupTeleCloudSync
};