import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Section, DisplayHeading, GradientText, GlassCard, CTABand } from './Shared';
import { ChevronDown, ChevronUp } from 'lucide-react';

/* EXACT current tiers/prices — onboarding depends on these */
const MONTHLY_FEATURES = [
  'Unlimited WhatsApp Messages',
  'Zero Per-Message Cost',
  'Bulk Contact Upload (CSV/XLS/XLSX)',
  'Rich Media Campaigns (Image/Video)',
  'A/B Message Testing',
  'Real-Time Analytics Dashboard',
  'Smart Auto-Retry (up to 3 attempts)',
  'Campaign Scheduling & Controls',
  'Agent Management & Tracking',
  'Detailed Reports & CSV Export',
  'Lead Source Analytics',
  'Contact Management & Deduplication',
  'Email Support',
  '90-92% Delivery Rate',
];

const YEARLY_EXTRAS = [
  'Priority Support (faster response times)',
  'Early Access to New Features',
  'Dedicated Account Manager (for high-volume)',
  'Custom Report Templates',
];

const COMPARISON_ROWS = [
  { feature: 'Unlimited Messages', monthly: true, yearly: true },
  { feature: 'Zero Per-Message Cost', monthly: true, yearly: true },
  { feature: 'Bulk Contact Upload', monthly: true, yearly: true },
  { feature: 'Rich Media Campaigns', monthly: true, yearly: true },
  { feature: 'A/B Message Testing', monthly: true, yearly: true },
  { feature: 'Real-Time Analytics', monthly: true, yearly: true },
  { feature: 'Smart Auto-Retry', monthly: true, yearly: true },
  { feature: 'Campaign Scheduling', monthly: true, yearly: true },
  { feature: 'Agent Management', monthly: true, yearly: true },
  { feature: 'Reports & CSV Export', monthly: true, yearly: true },
  { feature: 'Lead Source Analytics', monthly: true, yearly: true },
  { feature: 'Contact Deduplication', monthly: true, yearly: true },
  { feature: 'Email Support', monthly: true, yearly: true },
  { feature: 'OrderGuard™', monthly: true, yearly: true },
  { feature: 'Automated Journeys', monthly: true, yearly: true },
  { feature: 'Payment Links', monthly: true, yearly: true },
  { feature: 'Team Inbox', monthly: true, yearly: true },
  { feature: 'Priority Support', monthly: false, yearly: true },
  { feature: 'Early Access to Features', monthly: false, yearly: true },
  { feature: 'Dedicated Account Manager', monthly: false, yearly: true },
  { feature: 'Custom Report Templates', monthly: false, yearly: true },
];

const PRICING_FAQS = [
  { q: 'Can I switch from Monthly to Yearly?', a: 'Yes! You can upgrade from a Monthly plan to a Yearly plan at any time. Contact our support team and we will handle the transition for you.' },
  { q: 'What happens when my plan expires?', a: 'When your plan expires, you will be prompted to renew. Your data and campaigns will remain intact, but you will not be able to send new messages until you renew.' },
  { q: 'Is there a free trial?', a: 'We do not offer a free trial at this time, but we do have a 7-day money-back guarantee. If you are not satisfied, we will refund your payment in full.' },
  { q: 'How do I make payment?', a: 'After selecting your plan, you will be shown a UPI QR code. Scan it with any UPI app, make the payment, and enter the transaction reference on our form.' },
  { q: 'What is included in Priority Support?', a: 'Priority Support means faster response times (within 4 hours during business hours), a dedicated support channel, and escalation priority for any issues you face.' },
  { q: 'Are there any per-message charges?', a: 'We charge zero per-message fees. However, WhatsApp conversations incur Meta\'s per-conversation charges (~₹0.70 for marketing). These are passed through at cost, no markup.' },
];

