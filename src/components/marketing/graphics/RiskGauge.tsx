import { useRef, useState, useEffect } from 'react';

interface RiskGaugeProps {
  score: number;
  label?: string;
  size?: number;
  animate?: boolean;
  className?: string;
}

export function RiskGauge({ score, label = 'High · Prepay link sent', size = 200, animate = true, className = '' }: RiskGaugeProps) {
  const [currentScore, setCurrentScore] = useState(animate ? 0 : score);
  const ref = useRef<HTMLDivElement>(null);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (!animate) { setCurrentScore(score); return; }
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !hasStarted.current) {
        hasStarted.current = true;
        const start = performance.now();
        const duration = 800;
        const tick = (now: number) => {
          const t = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - t, 3);
          setCurrentScore(Math.round(eased * score));
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.3 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [animate, score]);

  const band = currentScore < 40 ? 'Low' : currentScore < 70 ? 'Medium' : 'High';
  const bandColor = currentScore < 40 ? '#E04632' : currentScore < 70 ? '#F59E0B' : '#EF4444';

  // Arc math (270° arc)
  const r = size * 0.35;
  const cx = size / 2;
  const cy = size * 0.5;
  const circumference = 2 * Math.PI * r * 0.75; // 270° = 75% of full circle
  const offset = circumference * (1 - currentScore / 100);
  const startAngle = 135; // Start at bottom-left

  return (
    <div ref={ref} className={className} style={{
      width: '100%', maxWidth: size, padding: size * 0.08, margin: '0 auto',
      background: 'rgba(255,255,255,0.03)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 20,
      textAlign: 'center',
    }}>
      <svg width="100%" height="auto" viewBox={`0 0 ${size} ${size * 0.7}`}>
        <defs>
          <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#E04632" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth={size * 0.06}
          strokeLinecap="round" strokeDasharray={circumference}
          strokeDashoffset={0}
          transform={`rotate(${startAngle} ${cx} ${cy})`}
        />
        {/* Active arc */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="url(#gaugeGrad)" strokeWidth={size * 0.06}
          strokeLinecap="round" strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(${startAngle} ${cx} ${cy})`}
          style={{ transition: animate ? 'none' : 'stroke-dashoffset 0.8s ease-out' }}
        />
        {/* Score */}
        <text x={cx} y={cy - 4} textAnchor="middle" dominantBaseline="middle"
          fill="white" fontSize={size * 0.2} fontWeight="700"
          fontFamily="'Space Grotesk', sans-serif"
        >{currentScore}</text>
        {/* Band label */}
        <text x={cx} y={cy + size * 0.12} textAnchor="middle"
          fill={bandColor} fontSize={size * 0.07} fontWeight="600"
          fontFamily="'Inter', sans-serif"
        >{band}</text>
      </svg>
      {label && (
        <div style={{
          marginTop: 4, fontSize: size * 0.06, color: '#94a3b8',
          fontFamily: "'Inter', sans-serif",
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: bandColor, display: 'inline-block', animation: 'pulse 2s infinite' }} />
          {label}
        </div>
      )}
    </div>
  );
}
