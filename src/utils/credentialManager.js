// TeleCloud Sync Credential Manager
// Handles secure storage of Telegram API credentials using electron-store with encryption

const crypto = require('crypto');

class CredentialManager {
    constructor(store) {
        this.store = store;
        this.ENCRYPTION_KEY = this.getOrCreateEncryptionKey();
    }

    /**
     * Get or create a unique encryption key for this installation
     */
    getOrCreateEncryptionKey() {
        let key = this.store.get('_encryptionKey');
        if (!key) {
            // Generate a random 32-byte key
            key = crypto.randomBytes(32).toString('hex');
            this.store.set('_encryptionKey', key);
        }
        return key;
    }

    /**
     * Encrypt data using AES-256-CBC
     */
    encrypt(text) {
        if (!text) return null;

        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(
            'aes-256-cbc',
            Buffer.from(this.ENCRYPTION_KEY, 'hex'),
            iv
        );

        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        // Return IV + encrypted data
        return iv.toString('hex') + ':' + encrypted;
    }

    /**
     * Decrypt data using AES-256-CBC
     */
    decrypt(encryptedText) {
        if (!encryptedText) return null;

        try {
            const parts = encryptedText.split(':');
            const iv = Buffer.from(parts[0], 'hex');
            const encrypted = parts[1];

            const decipher = crypto.createDecipheriv(
                'aes-256-cbc',
                Buffer.from(this.ENCRYPTION_KEY, 'hex'),
                iv
            );

            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            console.error('Decryption error:', error);
            return null;
        }
    }

    /**
     * Save TeleCloud Sync credentials securely
     */
    saveCredentials(credentials) {
        const encrypted = {
            apiId: this.encrypt(credentials.apiId?.toString()),
            apiHash: this.encrypt(credentials.apiHash),
            phoneNumber: credentials.phoneNumber, // Not encrypted (not sensitive)
            session: this.encrypt(credentials.session),
            enabled: credentials.enabled || false,
            autoSync: credentials.autoSync || false,
            syncAudioFiles: credentials.syncAudioFiles || false,
            storageLocation: credentials.storageLocation || 'saved_messages',
            channelId: credentials.channelId || null,
            playbackMode: credentials.playbackMode || 'stream',
            cacheLimit: credentials.cacheLimit || 50,
            lastSync: credentials.lastSync || null,
            musicFolders: credentials.musicFolders || [] // FIX: Save music folders
        };

        this.store.set('teleCloudSync', encrypted);
    }

    /**
     * Get TeleCloud Sync credentials (decrypted)
     */
    getCredentials() {
        const encrypted = this.store.get('teleCloudSync');
        if (!encrypted) return null;

        return {
            apiId: this.decrypt(encrypted.apiId),
            apiHash: this.decrypt(encrypted.apiHash),
            phoneNumber: encrypted.phoneNumber,
            session: this.decrypt(encrypted.session),
            enabled: encrypted.enabled || false,
            autoSync: encrypted.autoSync || false,
            syncAudioFiles: encrypted.syncAudioFiles || false,
            storageLocation: encrypted.storageLocation || 'saved_messages',
            channelId: encrypted.channelId || null,
            playbackMode: encrypted.playbackMode || 'stream',
            cacheLimit: encrypted.cacheLimit || 50,
            lastSync: encrypted.lastSync || null,
            musicFolders: encrypted.musicFolders || [] // FIX: Retrieve music folders
        };
    }

    /**
     * Update specific credential fields
     */
    updateCredentials(updates) {
        const current = this.getCredentials() || {};
        const updated = { ...current, ...updates };
        this.saveCredentials(updated);
    }

    /**
     * Delete all TeleCloud Sync credentials
     */
    deleteCredentials() {
        this.store.delete('teleCloudSync');
    }

    /**
     * Check if credentials exist
     */
    hasCredentials() {
        return this.store.has('teleCloudSync');
    }

    /**
     * Check if user is authenticated (has valid session)
     */
    isAuthenticated() {
        const creds = this.getCredentials();
        return creds && creds.session && creds.apiId && creds.apiHash;
    }
}

module.exports = CredentialManager;
