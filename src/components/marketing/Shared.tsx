import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useScrollReveal } from '../../hooks/useScrollReveal';

interface SectionProps {
  children: ReactNode;
  className?: string;
  id?: string;
  delay?: number;
  size?: 'sm' | 'md' | 'lg';
}

/** Scroll-reveal section wrapper */
export function Section({ children, className = '', id, delay = 0, size = 'md' }: SectionProps) {
  const { ref, isVisible } = useScrollReveal<HTMLElement>();
  const sizeClass = size === 'lg' ? 'mkt-section-lg' : size === 'sm' ? 'mkt-section-sm' : '';

  return (
    <section
      ref={ref}
      id={id}
      className={`mkt-section ${sizeClass} ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(28px)',
        transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </section>
  );
}

/** Gradient text span */
export function GradientText({ children, from = '#E04632', to = '#F06850' }: {
  children: ReactNode; from?: string; to?: string;
}) {
  return (
    <span style={{
      background: `linear-gradient(135deg, ${from}, ${to})`,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    }}>{children}</span>
  );
}

/** Display heading */
export function DisplayHeading({ children, as: Tag = 'h2' }: {
  children: ReactNode; as?: 'h1' | 'h2' | 'h3';
}) {
  const cls = Tag === 'h1' ? 'mkt-display-h1' : Tag === 'h2' ? 'mkt-display-h2' : 'mkt-display-h3';
  return <Tag className={cls}>{children}</Tag>;
}

/** Glass card */
export function GlassCard({ children, className = '' }: {
  children: ReactNode; className?: string;
}) {
  return <div className={`mkt-glass ${className}`}>{children}</div>;
}

/** CTA band */
export function CTABand() {
  return (
    <section className="mkt-cta">
      {/* Aurora glow */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 600, height: 300,
        background: 'radial-gradient(ellipse, rgba(224,70,50,0.12) 0%, transparent 70%)',
        filter: 'blur(60px)',
        pointerEvents: 'none',
      }} />
      <div style={{ position: 'relative', maxWidth: 680, margin: '0 auto' }}>
        <DisplayHeading as="h2">
          Your customers are on WhatsApp.{' '}
          <GradientText>Your revenue should be too.</GradientText>
        </DisplayHeading>
        <p className="mkt-body" style={{ marginTop: 16, fontSize: 18 }}>
          Start for free. No credit card. Go live in under 10 minutes.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 32, flexWrap: 'wrap' }}>
          <Link to="/signup" className="mkt-btn-primary">Start free</Link>
          <Link to="/contact" className="mkt-btn-secondary">Talk to us</Link>
        </div>
      </div>
    </section>
  );
}
