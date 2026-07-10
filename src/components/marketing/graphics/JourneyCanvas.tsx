import { useState, useEffect } from 'react';
import { Waveform } from './voice/Waveform';

interface JourneyStep {
  label: string;
  type: 'trigger' | 'wait' | 'send' | 'condition' | 'exit' | 'ai_call';
  icon?: string;
}

interface JourneyCanvasProps {
  steps?: JourneyStep[];
  className?: string;
}

const DEFAULT_STEPS: JourneyStep[] = [
  { label: 'Cart Abandoned', type: 'trigger', icon: '🛒' },
  { label: 'Wait 30min', type: 'wait', icon: '⏱' },
  { label: 'Send Reminder', type: 'send', icon: '💬' },
  { label: 'Purchased?', type: 'condition', icon: '🎯' },
  { label: 'Recovered ✓', type: 'exit', icon: '✅' },
];

const TYPE_COLORS: Record<string, string> = {
  trigger: '#E04632',
  wait: '#F59E0B',
  send: '#3B82F6',
  condition: '#8B5CF6',
  exit: '#E04632',
  ai_call: '#E04632', // voice uses primary color
};

export function JourneyCanvas({ steps = DEFAULT_STEPS, className = '' }: JourneyCanvasProps) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActive(prev => (prev + 1) % steps.length);
    }, 2200);
    return () => clearInterval(id);
  }, [steps.length]);

  const currentStep = steps[active];
  const color = TYPE_COLORS[currentStep?.type] || '#E04632';

  return (
    <div className={className} style={{ width: '100%' }}>
      {/* Step dots / progress */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {steps.map((s, i) => {
          const c = TYPE_COLORS[s.type] || '#6B7280';
          return (
            <div key={i} style={{
              flex: 1, height: 4, borderRadius: 2,
              background: i <= active ? c : 'rgba(255,255,255,0.1)',
              transition: 'background 0.5s',
            }} />
          );
        })}
      </div>

      {/* Current step card */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '16px 20px', borderRadius: 16,
        background: 'rgba(255,255,255,0.03)', border: `1px solid ${color}40`,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, bottom: 0, width: 4,
          background: color,
        }} />
        
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, position: 'relative'
        }}>
          {currentStep.type === 'ai_call' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 18 }}>📞</span>
              <div style={{ width: 16 }}><Waveform active color={color} bars={3} height={16} /></div>
            </div>
          ) : (
            currentStep.icon
          )}
        </div>
        
        <div>
          <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: 2 }}>
            {currentStep.type.replace('_', ' ')}
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#f1f5f9', fontFamily: "'Inter', sans-serif" }}>
            {currentStep.label}
          </div>
        </div>
      </div>
    </div>
  );
}
