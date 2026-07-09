import { useEffect } from 'react';
import { Section, GradientText, DisplayHeading, GlassCard, CTABand } from './Shared';
import { MetricTicker } from './graphics/MetricTicker';
import { SpotlightCard } from './graphics/SpotlightCard';
import { useScrollReveal } from '../../hooks/useScrollReveal';

/* ─── TIMELINE ─── */
const MILESTONES = [
  { year: '2024', title: 'Founded', desc: 'Started with one idea: WhatsApp is where Indian businesses should sell.' },
  { year: '2025 Q1', title: 'First 1M messages', desc: 'Crossed one million WhatsApp messages delivered for D2C brands across India.' },
  { year: '2025 Q3', title: 'OrderGuard™ launch', desc: 'Real-time COD fraud scoring goes live. RTO rates drop 28% on average.' },
  { year: '2026', title: 'Today', desc: 'Multi-vertical platform serving e-commerce, clinics, salons, education, real estate, and services.' },
];

function Timeline() {
  return (
    <div style={{ position: 'relative', maxWidth: 600, margin: '0 auto', padding: '40px 0 40px 40px' }}>
      {/* Vertical line */}
      <div style={{
        position: 'absolute', left: 16, top: 0, bottom: 0, width: 2,
        background: 'linear-gradient(180deg, transparent, #E04632 10%, #E04632 90%, transparent)',
      }} />
      {MILESTONES.map((m, i) => (
        <TimelineNode key={i} milestone={m} index={i} />
      ))}
    </div>
  );
}

function TimelineNode({ milestone: m, index: i }: { milestone: typeof MILESTONES[number]; index: number }) {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();
  return (
    <div ref={ref} style={{
      position: 'relative', marginBottom: 48, paddingLeft: 40,
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translateX(0)' : 'translateX(-20px)',
      transition: `all 0.6s cubic-bezier(0.16,1,0.3,1) ${i * 100}ms`,
    }}>
      {/* Node dot */}
      <div style={{
        position: 'absolute', left: -32, top: 4,
        width: 14, height: 14, borderRadius: '50%',
        background: '#E04632', border: '3px solid #070B14',
        boxShadow: '0 0 12px rgba(224,70,50,0.4)',
      }} />
      <div style={{
        padding: 24, borderRadius: 16,
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <span style={{
          display: 'inline-block', padding: '3px 10px', borderRadius: 6, marginBottom: 8,
          background: 'rgba(224,70,50,0.1)', fontSize: 12, fontWeight: 600, color: '#E04632',
        }}>{m.year}</span>
        <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 18, color: '#f1f5f9', marginBottom: 4 }}>{m.title}</h3>
        <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.6, fontFamily: "'Inter', sans-serif", margin: 0 }}>{m.desc}</p>
      </div>
    </div>
  );
}

/* ─── VALUES ─── */
const VALUES = [
  { title: 'Ship fast, learn faster', desc: 'We launch features weekly and iterate based on real merchant data — not assumptions.', icon: '🚀' },
  { title: 'Revenue over vanity', desc: 'Every feature we build must provably make merchants money. If it doesn\'t, we cut it.', icon: '📈' },
  { title: 'Secure by default', desc: 'Vault-encrypted secrets, HMAC-verified webhooks, RLS on every table. Trust is the product.', icon: '🔒' },
  { title: 'India-first, global-ready', desc: 'Built for Indian business realities — COD, UPI, pincodes, ₹ — but architected for anywhere.', icon: '🇮🇳' },
];

/* ─── INDIA MAP DOT GRID ─── */
function IndiaMapAccent() {
  return (
    <svg width="200" height="240" viewBox="0 0 200 240" style={{ opacity: 0.06 }}>
      {/* Simplified India shape as dot grid */}
      {Array.from({ length: 20 }, (_, row) =>
        Array.from({ length: 16 }, (_, col) => {
          const x = col * 12 + 8;
          const y = row * 12 + 8;
          // Rough India boundary
          const inShape =
            (row > 1 && row < 18 && col > 3 && col < 14) &&
            !(row < 4 && col < 6) && !(row < 3 && col > 11) &&
            !(row > 15 && col < 5) && !(row > 16 && col > 10) &&
            !(row > 14 && col < 4);
          return inShape ? <circle key={`${row}-${col}`} cx={x} cy={y} r={1.5} fill="white" /> : null;
        })
      )}
    </svg>
  );
}

