import React, { useRef, useEffect, useState } from 'react';

const FUNNEL_DATA = [
  { label: 'Leads Received', value: 500, color: '#64748b' },
  { label: 'Called (<60s)', value: 412, color: '#3B82F6' },
  { label: 'Connected', value: 318, color: '#10B981' },
  { label: 'Qualified', value: 121, color: '#E04632' },
];

export function CallFunnel() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.2 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const maxVal = FUNNEL_DATA[0].value;

  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {FUNNEL_DATA.map((item, i) => {
        const widthPct = (item.value / maxVal) * 100;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 100, fontSize: 13, color: '#94a3b8', fontFamily: "'Inter', sans-serif", textAlign: 'right' }}>
              {item.label}
            </div>
            <div style={{ flex: 1, height: 24, background: 'rgba(255,255,255,0.03)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: visible ? `${widthPct}%` : '0%',
                background: item.color,
                borderRadius: 12,
                transition: `width 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.15}s`,
              }} />
            </div>
            <div style={{ width: 40, fontSize: 14, fontWeight: 700, color: '#e2e8f0', fontFamily: "'Space Grotesk', sans-serif" }}>
              {item.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}
