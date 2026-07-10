import React from 'react';

export function Waveform({ active = true, color = '#E04632', bars = 16, height = 32 }: { active?: boolean; color?: string; bars?: number; height?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, height }}>
      {Array.from({ length: bars }).map((_, i) => {
        // Pseudo-random heights for variety
        const baseHeight = 30 + Math.sin(i * 1.5) * 20 + Math.cos(i * 3) * 30;
        const normalized = Math.max(15, Math.min(100, baseHeight));
        
        return (
          <div
            key={i}
            className="wave-bar"
            style={{
              width: 3,
              borderRadius: 2,
              background: color,
              height: `${normalized}%`,
              animationDelay: `${i * 0.05}s`,
              animationPlayState: active ? 'running' : 'paused',
            }}
          />
        );
      })}
      <style>{`
        @keyframes waveform-bounce {
          0%, 100% { transform: scaleY(0.5); }
          50% { transform: scaleY(1.2); }
        }
        .wave-bar {
          animation: waveform-bounce 0.8s ease-in-out infinite;
          transform-origin: center;
        }
        @media (prefers-reduced-motion: reduce) {
          .wave-bar {
            animation: none !important;
            transform: scaleY(1) !important;
          }
        }
      `}</style>
    </div>
  );
}
