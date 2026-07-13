import React from 'react';

const SignalPathModal = ({ currentFile, selectedDevice, devices, eqEnabled, setEqEnabled, onClose }) => {
  const deviceName = selectedDevice === '-1' ? 'System Default' : (devices.find(d => d.id === selectedDevice)?.name || 'Unknown Device');

  const isTidal = currentFile?.id?.startsWith('tidal:') || currentFile?.source === 'tidal' || currentFile?.path?.startsWith('tidal://');
  const ext = isTidal ? 'TIDAL' : (currentFile?.path?.split('.').pop()?.toUpperCase() || '?');
  const title = currentFile?.metadata?.title || 'Unknown Audio';
  const sourceName = isTidal ? "Tidal" : "Source";

  const isExclusive = selectedDevice !== '-1';

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--bg-tertiary)',
      borderRadius: '12px',
      width: '350px',
      boxShadow: '0 -10px 40px rgba(0,0,0,0.8)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      color: 'var(--text-main)',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--bg-tertiary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Signal Path
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'normal' }}>
              {eqEnabled ? 'Enhanced' : (isExclusive ? 'Lossless' : 'High Quality')}
            </span>
          </h3>
        </div>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px' }}>&times;</button>
      </div>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
        {/* Vertical line connecting nodes */}
        <div style={{ position: 'absolute', left: '35px', top: '40px', bottom: '40px', width: '2px', background: 'var(--text-muted)', opacity: 0.5 }} />

        {/* Source Node */}
        <div style={{ display: 'flex', gap: '15px', position: 'relative', zIndex: 1 }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-main)', border: '2px solid var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold' }}>
            {isTidal ? (
              <svg viewBox="0 0 24 24" width="16" height="16" fill="white" style={{ transform: 'rotate(180deg)' }}>
                <path d="M12.012 3.992L8.008 7.996 12.012 12l4.004-4.004L12.012 3.992zm0 8.016L8.008 16.012l4.004 4.004 4.004-4.004-4.004-4.004zm-8.016 0l-4.004 4.004L4.004 20l4.004-4.004-4.004-4.004zm16.032 0l-4.004 4.004L20.028 20l4.004-4.004-4.004-4.004z" />
              </svg>
            ) : ext}
          </div>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{sourceName}</div>
            <div style={{ fontSize: '12px', color: 'var(--accent-red)' }}>{title}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{currentFile?.metadata?.sampleRate ? `${currentFile.metadata.sampleRate / 1000}kHz` : '44.1kHz'} {currentFile?.metadata?.bitrate ? `${Math.round(currentFile.metadata.bitrate / 1000)}kbps` : ''}</div>
          </div>
        </div>

        {/* Processing Node (EQ) */}
        <div style={{ display: 'flex', gap: '15px', position: 'relative', zIndex: 1, alignItems: 'center' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: eqEnabled ? 'var(--accent-red)' : 'var(--text-muted)', margin: '10px' }} />
          <div style={{ flex: 1, opacity: eqEnabled ? 1 : 0.5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }} onClick={() => { if (window.openEqSettings) window.openEqSettings(); onClose(); }}>
                Parametric EQ & AutoEQ
              </div>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={eqEnabled}
                  onChange={(e) => setEqEnabled && setEqEnabled(e.target.checked)}
                  style={{ width: '14px', height: '14px', accentColor: 'var(--accent-red)', cursor: 'pointer' }}
                />
              </label>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{eqEnabled ? '31-band Active Processing' : 'Bypassed'}</div>
          </div>
          <button
            onClick={() => { if (window.openEqSettings) window.openEqSettings(); onClose(); }}
            style={{ background: 'var(--bg-hover)', border: 'none', color: 'var(--text-main)', padding: '5px 10px', borderRadius: '15px', fontSize: '11px', cursor: 'pointer' }}
          >
            Configure
          </button>
        </div>

        {/* Volume / Exclusive Mode */}
        {isExclusive ? (
          <div style={{ display: 'flex', gap: '15px', position: 'relative', zIndex: 1, alignItems: 'center' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#4caf50', margin: '10px' }} />
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '14px' }}>Exclusive Mode (WASAPI)</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Bit-perfect Audio Transport</div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '15px', position: 'relative', zIndex: 1, alignItems: 'center' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--text-muted)', margin: '10px' }} />
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '14px' }}>OS Mixer</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Volume Leveling & Resampling</div>
            </div>
          </div>
        )}

        {/* Output Node */}
        <div style={{ display: 'flex', gap: '15px', position: 'relative', zIndex: 1 }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-main)', border: '2px solid var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" /></svg>
          </div>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>Output</div>
            <div style={{ fontSize: '12px', color: '#4caf50' }}>{deviceName}</div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SignalPathModal;
