import React, { useState, useEffect } from 'react';
import { Sparkles, ChevronRight, Zap, CheckCircle2, AlertTriangle } from 'lucide-react';

interface TickerItem {
  id: string;
  icon: 'zap' | 'check' | 'alert' | 'ai';
  department: string;
  text: string;
  time: string;
  tag: string;
}

const DEFAULT_FEED: TickerItem[] = [
  { id: '1', icon: 'ai', department: 'AI Triage Engine', text: 'Auto-classified incident #CIVIX-2026-000010 as HIGH Severity (Water Pipeline Leak)', time: 'Just now', tag: 'AI AUTO-DISPATCH' },
  { id: '2', icon: 'zap', department: 'Field Ops', text: 'Officer Ramesh Gowda updated Pothole repair to 50% (Halfway Resolved)', time: '2m ago', tag: 'FIELD PROGRESS' },
  { id: '3', icon: 'check', department: 'Electricity Board', text: 'Power restoration & hanging wire hazard completed at Indiranagar 100ft Rd', time: '5m ago', tag: 'RESOLVED' },
  { id: '4', icon: 'alert', department: 'Public Safety', text: 'Open Manhole barricaded and under active repair by Drainage Division', time: '8m ago', tag: 'SAFETY DISPATCH' },
  { id: '5', icon: 'check', department: 'Sanitation', text: 'Garbage dump clearance completed in Jayanagar 4th Block', time: '12m ago', tag: 'RESOLVED' }
];

export const LiveActivityTicker: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [feed] = useState<TickerItem[]>(DEFAULT_FEED);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % feed.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [isPaused, feed.length]);

  const current = feed[currentIndex];

  const getIcon = (type: string) => {
    switch (type) {
      case 'ai': return <Sparkles size={14} style={{ color: '#38bdf8' }} />;
      case 'zap': return <Zap size={14} style={{ color: '#f59e0b' }} />;
      case 'check': return <CheckCircle2 size={14} style={{ color: '#10b981' }} />;
      default: return <AlertTriangle size={14} style={{ color: '#ef4444' }} />;
    }
  };

  const getTagColor = (tag: string) => {
    if (tag.includes('RESOLVED')) return 'rgba(16,185,129,0.2)';
    if (tag.includes('AI')) return 'rgba(56,189,248,0.2)';
    if (tag.includes('FIELD')) return 'rgba(245,158,11,0.2)';
    return 'rgba(239,68,68,0.2)';
  };

  return (
    <div
      className="broadcast-ticker animate-fade-in"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        margin: '0 24px 16px 24px',
        fontSize: '0.8rem',
        boxSizing: 'border-box',
        cursor: 'pointer',
        transition: 'all 0.2s ease'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
        {/* Pulsing Live Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(16,185,129,0.15)', padding: '3px 8px', borderRadius: '20px', border: '1px solid rgba(16,185,129,0.3)', flexShrink: 0 }}>
          <div className="pulse-dot" />
          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#10b981', letterSpacing: '0.5px' }}>
            LIVE MUNICIPAL RADAR
          </span>
        </div>

        {/* Ticker Item */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            {getIcon(current.icon)}
          </span>
          <span style={{
            fontSize: '0.65rem',
            fontWeight: 700,
            padding: '1px 6px',
            borderRadius: '4px',
            backgroundColor: getTagColor(current.tag),
            color: '#fff',
            flexShrink: 0
          }}>
            {current.tag}
          </span>
          <strong style={{ color: 'white', flexShrink: 0 }}>{current.department}:</strong>
          <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {current.text}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)' }}>
          {current.time}
        </span>
        <button
          onClick={() => setCurrentIndex((currentIndex + 1) % feed.length)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--primary-color)',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex',
            alignItems: 'center'
          }}
          title="Next Update"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};