export function PricingPage() {
  const [compOpen, setCompOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  useEffect(() => {
    document.title = 'Pricing — ReachPeak';
  }, []);

  return (
    <>
      {/* Hero */}
      <section style={{
        paddingTop: 120, paddingBottom: 48, textAlign: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '-10%', left: '40%',
          width: 500, height: 400,
          background: 'radial-gradient(ellipse, rgba(224,70,50,0.08) 0%, transparent 60%)',
          filter: 'blur(80px)', pointerEvents: 'none',
        }} />
        <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 24px', position: 'relative' }}>
          <DisplayHeading as="h1">
            Simple, transparent <GradientText>pricing.</GradientText>
          </DisplayHeading>
          <p style={{ fontSize: 18, color: '#94a3b8', marginTop: 16, lineHeight: 1.7, fontFamily: "'Inter', sans-serif" }}>
            No per-message fees. No hidden charges. Just one flat rate for unlimited WhatsApp marketing.
          </p>
        </div>
      </section>

      {/* Plans */}
      <Section className="py-12">
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 24, maxWidth: 800, margin: '0 auto',
        }}>
          {/* Monthly */}
          <div style={{
            padding: 32, borderRadius: 24,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', flexDirection: 'column',
          }}>
            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 24, color: '#f1f5f9' }}>Monthly Plan</h3>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24, fontFamily: "'Inter', sans-serif" }}>Perfect for growing businesses</p>
            <div style={{ marginBottom: 28 }}>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 48, fontWeight: 700, color: '#f1f5f9' }}>₹2,499</span>
              <span style={{ fontSize: 16, color: '#64748b' }}>/month</span>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10, flex: 1, marginBottom: 32 }}>
              {MONTHLY_FEATURES.map(f => (
                <li key={f} style={{ fontSize: 14, color: '#94a3b8', display: 'flex', alignItems: 'flex-start', gap: 8, fontFamily: "'Inter', sans-serif" }}>
                  <span style={{ color: '#E04632', fontSize: 14, marginTop: 1, flexShrink: 0 }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <Link to="/signup" style={{
              display: 'block', textAlign: 'center', padding: '14px 24px', borderRadius: 12,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#e2e8f0', fontSize: 16, fontWeight: 600, textDecoration: 'none',
              fontFamily: "'Inter', sans-serif", transition: 'background 0.2s',
            }}>Get started</Link>
          </div>

          {/* Yearly */}
          <div style={{
            padding: 32, borderRadius: 24,
            background: 'rgba(224,70,50,0.04)',
            border: '1px solid rgba(224,70,50,0.2)',
            position: 'relative', overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
          }}>
            {/* Border beam */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 2,
              background: 'linear-gradient(90deg, transparent, #E04632, transparent)',
              animation: 'borderBeam 3s linear infinite',
            }} />
            <span style={{
              position: 'absolute', top: 16, right: 16,
              padding: '4px 12px', borderRadius: 6,
              background: 'rgba(224,70,50,0.12)', fontSize: 11, fontWeight: 700, color: '#E04632',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>Best Value — Save ₹14,989/yr</span>

            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 24, color: '#f1f5f9' }}>Yearly Plan</h3>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24, fontFamily: "'Inter', sans-serif" }}>For established businesses</p>
            <div style={{ marginBottom: 28 }}>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 48, fontWeight: 700, color: '#f1f5f9' }}>₹14,999</span>
              <span style={{ fontSize: 16, color: '#64748b' }}>/year</span>
              <div style={{ fontSize: 13, color: '#E04632', marginTop: 4, fontWeight: 500 }}>= ₹1,250/month</div>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10, flex: 1, marginBottom: 32 }}>
              {MONTHLY_FEATURES.map(f => (
                <li key={f} style={{ fontSize: 14, color: '#94a3b8', display: 'flex', alignItems: 'flex-start', gap: 8, fontFamily: "'Inter', sans-serif" }}>
                  <span style={{ color: '#E04632', fontSize: 14, marginTop: 1, flexShrink: 0 }}>✓</span> {f}
                </li>
              ))}
              <li style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(224,70,50,0.15)' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#E04632', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Plus yearly extras:</span>
              </li>
              {YEARLY_EXTRAS.map(f => (
                <li key={f} style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 500, display: 'flex', alignItems: 'flex-start', gap: 8, fontFamily: "'Inter', sans-serif" }}>
                  <span style={{ color: '#E04632', fontSize: 14, marginTop: 1, flexShrink: 0 }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <Link to="/signup" style={{
              display: 'block', textAlign: 'center', padding: '14px 24px', borderRadius: 12,
              background: 'linear-gradient(135deg, #E04632, #C83A28)',
              color: 'white', fontSize: 16, fontWeight: 600, textDecoration: 'none',
              fontFamily: "'Inter', sans-serif",
              boxShadow: '0 0 24px rgba(224,70,50,0.3)',
            }}>Get started</Link>
          </div>
        </div>

        <style>{`
          @keyframes borderBeam {
            from { transform: translateX(-100%); }
            to { transform: translateX(100%); }
          }
        `}</style>
      </Section>

      {/* Trust badges */}
      <Section className="py-12">
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16, maxWidth: 800, margin: '0 auto',
        }}>
          {[
            { icon: '🛡️', title: '7-Day Money Back', desc: 'No questions asked' },
            { icon: '🔒', title: 'Secure Payments', desc: 'UPI with encryption' },
            { icon: '⚡', title: '24hr Activation', desc: 'Go live within 24 hours' },
            { icon: '🔓', title: 'Cancel Anytime', desc: 'No lock-in contracts' },
          ].map((b, i) => (
            <div key={i} style={{
              textAlign: 'center', padding: 20, borderRadius: 16,
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
            }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{b.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 2 }}>{b.title}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{b.desc}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Comparison table (collapsible) */}
      <Section className="py-12">
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <button onClick={() => setCompOpen(!compOpen)} style={{
            width: '100%', padding: '16px 20px', borderRadius: 16,
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            cursor: 'pointer', color: '#f1f5f9', fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 600, fontSize: 16,
          }}>
            Feature Comparison
            {compOpen ? <ChevronUp size={18} color="#64748b" /> : <ChevronDown size={18} color="#64748b" />}
          </button>
          <div style={{
            maxHeight: compOpen ? 1200 : 0,
            overflow: 'hidden',
            transition: 'max-height 0.4s ease',
          }}>
            <div style={{
              marginTop: 8, borderRadius: 16, overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Inter', sans-serif" }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#64748b' }}>Feature</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#64748b' }}>Monthly</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#E04632' }}>Yearly</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '10px 16px', fontSize: 13, color: '#e2e8f0' }}>{row.feature}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'center', fontSize: 14 }}>{row.monthly ? '✅' : '—'}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'center', fontSize: 14 }}>{row.yearly ? '✅' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Section>

      {/* Pricing FAQ */}
      <Section className="py-16">
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <DisplayHeading as="h2">
            Pricing <GradientText>FAQ</GradientText>
          </DisplayHeading>
        </div>
        <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {PRICING_FAQS.map((faq, i) => (
            <div key={i} style={{
              background: faqOpen === i ? 'rgba(255,255,255,0.03)' : 'transparent',
              border: '1px solid rgba(255,255,255,0.04)',
              borderRadius: 16, overflow: 'hidden',
            }}>
              <button onClick={() => setFaqOpen(faqOpen === i ? null : i)} style={{
                width: '100%', padding: '16px 20px', background: 'none', border: 'none',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                cursor: 'pointer', textAlign: 'left',
              }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9', fontFamily: "'Inter', sans-serif" }}>{faq.q}</span>
                {faqOpen === i ? <ChevronUp size={18} color="#64748b" /> : <ChevronDown size={18} color="#64748b" />}
              </button>
              <div style={{ maxHeight: faqOpen === i ? 200 : 0, overflow: 'hidden', transition: 'max-height 0.3s ease' }}>
                <p style={{ padding: '0 20px 16px', fontSize: 14, color: '#94a3b8', lineHeight: 1.7, fontFamily: "'Inter', sans-serif", margin: 0 }}>
                  {faq.a}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <CTABand />
    </>
  );
}
