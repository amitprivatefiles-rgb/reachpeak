import { useState, useEffect } from 'react';

interface JourneyStep {
  label: string;
  type: 'trigger' | 'wait' | 'send' | 'condition' | 'exit';
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
};

export function JourneyCanvas({ steps = DEFAULT_STEPS, className = '' }: JourneyCanvasProps) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActive(prev => (prev + 1) % steps.length);
    }, 2200);
    return () => clearInterval(id);
  }, [steps.length]);

  const color = TYPE_COLORS[steps[active]?.type] || '#E04632';

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
        padding: '14px 16px',
        background: `${color}18`,
        border: `1px solid ${color}40`,
        borderRadius: 14,
        transition: 'all 0.4s ease',
        minHeight: 60,
      }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12, flexShrink: 0,
          background: `${color}25`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20,
        }}>
          {steps[active]?.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14, fontWeight: 700, color: '#f1f5f9',
            fontFamily: "'Space Grotesk', sans-serif",
          }}>{steps[active]?.label}</div>
          <div style={{
            fontSize: 11, fontWeight: 500, color: color,
            fontFamily: "'Inter', sans-serif",
            marginTop: 1,
          }}>Step {active + 1} of {steps.length}</div>
        </div>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          border: `2px solid ${color}50`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: color,
          fontFamily: "'Space Grotesk', sans-serif",
          flexShrink: 0,
        }}>{active + 1}</div>
      </div>
    </div>
  );
}
