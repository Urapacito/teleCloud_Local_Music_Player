// autoEqMath.js

// Predefined 31-band frequencies (1/3 octave standard)
export const STANDARD_FREQUENCIES = [
  20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800,
  1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500, 16000, 20000
];

// Default Q for 1/3 octave is 4.32 (to prevent over-accumulation)
export const DEFAULT_Q = 4.32;

/**
 * Parses a Squiglink/AutoEQ text file.
 * Format is usually "Freq Amplitude" or "Freq,Amplitude" per line.
 */
export function parseMeasurement(text) {
  const lines = text.split('\n');
  const data = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('Frequency')) continue;
    
    // Split by comma or whitespace
    const parts = trimmed.split(/[\s,]+/);
    if (parts.length >= 2) {
      const freq = parseFloat(parts[0]);
      const amp = parseFloat(parts[1]);
      if (!isNaN(freq) && !isNaN(amp)) {
        data.push({ x: freq, y: amp });
      }
    }
  }
  return data.sort((a, b) => a.x - b.x);
}

export function processCurve(data, smoothFactor, normalizeMode, normalizeDb, normalizeHz) {
  if (!data || data.length === 0) return [];

  // 1. Smoothing (moving average)
  let smoothed = [];
  if (smoothFactor > 1) {
    const half = Math.floor(smoothFactor / 2);
    for (let i = 0; i < data.length; i++) {
      let sum = 0;
      let count = 0;
      for (let j = i - half; j <= i + half; j++) {
        if (j >= 0 && j < data.length) {
          sum += data[j].y;
          count++;
        }
      }
      smoothed.push({ x: data[i].x, y: sum / count });
    }
  } else {
    smoothed = [...data];
  }

  // 2. Normalization
  let offset = 0;
  if (normalizeMode === 'dB') {
    // Average across 500-1000Hz
    let sum = 0;
    let count = 0;
    for (let p of smoothed) {
      if (p.x >= 500 && p.x <= 1000) {
        sum += p.y;
        count++;
      }
    }
    const avg = count > 0 ? (sum / count) : smoothed[0].y;
    offset = normalizeDb - avg;
  } else if (normalizeMode === 'Hz') {
    const valAtHz = interpolate(smoothed, normalizeHz);
    offset = normalizeDb - valAtHz;
  }

  return smoothed.map(p => ({ x: p.x, y: p.y + offset }));
}

/**
 * Logarithmic interpolation to find the amplitude at a specific frequency
 */
export function interpolate(data, freq) {
  if (!data || data.length === 0) return 0;
  if (freq <= data[0].x) return data[0].y;
  if (freq >= data[data.length - 1].x) return data[data.length - 1].y;

  for (let i = 0; i < data.length - 1; i++) {
    if (freq >= data[i].x && freq <= data[i + 1].x) {
      // Log interpolation
      const x0 = Math.log10(data[i].x);
      const x1 = Math.log10(data[i + 1].x);
      const y0 = data[i].y;
      const y1 = data[i + 1].y;
      const x = Math.log10(freq);
      
      const t = (x - x0) / (x1 - x0);
      return y0 + t * (y1 - y0);
    }
  }
  return 0;
}

/**
 * Calculates the amplitude response of a single biquad peaking EQ filter at a given frequency
 */
export function getPeakEqResponse(freq, centerFreq, q, gainDb) {
  const w0 = 2 * Math.PI * (centerFreq / 48000);
  const A = Math.pow(10, gainDb / 40);
  const alpha = Math.sin(w0) / (2 * q);

  const b0 = 1 + alpha * A;
  const b1 = -2 * Math.cos(w0);
  const b2 = 1 - alpha * A;
  const a0 = 1 + alpha / A;
  const a1 = -2 * Math.cos(w0);
  const a2 = 1 - alpha / A;

  const w = 2 * Math.PI * (freq / 48000);
  const cosw = Math.cos(w);
  const cos2w = Math.cos(2 * w);

  const num = b0*b0 + b1*b1 + b2*b2 + 2*(b0*b1 + b1*b2)*cosw + 2*b0*b2*cos2w;
  const den = a0*a0 + a1*a1 + a2*a2 + 2*(a0*a1 + a1*a2)*cosw + 2*a0*a2*cos2w;

  return 10 * Math.log10(num / den);
}

