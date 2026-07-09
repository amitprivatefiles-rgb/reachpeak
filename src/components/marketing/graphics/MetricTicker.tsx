import { useRef, useState, useEffect } from 'react';

interface MetricTickerProps {
  value: number;
  suffix?: string;
  prefix?: string;
  label: string;
  duration?: number;
  decimals?: number;
}

export function MetricTicker({ value, suffix = '', prefix = '', label, duration = 1200, decimals = 0 }: MetricTickerProps) {
  const [current, setCurrent] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - t, 3);
          setCurrent(eased * value);
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.3 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [value, duration]);

  const formatted = decimals > 0 ? current.toFixed(decimals) : Math.round(current).toLocaleString();

  return (
    <div ref={ref} style={{ textAlign: 'center', padding: '16px 0' }}>
      <div style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: 'clamp(2.5rem, 5vw, 4rem)',
        fontWeight: 700,
        background: 'linear-gradient(135deg, #E04632, #F06850)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        lineHeight: 1.1,
      }}>
        {prefix}{formatted}{suffix}
      </div>
      <div style={{
        fontSize: 14, color: '#94a3b8', marginTop: 8,
        fontFamily: "'Inter', sans-serif", fontWeight: 500,
      }}>{label}</div>
    </div>
  );
}
