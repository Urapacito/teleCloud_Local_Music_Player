import React from 'react';
import LyricsView from './LyricsView';

const RightPanel = ({ currentFile, showLyrics, setShowLyrics, currentTime }) => {
  // Generate cover URL for local files using media:// protocol
  const coverUrl = currentFile?.source === 'tidal'
    ? currentFile.cover
    : (currentFile?.path ? `media://${encodeURIComponent(currentFile.path)}` : null);

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
      {/* Blurred Background - Using img tag for proper media:// protocol support */}
      {coverUrl && (
        <img
          src={coverUrl}
          alt="background"
          style={{
            position: 'absolute',
            top: '-50px', left: '-50px', right: '-50px', bottom: '-50px',
            width: 'calc(100% + 100px)',
            height: 'calc(100% + 100px)',
            objectFit: 'cover',
            objectPosition: 'center',
            filter: 'blur(40px) brightness(0.4)',
            zIndex: 0
          }}
        />
      )}

      <div style={{ zIndex: 1, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        {showLyrics ? (
          <div style={{ width: '100%', height: '100%', cursor: 'pointer' }} onClick={() => setShowLyrics(false)}>
            <LyricsView lyrics={currentFile?.metadata?.lyrics} currentTime={currentTime} />
          </div>
        ) : (
          coverUrl ? (
            <img
              src={coverUrl}
              alt="cover"
              onClick={() => setShowLyrics(true)}
              style={{ width: '80%', maxWidth: '500px', aspectRatio: '1/1', objectFit: 'cover', borderRadius: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.8)', cursor: 'pointer' }}
            />
          ) : (
            <div
              onClick={() => setShowLyrics(true)}
              style={{ width: '80%', maxWidth: '500px', aspectRatio: '1/1', borderRadius: '20px', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <svg viewBox="0 0 24 24" width="100" height="100" fill="var(--bg-tertiary)"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" /></svg>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default RightPanel;
