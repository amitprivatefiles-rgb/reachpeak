import { useEffect } from 'react';
import { Section, GradientText, DisplayHeading, CTABand } from './Shared';
import { MetricTicker } from './graphics/MetricTicker';
import { SpotlightCard } from './graphics/SpotlightCard';
import { useScrollReveal } from '../../hooks/useScrollReveal';

const MILESTONES = [
  { year: 'Early 2025', title: 'The Frustration', desc: 'Running active businesses, Amit Rai faced constant friction: customer no-shows, unpaid invoices, and massive RTO losses on COD orders. The tools available were either too complex or didn\'t fit how Indian customers actually transact.' },
  { year: 'Mid 2025', title: 'The Spark', desc: 'Realizing that every Indian customer uses WhatsApp natively, Amit began building a simple, direct, and revenue-centric automation layer to solve his own problems.' },
  { year: 'Late 2025', title: 'Building ReachPeak', desc: 'ReachPeak was officially formed to bring this powerful WhatsApp automation to other Indian businesses, focusing on solving real problems like COD fraud and cart recovery.' },
  { year: 'Today', title: 'Growing with Merchants', desc: 'ReachPeak is continually evolving, driven by the real-world needs of Indian merchants who require simple, effective solutions to drive revenue.' },
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
  { title: 'Born from real pain', desc: 'We build for merchants because we were merchants. Every feature is designed to fix a problem we faced ourselves.', icon: '💡' },
  { title: 'Revenue over vanity metrics', desc: 'Every campaign and automated journey we launch must directly drive orders, confirmations, or payments.', icon: '📈' },
  { title: 'Secure & Trustworthy', desc: 'Secure APIs, official WhatsApp Cloud endpoints, and robust database safeguards. Trust is our absolute priority.', icon: '🔒' },
  { title: 'India-First Integration', desc: 'Tailored for Indian business realities — UPI, COD, pincodes, and rupees — but scalable globally.', icon: '🇮🇳' },
];

/* ─── GLOBE INDIA ACCENT ─── */
function GlobeIndiaAccent() {
  return (
    <div style={{
      width: 220, height: 220,
      borderRadius: '50%',
      background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.05), rgba(0,0,0,0.6))',
      boxShadow: 'inset -12px -12px 24px rgba(0,0,0,0.6), inset 2px 2px 10px rgba(255,255,255,0.05), 0 0 40px rgba(224,70,50,0.15)',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid rgba(255,255,255,0.03)',
      flexShrink: 0
    }}>
      {/* Background globe grid (latitude/longitude) */}
      <svg width="220" height="220" viewBox="0 0 220 220" style={{ position: 'absolute', opacity: 0.1 }}>
        <ellipse cx="110" cy="110" rx="100" ry="40" fill="none" stroke="white" strokeWidth="1" />
        <ellipse cx="110" cy="110" rx="100" ry="75" fill="none" stroke="white" strokeWidth="1" />
        <ellipse cx="110" cy="110" rx="40" ry="100" fill="none" stroke="white" strokeWidth="1" />
        <ellipse cx="110" cy="110" rx="75" ry="100" fill="none" stroke="white" strokeWidth="1" />
        <line x1="10" y1="110" x2="210" y2="110" stroke="white" strokeWidth="1" />
        <line x1="110" y1="10" x2="110" y2="210" stroke="white" strokeWidth="1" />
      </svg>
      
      {/* India Map Shape on the globe */}
      <svg width="100" height="110" viewBox="0 0 100 110" style={{
        position: 'absolute', top: '15%', left: '26%',
        filter: 'drop-shadow(0 0 6px rgba(224,70,50,0.6))',
        transform: 'rotate(-5deg)'
      }}>
        <path d="M 45 0 C 48 5, 52 10, 58 12 C 62 14, 68 18, 72 24 C 76 30, 85 35, 88 45 C 90 55, 85 68, 80 72 C 75 78, 68 85, 62 92 C 58 98, 52 105, 48 110 C 42 100, 38 95, 32 85 C 28 75, 22 68, 18 55 C 12 45, 8 38, 5 25 C 2 15, 8 10, 15 8 C 25 5, 30 2, 45 0 Z" 
              fill="#E04632" opacity="0.9" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        {/* Location marker dot */}
        <circle cx="50" cy="65" r="4" fill="white" style={{ animation: 'pulseDot 2s infinite' }} />
        <style>{`
          @keyframes pulseDot {
            0% { box-shadow: 0 0 0 0 rgba(255,255,255,0.7); }
            70% { box-shadow: 0 0 0 10px rgba(255,255,255,0); }
            100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); }
          }
        `}</style>
      </svg>
    </div>
  );
}

/* ─── ABOUT PAGE ─── */
export function AboutPage() {
  useEffect(() => {
    document.title = 'About ReachPeak — Our Story';
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
            Built by founders,{' '}
            <GradientText>for businesses.</GradientText>
          </DisplayHeading>
          <p style={{ fontSize: 18, color: '#94a3b8', marginTop: 20, lineHeight: 1.7, fontFamily: "'Inter', sans-serif", maxWidth: 650, margin: '20px auto 0' }}>
            We started ReachPeak in 2025 because we kept running into the same problems: high COD cancellations, missed appointments, and scattered tools. We built the platform we wished existed.
          </p>
        </div>
        <style>{`
          @keyframes aboutAurora {
            from { transform: translate(0, 0) scale(1); }
            to { transform: translate(40px, -30px) scale(1.15); }
          }
        `}</style>
      </section>

      {/* Founder Story */}
      <Section className="py-16">
        <div style={{
          maxWidth: 900, margin: '0 auto', display: 'flex', gap: 40, alignItems: 'center', flexWrap: 'wrap',
          padding: '40px 32px', borderRadius: 24, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)'
        }}>
          <div style={{
            width: 140, height: 140, borderRadius: '50%', background: 'rgba(224,70,50,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, border: '2px dashed #E04632'
          }}>
            👨‍💻
          </div>
          <div style={{ flex: 1, minWidth: 280 }}>
            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, color: '#f1f5f9', marginBottom: 12 }}>
              Why We Started ReachPeak
            </h3>
            <p style={{ fontSize: 15, color: '#94a3b8', lineHeight: 1.7, fontFamily: "'Inter', sans-serif", margin: 0 }}>
              ReachPeak was started in 2025 by <strong>Amit Rai</strong>. As builders running active projects, we faced constant friction: customer no-shows, unpaid invoices, and massive RTO losses on COD orders. Every tool we tried was either too complex or didn't fit how Indian customers actually transact — on WhatsApp. That's why we decided to build a simple, direct, and revenue-centric automation layer.
            </p>
          </div>
        </div>
      </Section>

      {/* Timeline */}
      <Section className="py-20">
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <DisplayHeading as="h2">Our <GradientText>journey.</GradientText></DisplayHeading>
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
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 64,
          padding: '56px 40px', borderRadius: 24,
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
          flexWrap: 'wrap',
        }}>
          <GlobeIndiaAccent />
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
