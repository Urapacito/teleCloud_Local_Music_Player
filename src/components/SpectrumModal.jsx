import React, { useEffect, useRef, useState } from 'react';

const SpectrumModal = ({ file, onClose, theme }) => {
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Theme-adaptive colors
  const isDark = theme === 'dark';
  const canvasBg = isDark ? '#000' : '#f8f9fa';
  const containerBg = isDark ? '#000' : '#ffffff';  // White for light theme (brighter than outer)
  const axisColor = isDark ? '#ffffff' : '#000000';  // High contrast axis labels

  // Gradient colors - different for light vs dark
  const gradientColors = isDark ? {
    color1: '#000033',  // Dark blue
    color2: '#800080',  // Purple
    color3: '#ff0000',  // Red
    color4: '#ffff00',  // Yellow
    color5: '#ffffff'   // White
  } : {
    color1: '#000080',  // Navy blue
    color2: '#8b008b',  // Dark magenta
    color3: '#dc143c',  // Crimson
    color4: '#ff8c00',  // Dark orange
    color5: '#000000'   // Black
  };

  useEffect(() => {
    let active = true;
    const ctx = canvasRef.current?.getContext('2d');

    async function drawSpectrum() {
      try {
        if (!file || !file.path) throw new Error("Invalid file");

        // Read file via IPC (window.require is unavailable in contextIsolation mode)
        const result = await window.ipcRenderer.invoke('read-local-file', file.path);
        if (!result.success) throw new Error(result.error || 'Failed to read file');

        // Decode base64 → ArrayBuffer
        const binary = atob(result.data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const arrayBuffer = bytes.buffer;

        if (!active) return;

        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

        if (!active) return;

        const channelData = audioBuffer.getChannelData(0); // mono for display
        const sampleRate = audioBuffer.sampleRate;
        const width = 800;
        const height = 400;

        if (canvasRef.current) {
          canvasRef.current.width = width;
          canvasRef.current.height = height;
        }

        // Draw a fake spectrogram-like representation (waveform density) since a real FFT spectrogram
        // over the entire file manually in JS is too slow.
        // We divide the audio into 'width' buckets.
        const step = Math.ceil(channelData.length / width);
        const ampData = [];

        for (let i = 0; i < width; i++) {
          let min = 1.0;
          let max = -1.0;
          for (let j = 0; j < step; j++) {
            const datum = channelData[(i * step) + j];
            if (datum < min) min = datum;
            if (datum > max) max = datum;
          }
          ampData.push(Math.max(Math.abs(min), Math.abs(max)));
        }

        // Color mapping - theme adaptive
        ctx.fillStyle = canvasBg;
        ctx.fillRect(0, 0, width, height);

        for (let i = 0; i < width; i++) {
          const amp = ampData[i];
          const y = (1 - amp) * height;

          // Gradient based on height - theme adaptive
          const gradient = ctx.createLinearGradient(0, height, 0, 0);
          gradient.addColorStop(0, gradientColors.color1);
          gradient.addColorStop(0.3, gradientColors.color2);
          gradient.addColorStop(0.6, gradientColors.color3);
          gradient.addColorStop(0.9, gradientColors.color4);
          gradient.addColorStop(1, gradientColors.color5);

          ctx.fillStyle = gradient;
          ctx.fillRect(i, y, 1, height - y);
        }

        setLoading(false);
        audioCtx.close();
      } catch (err) {
        console.error("Spectrum Error:", err);
        if (active) {
          setError(err.message || "Failed to generate spectrum");
          setLoading(false);
        }
      }
    }

    drawSpectrum();

    return () => { active = false; };
  }, [file]);

  if (!file) return null;

  const bitDepth = file.metadata?.bitsPerSample;
  const sampleRate = file.metadata?.sampleRate ? `${Math.round(file.metadata.sampleRate / 1000)}kHz` : '';
  const bitrateStr = file.metadata?.bitrate ? `${Math.round(file.metadata.bitrate / 1000)}kbps` : '';

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000000
    }}>
      <div style={{
        background: 'var(--bg-secondary)', borderRadius: '15px', padding: '20px', width: '900px', maxWidth: '95vw',
        boxShadow: '0 10px 40px rgba(0,0,0,0.7)', position: 'relative'
      }}>

        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '10px', right: '15px', background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '24px', cursor: 'pointer', zIndex: 10 }}
        >
          ×
        </button>

        <div style={{ background: containerBg, borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', position: 'relative' }}>

          <div style={{ marginBottom: '10px', color: 'var(--text-main)', fontSize: '14px', fontFamily: 'monospace' }}>
            <div style={{ fontWeight: 'bold' }}>{file.path || file.name}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>
              {file.ext?.toUpperCase().replace('.', '')} / {bitDepth ? `${bitDepth}-bit` : ''} / {sampleRate} / {bitrateStr}
            </div>
          </div>

          <div style={{ display: 'flex', height: '360px' }}>
            {/* Left Y-axis (kHz) */}
            <div style={{ width: '40px', position: 'relative', color: axisColor, fontSize: '12px', fontWeight: '600', textAlign: 'right', paddingRight: '10px', fontFamily: 'monospace' }}>
              <span style={{ position: 'absolute', top: '0%', right: '10px', transform: 'translateY(-50%)' }}>22</span>
              <span style={{ position: 'absolute', top: '9.1%', right: '10px', transform: 'translateY(-50%)' }}>20</span>
              <span style={{ position: 'absolute', top: '31.8%', right: '10px', transform: 'translateY(-50%)' }}>15</span>
              <span style={{ position: 'absolute', top: '54.5%', right: '10px', transform: 'translateY(-50%)' }}>10</span>
              <span style={{ position: 'absolute', top: '77.2%', right: '10px', transform: 'translateY(-50%)' }}>5</span>
              <span style={{ position: 'absolute', top: '100%', right: '10px', transform: 'translateY(-50%)' }}>0</span>
              <span style={{ position: 'absolute', top: '50%', right: '35px', transform: 'translateY(-50%) rotate(-90deg)', letterSpacing: '2px' }}>kHz</span>
            </div>

            {/* Canvas Area */}
            <div style={{ flex: 1, position: 'relative', borderLeft: '1px solid var(--bg-tertiary)', borderBottom: '1px solid var(--bg-tertiary)', marginBottom: '20px' }}>
              {loading && !error && (
                <div style={{ color: 'var(--text-main)', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>Analyzing audio data...</div>
              )}
              {error && (
                <div style={{ color: 'var(--accent-red)', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', padding: '0 20px' }}>
                  {error}. For very large FLAC files, full spectrograms require a native backend.
                </div>
              )}
              <canvas
                ref={canvasRef}
                style={{ width: '100%', height: '100%', display: 'block', opacity: loading ? 0 : 1, transition: 'opacity 0.3s' }}
              />
            </div>

            {/* Right Gradient Bar (dB) */}
            <div style={{ width: '60px', marginLeft: '15px', position: 'relative', marginBottom: '20px', display: 'flex' }}>
              <div style={{ width: '15px', background: `linear-gradient(to top, ${gradientColors.color1}, ${gradientColors.color2}, ${gradientColors.color3}, ${gradientColors.color4}, ${gradientColors.color5})`, border: '1px solid var(--bg-tertiary)' }}></div>
              <div style={{ flex: 1, position: 'relative', color: axisColor, fontSize: '12px', fontWeight: '600', paddingLeft: '8px', fontFamily: 'monospace' }}>
                <span style={{ position: 'absolute', top: '0%', transform: 'translateY(-50%)' }}>0 dB</span>
                <span style={{ position: 'absolute', top: '16.6%', transform: 'translateY(-50%)' }}>-20 dB</span>
                <span style={{ position: 'absolute', top: '33.3%', transform: 'translateY(-50%)' }}>-40 dB</span>
                <span style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)' }}>-60 dB</span>
                <span style={{ position: 'absolute', top: '66.6%', transform: 'translateY(-50%)' }}>-80 dB</span>
                <span style={{ position: 'absolute', top: '83.3%', transform: 'translateY(-50%)' }}>-100 dB</span>
                <span style={{ position: 'absolute', top: '100%', transform: 'translateY(-50%)' }}>-120 dB</span>
              </div>
            </div>
          </div>

          {/* Bottom X-axis (Time) */}
          <div style={{ display: 'flex', marginLeft: '40px', marginRight: '75px', color: axisColor, fontSize: '12px', fontWeight: '600', justifyContent: 'space-between', fontFamily: 'monospace', position: 'absolute', bottom: '15px', left: '20px', right: '20px' }}>
            <span>0:00</span>
            <span>{file.metadata?.duration ? `${Math.floor((file.metadata.duration * 0.2) / 60)}:${Math.floor((file.metadata.duration * 0.2) % 60).toString().padStart(2, '0')}` : '1:00'}</span>
            <span>{file.metadata?.duration ? `${Math.floor((file.metadata.duration * 0.4) / 60)}:${Math.floor((file.metadata.duration * 0.4) % 60).toString().padStart(2, '0')}` : '2:00'}</span>
            <span>{file.metadata?.duration ? `${Math.floor((file.metadata.duration * 0.6) / 60)}:${Math.floor((file.metadata.duration * 0.6) % 60).toString().padStart(2, '0')}` : '3:00'}</span>
            <span>{file.metadata?.duration ? `${Math.floor((file.metadata.duration * 0.8) / 60)}:${Math.floor((file.metadata.duration * 0.8) % 60).toString().padStart(2, '0')}` : '4:00'}</span>
            <span>{file.metadata?.duration ? `${Math.floor(file.metadata.duration / 60)}:${Math.floor(file.metadata.duration % 60).toString().padStart(2, '0')}` : '5:00'}</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SpectrumModal;