export function getShelfEqResponse(freq, centerFreq, q, gainDb, isHigh) {
  const w0 = 2 * Math.PI * (centerFreq / 48000);
  const A = Math.pow(10, gainDb / 40);
  const alpha = Math.sin(w0) / (2 * q);
  
  let b0, b1, b2, a0, a1, a2;
  
  if (isHigh) {
    b0 = A * ((A + 1) + (A - 1) * Math.cos(w0) + 2 * Math.sqrt(A) * alpha);
    b1 = -2 * A * ((A - 1) + (A + 1) * Math.cos(w0));
    b2 = A * ((A + 1) + (A - 1) * Math.cos(w0) - 2 * Math.sqrt(A) * alpha);
    a0 = (A + 1) - (A - 1) * Math.cos(w0) + 2 * Math.sqrt(A) * alpha;
    a1 = 2 * ((A - 1) - (A + 1) * Math.cos(w0));
    a2 = (A + 1) - (A - 1) * Math.cos(w0) - 2 * Math.sqrt(A) * alpha;
  } else {
    // Low Shelf
    b0 = A * ((A + 1) - (A - 1) * Math.cos(w0) + 2 * Math.sqrt(A) * alpha);
    b1 = 2 * A * ((A - 1) - (A + 1) * Math.cos(w0));
    b2 = A * ((A + 1) - (A - 1) * Math.cos(w0) - 2 * Math.sqrt(A) * alpha);
    a0 = (A + 1) + (A - 1) * Math.cos(w0) + 2 * Math.sqrt(A) * alpha;
    a1 = -2 * ((A - 1) + (A + 1) * Math.cos(w0));
    a2 = (A + 1) + (A - 1) * Math.cos(w0) - 2 * Math.sqrt(A) * alpha;
  }

  const w = 2 * Math.PI * (freq / 48000);
  const cosw = Math.cos(w);
  const cos2w = Math.cos(2 * w);

  const num = b0*b0 + b1*b1 + b2*b2 + 2*(b0*b1 + b1*b2)*cosw + 2*b0*b2*cos2w;
  const den = a0*a0 + a1*a1 + a2*a2 + 2*(a0*a1 + a1*a2)*cosw + 2*a0*a2*cos2w;

  return 10 * Math.log10(num / den);
}

export function getTotalEqResponse(freq, bands, preamp = 0) {
  let totalDb = preamp;
  for (const band of bands) {
    if (band.gain === 0) continue;
    if (band.type === 'HSF') {
      totalDb += getShelfEqResponse(freq, band.freq, band.q, band.gain, true);
    } else if (band.type === 'LSF') {
      totalDb += getShelfEqResponse(freq, band.freq, band.q, band.gain, false);
    } else {
      totalDb += getPeakEqResponse(freq, band.freq, band.q, band.gain);
    }
  }
  return totalDb;
}

/**
 * Heuristic AutoEQ calculation.
 * Compares measurement and target, and tries to set the 31 bands to match the target.
 */
export function calculateAutoEq(measurement, target, minFreq = 20, maxFreq = 10000, maxGain = 12, maxQ = 2.0, userOffset = 0) {
  const bands = [];
  const measurementOffset = userOffset;

  for (const f of STANDARD_FREQUENCIES) {
    if (f > maxFreq || f < minFreq) continue;
    const q = maxQ; // Use default or user's max Q
    
    bands.push({
      freq: f,
      q: q,
      gain: 0, // We will calculate iteratively
      type: 'Peak'
    });
  }

  // Iterative AutoEQ Solver to prevent massive overlap summation
  for (let iter = 0; iter < 3; iter++) {
    for (let i = 0; i < bands.length; i++) {
      const band = bands[i];
      const measY = interpolate(measurement, band.freq) + measurementOffset;
      const targY = interpolate(target, band.freq);
      
      const currentEqVal = getTotalEqResponse(band.freq, bands);
      
      // We want measY + currentEqVal = targY
      // Error = targY - (measY + currentEqVal)
      let error = targY - (measY + currentEqVal);
      
      let newGain = band.gain + (error * 0.5); // 0.5 learning rate
      
      // Clamp to maxGain
      if (newGain > maxGain) newGain = maxGain;
      if (newGain < -maxGain) newGain = -maxGain;
      
      band.gain = parseFloat(newGain.toFixed(1));
    }
  }

  return bands;
}

export function buildFfmpegEqString(bands, preamp = 0) {
  let filters = [];
  if (preamp !== 0) {
    filters.push(`volume=volume=${preamp}dB`);
  }
  
  const bandFilters = bands.filter(b => b.gain !== 0).map(b => {
    if (b.type === 'HSF') {
      return `highshelf=f=${b.freq}:width_type=q:w=${b.q}:g=${b.gain}`;
    } else if (b.type === 'LSF') {
      return `lowshelf=f=${b.freq}:width_type=q:w=${b.q}:g=${b.gain}`;
    } else {
      return `equalizer=f=${b.freq}:width_type=q:w=${b.q}:g=${b.gain}`;
    }
  });

  return filters.concat(bandFilters).join(',');
}
