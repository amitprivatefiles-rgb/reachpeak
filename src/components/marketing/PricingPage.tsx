import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Section, DisplayHeading, GradientText, CTABand } from './Shared';
import { Check, ChevronDown, ChevronUp, Link as LinkIcon, Users, Settings, Rocket, BarChart3 } from 'lucide-react';

const MONTHLY_FEATURES = [
  'WhatsApp broadcasts & campaigns (approval workflow)',
  'Template manager + Meta sync',
  'Team inbox (24h window, quick replies)',
  'Contacts/tags/import',
  'Scheduled campaigns',
  'Basic analytics',
  '1 WhatsApp number',
  'Email support'
];

const YEARLY_EXTRAS = [
  'Automated journeys (abandoned cart, order updates, reminders, all presets)',
  'OrderGuard™ COD/RTO scoring & routing',
  'Payment links in chat (Razorpay)',
  'A/B testing + auto-retry',
  'Shopify/WooCommerce/PeakCart integrations + API & webhooks',
  'Advanced analytics & exports',
  'AI Calling Agents priority early access',
  'Priority WhatsApp support'
];

const COMPARISON_CATEGORIES = [
  {
    name: 'Campaigns & Broadcasts',
    features: [
      { name: 'WhatsApp broadcasts', monthly: true, yearly: true },
      { name: 'Template manager', monthly: true, yearly: true },
      { name: 'Contacts & tags', monthly: true, yearly: true },
      { name: 'Scheduled campaigns', monthly: true, yearly: true },
      { name: 'A/B testing + auto-retry', monthly: false, yearly: true },
    ]
  },
  {
    name: 'Automation & Journeys',
    features: [
      { name: 'Automated journeys (all presets)', monthly: false, yearly: true },
      { name: 'Abandoned cart & order updates', monthly: false, yearly: true },
    ]
  },
  {
    name: 'Team Inbox',
    features: [
      { name: 'Shared inbox (24h window)', monthly: true, yearly: true },
      { name: 'Quick replies', monthly: true, yearly: true },
    ]
  },
  {
    name: 'OrderGuard™',
    features: [
      { name: 'COD/RTO scoring & routing', monthly: false, yearly: true },
    ]
  },
  {
    name: 'Payments',
    features: [
      { name: 'Payment links in chat (Razorpay)', monthly: false, yearly: true },
    ]
  },
  {
    name: 'Integrations',
    features: [
      { name: 'Shopify / WooCommerce / PeakCart', monthly: false, yearly: true },
      { name: 'API & Webhooks', monthly: false, yearly: true },
    ]
  },
  {
    name: 'AI Calling',
    features: [
      { name: 'AI Calling Agents (Early Access)', monthly: false, yearly: true },
    ]
  },
  {
    name: 'Support',
    features: [
      { name: 'Email support', monthly: true, yearly: true },
      { name: 'Priority WhatsApp support', monthly: false, yearly: true },
    ]
  }
];

const PRICING_FAQS = [
  { q: 'Can I upgrade or downgrade later?', a: 'Yes, you can upgrade to Yearly at any time and we will prorate your payment. Downgrades take effect at the end of your current billing cycle.' },
  { q: 'What happens at renewal?', a: 'Your plan will automatically renew unless cancelled. We send a reminder 7 days before any yearly renewal.' },
  { q: 'Do you provide a GST invoice?', a: 'Absolutely. You can enter your GSTIN during checkout, and a GST invoice will be emailed to you instantly.' },
  { q: 'Is AI calling included?', a: 'AI Calling Agents are in priority early access for Yearly members. Usage pricing (per minute) will be announced at full launch.' },
];

