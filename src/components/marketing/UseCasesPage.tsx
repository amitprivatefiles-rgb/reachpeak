import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Section, DisplayHeading, GradientText, CTABand } from './Shared';
import { SpotlightCard } from './graphics/SpotlightCard';

const INDUSTRIES = [
  { path: '/solutions/ecommerce', name: 'D2C & E-commerce', icon: '🛒', pain: 'Cart abandonment and COD returns eating your margins.', voiceUseCase: 'COD confirmation & NDR calls to verify high-risk orders.', journeys: ['Cart recovery', 'COD confirm', 'Prepay nudge', 'Delivery updates', 'Win-back'], capabilities: ['OrderGuard™', 'Razorpay payments', 'Shopify integration'] },
  { path: '/solutions/clinics', name: 'Clinics & Healthcare', icon: '🏥', pain: 'No-shows leaving gaps in your schedule and revenue.', voiceUseCase: 'Appointment confirmation calls that reschedule on the spot.', journeys: ['Appointment reminders', 'Report alerts', 'Feedback loop', 'Recall campaigns'], capabilities: ['BookGuard', 'Deposit collection', 'Google reviews'] },
  { path: '/solutions/salons', name: 'Salons & Spas', icon: '💇', pain: 'Empty chairs from last-minute cancellations.', voiceUseCase: 'Rebooking calls to lapsed clients and same-day reminders.', journeys: ['Booking confirm', 'Rebooking nudge', 'Birthday offers', 'Loyalty rewards'], capabilities: ['BookGuard', 'Waitlist fills', 'Campaign broadcasts'] },
  { path: '/solutions/education', name: 'Coaching & Education', icon: '📚', pain: 'Enquiries going cold before they convert.', voiceUseCase: 'Admission counselling follow-ups within 60 seconds.', journeys: ['Enquiry follow-up', 'Fee reminders', 'Class updates', 'Re-enrolment'], capabilities: ['Lead scoring', 'Payment links', 'Batch broadcasts'] },
  { path: '/solutions/real-estate', name: 'Real Estate', icon: '🏠', pain: 'Leads going unanswered after hours.', voiceUseCase: 'Instant AI calls to qualify budget, locality, and timeline.', journeys: ['Instant lead reply', 'Site visit booking', 'Follow-up drip', 'Project updates'], capabilities: ['Instant reply', 'Lead qualification', 'Booking collection'] },
  { path: '/solutions/services', name: 'Agencies & Services', icon: '🔧', pain: 'Quotes, bookings, and payments scattered across channels.', voiceUseCase: 'Quote follow-up and booking confirmation calls.', journeys: ['Quote follow-up', 'Booking confirm', 'Invoice reminders', 'Feedback request'], capabilities: ['BookGuard', 'Advance collection', 'Team inbox'] },
];

const CAPABILITIES = [
  { title: 'AI Calling Agents', desc: 'Voice agents that call leads in <60s, speak regional languages natively, and qualify prospects.' },
  { title: 'WhatsApp Broadcasts', desc: 'Send campaigns to thousands with 98% open rate. Template approval, A/B testing, scheduled sends.' },
  { title: 'Event-driven Journeys', desc: 'Trigger multi-step automations from real store events. Exit on goal. Retry on failure.' },
  { title: 'Team Inbox', desc: 'Collaborative inbox for WhatsApp. Assignment, notes, collision-free replies.' },
  { title: 'In-chat Payments', desc: 'Send Razorpay payment links inside conversations. Collect in one tap.' },
  { title: 'OrderGuard™ / BookGuard', desc: 'Real-time risk scoring for COD orders and appointment bookings.' },
  { title: 'API & Webhooks', desc: 'Connect any platform. Shopify, WooCommerce, Zapier, or your custom stack.' },
];

export function UseCasesPage() {
  useEffect(() => {
    document.title = 'Solutions — One engine. Every business. — ReachPeak';
  }, []);

  return (
    <>
      {/* Hero */}
      <section style={{
        paddingTop: 120, paddingBottom: 48, textAlign: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '-10%', left: '30%',
          width: 600, height: 400,
          background: 'radial-gradient(ellipse, rgba(224,70,50,0.07) 0%, transparent 60%)',
          filter: 'blur(80px)', pointerEvents: 'none',
        }} />
        <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 24px', position: 'relative' }}>
          <DisplayHeading as="h1">
            One engine.{' '}
            <GradientText>Every business.</GradientText>
          </DisplayHeading>
          <p style={{ fontSize: 18, color: '#94a3b8', marginTop: 16, lineHeight: 1.7, fontFamily: "'Inter', sans-serif" }}>
            Pre-built journey packs, industry-tuned scoring, and ready-made templates — pick your vertical and go live today.
          </p>
        </div>
      </section>

      {/* Industry cards */}
      <Section className="py-16">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: 24,
        }}>
          {INDUSTRIES.map((ind) => (
            <Link key={ind.path} to={ind.path} style={{ textDecoration: 'none' }}>
              <SpotlightCard>
                <div style={{ padding: 32 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <span style={{ fontSize: 36 }}>{ind.icon}</span>
                    <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 20, color: '#f1f5f9', margin: 0 }}>{ind.name}</h3>
                  </div>
                  <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.6, marginBottom: 12, fontFamily: "'Inter', sans-serif" }}>{ind.pain}</p>
                  <p style={{ fontSize: 13, color: '#E04632', lineHeight: 1.5, marginBottom: 20, fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>
                    <span style={{ marginRight: 6 }}>📞</span>{ind.voiceUseCase}
                  </p>
                  
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Ready-made journeys</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {ind.journeys.map(j => (
                        <span key={j} style={{
                          padding: '4px 10px', borderRadius: 6,
                          background: 'rgba(224,70,50,0.08)', border: '1px solid rgba(224,70,50,0.12)',
                          fontSize: 11, color: '#E04632', fontWeight: 500,
                        }}>{j}</span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Key capabilities</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {ind.capabilities.map(c => (
                        <span key={c} style={{
                          padding: '4px 10px', borderRadius: 6,
                          background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.12)',
                          fontSize: 11, color: '#8B5CF6', fontWeight: 500,
                        }}>{c}</span>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop: 20, fontSize: 14, fontWeight: 600, color: '#E04632', fontFamily: "'Inter', sans-serif" }}>
                    Explore {ind.name} →
                  </div>
                </div>
              </SpotlightCard>
            </Link>
          ))}
        </div>
      </Section>

      {/* Cross-industry capabilities */}
      <Section className="py-20">
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <DisplayHeading as="h2">
            Capabilities that work{' '}
            <GradientText>across every vertical.</GradientText>
          </DisplayHeading>
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16,
        }}>
          {CAPABILITIES.map((cap, i) => (
            <div key={i} style={{
              padding: 24, borderRadius: 16,
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <h4 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, color: '#f1f5f9', marginBottom: 6 }}>{cap.title}</h4>
              <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, fontFamily: "'Inter', sans-serif", margin: 0 }}>{cap.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      <CTABand />
    </>
  );
}
