import React, { useState, useEffect } from 'react';
import { Waveform } from './Waveform';
import { OutcomeChips } from './OutcomeChips';

export interface TranscriptLine {
  speaker: 'AI' | 'Customer';
  text: string;
}

export function LiveCallCard({ 
  compact = false, 
  transcript = [
    { speaker: 'AI', text: 'Hi Priya! Calling from Glow Salon about tomorrow\'s 4 PM appointment...' },
    { speaker: 'Customer', text: 'Can we do 6 PM instead?' },
    { speaker: 'AI', text: 'Done — moved to 6 PM. Confirmation on WhatsApp ✓' }
  ],
  outcomeLabel = 'Rescheduled ✓',
  outcomeValue
}: { 
  compact?: boolean;
  transcript?: TranscriptLine[];
  outcomeLabel?: string;
  outcomeValue?: string;
}) {
  const [timer, setTimer] = useState(0);
  const [activeLine, setActiveLine] = useState(-1);
  
  useEffect(() => {
    const t = setInterval(() => setTimer(v => (v < 59 ? v + 1 : 59)), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let step = 0;
    setActiveLine(0); // Show first line immediately
    const interval = setInterval(() => {
      step++;
      if (step < transcript.length) {
        setActiveLine(step);
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [transcript]);

  const formatTime = (s: number) => `00:${s.toString().padStart(2, '0')}`;
  const callEnded = activeLine >= transcript.length - 1;

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 24,
      padding: compact ? 20 : 32,
      display: 'flex',
      flexDirection: 'column',
      gap: 24,
      boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
    }}>
      {/* Top Header: Orb, Title, Timer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Pulsing Orb */}
          <div style={{ position: 'relative', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className={`orb-ring ${!callEnded ? 'active' : ''}`} style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'rgba(224,70,50,0.2)', position: 'absolute' }} />
            <div className={`orb-ring inner ${!callEnded ? 'active' : ''}`} style={{ width: '70%', height: '70%', borderRadius: '50%', background: 'rgba(224,70,50,0.4)', position: 'absolute' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#E04632', position: 'relative', zIndex: 2 }} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9', fontFamily: "'Inter', sans-serif" }}>AI Agent</div>
            <div style={{ fontSize: 13, color: '#10B981', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
              {callEnded ? 'Call ended' : 'On call'}
            </div>
          </div>
        </div>
        <div style={{ fontSize: 16, fontFamily: "'Space Grotesk', monospace", color: '#94a3b8', fontWeight: 500 }}>
          {formatTime(timer)}
        </div>
      </div>

      {/* Waveform */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0' }}>
        <Waveform active={!callEnded} color="#E04632" bars={compact ? 24 : 32} height={40} />
      </div>

      {/* Transcript */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: compact ? 120 : 140 }}>
        {transcript.map((line, i) => {
          if (i > activeLine) return null;
          const isAI = line.speaker === 'AI';
          return (
            <div key={i} className="transcript-line" style={{
              alignSelf: isAI ? 'flex-start' : 'flex-end',
              background: isAI ? 'rgba(224,70,50,0.1)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${isAI ? 'rgba(224,70,50,0.2)' : 'rgba(255,255,255,0.1)'}`,
              padding: '10px 14px',
              borderRadius: 12,
              borderBottomLeftRadius: isAI ? 4 : 12,
              borderBottomRightRadius: !isAI ? 4 : 12,
              maxWidth: '85%',
              fontSize: 13,
              fontFamily: "'Inter', sans-serif",
              color: '#e2e8f0',
              lineHeight: 1.5,
            }}>
              <strong style={{ color: isAI ? '#E04632' : '#94a3b8', fontSize: 11, textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>{line.speaker}</strong>
              {line.text}
            </div>
          );
        })}
      </div>

      {/* Outcome */}
      <div style={{
        marginTop: 'auto',
        opacity: callEnded ? 1 : 0,
        transform: callEnded ? 'translateY(0)' : 'translateY(10px)',
        transition: 'all 0.5s cubic-bezier(0.16,1,0.3,1)',
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, fontFamily: "'Inter', sans-serif" }}>Live Outcome</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <OutcomeChips label={outcomeLabel} value={outcomeValue} delay={0} />
        </div>
      </div>

      <style>{`
        @keyframes orb-pulse {
          0% { transform: scale(0.8); opacity: 0.8; }
          50% { transform: scale(1.5); opacity: 0.2; }
          100% { transform: scale(0.8); opacity: 0.8; }
        }
        .orb-ring.active {
          animation: orb-pulse 2s ease-in-out infinite;
        }
        .orb-ring.inner.active {
          animation-delay: 0.5s;
          animation-duration: 1.5s;
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .transcript-line {
          animation: fade-up 0.4s ease-out forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .orb-ring.active { animation: none; transform: scale(1); }
          .transcript-line { animation: none; }
        }
      `}</style>
    </div>
  );
}
