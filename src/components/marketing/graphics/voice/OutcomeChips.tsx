import React from 'react';

type ChipType = 'Qualified' | 'Callback' | 'Converted' | 'NoAnswer';

interface OutcomeChipsProps {
  outcomes?: ChipType[];
  delayBase?: number;
}

const CHIP_CONFIG = {
  Qualified: { icon: '✓', color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
  Callback: { icon: '⏰', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  Converted: { icon: '₹', color: '#E04632', bg: 'rgba(224,70,50,0.1)' },
  NoAnswer: { icon: '✗', color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
};

export function OutcomeChips({ outcomes = ['Qualified', 'Callback', 'Converted', 'NoAnswer'], delayBase = 0 }: OutcomeChipsProps) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {outcomes.map((type, i) => {
        const conf = CHIP_CONFIG[type];
        return (
          <div
            key={i}
            className="outcome-chip"
            style={{
              padding: '4px 10px',
              borderRadius: 20,
              background: conf.bg,
              border: `1px solid ${conf.color}30`,
              color: conf.color,
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "'Inter', sans-serif",
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              animationDelay: `${delayBase + i * 0.15}s`,
            }}
          >
            <span>{conf.icon}</span>
            {type === 'NoAnswer' ? 'No answer' : type}
          </div>
        );
      })}
      <style>{`
        @keyframes chip-spring {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .outcome-chip {
          opacity: 0;
          animation: chip-spring 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .outcome-chip {
            animation: none !important;
            opacity: 1 !important;
          }
        }
      `}</style>
    </div>
  );
}
