import React, { useMemo, useEffect, useRef } from 'react';

const LyricsView = ({ lyrics, currentTime }) => {
  const containerRef = useRef(null);
  
  const parsed = useMemo(() => {
    if (!lyrics) return { isSynced: false, lines: [] };
    
    const lines = lyrics.split('\n');
    const result = [];
    const timeRegex = /\[(\d{2}):(\d{2}(?:\.\d{1,3})?)\]/g;
    
    let hasTime = false;
    
    lines.forEach((line, index) => {
      let match;
      const times = [];
      timeRegex.lastIndex = 0;
      while ((match = timeRegex.exec(line)) !== null) {
        hasTime = true;
        const min = parseInt(match[1], 10);
        const sec = parseFloat(match[2]);
        times.push(min * 60 + sec);
      }
      const text = line.replace(/\[\d{2}:\d{2}(?:\.\d{1,3})?\]/g, '').trim();
      
      if (times.length > 0) {
        times.forEach(t => result.push({ time: t, text: text || ' ' }));
      } else if (!hasTime && text) {
        result.push({ time: index, text }); 
      }
    });
    
    if (!hasTime) {
      return { isSynced: false, lines: result };
    }
    
    return { isSynced: true, lines: result.sort((a, b) => a.time - b.time) };
  }, [lyrics]);

  const activeIndex = useMemo(() => {
    if (!parsed.isSynced || parsed.lines.length === 0) return -1;
    let idx = -1;
    for (let i = 0; i < parsed.lines.length; i++) {
      if (currentTime >= parsed.lines[i].time - 0.3) {
        idx = i;
      } else {
        break;
      }
    }
    return idx;
  }, [parsed, currentTime]);

  useEffect(() => {
    if (parsed.isSynced && activeIndex !== -1 && containerRef.current) {
      const activeEl = containerRef.current.querySelector(`[data-index="${activeIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeIndex, parsed.isSynced]);

  if (!lyrics) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
        No lyrics found in file metadata.
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      style={{ 
        width: '100%', 
        height: '100%', 
        overflowY: 'auto', 
        padding: '80px 40px', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        scrollBehavior: 'smooth'
      }}
      className="hide-scrollbar"
    >
      {parsed.lines.map((line, idx) => {
        const isActive = parsed.isSynced && idx === activeIndex;
        const isPast = parsed.isSynced && idx < activeIndex;
        
        return (
          <div 
            key={idx}
            data-index={idx}
            style={{
              fontSize: isActive ? '28px' : '18px',
              fontWeight: isActive ? 'bold' : 'normal',
              color: isActive ? 'var(--text-main)' : (isPast ? '#666' : 'var(--text-muted)'),
              opacity: isActive ? 1 : 0.6,
              textShadow: isActive ? '0 0 20px rgba(255,255,255,0.4)' : 'none',
              textAlign: 'center',
              margin: '10px 0',
              transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              minHeight: '24px'
            }}
          >
            {line.text}
          </div>
        );
      })}
    </div>
  );
};

export default LyricsView;
