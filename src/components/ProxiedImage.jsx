import React, { useState, useEffect } from 'react';

const ProxiedImage = ({ src, alt, style, className, onClick }) => {
    const [proxiedSrc, setProxiedSrc] = useState(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        let isMounted = true;
        setProxiedSrc(null); // Reset on src change
        setError(false);

        if (src && typeof window.electronAPI?.fetchImage === 'function') {
            window.electronAPI.fetchImage(src)
                .then(base64Data => {
                    if (isMounted) {
                        setProxiedSrc(base64Data);
                    }
                })
                .catch(err => {
                    console.error('Image proxy failed:', err);
                    if (isMounted) {
                        setError(true);
                    }
                });
        } else if (src) {
            // Fallback for local images or if API is not available
            setProxiedSrc(src);
        }

        return () => {
            isMounted = false;
        };
    }, [src]);

    if (error || !proxiedSrc) {
        // Render a placeholder or nothing
        return (
            <div style={{ ...style, backgroundColor: 'var(--bg-tertiary)' }} className={className} onClick={onClick}>
                {/* You could put a placeholder icon here */}
            </div>
        );
    }

    return (
        <img
            src={proxiedSrc}
            alt={alt}
            style={style}
            className={className}
            onClick={onClick}
        />
    );
};

export default ProxiedImage;
