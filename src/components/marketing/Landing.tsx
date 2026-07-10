import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Section, GradientText, DisplayHeading, GlassCard, CTABand } from './Shared';
import { ChatMock } from './graphics/ChatMock';
import { RiskGauge } from './graphics/RiskGauge';
import { JourneyCanvas } from './graphics/JourneyCanvas';
import { MetricTicker } from './graphics/MetricTicker';
import { LogoMarquee } from './graphics/LogoMarquee';
import { SpotlightCard } from './graphics/SpotlightCard';
import { ChevronDown, ChevronUp } from 'lucide-react';

/* ═══════════════════════════════════════════════════════ */
/*                      LANDING PAGE                       */
/* ═══════════════════════════════════════════════════════ */
export function Landing() {
  return (
    <>
      <HeroSection />
      <MetricsBand />
      <PillarsSection />
      <OrderGuardSection />
      <BookGuardSection />
      <AICallingSection />
      <IndustriesGrid />
      <JourneyShowcase />
      <LogoMarquee />
      <HowItWorks />
      <PricingTeaser />
      <Testimonials />
      <FAQSection />
      <CTABand />
    </>
  );
}

/* ─── HERO ─── */
function HeroSection() {
  return (
    <section className="mkt-hero">
      {/* Aurora blobs */}
      <div style={{
        position: 'absolute', top: '-20%', left: '30%',
        width: 800, height: 600,
        background: 'radial-gradient(ellipse, rgba(224,70,50,0.08) 0%, transparent 60%)',
        filter: 'blur(80px)',
        animation: 'mktAuroraDrift 12s ease-in-out infinite alternate',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: '10%', right: '10%',
        width: 500, height: 400,
        background: 'radial-gradient(ellipse, rgba(124,58,237,0.06) 0%, transparent 60%)',
        filter: 'blur(80px)',
        animation: 'mktAuroraDrift 15s ease-in-out infinite alternate-reverse',
        pointerEvents: 'none',
      }} />
      {/* Dot grid */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.03,
        backgroundImage: 'radial-gradient(circle, #e2e8f0 1px, transparent 1px)',
        backgroundSize: '24px 24px', pointerEvents: 'none',
      }} />

      <div className="mkt-hero-grid">
        {/* Copy */}
        <div style={{ maxWidth: 640 }}>
          <DisplayHeading as="h1">
            Turn every conversation into{' '}
            <GradientText>revenue.</GradientText>
          </DisplayHeading>
          <p className="mkt-body" style={{ marginTop: 24, maxWidth: 520, fontSize: 'clamp(1rem, 2vw, 1.2rem)' }}>
            WhatsApp campaigns, automated journeys, and AI calling agents that reach, qualify and convert your leads — with COD & no-show protection and in-chat payments. One platform for every business.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 36, flexWrap: 'wrap' }}>
            <Link to="/signup" className="mkt-btn-primary">Start free</Link>
            <a href="#pillars" className="mkt-btn-secondary">See it in action ↓</a>
          </div>

          {/* Mobile mini-graphic */}
          <div className="mkt-hero-mobile-card lg:hidden">
            <div className="mkt-glass" style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#E04632' }} />
                <span className="mkt-body-sm">WhatsApp Business API</span>
              </div>
              {['Cart recovery sent ✓', 'Payment collected ₹2,450', 'COD verified — low risk'].map((msg, i) => (
                <div key={i} style={{
                  padding: '10px 14px', borderRadius: 12, marginBottom: 6,
                  background: i === 1 ? 'rgba(224,70,50,0.08)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${i === 1 ? 'rgba(224,70,50,0.15)' : 'rgba(255,255,255,0.04)'}`,
                  fontSize: 13, color: i === 1 ? '#E04632' : '#94a3b8',
                  fontFamily: "'Inter', sans-serif", fontWeight: 500,
                  animation: `mktChatFadeIn 0.5s ease-out ${0.3 + i * 0.15}s both`,
                }}>{msg}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Desktop composite */}
        <div className="hidden lg:block" style={{ position: 'relative' }}>
          <ChatMock
            businessName="ReachPeak Store"
            messages={[
              { type: 'image-template', sender: 'business', content: '🛍️ Your order is confirmed!\nOrder #RP4521 — ₹4,500', time: '2:31 PM', status: 'delivered' },
              { type: 'button-reply', sender: 'customer', content: 'Confirm order', time: '2:33 PM', buttons: ['✅ Confirm'] },
              { type: 'payment', sender: 'business', content: '₹4,050 (10% prepay discount)\nPay to confirm your order', time: '2:34 PM', status: 'read', paid: true },
            ]}
          />
          <div style={{ position: 'absolute', top: -20, right: -60 }}>
            <RiskGauge score={87} label="High · Prepay link sent" size={160} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── METRICS BAND ─── */
function MetricsBand() {
  return (
    <Section size="sm">
      <div className="mkt-metrics-grid">
        <MetricTicker value={60} prefix="<" suffix="s" label="AI call time" />
        <MetricTicker value={3} suffix="×" label="cart recovery" />
        <MetricTicker value={28} suffix="%" label="lower RTO" />
        <MetricTicker value={98} suffix="%" label="open rate" />
      </div>
    </Section>
  );
}

/* ─── FOUR PILLARS ─── */
import { LiveCallCard } from './graphics/voice/LiveCallCard';

function PillarsSection() {
  const pillars = [
    {
      title: 'Campaigns & Journeys',
      desc: 'Broadcast to thousands. Automate cart recovery, order updates, and re-engagement — all triggered by real events.',
      graphic: <JourneyCanvas />,
      stat: '98% open rate',
    },
    {
      title: 'AI Calling Agents',
      desc: 'AI agents that call your leads in seconds, speak their language, qualify them, and hand the hot ones to you.',
      graphic: <LiveCallCard />,
      stat: '< 60s to call',
    },
    {
      title: 'OrderGuard™',
      desc: 'Score every COD order in real-time. Auto-confirm low-risk, nudge high-risk to prepay, block serial RTOs.',
      graphic: <RiskGauge score={87} label="High · Prepay link sent" size={180} />,
      stat: '28% lower RTO',
    },
    {
      title: 'Inbox & Payments',
      desc: 'Team inbox for WhatsApp. Send payment links mid-chat. Customers pay in one tap — you see it in real-time.',
      graphic: (
        <ChatMock
          businessName="Support"
          messages={[
            { type: 'text', sender: 'customer', content: 'Can I pay online instead?', time: '4:12 PM' },
            { type: 'payment', sender: 'business', content: '₹2,499 — tap to pay', time: '4:13 PM', status: 'read', paid: true },
          ]}
        />
      ),
      stat: 'Instant collection',
    },
  ];

  return (
    <Section id="pillars">
      <div style={{ textAlign: 'center', marginBottom: 56 }}>
        <DisplayHeading as="h2">
          Everything you need.{' '}
          <GradientText>Nothing you don't.</GradientText>
        </DisplayHeading>
      </div>
      <div className="mkt-pillars-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: 32 }}>
        {pillars.map((p, i) => (
          <SpotlightCard key={i}>
            <div style={{ padding: '32px 32px' }}>
              <div style={{ marginBottom: 28, minHeight: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {p.graphic}
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                <h3 style={{
                  fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700,
                  fontSize: 22, color: '#f1f5f9', margin: 0,
                }}>{p.title}</h3>
                <span style={{
                  background: 'rgba(224,70,50,0.1)', border: '1px solid rgba(224,70,50,0.2)',
                  color: '#E04632', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  fontFamily: "'Inter', sans-serif", wordBreak: 'break-word'
                }}>{p.stat}</span>
              </div>
              <p className="mkt-body" style={{ fontSize: 16 }}>{p.desc}</p>
            </div>
          </SpotlightCard>
        ))}
      </div>
    </Section>
  );
}

/* ─── ORDERGUARD DEEP-DIVE ─── */
function OrderGuardSection() {
  const funnelSteps = [
    { label: '100 COD orders', value: 100, color: '#64748b' },
    { label: '18 flagged high-risk', value: 18, color: '#F59E0B' },
    { label: '11 confirmed', value: 11, color: '#E04632' },
    { label: '4 converted to prepaid', value: 4, color: '#8B5CF6' },
  ];

  return (
    <Section size="lg">
      <div className="mkt-2col">
        <div>
          <div style={{
            display: 'inline-block', padding: '6px 14px', borderRadius: 8,
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
            fontSize: 12, fontWeight: 600, color: '#EF4444', marginBottom: 16,
          }}>OrderGuard™</div>
          <DisplayHeading as="h2">
            Stop losing money to{' '}
            <GradientText from="#EF4444" to="#F59E0B">COD returns.</GradientText>
          </DisplayHeading>
          <p className="mkt-body" style={{ marginTop: 16, maxWidth: 480 }}>
            Every COD order is scored in real-time. High-risk? Auto-send a prepay link with a discount. Serial RTO customers get blocked before they cost you.
          </p>
          <div style={{
            marginTop: 32, padding: 24, borderRadius: 16,
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div className="mkt-label" style={{ marginBottom: 12 }}>Risk factors</div>
            {[
              { factor: 'First-time customer', points: '+15', color: '#F59E0B' },
              { factor: 'High-value COD (₹4,500)', points: '+12', color: '#F59E0B' },
              { factor: 'Pincode 400001 (18% RTO)', points: '+10', color: '#EF4444' },
              { factor: 'No prior delivery history', points: '+8', color: '#F59E0B' },
            ].map((f, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              }}>
                <span className="mkt-body-sm" style={{ color: '#e2e8f0' }}>{f.factor}</span>
                <span style={{ color: f.color, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif", fontSize: 14 }}>{f.points}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Funnel */}
        <div>
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 16,
            padding: '28px 24px', borderRadius: 20,
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
          }}>
            {funnelSteps.map((step, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span className="mkt-body-sm" style={{ color: '#e2e8f0' }}>{step.label}</span>
                  <span style={{ color: step.color, fontWeight: 600, fontSize: 13 }}>{step.value}</span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 4, background: step.color,
                    width: `${step.value}%`, transition: 'width 1s ease-out',
                  }} />
                </div>
              </div>
            ))}
            <div style={{
              marginTop: 16, padding: 16, borderRadius: 12,
              background: 'rgba(224,70,50,0.05)', border: '1px solid rgba(224,70,50,0.15)',
              textAlign: 'center',
            }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, color: '#E04632' }}>₹38,400</div>
              <span className="mkt-body-sm">saved this month</span>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ─── BOOKGUARD ─── */
function BookGuardSection() {
  return (
    <Section size="lg">
      <div className="mkt-2col mkt-2col-reverse">
        <div className="hidden lg:block">
          <ChatMock
            businessName="Dr. Mehta's Clinic"
            messages={[
              { type: 'text', sender: 'business', content: '📋 Reminder: Your appointment with Dr. Mehta is tomorrow at 3:00 PM.', time: '10:00 AM', status: 'read' },
              { type: 'button-reply', sender: 'customer', content: '', time: '10:15 AM', buttons: ['✅ Confirm', '📅 Reschedule'] },
              { type: 'text', sender: 'customer', content: '✅ Confirm', time: '10:15 AM' },
              { type: 'payment', sender: 'business', content: '₹500 consultation deposit', time: '10:16 AM', status: 'read', paid: true },
            ]}
          />
        </div>
        <div>
          <div style={{
            display: 'inline-block', padding: '6px 14px', borderRadius: 8,
            background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)',
            fontSize: 12, fontWeight: 600, color: '#3B82F6', marginBottom: 16,
          }}>BookGuard</div>
          <DisplayHeading as="h2">
            No-shows are the service industry's RTO.
          </DisplayHeading>
          <p className="mkt-body" style={{ marginTop: 16, maxWidth: 480 }}>
            Remind, confirm, and take deposits from risky bookings — automatically. Works for clinics, salons, coaching, and any appointment-based business.
          </p>
        </div>
      </div>
    </Section>
  );
}

/* ─── MEET YOUR AI CALLING AGENT ─── */
import { AI_CALLING_LIVE } from './config';

function AICallingSection() {
  return (
    <Section size="lg">
      <div className="mkt-2col">
        <div>
          <div style={{
            display: 'inline-block', padding: '6px 14px', borderRadius: 8,
            background: 'rgba(224,70,50,0.1)', border: '1px solid rgba(224,70,50,0.2)',
            fontSize: 12, fontWeight: 600, color: '#E04632', marginBottom: 16,
          }}>AI Calling Agents</div>
          <DisplayHeading as="h2">
            Meet your <GradientText>AI calling agent.</GradientText>
          </DisplayHeading>
          <p className="mkt-body" style={{ marginTop: 16, maxWidth: 480 }}>
            Voice and WhatsApp are ONE journey. The AI agent calls; WhatsApp follows up with the link. Missed the call? The message is already in their chat.
          </p>
          <div style={{ marginTop: 32 }}>
            {AI_CALLING_LIVE ? (
              <Link to="/signup" className="mkt-btn-primary">Start free</Link>
            ) : (
              <Link to="/ai-calling" className="mkt-btn-primary">Get early access</Link>
            )}
          </div>
        </div>
        <div>
          <LiveCallCard />
        </div>
      </div>
    </Section>
  );
}

/* ─── INDUSTRIES GRID ─── */
const INDUSTRIES = [
  { path: '/solutions/ecommerce', name: 'D2C & E-commerce', icon: '🛒' },
  { path: '/solutions/clinics', name: 'Clinics & Healthcare', icon: '🏥' },
  { path: '/solutions/salons', name: 'Salons & Spas', icon: '💇' },
  { path: '/solutions/education', name: 'Coaching & Education', icon: '📚' },
  { path: '/solutions/real-estate', name: 'Real Estate', icon: '🏠' },
  { path: '/solutions/services', name: 'Agencies & Services', icon: '🔧' },
];

function IndustriesGrid() {
  return (
    <Section>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <DisplayHeading as="h2">
          Built for <GradientText>your industry.</GradientText>
        </DisplayHeading>
        <p className="mkt-body" style={{ marginTop: 12 }}>Pre-built journey packs, tuned for your vertical.</p>
      </div>
      <div className="mkt-industries-grid">
        {INDUSTRIES.map(ind => (
          <Link key={ind.path} to={ind.path} className="mkt-glass" style={{
            textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12,
            transition: 'border-color 0.2s, transform 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(224,70,50,0.2)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <span style={{ fontSize: 28 }}>{ind.icon}</span>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 15, color: '#e2e8f0' }}>{ind.name}</span>
          </Link>
        ))}
      </div>
    </Section>
  );
}

/* ─── JOURNEY SHOWCASE (BENTO) ─── */
function JourneyShowcase() {
  return (
    <Section size="lg">
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <DisplayHeading as="h2">
          Automation that{' '}
          <GradientText>actually works.</GradientText>
        </DisplayHeading>
        <p className="mkt-body" style={{ marginTop: 12 }}>
          Event-triggered journeys with real-time exit conditions. Not just a drip sequence.
        </p>
      </div>
      <div className="mkt-bento">
        {/* Large cell */}
        <div className="mkt-glass mkt-bento-wide" style={{ minHeight: 180 }}>
          <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 18, color: '#f1f5f9', marginBottom: 16 }}>
            Lead Conversion Journey
          </h3>
          <JourneyCanvas steps={[
            { label: 'Lead Arrived', type: 'trigger', icon: '📝' },
            { label: 'AI Call', type: 'ai_call' },
            { label: 'Send Brochure', type: 'send', icon: '💬' },
            { label: 'Booked?', type: 'condition', icon: '🎯' },
            { label: 'Converted ✓', type: 'exit', icon: '✅' },
          ]} />
        </div>

        {/* Stat cells */}
        {[
          { label: 'Delivery rate', value: '94.2%', color: '#E04632' },
          { label: 'Carts recovered', value: '₹2.8L', color: '#8B5CF6' },
          { label: 'RTO prevented', value: '147', color: '#F59E0B' },
        ].map((stat, i) => (
          <GlassCard key={i}>
            <div className="mkt-label" style={{ marginBottom: 8 }}>{stat.label}</div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, color: stat.color }}>{stat.value}</div>
          </GlassCard>
        ))}
      </div>
    </Section>
  );
}

/* ─── HOW IT WORKS ─── */
function HowItWorks() {
  const steps = [
    { num: '1', title: 'Connect your number', desc: 'One-click Embedded Signup. Your number is verified in under 24 hours.' },
    { num: '2', title: 'Install a journey pack', desc: 'Cart recovery, appointment reminders, COD verify — pick your vertical and go.' },
    { num: '3', title: 'Watch revenue grow', desc: 'Live dashboard shows every message, payment, and recovered order in real-time.' },
  ];

  return (
    <Section>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <DisplayHeading as="h2">
          Live in <GradientText>three steps.</GradientText>
        </DisplayHeading>
      </div>
      <div className="mkt-steps-grid">
        {steps.map(s => (
          <div key={s.num} style={{ textAlign: 'center' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px',
              background: 'linear-gradient(135deg, rgba(224,70,50,0.15), rgba(224,70,50,0.05))',
              border: '1px solid rgba(224,70,50,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 20, color: '#E04632',
            }}>{s.num}</div>
            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 18, color: '#f1f5f9', marginBottom: 8 }}>{s.title}</h3>
            <p className="mkt-body-sm">{s.desc}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ─── PRICING TEASER ─── */
function PricingTeaser() {
  return (
    <Section id="pricing">
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <DisplayHeading as="h2">
          Simple, transparent <GradientText>pricing.</GradientText>
        </DisplayHeading>
        <p className="mkt-body" style={{ marginTop: 12 }}>
          No per-message fees. No hidden charges. Unlimited WhatsApp messages.
        </p>
      </div>
      <div className="mkt-pricing-grid">
        {/* Monthly */}
        <div className="mkt-glass" style={{ textAlign: 'center' }}>
          <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 18, color: '#f1f5f9', marginBottom: 12 }}>Monthly</h3>
          <div>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 40, fontWeight: 700, color: '#f1f5f9' }}>₹2,499</span>
            <span style={{ fontSize: 14, color: '#64748b' }}>/mo</span>
          </div>
          <p className="mkt-body-sm" style={{ marginTop: 8 }}>Everything included</p>
        </div>
        {/* Yearly */}
        <div className="mkt-glass" style={{ textAlign: 'center', borderColor: 'rgba(224,70,50,0.2)', position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 2,
            background: 'linear-gradient(90deg, transparent, #E04632, transparent)',
            animation: 'mktBorderBeam 3s linear infinite',
          }} />
          <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 18, color: '#f1f5f9', marginBottom: 12 }}>Yearly</h3>
          <div>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 40, fontWeight: 700, color: '#f1f5f9' }}>₹14,999</span>
            <span style={{ fontSize: 14, color: '#64748b' }}>/yr</span>
          </div>
          <p style={{ fontSize: 13, color: '#E04632', marginTop: 8, fontWeight: 500, fontFamily: "'Inter', sans-serif" }}>Save ₹14,989/year</p>
        </div>
      </div>
      <div style={{ textAlign: 'center', marginTop: 32 }}>
        <Link to="/pricing" className="mkt-btn-primary">See full pricing →</Link>
      </div>
    </Section>
  );
}

