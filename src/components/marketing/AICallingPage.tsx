import React, { useEffect, useState } from 'react';
import { Section, DisplayHeading, GradientText } from './Shared';
import { SpotlightCard } from './graphics/SpotlightCard';
import { LiveCallCard } from './graphics/voice/LiveCallCard';
import { CallFunnel } from './graphics/voice/CallFunnel';
import { JourneyCanvas } from './graphics/JourneyCanvas';
import { MetricTicker } from './graphics/MetricTicker';
import { AI_CALLING_LIVE } from './config';

const FAQ_CALLING = [
  { q: "What does the agent sound like?", a: "Extremely natural. It uses ultra-low latency models that understand interruptions, hesitations, and complex Indian accents in real-time." },
  { q: "Which languages are supported?", a: "Hindi, English, Hinglish natively, with Bengali, Tamil, Telugu, Marathi, Gujarati, and Kannada rolling out soon." },
  { q: "How are leads uploaded?", a: "You can push leads via API, connect your CRM (HubSpot, LeadSquared, etc.), or upload CSVs directly to ReachPeak." },
  { q: "What happens after a call?", a: "The outcome (Qualified, No Answer, Converted, etc.) is logged immediately. Based on the outcome, a WhatsApp journey is triggered automatically." },
  { q: "When does it launch?", a: "We are rolling out to early-access businesses right now. Join the waitlist to secure your spot." },
];