function WorkflowStrip() {
  const steps = [
    { label: 'Connect number', icon: <LinkIcon size={16} /> },
    { label: 'Import contacts', icon: <Users size={16} /> },
    { label: 'Pick industry pack', icon: <Settings size={16} /> },
    { label: 'Launch', icon: <Rocket size={16} /> },
    { label: 'Track revenue', icon: <BarChart3 size={16} /> },
  ];
  
  return (
    <div style={{ padding: '40px 24px', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h3 style={{ fontSize: 18, color: '#f1f5f9', fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" }}>How your first campaign ships</h3>
      </div>
      <div className="mkt-workflow-strip">
        {steps.map((step, i) => (
          <div key={i} className="mkt-workflow-node" style={{ flex: 1 }}>
            <div className="mkt-workflow-icon">
              {step.icon}
            </div>
            <div className="mkt-workflow-label">{step.label}</div>
            {i < steps.length - 1 && <div className="mkt-workflow-connector" />}
          </div>
        ))}
      </div>
      <style>{`
        .mkt-workflow-strip {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          position: relative;
        }
        .mkt-workflow-node {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          position: relative;
          z-index: 2;
        }
        .mkt-workflow-icon {
          width: 40px; height: 40px; border-radius: 50%;
          background: rgba(224,70,50,0.1); border: 1px solid rgba(224,70,50,0.3);
          color: #E04632;
          display: flex; align-items: center; justify-content: center;
          position: relative;
        }
        .mkt-workflow-label {
          font-size: 13px; color: #cbd5e1; font-weight: 500; font-family: 'Inter', sans-serif;
          white-space: nowrap; text-align: center;
        }
        .mkt-workflow-connector {
          position: absolute;
          top: 20px; left: 50%; width: 100%; height: 2px;
          background: linear-gradient(90deg, rgba(224,70,50,0.3) 50%, transparent 50%);
          background-size: 8px 100%;
          z-index: -1;
          animation: workflowDash 20s linear infinite;
        }
        @keyframes workflowDash {
          to { background-position: -200px 0; }
        }
        @media (max-width: 768px) {
          .mkt-workflow-strip {
            flex-direction: column;
            gap: 24px;
            align-items: flex-start;
            padding-left: 20px;
          }
          .mkt-workflow-node {
            flex-direction: row;
            width: 100%;
          }
          .mkt-workflow-connector {
            width: 2px; height: 100%;
            top: 40px; left: 20px;
            background: linear-gradient(180deg, rgba(224,70,50,0.3) 50%, transparent 50%);
            background-size: 100% 8px;
            animation: workflowDashVert 20s linear infinite;
          }
          @keyframes workflowDashVert {
            to { background-position: 0 -200px; }
          }
        }
      `}</style>
    </div>
  );
}

function CategoryAccordion({ cat }: { cat: typeof COMPARISON_CATEGORIES[number] }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginBottom: 12, borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
      <button 
        onClick={() => setOpen(!open)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'transparent', border: 'none', color: '#f1f5f9', fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 600, cursor: 'pointer' }}
      >
        {cat.name}
        {open ? <ChevronUp size={20} color="#94a3b8" /> : <ChevronDown size={20} color="#94a3b8" />}
      </button>
      {open && (
        <div style={{ padding: '0 20px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {cat.features.map((f, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px', gap: 12, padding: '12px 0', borderBottom: i === cat.features.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.04)', alignItems: 'center' }}>
              <div style={{ fontSize: 13, color: '#94a3b8', fontFamily: "'Inter', sans-serif" }}>{f.name}</div>
              <div style={{ textAlign: 'center' }}>{f.monthly ? <Check size={16} color="#E04632" style={{ margin: '0 auto' }} /> : <span style={{ color: '#475569' }}>—</span>}</div>
              <div style={{ textAlign: 'center' }}>{f.yearly ? <Check size={16} color="#E04632" style={{ margin: '0 auto' }} /> : <span style={{ color: '#475569' }}>—</span>}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PricingPage() {
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
            Two plans, one clear upgrade story. Choose the plan that fits your growth.
          </p>
        </div>
      </section>

      {/* Plans */}
      <Section className="py-8">
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 24, maxWidth: 900, margin: '0 auto',
        }}>
          {/* Monthly */}
          <div style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 24, padding: 32,
            display: 'flex', flexDirection: 'column',
          }}>
            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 700, color: '#f1f5f9', marginBottom: 12 }}>Monthly</h3>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
              <span style={{ fontSize: 48, fontWeight: 800, color: '#f1f5f9', fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1 }}>₹2,499</span>
              <span style={{ fontSize: 16, color: '#94a3b8', fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>/mo</span>
            </div>
            <p style={{ fontSize: 14, color: '#94a3b8', fontFamily: "'Inter', sans-serif", marginBottom: 32 }}>Core features for growing businesses.</p>
            
            <a href="/signup" style={{
              display: 'block', textAlign: 'center', padding: '14px 24px', borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)',
              color: '#f1f5f9', fontSize: 15, fontWeight: 600, fontFamily: "'Inter', sans-serif",
              textDecoration: 'none', marginBottom: 32, transition: 'background 0.2s'
            }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'} onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
              Get Started
            </a>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>What's included</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {MONTHLY_FEATURES.map((f, i) => (
                  <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', fontSize: 14, color: '#cbd5e1', fontFamily: "'Inter', sans-serif", lineHeight: 1.5 }}>
                    <Check size={18} color="#E04632" style={{ flexShrink: 0, marginTop: 2 }} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Yearly */}
          <div style={{
            position: 'relative',
            background: 'rgba(255,255,255,0.02)', border: '2px solid rgba(224,70,50,0.5)',
            borderRadius: 24, padding: 32,
            display: 'flex', flexDirection: 'column',
            boxShadow: '0 0 40px rgba(224,70,50,0.1), inset 0 0 20px rgba(224,70,50,0.05)',
          }}>
            <div style={{
              position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
              background: 'linear-gradient(135deg, #E04632, #C83A28)', padding: '4px 16px', borderRadius: 20,
              fontSize: 12, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em',
              whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(224,70,50,0.3)'
            }}>Best Value</div>

            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 700, color: '#f1f5f9', marginBottom: 12 }}>Yearly</h3>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
              <span style={{ fontSize: 48, fontWeight: 800, color: '#f1f5f9', fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1 }}>₹14,999</span>
              <span style={{ fontSize: 16, color: '#94a3b8', fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>/yr</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32 }}>
              <span style={{ fontSize: 13, color: '#E04632', fontWeight: 600, background: 'rgba(224,70,50,0.1)', padding: '2px 8px', borderRadius: 4 }}>₹1,250/mo effective</span>
              <span style={{ fontSize: 13, color: '#94a3b8', textDecoration: 'line-through' }}>Save 50%</span>
            </div>
            
            <a href="/signup" style={{
              display: 'block', textAlign: 'center', padding: '14px 24px', borderRadius: 12,
              background: 'linear-gradient(135deg, #E04632, #C83A28)',
              color: '#fff', fontSize: 15, fontWeight: 600, fontFamily: "'Inter', sans-serif",
              textDecoration: 'none', marginBottom: 32, transition: 'box-shadow 0.2s',
              boxShadow: '0 4px 14px rgba(224,70,50,0.4)',
            }} onMouseOver={e => e.currentTarget.style.boxShadow = '0 6px 20px rgba(224,70,50,0.6)'} onMouseOut={e => e.currentTarget.style.boxShadow = '0 4px 14px rgba(224,70,50,0.4)'}>
              Get Started
            </a>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Everything in Monthly, plus:</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {YEARLY_EXTRAS.map((f, i) => (
                  <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', fontSize: 14, color: '#f1f5f9', fontFamily: "'Inter', sans-serif", lineHeight: 1.5, fontWeight: 500 }}>
                    <Check size={18} color="#E04632" style={{ flexShrink: 0, marginTop: 2 }} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Section>

      {/* Honesty Note */}
      <Section className="py-4">
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', padding: '8px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 13, color: '#94a3b8', fontFamily: "'Inter', sans-serif" }}>
            <strong style={{ color: '#cbd5e1' }}>Note:</strong> Meta's per-conversation charges are billed separately by Meta at their standard rates.
          </div>
        </div>
      </Section>

      {/* Workflow Strip */}
      <Section className="py-12">
        <WorkflowStrip />
      </Section>

      {/* Feature Comparison */}
      <Section className="py-16">
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <DisplayHeading as="h2">Compare <GradientText>plans.</GradientText></DisplayHeading>
          </div>
          
          {/* Desktop Table */}
          <div className="hidden md:block" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)', fontSize: 13, fontWeight: 600, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <div>Features</div>
              <div style={{ textAlign: 'center' }}>Monthly</div>
              <div style={{ textAlign: 'center', color: '#E04632' }}>Yearly</div>
            </div>
            
            {COMPARISON_CATEGORIES.map((cat, i) => (
              <div key={i}>
                <div style={{ padding: '16px 24px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 14, fontWeight: 600, color: '#f1f5f9', fontFamily: "'Space Grotesk', sans-serif" }}>
                  {cat.name}
                </div>
                {cat.features.map((f, j) => (
                  <div key={j} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.02)', fontSize: 14, color: '#94a3b8', fontFamily: "'Inter', sans-serif", alignItems: 'center' }}>
                    <div>{f.name}</div>
                    <div style={{ textAlign: 'center' }}>{f.monthly ? <Check size={18} color="#E04632" style={{ margin: '0 auto' }} /> : <span style={{ color: '#475569' }}>—</span>}</div>
                    <div style={{ textAlign: 'center' }}>{f.yearly ? <Check size={18} color="#E04632" style={{ margin: '0 auto' }} /> : <span style={{ color: '#475569' }}>—</span>}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Mobile Accordions */}
          <div className="block md:hidden">
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, marginBottom: 16, paddingRight: 8, fontSize: 12, fontWeight: 600, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <div style={{ width: 60, textAlign: 'center' }}>Mo.</div>
              <div style={{ width: 60, textAlign: 'center', color: '#E04632' }}>Yr.</div>
            </div>
            {COMPARISON_CATEGORIES.map((cat, i) => (
              <CategoryAccordion key={i} cat={cat} />
            ))}
          </div>
        </div>
      </Section>

      {/* FAQ */}
      <Section className="py-20">
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <DisplayHeading as="h2">Questions?</DisplayHeading>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {PRICING_FAQS.map((faq, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden'
              }}>
                <button
                  onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '20px 24px', background: 'transparent', border: 'none', cursor: 'pointer',
                    color: '#f1f5f9', fontSize: 16, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif",
                    textAlign: 'left'
                  }}
                >
                  {faq.q}
                  {faqOpen === i ? <ChevronUp size={20} color="#E04632" /> : <ChevronDown size={20} color="#94a3b8" />}
                </button>
                {faqOpen === i && (
                  <div style={{ padding: '0 24px 20px', color: '#94a3b8', fontSize: 15, lineHeight: 1.6, fontFamily: "'Inter', sans-serif" }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </Section>

      <CTABand />
    </>
  );
}
