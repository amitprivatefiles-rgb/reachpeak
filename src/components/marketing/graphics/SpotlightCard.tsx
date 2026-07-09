import { useRef, useCallback, ReactNode } from 'react';

export function SpotlightCard({ children, className = '' }: {
  children: ReactNode; className?: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--sx', `${e.clientX - rect.left}px`);
    card.style.setProperty('--sy', `${e.clientY - rect.top}px`);
  }, []);

  return (
    <div
      ref={cardRef}
      className={`mkt-spotlight ${className}`}
      onMouseMove={handleMouseMove}
    >
      {/* Spotlight gradient follows cursor — desktop only */}
      <div className="hidden lg:block" style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(400px circle at var(--sx, 50%) var(--sy, 50%), rgba(224,70,50,0.06), transparent 60%)',
        pointerEvents: 'none',
      }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}
