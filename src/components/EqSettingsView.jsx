import React, { useState, useEffect, useRef } from 'react';
import { STANDARD_FREQUENCIES, DEFAULT_Q, calculateAutoEq, buildFfmpegEqString, getTotalEqResponse, parseMeasurement, processCurve } from '../utils/autoEqMath';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';

const EqSettingsView = ({
  onBack, currentEqBands, setCurrentEqBands, eqEnabled, setEqEnabled,
  measurement, setMeasurement,
  target, setTarget,
  measurementName, setMeasurementName,
  targetName, setTargetName,
  history, setHistory,
  minFreq, setMinFreq,
  maxFreq, setMaxFreq,
  maxGain, setMaxGain,
  maxQ, setMaxQ,
  normalizeMode, setNormalizeMode,
  normalizeDbValue, setNormalizeDbValue,
  normalizeHzValue, setNormalizeHzValue,
  smoothFactor, setSmoothFactor,
  preamp, setPreamp,
  theme
}) => {
  const [measurementOffset, setMeasurementOffset] = useState(0);
  const [yAxisRange, setYAxisRange] = useState(40);

  // Data for graph
  const [chartData, setChartData] = useState([]);

  // Use a ref to save bands after render
  const currentBandsRef = useRef(currentEqBands);
  useEffect(() => {
    currentBandsRef.current = currentEqBands;
  }, [currentEqBands]);

  useEffect(() => {
    // Generate log-spaced graph points
    const points = [];
    const minF = 20;
    const maxF = 20000;
    const steps = 200;

    // Process curves
    const processedMeasurement = processCurve(measurement, smoothFactor, normalizeMode, normalizeDbValue, normalizeHzValue);
    const processedTarget = processCurve(target, smoothFactor, normalizeMode, normalizeDbValue, normalizeHzValue);

    for (let i = 0; i <= steps; i++) {
      const f = minF * Math.pow(maxF / minF, i / steps);
      const row = { freq: Math.round(f) };

      let eqVal = 0;
      let visualEqVal = 0;
      if (currentEqBands) {
        // eqVal includes preamp for actual processing/export if needed, but we use visualEqVal for graph
        visualEqVal = getTotalEqResponse(f, currentEqBands, 0);
        row.eq = visualEqVal + normalizeDbValue;
      }

      let measVal = null;
      if (processedMeasurement && processedMeasurement.length > 0) {
        const closest = processedMeasurement.reduce((prev, curr) => Math.abs(curr.x - f) < Math.abs(prev.x - f) ? curr : prev);
        measVal = closest.y;
        row.measurement = measVal;

        row.eqMeasurement = measVal + visualEqVal;
      }

      if (processedTarget && processedTarget.length > 0) {
        const closest = processedTarget.reduce((prev, curr) => Math.abs(curr.x - f) < Math.abs(prev.x - f) ? curr : prev);
        // Target does not shift with preamp to maintain perfect overlap with all other lines
        row.target = closest.y;
      }

      points.push(row);
    }
    setChartData(points);
  }, [measurement, target, currentEqBands, measurementOffset, smoothFactor, normalizeMode, normalizeDbValue, normalizeHzValue, preamp]);

  const [draggingBandIdx, setDraggingBandIdx] = useState(null);
  const [isDraggingGraph, setIsDraggingGraph] = useState(false);
  const [isAutoEqRunning, setIsAutoEqRunning] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  const handleMouseMove = (e) => {
    if (draggingBandIdx !== null) {
      const dx = e.movementX;
      const dy = e.movementY;

      const newBands = [...currentEqBands];
      const band = newBands[draggingBandIdx];

      let newGain = band.gain - (dy * 0.15);
      newGain = Math.max(-15, Math.min(15, newGain));

      let newFreq = band.freq * Math.pow(1.005, dx);
      newFreq = Math.max(20, Math.min(20000, newFreq));

      newBands[draggingBandIdx] = { ...band, gain: parseFloat(newGain.toFixed(1)), freq: Math.round(newFreq) };
      setCurrentEqBands(newBands);
    } else if (isDraggingGraph) {
      // Dragging the whole graph vertically
      const dy = e.movementY;
      // To pan the graph down (mouse moves down, dy > 0), the domain needs to shift UP.
      const dbChange = (dy * 0.1);
      setMeasurementOffset(prev => prev + dbChange);
    }
  };

  const handleMouseUp = () => {
    if (draggingBandIdx !== null) {
      saveHistory(currentEqBands, `Dragged band ${draggingBandIdx + 1}`);
      setDraggingBandIdx(null);
    }
    setIsDraggingGraph(false);
  };

  const draggingBandRef = useRef(null);
  useEffect(() => {
    draggingBandRef.current = draggingBandIdx;
  }, [draggingBandIdx]);

  const handleWheelOnDot = (e, idx) => {
    const newBands = [...currentBandsRef.current];
    const band = newBands[idx];
    let newQ = band.q - (Math.sign(e.deltaY) * 0.1);
    newQ = Math.max(0.1, Math.min(10, newQ));
    newBands[idx] = { ...band, q: parseFloat(newQ.toFixed(2)) };
    setCurrentEqBands(newBands);
  };

  const graphContainerRef = useRef(null);
  useEffect(() => {
    const el = graphContainerRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (draggingBandRef.current !== null) {
        e.preventDefault();
        handleWheelOnDot(e, draggingBandRef.current);
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const handleBandChange = (index, field, value) => {
    const newBands = [...currentEqBands];
    newBands[index] = { ...newBands[index], [field]: value };
    setCurrentEqBands(newBands);
  };

  const saveHistory = (bands, label) => {
    setHistory(prev => [{ bands: JSON.parse(JSON.stringify(bands)), label, timestamp: Date.now() }, ...prev].slice(0, 10));
  };

  const handleAutoEq = () => {
    if (!measurement || !target) {
      alert("Please upload measurement and target first.");
      return;
    }

    setIsAutoEqRunning(true);

    setTimeout(() => {
      const processedMeasurement = processCurve(measurement, smoothFactor, normalizeMode, normalizeDbValue, normalizeHzValue);
      const processedTarget = processCurve(target, smoothFactor, normalizeMode, normalizeDbValue, normalizeHzValue);

      const newBands = calculateAutoEq(processedMeasurement, processedTarget, minFreq, maxFreq, maxGain, maxQ, 0);

      // Auto-calculate preamp to prevent digital clipping
      let maxPeak = 0;
      for (const b of newBands) {
        if (b.gain > maxPeak) maxPeak = b.gain;
      }
      const newPreamp = maxPeak > 0 ? -maxPeak : 0;
      setPreamp(newPreamp);

      saveHistory(newBands, `AutoEQ (${minFreq}-${maxFreq}Hz)`);
      setCurrentEqBands(newBands);

      setIsAutoEqRunning(false);
    }, 50);
  };

  const handleResetEq = () => {
    const newBands = currentEqBands.map(b => ({ ...b, gain: 0 }));
    saveHistory(newBands, "Reset to Flat");
    setCurrentEqBands(newBands);
  };

  const handleFileChange = (e, isMeasurement) => {
    const file = e.target.files[0];
    if (file) {
      if (isMeasurement) setMeasurementName(file.name.replace(/\.[^/.]+$/, ""));
      else setTargetName(file.name.replace(/\.[^/.]+$/, ""));

      const reader = new FileReader();
      reader.onload = (ev) => {
        const data = parseMeasurement(ev.target.result);
        if (isMeasurement) setMeasurement(data);
        else setTarget(data);
      };
      reader.readAsText(file);
    }
    // reset value to allow uploading same file again
    e.target.value = null;
  };

  const handleExportEq = () => {
    let txt = `Preamp: ${preamp} dB\n`;
    currentEqBands.forEach((b, i) => {
      const type = b.type === 'Peak' ? 'PK' : b.type;
      txt += `Filter ${i + 1}: ON ${type} Fc ${b.freq} Hz Gain ${b.gain} dB Q ${Number(b.q).toFixed(3)}\n`;
    });
    const blob = new Blob([txt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'telecloud_eq.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportEq = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const lines = text.split('\n');
      const newBands = [];
      let newPreamp = 0;

      for (const line of lines) {
        if (line.startsWith('Preamp:')) {
          const match = line.match(/Preamp:\s*([\-\d\.]+)/);
          if (match) newPreamp = parseFloat(match[1]);
        } else if (line.startsWith('Filter')) {
          const match = line.match(/ON\s+([A-Z]+)\s+Fc\s+([\d\.]+)\s+Hz\s+Gain\s+([\-\d\.]+)\s+dB\s+Q\s+([\d\.]+)/);
          if (match) {
            let type = match[1];
            if (type === 'PK') type = 'Peak';
            newBands.push({
              freq: parseFloat(match[2]),
              gain: parseFloat(match[3]),
              q: parseFloat(match[4]),
              type: type
            });
          }
        }
      }

      if (newBands.length > 0) {
        setPreamp(newPreamp);
        setCurrentEqBands(newBands);
        saveHistory(newBands, 'Imported EQ');
      } else {
        alert("Invalid EQ file format.");
      }
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  const formatTimeAgo = (timestamp) => {
    const secs = Math.floor((Date.now() - timestamp) / 1000);
    if (secs < 60) return `${secs}s`;
    return `${Math.floor(secs / 60)}m`;
  };

  return (
    <div style={{ padding: '30px', height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text-main)', background: 'var(--bg-main)', position: 'relative' }}>
      {isAutoEqRunning && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(5px)',
          WebkitBackdropFilter: 'blur(5px)', zIndex: 100000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '15px',
          color: 'white', fontWeight: '600', fontSize: '16px'
        }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>AutoEQ is running</div>
          <div style={{ fontSize: '14px', opacity: 0.8 }}>This could take 5-20 seconds or more...</div>
          <div style={{ marginTop: '10px' }}>
            <div className="loading-spinner" style={{
              width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.3)',
              borderTop: '4px solid white', borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <button
          onClick={onBack}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '24px', cursor: 'pointer', marginRight: '15px' }}
        >
          ←
        </button>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Advanced PEQ</h2>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button
            onClick={handleResetEq}
            style={{ background: 'transparent', border: '1px solid var(--bg-tertiary)', color: 'var(--text-main)', padding: '5px 10px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Reset EQ
          </button>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'var(--bg-secondary)', padding: '5px 10px', borderRadius: '20px', border: '1px solid var(--bg-tertiary)', fontSize: '13px', fontWeight: 'bold' }}>
            <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: eqEnabled ? 'var(--accent-red)' : 'transparent', border: '2px solid var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {eqEnabled && <svg viewBox="0 0 24 24" width="10" height="10" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>}
            </div>
            <input type="checkbox" checked={eqEnabled} onChange={(e) => setEqEnabled(e.target.checked)} style={{ display: 'none' }} />
            Enable EQ
          </label>
        </div>
      </div>

      <div
        style={{ display: 'flex', gap: '20px', flex: 1, overflow: 'hidden' }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >

        {/* Left Side: Graph and AutoEQ Controls */}
        <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', paddingRight: '10px' }}>

          {/* Graph Section */}
          <div ref={graphContainerRef} style={{ display: 'flex', flexDirection: 'column', height: '75vh', minHeight: '600px', background: 'var(--bg-secondary)', borderRadius: '12px', padding: '20px', border: '1px solid var(--bg-tertiary)' }}>

            {/* Normalize / Smooth Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)' }}>NORMALIZE:</span>
                <div style={{ display: 'flex', border: '1px solid var(--bg-tertiary)', borderRadius: '6px', overflow: 'hidden' }}>
                  <button
                    onClick={() => setNormalizeMode('dB')}
                    style={{ background: normalizeMode === 'dB' ? 'var(--accent-red)' : 'transparent', color: normalizeMode === 'dB' ? 'white' : 'var(--text-main)', border: 'none', padding: '5px 10px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}
                  >dB</button>
                  <input
                    type="number"
                    value={normalizeDbValue}
                    onChange={(e) => { setNormalizeMode('dB'); setNormalizeDbValue(parseFloat(e.target.value) || 0); }}
                    style={{ width: '40px', border: 'none', background: 'transparent', color: 'var(--text-main)', textAlign: 'center', fontSize: '12px', borderLeft: '1px solid var(--bg-tertiary)' }}
                  />
                </div>

                <div style={{ display: 'flex', border: '1px solid var(--bg-tertiary)', borderRadius: '6px', overflow: 'hidden' }}>
                  <button
                    onClick={() => setNormalizeMode('Hz')}
                    style={{ background: normalizeMode === 'Hz' ? 'var(--accent-red)' : 'transparent', color: normalizeMode === 'Hz' ? 'white' : 'var(--text-main)', border: 'none', padding: '5px 10px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}
                  >Hz</button>
                  <input
                    type="number"
                    value={normalizeHzValue}
                    onChange={(e) => { setNormalizeMode('Hz'); setNormalizeHzValue(parseFloat(e.target.value) || 0); }}
                    style={{ width: '50px', border: 'none', background: 'transparent', color: 'var(--text-main)', textAlign: 'center', fontSize: '12px', borderLeft: '1px solid var(--bg-tertiary)' }}
                  />
                </div>
              </div>

              <div style={{ width: '1px', height: '20px', background: 'var(--bg-tertiary)' }}></div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)' }}>SMOOTH:</span>
                <input
                  type="number"
                  value={smoothFactor}
                  onChange={(e) => setSmoothFactor(parseInt(e.target.value) || 1)}
                  style={{ width: '40px', border: '1px solid var(--bg-tertiary)', borderRadius: '6px', background: 'transparent', color: 'var(--text-main)', textAlign: 'center', fontSize: '12px', padding: '5px' }}
                />
              </div>

              <div style={{ width: '1px', height: '20px', background: 'var(--bg-tertiary)' }}></div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)' }}>Y-AXIS:</span>
                <select
                  value={yAxisRange}
                  onChange={(e) => setYAxisRange(parseInt(e.target.value))}
                  style={{ border: '1px solid var(--bg-tertiary)', borderRadius: '6px', background: 'var(--bg-secondary)', color: 'var(--text-main)', fontSize: '12px', padding: '4px', outline: 'none' }}
                >
                  <option value={20} style={{ background: 'var(--bg-secondary)', color: 'var(--text-main)' }}>±20 dB</option>
                  <option value={30} style={{ background: 'var(--bg-secondary)', color: 'var(--text-main)' }}>±30 dB</option>
                  <option value={40} style={{ background: 'var(--bg-secondary)', color: 'var(--text-main)' }}>±40 dB</option>
                  <option value={50} style={{ background: 'var(--bg-secondary)', color: 'var(--text-main)' }}>±50 dB</option>
                </select>
                <button
                  onClick={() => setShowInfoModal(true)}
                  style={{
                    background: 'var(--bg-hover)',
                    border: '1px solid var(--bg-tertiary)',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: 0,
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  title="PEQ Instructions"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="var(--text-muted)">
                    <path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                  </svg>
                </button>
              </div>
            </div>

            <div
              style={{ display: 'flex', flex: 1, overflow: 'hidden', cursor: isDraggingGraph ? 'grabbing' : 'grab', position: 'relative', userSelect: 'none', outline: 'none' }}
              tabIndex={-1}
              onMouseDown={(e) => {
                // simple check to avoid dragging when interacting with dots
                if (e.target.tagName !== 'circle') setIsDraggingGraph(true);
              }}
            >
              {/* Custom Scrollbar UI attached to Y-Axis */}
              <div
                style={{
                  position: 'absolute', left: 10, top: 15, bottom: 45, width: '14px',
                  background: 'var(--bg-hover)', borderRadius: '7px', zIndex: 10,
                  border: '1px solid var(--bg-tertiary)',
                  pointerEvents: 'none' // Let the user drag by clicking anywhere
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: `${Math.max(5, Math.min(95, ((measurementOffset + 100) / 200) * 100))}%`,
                  left: 1, width: '10px', height: '30px',
                  background: 'var(--text-muted)', borderRadius: '5px', transform: 'translateY(-50%)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px'
                }}>
                  <div style={{ width: '6px', height: '1px', background: 'var(--bg-secondary)' }}></div>
                  <div style={{ width: '6px', height: '1px', background: 'var(--bg-secondary)' }}></div>
                  <div style={{ width: '6px', height: '1px', background: 'var(--bg-secondary)' }}></div>
                </div>
              </div>

              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-tertiary)" />
                  <XAxis
                    dataKey="freq"
                    scale="log"
                    domain={[20, 20000]}
                    type="number"
                    stroke="var(--text-muted)"
                    ticks={[20, 30, 40, 50, 60, 80, 100, 150, 200, 300, 400, 500, 600, 800, 1000, 1500, 2000, 3000, 4000, 5000, 6000, 8000, 10000, 15000, 20000]}
                    tickFormatter={val => val >= 1000 ? (val / 1000) + 'k' : val}
                  />
                  <YAxis
                    yAxisId="left"
                    stroke="var(--text-muted)"
                    domain={[Math.max(0, normalizeDbValue + Math.round(measurementOffset) - (yAxisRange / 2)), normalizeDbValue + Math.round(measurementOffset) + (yAxisRange / 2)]}
                    hide={false}
                    allowDataOverflow={true}
                  />
                  <Legend verticalAlign="bottom" align="right" wrapperStyle={{ fontSize: '12px', color: 'var(--text-main)' }} />

                  {measurement && <Line yAxisId="left" name={measurementName} type="monotone" dataKey="measurement" stroke="#1042b5" dot={false} activeDot={false} strokeWidth={2} isAnimationActive={false} />}
                  {target && <Line yAxisId="left" name={targetName} type="monotone" dataKey="target" stroke="#888888" strokeDasharray="5 5" dot={false} activeDot={false} strokeWidth={2} isAnimationActive={false} />}
                  {measurement && <Line yAxisId="left" name={`${measurementName} w/ EQ`} type="monotone" dataKey="eqMeasurement" stroke="#4caf50" dot={false} activeDot={false} strokeWidth={3} isAnimationActive={false} />}

                  <Line yAxisId="left" name="Filter Curve" type="monotone" dataKey="eq" stroke="#e63946" dot={false} activeDot={false} strokeWidth={2} isAnimationActive={false} />

                  {currentEqBands.map((band, idx) => (
                    <Line
                      key={`dot-${idx}`}
                      yAxisId="left"
                      type="monotone"
                      data={[{ freq: band.freq, eq: band.gain + normalizeDbValue }]}
                      dataKey="eq"
                      stroke="none"
                      isAnimationActive={false}
                      legendType="none"
                      activeDot={false}
                      dot={(props) => {
                        return (
                          <circle
                            cx={props.cx} cy={props.cy} r={8}
                            fill={draggingBandIdx === idx ? "var(--accent-red)" : (theme === 'light' ? 'var(--text-secondary)' : 'white')}
                            stroke="var(--bg-main)" strokeWidth={2}
                            style={{ cursor: 'grab' }}
                            onMouseDown={(e) => { e.preventDefault(); setDraggingBandIdx(idx); }}
                          />
                        );
                      }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AutoEQ Controls */}
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '20px', border: '1px solid var(--bg-tertiary)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px' }}>AutoEQ Configuration</h3>

            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '5px' }}>Upload Measurement</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <label style={{ cursor: 'pointer', padding: '8px 16px', background: 'var(--bg-hover)', border: '1px solid var(--bg-tertiary)', color: 'var(--text-main)', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                    Choose File
                    <input type="file" accept=".txt,.csv" onChange={(e) => handleFileChange(e, true)} style={{ display: 'none' }} />
                  </label>
                  <span style={{ marginLeft: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>{measurementName !== 'Measurement' ? measurementName : 'No file chosen'}</span>
                  {measurement && (
                    <button onClick={() => { setMeasurement(null); setMeasurementName('Measurement'); }} style={{ background: 'transparent', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: '14px', marginLeft: '5px' }} title="Remove">×</button>
                  )}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '5px' }}>Upload Target</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <label style={{ cursor: 'pointer', padding: '8px 16px', background: 'var(--bg-hover)', border: '1px solid var(--bg-tertiary)', color: 'var(--text-main)', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                    Choose File
                    <input type="file" accept=".txt,.csv" onChange={(e) => handleFileChange(e, false)} style={{ display: 'none' }} />
                  </label>
                  <span style={{ marginLeft: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>{targetName !== 'Target' ? targetName : 'No file chosen'}</span>
                  {target && (
                    <button onClick={() => { setTarget(null); setTargetName('Target'); }} style={{ background: 'transparent', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: '14px', marginLeft: '5px' }} title="Remove">×</button>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '5px' }}>Min Freq (Hz)</div>
                <input type="number" value={minFreq} onChange={e => setMinFreq(Number(e.target.value))} style={{ width: '80px', background: 'var(--bg-main)', border: '1px solid var(--bg-tertiary)', color: 'var(--text-main)', padding: '5px', borderRadius: '4px' }} />
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '5px' }}>Max Freq (Hz)</div>
                <input type="number" value={maxFreq} onChange={e => setMaxFreq(Number(e.target.value))} style={{ width: '80px', background: 'var(--bg-main)', border: '1px solid var(--bg-tertiary)', color: 'var(--text-main)', padding: '5px', borderRadius: '4px' }} />
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '5px' }}>Max Gain (dB)</div>
                <input type="number" value={maxGain} onChange={e => setMaxGain(Number(e.target.value))} style={{ width: '80px', background: 'var(--bg-main)', border: '1px solid var(--bg-tertiary)', color: 'var(--text-main)', padding: '5px', borderRadius: '4px' }} />
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '5px' }}>Max Q</div>
                <input type="number" value={maxQ} onChange={e => setMaxQ(Number(e.target.value))} style={{ width: '80px', background: 'var(--bg-main)', border: '1px solid var(--bg-tertiary)', color: 'var(--text-main)', padding: '5px', borderRadius: '4px' }} />
              </div>
              <button onClick={handleAutoEq} style={{ background: 'var(--accent-red)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', marginLeft: 'auto' }}>
                Run AutoEQ
              </button>
            </div>
          </div>

          {/* History */}
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '20px', border: '1px solid var(--bg-tertiary)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px' }}>Change History</h3>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>Undo/Redo via list. Click to revert.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', background: 'var(--bg-main)', padding: '10px', borderRadius: '8px' }}>
              {history.map((hist, idx) => (
                <div
                  key={idx}
                  onClick={() => setCurrentEqBands(hist.bands)}
                  style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', cursor: 'pointer', borderBottom: idx < history.length - 1 ? '1px solid var(--bg-tertiary)' : 'none' }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-muted)', marginRight: '10px' }}>{idx === 0 ? '(A)' : ''}</span>
                    {hist.label}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formatTimeAgo(hist.timestamp)}</span>
                </div>
              ))}
              {history.length === 0 && <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '10px' }}>No history yet.</div>}
            </div>
          </div>

        </div>

        {/* Right Side: 31 Bands Controls */}
        <div style={{ width: '380px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--bg-tertiary)', overflowY: 'auto', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Band Controls</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleExportEq}
                style={{ background: 'var(--bg-hover)', border: '1px solid var(--bg-tertiary)', color: 'var(--text-main)', padding: '5px 10px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Export
              </button>
              <label style={{ background: 'var(--bg-hover)', border: '1px solid var(--bg-tertiary)', color: 'var(--text-main)', padding: '5px 10px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}>
                Import
                <input type="file" accept=".txt" onChange={handleImportEq} style={{ display: 'none' }} />
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', background: 'var(--bg-main)', padding: '10px', borderRadius: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold', width: '60px' }}>Preamp</span>
            <input
              type="number" step="0.1"
              value={preamp}
              onChange={e => setPreamp(parseFloat(e.target.value) || 0)}
              style={{ flex: 1, background: 'transparent', border: '1px solid var(--bg-tertiary)', color: 'var(--text-main)', borderRadius: '4px', padding: '5px', fontSize: '14px' }}
            />
            <span style={{ fontSize: '14px' }}>dB</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {currentEqBands.map((band, idx) => (
              <div key={idx} style={{ background: 'var(--bg-main)', padding: '10px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <input
                      type="number"
                      value={band.freq}
                      onChange={e => handleBandChange(idx, 'freq', parseFloat(e.target.value) || 0)}
                      onBlur={() => saveHistory(currentBandsRef.current, `Freq changed to ${currentBandsRef.current[idx].freq}Hz`)}
                      style={{ background: 'transparent', border: '1px solid var(--bg-tertiary)', color: 'var(--text-main)', width: '60px', fontWeight: 'bold', fontSize: '14px', borderRadius: '4px', padding: '2px 5px' }}
                    />
                    <span style={{ fontWeight: 'bold', fontSize: '14px' }}>Hz</span>
                  </div>
                  <select
                    value={band.type}
                    onChange={e => {
                      handleBandChange(idx, 'type', e.target.value);
                      saveHistory(currentBandsRef.current, `${band.freq}Hz changed to ${e.target.value}`);
                    }}
                    style={{ background: 'var(--bg-secondary)', color: 'var(--text-main)', border: '1px solid var(--bg-tertiary)', borderRadius: '4px', fontSize: '12px', padding: '2px 5px' }}
                  >
                    <option value="Peak">Peak</option>
                    <option value="LSF">LSF</option>
                    <option value="HSF">HSF</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', width: '30px' }}>Gain</span>
                  <input
                    type="number"
                    value={band.gain}
                    onChange={e => handleBandChange(idx, 'gain', parseFloat(e.target.value) || 0)}
                    onBlur={() => saveHistory(currentBandsRef.current, `Gain changed to ${currentBandsRef.current[idx].gain}dB`)}
                    style={{ flex: 1, background: 'transparent', border: '1px solid var(--bg-tertiary)', color: 'var(--text-main)', borderRadius: '4px', padding: '2px 5px', fontSize: '13px' }}
                  />
                  <span style={{ fontSize: '12px', width: '20px' }}>dB</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', width: '30px' }}>Q</span>
                  <input
                    type="number" step="0.1"
                    value={band.q}
                    onChange={e => handleBandChange(idx, 'q', parseFloat(e.target.value) || 0.1)}
                    onBlur={() => saveHistory(currentBandsRef.current, `Q changed to ${currentBandsRef.current[idx].q}`)}
                    style={{ flex: 1, background: 'transparent', border: '1px solid var(--bg-tertiary)', color: 'var(--text-main)', borderRadius: '4px', padding: '2px 5px', fontSize: '13px' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* PEQ Info Modal */}
      {showInfoModal && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(5px)',
            WebkitBackdropFilter: 'blur(5px)', zIndex: 100001,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setShowInfoModal(false)}
        >
          <div
            style={{
              background: 'var(--bg-secondary)',
              borderRadius: '16px',
              padding: '30px',
              maxWidth: '700px',
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
              border: '1px solid var(--bg-tertiary)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: 'var(--text-main)' }}>Advanced PEQ Guide</h2>
              <button
                onClick={() => setShowInfoModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '28px',
                  cursor: 'pointer',
                  padding: '0',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ color: 'var(--text-main)', lineHeight: '1.7', fontSize: '14px' }}>
              <div style={{ marginBottom: '25px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px', color: 'var(--accent-red)' }}>What is Parametric EQ?</h3>
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                  Parametric EQ allows you to precisely adjust specific frequency ranges in your audio. Each band has three parameters: Frequency (Hz), Gain (dB), and Q (bandwidth).
                </p>
              </div>

              <div style={{ marginBottom: '25px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px', color: 'var(--accent-red)' }}>How to Use</h3>
                <div style={{ background: 'var(--bg-main)', padding: '15px', borderRadius: '8px', marginBottom: '10px' }}>
                  <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>Manual Adjustment:</p>
                  <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)' }}>
                    <li style={{ marginBottom: '8px' }}><strong>Drag dots on graph:</strong> Move horizontally to adjust frequency, vertically to adjust gain</li>
                    <li style={{ marginBottom: '8px' }}><strong>Scroll on dot:</strong> While holding a dot, scroll to adjust Q (bandwidth)</li>
                    <li style={{ marginBottom: '8px' }}><strong>Right panel:</strong> Type precise values for each band</li>
                    <li><strong>Drag graph:</strong> Click and drag the background to pan the Y-axis view</li>
                  </ul>
                </div>

                <div style={{ background: 'var(--bg-main)', padding: '15px', borderRadius: '8px' }}>
                  <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>AutoEQ:</p>
                  <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)' }}>
                    <li style={{ marginBottom: '8px' }}>Upload a <strong>measurement file</strong> (your headphone/speaker frequency response)</li>
                    <li style={{ marginBottom: '8px' }}>Upload a <strong>target file</strong> (desired frequency response curve)</li>
                    <li style={{ marginBottom: '8px' }}>Adjust settings: Min/Max Freq range, Max Gain, Max Q</li>
                    <li>Click <strong>"Run AutoEQ"</strong> to automatically generate optimal EQ settings</li>
                  </ul>
                </div>
              </div>

              <div style={{ marginBottom: '25px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px', color: 'var(--accent-red)' }}>Understanding the Parameters</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ background: 'var(--bg-main)', padding: '12px', borderRadius: '8px' }}>
                    <strong>Frequency (Hz):</strong> <span style={{ color: 'var(--text-secondary)' }}>The center frequency of the band (20 Hz - 20,000 Hz)</span>
                  </div>
                  <div style={{ background: 'var(--bg-main)', padding: '12px', borderRadius: '8px' }}>
                    <strong>Gain (dB):</strong> <span style={{ color: 'var(--text-secondary)' }}>How much to boost (+) or cut (-) that frequency</span>
                  </div>
                  <div style={{ background: 'var(--bg-main)', padding: '12px', borderRadius: '8px' }}>
                    <strong>Q Factor:</strong> <span style={{ color: 'var(--text-secondary)' }}>Bandwidth of the filter. Higher Q = narrower, lower Q = wider</span>
                  </div>
                  <div style={{ background: 'var(--bg-main)', padding: '12px', borderRadius: '8px' }}>
                    <strong>Filter Type:</strong> <span style={{ color: 'var(--text-secondary)' }}>Peak (bell curve), LSF (low shelf), HSF (high shelf)</span>
                  </div>
                  <div style={{ background: 'var(--bg-main)', padding: '12px', borderRadius: '8px' }}>
                    <strong>Preamp:</strong> <span style={{ color: 'var(--text-secondary)' }}>Overall volume adjustment to prevent clipping</span>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '25px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px', color: 'var(--accent-red)' }}>Tips & Best Practices</h3>
                <div style={{ background: 'var(--bg-main)', padding: '15px', borderRadius: '8px' }}>
                  <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)' }}>
                    <li style={{ marginBottom: '8px' }}>Use <strong>NORMALIZE</strong> to align curves for easier comparison</li>
                    <li style={{ marginBottom: '8px' }}>Use <strong>SMOOTH</strong> to reduce measurement noise (try 1/3 to 1/6 octave)</li>
                    <li style={{ marginBottom: '8px' }}>Adjust <strong>Y-AXIS</strong> range for better view of your EQ curve</li>
                    <li style={{ marginBottom: '8px' }}>Check <strong>history</strong> to undo/redo changes</li>
                    <li style={{ marginBottom: '8px' }}>Use <strong>Export</strong> to save your EQ settings</li>
                    <li>Remember: Less is often more. Subtle adjustments usually sound better</li>
                  </ul>
                </div>
              </div>

              <div style={{ background: 'var(--bg-hover)', padding: '15px', borderRadius: '8px', border: '1px solid var(--bg-tertiary)' }}>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                  <strong>Note:</strong> For AutoEQ measurement files, you can find frequency response data for many headphones at
                  <span style={{ color: 'var(--accent-red)' }}> AutoEq database </span> or measure your own using a calibrated microphone.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EqSettingsView;
