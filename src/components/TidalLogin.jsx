import React, { useState } from 'react';

const TidalLogin = ({ onLoginSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async () => {
        setLoading(true);
        setError('');

        try {
            const ipcRenderer = window.ipcRenderer;
            const result = await ipcRenderer.invoke('tidal:login');

            if (result.success) {
                onLoginSuccess(result.session);
            } else {
                setError(result.error || 'Login failed');
            }
        } catch (err) {
            setError(err.message || 'Failed to connect to Tidal');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '500px',
            padding: '40px'
        }}>
            <div style={{
                background: 'var(--bg-secondary)',
                borderRadius: '20px',
                padding: '40px',
                maxWidth: '450px',
                width: '100%',
                boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <svg viewBox="0 0 24 24" width="60" height="60" fill="var(--accent-red)" style={{ marginBottom: '20px', transform: 'rotate(180deg)' }}>
                        <path d="M12.012 3.992L8.008 7.996 12.012 12l4.004-4.004L12.012 3.992zm0 8.016L8.008 16.012l4.004 4.004 4.004-4.004-4.004-4.004zm-8.016 0l-4.004 4.004L4.004 20l4.004-4.004-4.004-4.004zm16.032 0l-4.004 4.004L20.028 20l4.004-4.004-4.004-4.004z" />
                    </svg>
                    <h2 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 10px 0' }}>Connect Tidal</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
                        Sign in with your Tidal account using the official secure login page.
                    </p>
                </div>

                {error && (
                    <div style={{
                        background: 'rgba(230, 57, 70, 0.1)',
                        border: '1px solid var(--accent-red)',
                        borderRadius: '8px',
                        padding: '12px',
                        marginBottom: '20px',
                        color: 'var(--accent-red)',
                        fontSize: '13px',
                        textAlign: 'center'
                    }}>
                        {error}
                    </div>
                )}

                <button
                    onClick={handleLogin}
                    disabled={loading}
                    style={{
                        width: '100%',
                        padding: '14px',
                        background: loading ? 'var(--bg-hover)' : 'var(--accent-red)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '15px',
                        fontWeight: 'bold',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        opacity: loading ? 0.6 : 1
                    }}
                >
                    {loading ? (
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                            <div style={{
                                width: '16px',
                                height: '16px',
                                border: '2px solid white',
                                borderTop: '2px solid transparent',
                                borderRadius: '50%',
                                animation: 'spin 0.8s linear infinite'
                            }}></div>
                            Waiting for Tidal login...
                        </span>
                    ) : 'Sign in with Tidal'}
                </button>

                <p style={{
                    marginTop: '20px',
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    textAlign: 'center',
                    lineHeight: '1.6'
                }}>
                    Your browser will open for Tidal authorization.<br />
                    After approving access, return here to browse and play your library.
                </p>

                <p style={{
                    marginTop: '16px',
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    textAlign: 'center'
                }}>
                    Don't have a Tidal account?{' '}
                    <a href="https://tidal.com" target="_blank" rel="noopener noreferrer" style={{
                        color: 'var(--accent-red)',
                        textDecoration: 'none',
                        fontWeight: '600'
                    }}>
                        Sign up on tidal.com
                    </a>
                </p>
            </div>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default TidalLogin;