/* ─── TESTIMONIALS ─── */
function Testimonials() {
  const items = [
    { quote: 'OrderGuard alone saved us ₹2.3L in the first month. The COD confirmation flow is brilliant.', name: 'Rahul S.', role: 'D2C Founder', initial: 'R', color: '#E04632' },
    { quote: 'We went from 22% no-shows to 4% in two weeks. The automated reminders + deposit collection is a game-changer.', name: 'Dr. Priya M.', role: 'Clinic Owner', initial: 'P', color: '#3B82F6' },
    { quote: 'Setup took 10 minutes. Our cart recovery campaigns were running the same afternoon. Incredible.', name: 'Arjun K.', role: 'Shopify Merchant', initial: 'A', color: '#8B5CF6' },
  ];

  return (
    <Section>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <DisplayHeading as="h2">
          Trusted by businesses{' '}
          <GradientText>like yours.</GradientText>
        </DisplayHeading>
      </div>
      <div className="mkt-testimonials">
        {items.map((t, i) => (
          <GlassCard key={i}>
            <p style={{ fontSize: 15, color: '#e2e8f0', lineHeight: 1.7, fontFamily: "'Inter', sans-serif", marginBottom: 20 }}>"{t.quote}"</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', background: `${t.color}20`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 16, color: t.color, fontFamily: "'Space Grotesk', sans-serif",
              }}>{t.initial}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>{t.name}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{t.role}</div>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </Section>
  );
}

/* ─── FAQ ─── */
const FAQ_ITEMS = [
  { q: 'Do I need Meta approval to use ReachPeak?', a: 'Yes — you need a Meta-verified WhatsApp Business API account. We handle the Embedded Signup in one click, and your number gets verified within 24 hours.' },
  { q: 'Is this the official WhatsApp API?', a: 'Yes. ReachPeak uses the official WhatsApp Cloud API (Meta\'s first-party solution). No unofficial hacks, no risk of number bans.' },
  { q: 'Do you also make calls?', a: 'Yes! ReachPeak features AI Calling Agents that can call leads within 60 seconds, speak multiple regional languages natively, qualify prospects, and seamlessly sync the outcome back to WhatsApp.' },
  { q: 'When is AI Calling available?', a: 'AI Calling is currently rolling out to early-access businesses. You can join the waitlist to secure your spot and get launch pricing.' },
  { q: 'Does it work without Shopify?', a: 'Absolutely. ReachPeak works with any platform via our REST API, webhooks, and Zapier. We have native Shopify and WooCommerce integrations, but also support PeakCart, custom stores, and manual CSV uploads.' },
  { q: 'Will my number get banned?', a: 'No. We enforce Meta\'s messaging policies, rate limits, and quality ratings. Your number\'s quality score is monitored in real-time, and we auto-pause campaigns if it drops.' },
  { q: 'How does OrderGuard scoring work?', a: 'Every COD order is scored using 12+ risk factors: customer history, order value, pincode RTO rate, payment pattern, and more. The score (0–100) determines the action: confirm, prepay nudge, or hold.' },
  { q: 'Can my team use the inbox?', a: 'Yes. The team inbox supports multiple agents with conversation assignment, notes, and collision-free replies. Available on Growth and Scale plans.' },
  { q: 'How is pricing calculated?', a: 'You pay a monthly platform fee (per plan) plus Meta\'s per-conversation charges. We don\'t markup Meta\'s costs. WhatsApp marketing conversations are ~₹0.70 each.' },
  { q: 'Where is my data stored?', a: 'All data is stored in India on Supabase (AWS ap-south-1). We never share your data with third parties. See our Privacy Policy for details.' },
];

function FAQSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <Section id="faq" size="lg">
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <DisplayHeading as="h2">
          Frequently asked <GradientText>questions.</GradientText>
        </DisplayHeading>
      </div>
      <div className="mkt-faq" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {FAQ_ITEMS.map((item, i) => (
          <div key={i} style={{
            background: openIdx === i ? 'rgba(255,255,255,0.03)' : 'transparent',
            border: '1px solid rgba(255,255,255,0.04)',
            borderRadius: 16, overflow: 'hidden', transition: 'background 0.2s',
          }}>
            <button onClick={() => setOpenIdx(openIdx === i ? null : i)} style={{
              width: '100%', padding: '18px 20px', background: 'none', border: 'none',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              cursor: 'pointer', textAlign: 'left',
            }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9', fontFamily: "'Inter', sans-serif", paddingRight: 16 }}>{item.q}</span>
              {openIdx === i ? <ChevronUp size={18} color="#64748b" /> : <ChevronDown size={18} color="#64748b" />}
            </button>
            <div style={{
              maxHeight: openIdx === i ? 300 : 0,
              overflow: 'hidden', transition: 'max-height 0.3s ease',
            }}>
              <p className="mkt-body-sm" style={{ padding: '0 20px 18px', margin: 0 }}>{item.a}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
