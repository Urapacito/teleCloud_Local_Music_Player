import React, { useState, useEffect } from 'react';

const TeleCloudSyncSettings = () => {
    // Authentication & Setup State
    const [step, setStep] = useState('info'); // 'info', 'credentials', 'phone', 'otp', 'config', 'connected'
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Credential Form State
    const [apiId, setApiId] = useState('');
    const [apiHash, setApiHash] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otpCode, setOtpCode] = useState('');

    // Sync Configuration State
    const [syncMode, setSyncMode] = useState('auto'); // 'manual' or 'auto'
    const [syncMetadata, setSyncMetadata] = useState(true);
    const [syncPlaylists, setSyncPlaylists] = useState(true);
    const [syncAudioFiles, setSyncAudioFiles] = useState(true);
    const [storageLocation, setStorageLocation] = useState('private_channel'); // 'saved_messages', 'private_channel', 'existing_channel'
    const [customChannelId, setCustomChannelId] = useState('');
    const [playbackMode, setPlaybackMode] = useState('stream'); // 'stream', 'download', 'hybrid'
    const [cacheLimit, setCacheLimit] = useState(50);

    // Connection Status
    const [connectedPhone, setConnectedPhone] = useState('');
    const [lastSync, setLastSync] = useState(null);
    const [syncedItems, setSyncedItems] = useState(0);
    const [storageUsed, setStorageUsed] = useState(0);
    const [storageLimit, setStorageLimit] = useState(2048); // MB

    // Sync Progress State
    const [isSyncing, setIsSyncing] = useState(false);
    const [showProgress, setShowProgress] = useState(false);
    const [currentFile, setCurrentFile] = useState('');
    const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
    const [uploadProgress, setUploadProgress] = useState(0);

    // Error State
    const [error, setError] = useState('');

    // Custom dropdown state
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Check if already connected on mount
    useEffect(() => {
        checkConnection();

        // Listen for sync progress events
        const handleProgress = (event, data) => {
            setCurrentFile(data.currentFile);
            setSyncProgress({ current: data.current, total: data.total });
            setUploadProgress(data.uploadProgress || 0);
        };

        const handleStopped = () => {
            setIsLoading(false);
            setShowProgress(false);
            alert('Sync stopped by user');
        };

        window.ipcRenderer.on('telecloud-sync:progress', handleProgress);
        window.ipcRenderer.on('telecloud-sync:stopped', handleStopped);

        // Cleanup listeners on unmount
        return () => {
            window.ipcRenderer.off('telecloud-sync:progress', handleProgress);
            window.ipcRenderer.off('telecloud-sync:stopped', handleStopped);
        };
    }, []);

    const checkConnection = async () => {
        try {
            const result = await window.ipcRenderer.invoke('telecloud-sync:check-auth');
            if (result.success && result.isAuthenticated) {
                setIsConnected(true);
                setStep('connected');
                setConnectedPhone(result.phoneNumber || '');
                setLastSync(result.lastSync);
                setSyncedItems(result.syncedItems || 0);
                setStorageUsed(result.storageUsed || 0);
                // Restore storage limit based on storage location
                setStorageLimit(result.storageLocation === 'private_channel' ? Infinity : 2048);

                // Check if sync is in progress
                const syncStatus = await window.ipcRenderer.invoke('telecloud-sync:check-sync-status');
                if (syncStatus && syncStatus.isSyncing) {
                    setIsLoading(true);
                }
            }
        } catch (err) {
            console.error('Error checking connection:', err);
        }
    };

    const handleContinueSetup = () => {
        setStep('credentials');
        setError('');
    };

    const handleSubmitCredentials = async () => {
        if (!apiId || !apiHash) {
            setError('Please enter both API ID and API Hash');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // Save credentials temporarily
            await window.ipcRenderer.invoke('telecloud-sync:save-temp-credentials', {
                apiId,
                apiHash
            });
            setStep('phone');
        } catch (err) {
            setError(err.message || 'Failed to save credentials');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendCode = async () => {
        if (!phoneNumber) {
            setError('Please enter your phone number');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const result = await window.ipcRenderer.invoke('telecloud-sync:send-code', {
                phoneNumber,
                apiId,
                apiHash
            });

            if (result.success) {
                setStep('otp');
            } else {
                setError(result.error || 'Failed to send code');
            }
        } catch (err) {
            setError(err.message || 'Failed to send verification code');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyCode = async () => {
        if (!otpCode) {
            setError('Please enter the verification code');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const result = await window.ipcRenderer.invoke('telecloud-sync:verify-code', {
                code: otpCode,
                phoneNumber
            });

            if (result.success) {
                setStep('config');
            } else {
                setError(result.error || 'Invalid verification code');
            }
        } catch (err) {
            setError(err.message || 'Failed to verify code');
        } finally {
            setIsLoading(false);
        }
    };

    const handleStartSync = async () => {
        setIsLoading(true);
        setError('');

        try {
            const result = await window.ipcRenderer.invoke('telecloud-sync:complete-setup', {
                syncMode,
                syncMetadata,
                syncPlaylists,
                syncAudioFiles,
                storageLocation,
                customChannelId: storageLocation === 'existing_channel' ? customChannelId : null,
                playbackMode,
                cacheLimit,
                musicFolders: [] // FIX: Pass music folders from settings
            });

            if (result.success) {
                setIsConnected(true);
                setConnectedPhone(phoneNumber);
                // Set storage limit based on storage location
                setStorageLimit(storageLocation === 'private_channel' ? Infinity : 2048);
                setStep('connected');
            } else {
                setError(result.error || 'Failed to complete setup');
            }
        } catch (err) {
            setError(err.message || 'Failed to start sync');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDisconnect = async () => {
        if (!window.confirm('Are you sure you want to disconnect TeleCloud Sync? Your cloud files will remain in Telegram.')) {
            return;
        }

        setIsLoading(true);
        try {
            await window.ipcRenderer.invoke('telecloud-sync:disconnect');
            setIsConnected(false);
            setStep('info');
            setApiId('');
            setApiHash('');
            setPhoneNumber('');
            setOtpCode('');
            setConnectedPhone('');
        } catch (err) {
            setError('Failed to disconnect');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSyncNow = async () => {
        setIsLoading(true);
        setShowProgress(true);
        try {
            const result = await window.ipcRenderer.invoke('telecloud-sync:sync-now');
            if (result.success) {
                setLastSync(new Date().toISOString());
                alert('Sync completed successfully!');
                // Refresh stats
                checkConnection();
            } else {
                alert('Sync failed: ' + (result.error || 'Unknown error'));
            }
        } catch (err) {
            alert('Sync failed: ' + err.message);
        } finally {
            setIsLoading(false);
            setShowProgress(false);
        }
    };

    const handleStopSync = async () => {
        if (!window.confirm('Stop sync operation?\n\nThis will:\n- Stop uploading current and remaining files\n- Keep already synced files in cloud\n- You can resume later\n\nAre you sure?')) {
            return;
        }

        try {
            const result = await window.ipcRenderer.invoke('telecloud-sync:stop-sync');
            if (result.success) {
                console.log('Sync stop requested');
            } else {
                alert('Failed to stop sync: ' + (result.error || 'Unknown error'));
            }
        } catch (err) {
            alert('Failed to stop sync: ' + err.message);
        }
    };

    const handleDeleteAll = async () => {
        if (!window.confirm('Delete ALL files from Telegram channel?\n\nThis will:\n- Delete all messages in the channel\n- Clear sync state from database\n- Cannot be undone\n\nAre you sure?')) {
            return;
        }

        setIsLoading(true);
        try {
            const result = await window.ipcRenderer.invoke('telecloud-sync:delete-all');
            if (result.success) {
                alert(`✓ Deleted ${result.deletedCount} files from Telegram and cleared sync state`);
                // Refresh stats
                checkConnection();
            } else {
                alert('Delete failed: ' + (result.error || 'Unknown error'));
            }
        } catch (err) {
            alert('Delete failed: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRestoreFromCloud = async () => {
        if (!window.confirm('Restore library from TeleCloud?\n\nThis will add all cloud tracks to your local library. It will not download audio files.')) {
            return;
        }

        setIsLoading(true);
        try {
            const result = await window.ipcRenderer.invoke('telecloud-sync:restore-from-cloud');
            if (result.success) {
                alert(`✓ Restored ${result.restoredCount} tracks from the cloud. Skipped ${result.skippedCount} duplicates.`);
                checkConnection(); // Refresh stats
            } else {
                alert('Restore failed: ' + (result.error || 'Unknown error'));
            }
        } catch (err) {
            alert('Restore failed: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const openTelegramDevPortal = () => {
        window.ipcRenderer.invoke('open-external', 'https://my.telegram.org/apps');
    };

    // Render Info Screen (Step 1)
    if (step === 'info') {
        return (
            <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
                <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '20px', color: 'var(--text-main)' }}>
                    📱 TeleCloud Sync
                </h2>

                <div style={{
                    background: 'var(--bg-secondary)',
                    borderRadius: '16px',
                    padding: '40px',
                    border: '1px solid var(--bg-tertiary)'
                }}>
                    <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                        <div style={{ fontSize: '48px', marginBottom: '20px' }}>☁️</div>
                        <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
                            Use Your Telegram as Cloud Storage
                        </h3>
                        <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: '1.6', maxWidth: '600px', margin: '0 auto' }}>
                            Sync your music library across devices using your personal Telegram account.
                            Your data stays private and under your control.
                        </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '40px' }}>
                        <div style={{ textAlign: 'center', padding: '20px' }}>
                            <div style={{ fontSize: '32px', marginBottom: '12px' }}>💰</div>
                            <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>No Subscription Fees</div>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>You provide your own storage</div>
                        </div>
                        <div style={{ textAlign: 'center', padding: '20px' }}>
                            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔒</div>
                            <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>Complete Privacy</div>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Your data stays in your account</div>
                        </div>
                        <div style={{ textAlign: 'center', padding: '20px' }}>
                            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📴</div>
                            <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>Works Offline</div>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Local playback always available</div>
                        </div>
                        <div style={{ textAlign: 'center', padding: '20px' }}>
                            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔓</div>
                            <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>Open Source</div>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Fully auditable and secure</div>
                        </div>
                    </div>

                    <div style={{
                        background: 'var(--bg-main)',
                        borderRadius: '12px',
                        padding: '24px',
                        marginBottom: '32px',
                        border: '1px solid var(--bg-tertiary)'
                    }}>
                        <div style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '16px', color: 'var(--text-main)' }}>
                            To get started, you'll need:
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '24px', color: 'var(--text-secondary)' }}>
                            <li style={{ marginBottom: '8px' }}>Telegram API ID and Hash (from my.telegram.org)</li>
                            <li>Your phone number</li>
                        </ul>
                    </div>

                    <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                        <button
                            onClick={openTelegramDevPortal}
                            style={{
                                background: 'var(--bg-hover)',
                                color: 'var(--text-main)',
                                border: '1px solid var(--bg-tertiary)',
                                padding: '14px 28px',
                                borderRadius: '12px',
                                fontSize: '15px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            Get API Credentials
                        </button>
                        <button
                            onClick={handleContinueSetup}
                            style={{
                                background: 'var(--accent-red)',
                                color: 'white',
                                border: 'none',
                                padding: '14px 32px',
                                borderRadius: '12px',
                                fontSize: '15px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            Continue Setup →
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Render Credentials Input Screen (Step 2)
    if (step === 'credentials') {
        return (
            <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
                <button
                    onClick={() => setStep('info')}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        fontSize: '14px',
                        marginBottom: '20px'
                    }}
                >
                    ← Back
                </button>

                <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '30px' }}>
                    Enter Your API Credentials
                </h2>

                <div style={{ background: 'var(--bg-secondary)', borderRadius: '16px', padding: '32px', border: '1px solid var(--bg-tertiary)' }}>
                    {error && (
                        <div style={{
                            background: 'rgba(230, 57, 70, 0.1)',
                            border: '1px solid var(--accent-red)',
                            borderRadius: '8px',
                            padding: '12px 16px',
                            marginBottom: '24px',
                            color: 'var(--accent-red)',
                            fontSize: '14px'
                        }}>
                            {error}
                        </div>
                    )}

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-main)' }}>
                            API ID *
                        </label>
                        <input
                            type="text"
                            value={apiId}
                            onChange={(e) => setApiId(e.target.value)}
                            placeholder="12345678"
                            style={{
                                width: '100%',
                                padding: '14px 16px',
                                borderRadius: '10px',
                                border: '2px solid var(--bg-tertiary)',
                                background: 'var(--bg-main)',
                                color: 'var(--text-main)',
                                fontSize: '15px',
                                outline: 'none'
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-main)' }}>
                            API Hash *
                        </label>
                        <input
                            type="text"
                            value={apiHash}
                            onChange={(e) => setApiHash(e.target.value)}
                            placeholder="abc123def456..."
                            style={{
                                width: '100%',
                                padding: '14px 16px',
                                borderRadius: '10px',
                                border: '2px solid var(--bg-tertiary)',
                                background: 'var(--bg-main)',
                                color: 'var(--text-main)',
                                fontSize: '15px',
                                outline: 'none'
                            }}
                        />
                    </div>

                    <div style={{ background: 'var(--bg-main)', borderRadius: '10px', padding: '16px', marginBottom: '24px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        <div style={{ marginBottom: '8px' }}>ℹ️ Get these from: <a href="#" onClick={(e) => { e.preventDefault(); openTelegramDevPortal(); }} style={{ color: 'var(--accent-red)' }}>https://my.telegram.org/apps</a></div>
                        <div>🔒 Your credentials are stored locally and encrypted</div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={() => setStep('info')}
                            style={{
                                flex: 1,
                                background: 'var(--bg-hover)',
                                color: 'var(--text-main)',
                                border: '1px solid var(--bg-tertiary)',
                                padding: '14px',
                                borderRadius: '10px',
                                fontSize: '15px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmitCredentials}
                            disabled={isLoading}
                            style={{
                                flex: 1,
                                background: isLoading ? 'var(--bg-hover)' : 'var(--accent-red)',
                                color: 'white',
                                border: 'none',
                                padding: '14px',
                                borderRadius: '10px',
                                fontSize: '15px',
                                fontWeight: 'bold',
                                cursor: isLoading ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {isLoading ? 'Saving...' : 'Continue'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Render Phone Number Screen (Step 3)
    if (step === 'phone') {
        return (
            <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
                <button
                    onClick={() => setStep('credentials')}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        fontSize: '14px',
                        marginBottom: '20px'
                    }}
                >
                    ← Back
                </button>

                <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '30px' }}>
                    Sign In to Telegram
                </h2>

                <div style={{ background: 'var(--bg-secondary)', borderRadius: '16px', padding: '32px', border: '1px solid var(--bg-tertiary)' }}>
                    {error && (
                        <div style={{
                            background: 'rgba(230, 57, 70, 0.1)',
                            border: '1px solid var(--accent-red)',
                            borderRadius: '8px',
                            padding: '12px 16px',
                            marginBottom: '24px',
                            color: 'var(--accent-red)',
                            fontSize: '14px'
                        }}>
                            {error}
                        </div>
                    )}

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-main)' }}>
                            Phone Number *
                        </label>
                        <input
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="+1 234 567 8900"
                            style={{
                                width: '100%',
                                padding: '14px 16px',
                                borderRadius: '10px',
                                border: '2px solid var(--bg-tertiary)',
                                background: 'var(--bg-main)',
                                color: 'var(--text-main)',
                                fontSize: '15px',
                                outline: 'none'
                            }}
                        />
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                            Include country code (e.g., +1 for US)
                        </div>
                    </div>

                    <button
                        onClick={handleSendCode}
                        disabled={isLoading}
                        style={{
                            width: '100%',
                            background: isLoading ? 'var(--bg-hover)' : 'var(--accent-red)',
                            color: 'white',
                            border: 'none',
                            padding: '14px',
                            borderRadius: '10px',
                            fontSize: '15px',
                            fontWeight: 'bold',
                            cursor: isLoading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {isLoading ? 'Sending...' : 'Send Code'}
                    </button>
                </div>
            </div>
        );
    }

    // Render OTP Verification Screen (Step 4)
    if (step === 'otp') {
        return (
            <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
                <button
                    onClick={() => setStep('phone')}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        fontSize: '14px',
                        marginBottom: '20px'
                    }}
                >
                    ← Back
                </button>

                <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '30px' }}>
                    Enter Verification Code
                </h2>

                <div style={{ background: 'var(--bg-secondary)', borderRadius: '16px', padding: '32px', border: '1px solid var(--bg-tertiary)' }}>
                    {error && (
                        <div style={{
                            background: 'rgba(230, 57, 70, 0.1)',
                            border: '1px solid var(--accent-red)',
                            borderRadius: '8px',
                            padding: '12px 16px',
                            marginBottom: '24px',
                            color: 'var(--accent-red)',
                            fontSize: '14px'
                        }}>
                            {error}
                        </div>
                    )}

                    <div style={{ textAlign: 'center', marginBottom: '24px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                        We sent a code to your Telegram app
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <input
                            type="text"
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value)}
                            placeholder="Enter 5-digit code"
                            maxLength={5}
                            style={{
                                width: '100%',
                                padding: '14px 16px',
                                borderRadius: '10px',
                                border: '2px solid var(--bg-tertiary)',
                                background: 'var(--bg-main)',
                                color: 'var(--text-main)',
                                fontSize: '24px',
                                textAlign: 'center',
                                letterSpacing: '8px',
                                outline: 'none',
                                fontWeight: 'bold'
                            }}
                        />
                    </div>

                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                        <button
                            onClick={handleSendCode}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--accent-red)',
                                cursor: 'pointer',
                                fontSize: '14px',
                                textDecoration: 'underline'
                            }}
                        >
                            Didn't receive it? Resend Code
                        </button>
                    </div>

                    <button
                        onClick={handleVerifyCode}
                        disabled={isLoading}
                        style={{
                            width: '100%',
                            background: isLoading ? 'var(--bg-hover)' : 'var(--accent-red)',
                            color: 'white',
                            border: 'none',
                            padding: '14px',
                            borderRadius: '10px',
                            fontSize: '15px',
                            fontWeight: 'bold',
                            cursor: isLoading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {isLoading ? 'Verifying...' : 'Verify & Continue'}
                    </button>
                </div>
            </div>
        );
    }

    // Render Sync Configuration Screen (Step 5)
    if (step === 'config') {
        return (
            <div style={{ padding: '40px', maxWidth: '700px', margin: '0 auto' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '30px' }}>
                    Configure Sync Settings
                </h2>

                <div style={{ background: 'var(--bg-secondary)', borderRadius: '16px', padding: '32px', border: '1px solid var(--bg-tertiary)' }}>
                    <div style={{ fontSize: '15px', color: 'var(--accent-red)', marginBottom: '24px', fontWeight: 'bold' }}>
                        ✓ Connected as: {phoneNumber}
                    </div>

                    {/* Storage Location */}
                    <div style={{ marginBottom: '32px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>Audio File Storage</h3>

                        <label style={{ display: 'block', padding: '16px', background: storageLocation === 'private_channel' ? 'rgba(230, 57, 70, 0.1)' : 'var(--bg-main)', border: `2px solid ${storageLocation === 'private_channel' ? 'var(--accent-red)' : 'var(--bg-tertiary)'}`, borderRadius: '10px', marginBottom: '12px', cursor: 'pointer' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                <input type="radio" checked={storageLocation === 'private_channel'} onChange={() => setStorageLocation('private_channel')} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '4px' }}>
                                        Private Channel - Auto-create (RECOMMENDED)
                                    </div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                                        ✓ Unlimited total storage (FREE)<br />
                                        ✓ Perfect for large FLAC libraries (100GB-1TB+)<br />
                                        ✓ Channel created automatically, completely private
                                    </div>
                                </div>
                            </div>
                        </label>

                        <label style={{ display: 'block', padding: '16px', background: storageLocation === 'saved_messages' ? 'rgba(230, 57, 70, 0.1)' : 'var(--bg-main)', border: `2px solid ${storageLocation === 'saved_messages' ? 'var(--accent-red)' : 'var(--bg-tertiary)'}`, borderRadius: '10px', cursor: 'pointer' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                <input type="radio" checked={storageLocation === 'saved_messages'} onChange={() => setStorageLocation('saved_messages')} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '4px' }}>
                                        Saved Messages Only (2GB total limit)
                                    </div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                        Only suitable for small libraries or metadata-only
                                    </div>
                                </div>
                            </div>
                        </label>
                    </div>

                    {/* Playback Mode */}
                    <div style={{ marginBottom: '32px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>Playback Mode</h3>

                        <div style={{ position: 'relative' }}>
                            {/* Custom Dropdown */}
                            <div
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                style={{
                                    width: '100%',
                                    padding: '14px 16px',
                                    paddingRight: '40px',
                                    borderRadius: '10px',
                                    border: '2px solid var(--bg-tertiary)',
                                    background: 'var(--bg-main)',
                                    color: 'var(--text-main)',
                                    fontSize: '15px',
                                    cursor: 'pointer',
                                    userSelect: 'none'
                                }}
                            >
                                {playbackMode === 'stream' && 'Stream from cloud (save device storage)'}
                                {playbackMode === 'download' && 'Download and cache (offline playback)'}
                                {playbackMode === 'hybrid' && 'Hybrid (stream + smart caching)'}
                            </div>
                            <div style={{
                                position: 'absolute',
                                right: '16px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                pointerEvents: 'none',
                                color: 'var(--text-muted)'
                            }}>▼</div>

                            {/* Dropdown Options */}
                            {isDropdownOpen && (
                                <div style={{
                                    position: 'absolute',
                                    top: 'calc(100% + 4px)',
                                    left: 0,
                                    right: 0,
                                    background: 'var(--bg-main)',
                                    border: '2px solid var(--bg-tertiary)',
                                    borderRadius: '10px',
                                    overflow: 'hidden',
                                    zIndex: 1000,
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                                }}>
                                    {[
                                        { value: 'stream', label: 'Stream from cloud (save device storage)' },
                                        { value: 'download', label: 'Download and cache (offline playback)' },
                                        { value: 'hybrid', label: 'Hybrid (stream + smart caching)' }
                                    ].map((option) => (
                                        <div
                                            key={option.value}
                                            onClick={() => {
                                                setPlaybackMode(option.value);
                                                setIsDropdownOpen(false);
                                            }}
                                            style={{
                                                padding: '12px 16px',
                                                fontSize: '15px',
                                                cursor: 'pointer',
                                                background: playbackMode === option.value ? 'rgba(230, 57, 70, 0.15)' : 'transparent',
                                                color: 'var(--text-main)',
                                                transition: 'background 0.15s'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (playbackMode !== option.value) {
                                                    e.currentTarget.style.background = 'rgba(230, 57, 70, 0.1)';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (playbackMode !== option.value) {
                                                    e.currentTarget.style.background = 'transparent';
                                                }
                                            }}
                                        >
                                            {option.label}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {playbackMode !== 'stream' && (
                            <div style={{ marginTop: '16px' }}>
                                <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px' }}>
                                    Cache Limit: {cacheLimit} GB
                                </label>
                                <input
                                    type="range"
                                    min="10"
                                    max="500"
                                    step="10"
                                    value={cacheLimit}
                                    onChange={(e) => setCacheLimit(Number(e.target.value))}
                                    style={{ width: '100%' }}
                                />
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleStartSync}
                        disabled={isLoading}
                        style={{
                            width: '100%',
                            background: isLoading ? 'var(--bg-hover)' : 'var(--accent-red)',
                            color: 'white',
                            border: 'none',
                            padding: '16px',
                            borderRadius: '10px',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            cursor: isLoading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {isLoading ? 'Setting up...' : 'Complete Setup'}
                    </button>
                </div>
            </div>
        );
    }

    // Render Connected/Status Screen
    if (step === 'connected') {
        const storagePercent = Math.round((storageUsed / storageLimit) * 100);
        const lastSyncText = lastSync ? new Date(lastSync).toLocaleString() : 'Never';

        return (
            <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    TeleCloud Sync
                    <span style={{ fontSize: '14px', background: '#10b981', color: 'white', padding: '4px 12px', borderRadius: '20px', fontWeight: 'bold' }}>
                        ✓ Connected
                    </span>
                </h2>

                <div style={{ background: 'var(--bg-secondary)', borderRadius: '16px', padding: '32px', border: '1px solid var(--bg-tertiary)', marginBottom: '24px' }}>
                    <div style={{ marginBottom: '24px' }}>
                        <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px' }}>Account</div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{connectedPhone}</div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                        <div>
                            <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px' }}>Last Sync</div>
                            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{lastSyncText}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px' }}>Synced Items</div>
                            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{syncedItems} tracks</div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                        <button
                            onClick={handleSyncNow}
                            disabled={isLoading}
                            style={{
                                flex: 1,
                                background: isLoading ? 'var(--bg-hover)' : 'var(--accent-red)',
                                color: 'white',
                                border: 'none',
                                padding: '14px',
                                borderRadius: '10px',
                                fontSize: '15px',
                                fontWeight: 'bold',
                                cursor: isLoading ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {isLoading ? 'Syncing...' : 'Sync Now'}
                        </button>
                        <button
                            onClick={handleDisconnect}
                            disabled={isLoading}
                            style={{
                                flex: 1,
                                background: 'transparent',
                                color: 'var(--accent-red)',
                                border: '2px solid var(--accent-red)',
                                padding: '14px',
                                borderRadius: '10px',
                                fontSize: '15px',
                                fontWeight: 'bold',
                                cursor: isLoading ? 'not-allowed' : 'pointer'
                            }}
                        >
                            Disconnect
                        </button>
                    </div>

                    {/* Sync Progress Section (Expandable) */}
                    {isLoading && (
                        <div style={{ marginTop: '16px', background: 'var(--bg-main)', borderRadius: '10px', padding: '16px', border: '1px solid var(--bg-tertiary)' }}>
                            <div
                                onClick={() => setShowProgress(!showProgress)}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginBottom: showProgress ? '16px' : '0' }}
                            >
                                <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-main)' }}>
                                    Sync in Progress
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                    {showProgress ? '▼' : '▶'} {showProgress ? 'Hide' : 'Show'} Details
                                </div>
                            </div>

                            {showProgress && (
                                <>
                                    <div style={{ marginBottom: '16px' }}>
                                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                            Current File:
                                        </div>
                                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {currentFile || 'Preparing...'}
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '16px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Progress</span>
                                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
                                                {syncProgress.current} / {syncProgress.total} tracks
                                            </span>
                                        </div>
                                        <div style={{ width: '100%', height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div style={{
                                                height: '100%',
                                                width: `${uploadProgress > 0 ? uploadProgress : (syncProgress.total > 0 ? (syncProgress.current / syncProgress.total) * 100 : 0)}%`,
                                                background: 'linear-gradient(90deg, #10b981 0%, #34d399 100%)',
                                                transition: 'width 0.3s ease'
                                            }}></div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleStopSync}
                                        style={{
                                            width: '100%',
                                            background: 'transparent',
                                            color: '#ef4444',
                                            border: '2px solid #ef4444',
                                            padding: '10px',
                                            borderRadius: '8px',
                                            fontSize: '14px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ⏹ Stop Sync
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    <button
                        onClick={handleDeleteAll}
                        disabled={isLoading}
                        style={{
                            width: '100%',
                            background: 'transparent',
                            color: '#f59e0b',
                            border: '2px solid #f59e0b',
                            padding: '12px',
                            borderRadius: '10px',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            cursor: isLoading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        Delete All from Channel (Testing)
                    </button>
                </div>

                <div style={{ background: 'var(--bg-secondary)', borderRadius: '16px', padding: '32px', border: '1px solid var(--bg-tertiary)', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>Cloud Recovery</h3>
                    <button
                        onClick={handleRestoreFromCloud}
                        disabled={isLoading}
                        style={{
                            width: '100%',
                            background: 'transparent',
                            color: '#34d399',
                            border: '2px solid #34d399',
                            padding: '12px',
                            borderRadius: '10px',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            cursor: isLoading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        Restore Library from Cloud
                    </button>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px', textAlign: 'center' }}>
                        Use this on a new PC to repopulate your library from the cloud.
                    </p>
                </div>

                <div style={{ background: 'var(--bg-secondary)', borderRadius: '16px', padding: '32px', border: '1px solid var(--bg-tertiary)' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>Storage Usage</h3>
                    <div style={{ fontSize: '14px', marginBottom: '12px', color: 'var(--text-secondary)' }}>
                        Used: {storageUsed} MB {storageLimit === Infinity ? '(Unlimited)' : `/ ${storageLimit} MB (${storagePercent}%)`}
                    </div>
                    {storageLimit !== Infinity && (
                        <div style={{ width: '100%', height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${storagePercent}%`, background: storagePercent > 90 ? '#ef4444' : 'var(--accent-red)', transition: 'width 0.3s' }}></div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Fallback
    return <div>Loading...</div>;
};

export default TeleCloudSyncSettings;