/* ─── ABOUT PAGE ─── */
export function AboutPage() {
  useEffect(() => {
    document.title = 'About ReachPeak — Building the revenue layer for WhatsApp';
  }, []);

  return (
    <>
      {/* Hero */}
      <section style={{
        minHeight: '60vh', display: 'flex', alignItems: 'center',
        paddingTop: 96, paddingBottom: 48, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '-20%', left: '30%',
          width: 700, height: 500,
          background: 'radial-gradient(ellipse, rgba(224,70,50,0.08) 0%, transparent 60%)',
          filter: 'blur(80px)', pointerEvents: 'none',
          animation: 'aboutAurora 12s ease-in-out infinite alternate',
        }} />
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.025,
          backgroundImage: 'radial-gradient(circle, #e2e8f0 1px, transparent 1px)',
          backgroundSize: '24px 24px', pointerEvents: 'none',
        }} />
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px', textAlign: 'center', position: 'relative' }}>
          <DisplayHeading as="h1">
            We're building the{' '}
            <GradientText>revenue layer</GradientText>{' '}
            for WhatsApp.
          </DisplayHeading>
          <p style={{ fontSize: 18, color: '#94a3b8', marginTop: 20, lineHeight: 1.7, fontFamily: "'Inter', sans-serif", maxWidth: 600, margin: '20px auto 0' }}>
            WhatsApp has 500M+ users in India. Every business runs on it. But there's no platform that turns conversations into revenue — until now.
          </p>
        </div>
        <style>{`
          @keyframes aboutAurora {
            from { transform: translate(0, 0) scale(1); }
            to { transform: translate(40px, -30px) scale(1.15); }
          }
        `}</style>
      </section>

      {/* Timeline */}
      <Section className="py-20">
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <DisplayHeading as="h2">Our <GradientText>story.</GradientText></DisplayHeading>
        </div>
        <Timeline />
      </Section>

      {/* Stats */}
      <Section className="py-16">
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 32, padding: '48px 32px',
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
          borderRadius: 24,
        }}>
          <MetricTicker value={5} suffix="M+" label="messages delivered" />
          <MetricTicker value={200} suffix="+" label="businesses served" />
          <MetricTicker value={12} suffix="L+" label="₹ recovered" prefix="₹" />
        </div>
      </Section>

      {/* Values */}
      <Section className="py-20">
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <DisplayHeading as="h2">What we <GradientText>believe.</GradientText></DisplayHeading>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {VALUES.map((v, i) => (
            <SpotlightCard key={i}>
              <div style={{ padding: 28 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>{v.icon}</div>
                <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 18, color: '#f1f5f9', marginBottom: 8 }}>{v.title}</h3>
                <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.6, fontFamily: "'Inter', sans-serif", margin: 0 }}>{v.desc}</p>
              </div>
            </SpotlightCard>
          ))}
        </div>
      </Section>

      {/* Built in India */}
      <Section className="py-20">
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 48,
          padding: '48px 32px', borderRadius: 24,
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
          flexWrap: 'wrap',
        }}>
          <IndiaMapAccent />
          <div style={{ maxWidth: 400 }}>
            <DisplayHeading as="h3">
              Built in India,{' '}
              <GradientText>for Indian business.</GradientText>
            </DisplayHeading>
            <p style={{ fontSize: 15, color: '#94a3b8', marginTop: 12, lineHeight: 1.7, fontFamily: "'Inter', sans-serif" }}>
              COD, UPI, pincodes, ₹ — we understand Indian commerce because we live it. Data hosted in India (AWS ap-south-1). Pricing in INR. Support in your timezone.
            </p>
          </div>
        </div>
      </Section>

      <CTABand />
    </>
  );
}
