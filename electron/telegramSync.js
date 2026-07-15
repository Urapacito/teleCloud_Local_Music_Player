// TeleCloud Sync - IPC Handlers
// Handles Telegram authentication and sync operations for TeleCloud Sync feature

const { ipcMain, shell } = require('electron');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { Api } = require('telegram/tl');
const ElectronStore = require('electron-store');
const CredentialManager = require('../src/utils/credentialManager');
const path = require('path');
const fs = require('fs');

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
                return {
                    success: true,
                    isAuthenticated: true,
                    phoneNumber: creds.phoneNumber,
                    lastSync: creds.lastSync,
                    syncedItems: 0, // TODO: Implement actual count
                    storageUsed: 0 // TODO: Implement actual usage
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
                lastSync: null
            });

            // Clear temp credentials
            tempCredentials = {};

            // If private channel is selected, create it
            if (config.storageLocation === 'private_channel' && telegramClient) {
                try {
                    // TODO: Implement channel creation
                    console.log('[TeleCloudSync] Private channel creation will be implemented');
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

    // Sync now (manual trigger)
    ipcMain.handle('telecloud-sync:sync-now', async () => {
        try {
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

            // TODO: Implement actual sync logic
            console.log('[TeleCloudSync] Sync logic will be implemented');

            // Update last sync time
            credentialManager.updateCredentials({
                lastSync: new Date().toISOString()
            });

            return { success: true };
        } catch (error) {
            console.error('[TeleCloudSync] Error during sync:', error);
            return { success: false, error: error.message };
        }
    });

    console.log('[TeleCloudSync] IPC handlers registered successfully');
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