export function AICallingPage() {
  useEffect(() => {
    document.title = 'AI Calling Agents — ReachPeak';
  }, []);

  const [waitlistEmail, setWaitlistEmail] = useState('');

  const handleWaitlistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistEmail) return;
    const subject = encodeURIComponent("Early Access Request: AI Calling");
    const body = encodeURIComponent(`Please add me to the waitlist for AI Calling Agents.\nEmail: ${waitlistEmail}`);
    window.open(`mailto:hello@reachpeakapi.in?subject=${subject}&body=${body}`, '_blank');
    setWaitlistEmail('');
  };

  return (
    <div style={{ background: '#050810' }}>
      {/* Hero Section */}
      <section style={{ paddingTop: 160, paddingBottom: 80, position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: '10%', right: '10%',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(224,70,50,0.15) 0%, transparent 60%)',
          filter: 'blur(80px)', pointerEvents: 'none',
        }} />
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 64, alignItems: 'center' }}>
          <div style={{ textAlign: 'center', maxWidth: 800 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 20,
              background: 'rgba(224,70,50,0.1)', border: '1px solid rgba(224,70,50,0.2)', marginBottom: 24,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#E04632', boxShadow: '0 0 8px #E04632' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#E04632', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {AI_CALLING_LIVE ? 'Now Available' : 'Early Access'}
              </span>
            </div>
            <DisplayHeading as="h1">
              AI agents that call, qualify and convert — <GradientText>in your customer's language.</GradientText>
            </DisplayHeading>
            <p style={{ fontSize: 18, color: '#94a3b8', lineHeight: 1.7, marginTop: 24, fontFamily: "'Inter', sans-serif" }}>
              Call leads within 60 seconds. Speak Hindi, English, or Hinglish natively. Qualify prospects, book appointments, confirm COD orders, and sync everything directly to WhatsApp and your CRM.
            </p>
            <div style={{ marginTop: 40, display: 'flex', justifyContent: 'center' }}>
              {AI_CALLING_LIVE ? (
                <button className="mkt-btn primary" style={{ fontSize: 16, padding: '16px 32px' }}>Start Free Trial</button>
              ) : (
                <form onSubmit={handleWaitlistSubmit} style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 400 }}>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={waitlistEmail}
                    onChange={(e) => setWaitlistEmail(e.target.value)}
                    required
                    style={{
                      flex: 1, padding: '14px 20px', borderRadius: 12, fontSize: 15,
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                      color: 'white', outline: 'none',
                    }}
                  />
                  <button type="submit" className="mkt-btn primary" style={{ padding: '14px 24px', whiteSpace: 'nowrap' }}>
                    Get Early Access
                  </button>
                </form>
              )}
            </div>
          </div>

          <div style={{ width: '100%', maxWidth: 600, margin: '0 auto' }}>
            <LiveCallCard />
          </div>
        </div>
      </section>

      {/* 60-second rule stat band */}
      <Section className="py-12">
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 24, padding: '40px',
          background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}>
          <MetricTicker value={60} suffix="s" prefix="<" label="Leads called in" />
          <MetricTicker value={3} suffix="×" label="More connects than manual" />
          <MetricTicker value={78} suffix="%" label="Answer rate with local opener" />
          <MetricTicker value={100} suffix="%" label="Outcomes logged & synced" />
        </div>
      </Section>

      {/* How it works */}
      <Section className="py-24">
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <DisplayHeading as="h2">How it <GradientText>works.</GradientText></DisplayHeading>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24, maxWidth: 1100, margin: '0 auto' }}>
          {[
            { title: '1. Trigger', desc: 'New lead, abandoned cart, or COD order enters the system.' },
            { title: '2. AI Calls', desc: 'Agent dials instantly, conversing naturally in regional languages.' },
            { title: '3. Outcome', desc: 'Call is tagged: Qualified, Callback, Not Interested, etc.' },
            { title: '4. Synced', desc: 'Data pushed to CRM and WhatsApp follow-up is sent.' }
          ].map((step, i) => (
            <SpotlightCard key={i}>
              <div style={{ padding: 24 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', background: 'rgba(224,70,50,0.1)',
                  color: '#E04632', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, marginBottom: 16, fontFamily: "'Space Grotesk', sans-serif"
                }}>{i + 1}</div>
                <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, color: 'white', marginBottom: 8 }}>{step.title}</h3>
                <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.5, fontFamily: "'Inter', sans-serif" }}>{step.desc}</p>
              </div>
            </SpotlightCard>
          ))}
        </div>
      </Section>

      {/* Capabilities grid */}
      <Section className="py-24">
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <DisplayHeading as="h2">Use cases that drive <GradientText>revenue.</GradientText></DisplayHeading>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, maxWidth: 1200, margin: '0 auto' }}>
          {[
            { title: 'Lead Qualification', desc: 'Instantly call inbound leads to qualify budget and timeline.' },
            { title: 'COD Confirmation', desc: 'Verify high-risk COD orders to reduce RTO losses.' },
            { title: 'Abandoned Cart', desc: 'Call shoppers to offer help or a personalized discount.' },
            { title: 'Appointments', desc: 'Remind and automatically reschedule no-shows.' },
            { title: 'Payment Dues', desc: 'Polite, automated voice reminders for pending invoices.' },
            { title: 'Feedback / NPS', desc: 'Collect post-service feedback with conversational AI.' }
          ].map((cap, i) => (
            <SpotlightCard key={i}>
              <div style={{ padding: 32 }}>
                <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, color: 'white', marginBottom: 12 }}>{cap.title}</h3>
                <p style={{ fontSize: 15, color: '#94a3b8', lineHeight: 1.5, fontFamily: "'Inter', sans-serif" }}>{cap.desc}</p>
              </div>
            </SpotlightCard>
          ))}
        </div>
      </Section>

      {/* Voice + WhatsApp Journey */}
      <Section className="py-24" style={{ background: 'rgba(224,70,50,0.02)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', textAlign: 'center', marginBottom: 48 }}>
          <DisplayHeading as="h2">Voice and WhatsApp are <GradientText>ONE journey.</GradientText></DisplayHeading>
          <p style={{ fontSize: 18, color: '#94a3b8', marginTop: 16, fontFamily: "'Inter', sans-serif" }}>
            The AI agent calls; WhatsApp follows up with the link. Missed the call? The message is already in their chat.
          </p>
        </div>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: 40, background: 'rgba(255,255,255,0.02)', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)' }}>
          <JourneyCanvas steps={[
            { label: 'Lead Created', type: 'trigger' },
            { label: 'AI Call (Qualify)', type: 'ai_call' },
            { label: 'Qualified?', type: 'condition' },
            { label: 'Send Booking Link', type: 'send' },
            { label: 'Meeting Booked', type: 'exit' },
          ]} />
        </div>
      </Section>

      {/* Languages Strip */}
      <Section className="py-16">
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, color: 'white' }}>Speaks their language</h3>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 800, margin: '0 auto' }}>
          {['Hindi', 'English', 'Hinglish', 'Bengali', 'Tamil', 'Telugu', 'Marathi', 'Gujarati', 'Kannada'].map(lang => (
            <div key={lang} style={{
              padding: '10px 20px', borderRadius: 30, background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontWeight: 500,
            }}>{lang}</div>
          ))}
          <div style={{
            padding: '10px 20px', borderRadius: 30, background: 'transparent',
            border: '1px dashed rgba(255,255,255,0.2)', color: '#94a3b8', fontWeight: 500,
          }}>+ more coming</div>
        </div>
      </Section>

      {/* Dashboard Mock */}
      <Section className="py-24">
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }} className="mkt-2col">
          <div>
            <DisplayHeading as="h2">Track every <GradientText>outcome.</GradientText></DisplayHeading>
            <p style={{ fontSize: 18, color: '#94a3b8', marginTop: 24, fontFamily: "'Inter', sans-serif", lineHeight: 1.6 }}>
              Our analytics dashboard provides a birds-eye view of your AI calling campaigns. Monitor answer rates, track qualification funnels in real-time, and identify the hottest leads pushed to your team.
            </p>
            <div style={{
              marginTop: 32, padding: 24, borderRadius: 16, background: 'rgba(224,70,50,0.05)',
              border: '1px solid rgba(224,70,50,0.1)'
            }}>
              <p style={{ margin: 0, fontSize: 14, color: '#f1f5f9', fontWeight: 500 }}>Built for India 🇮🇳</p>
              <p style={{ margin: '8px 0 0', fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>
                Consent-first calling, DND-aware, with call recordings and transcripts stored securely locally.
              </p>
            </div>
          </div>
          <div style={{ padding: 40, background: 'rgba(255,255,255,0.02)', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'white', marginBottom: 24, fontFamily: "'Space Grotesk', sans-serif" }}>Campaign Funnel: Real Estate Leads</h3>
            <CallFunnel />
          </div>
        </div>
      </Section>

      {/* FAQ & CTA */}
      <Section className="py-24">
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <DisplayHeading as="h2">Frequently Asked <GradientText>Questions</GradientText></DisplayHeading>
        </div>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {FAQ_CALLING.map((faq, i) => (
            <div key={i} style={{ padding: 24, background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
              <h4 style={{ fontSize: 16, fontWeight: 600, color: 'white', marginBottom: 12, fontFamily: "'Space Grotesk', sans-serif" }}>{faq.q}</h4>
              <p style={{ fontSize: 15, color: '#94a3b8', margin: 0, lineHeight: 1.6, fontFamily: "'Inter', sans-serif" }}>{faq.a}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
