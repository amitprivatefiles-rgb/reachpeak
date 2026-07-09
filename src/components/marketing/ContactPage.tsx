import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Section, DisplayHeading, GradientText } from './Shared';
import { MessageSquare, Mail, Clock, ChevronRight } from 'lucide-react';

export function ContactPage() {
  useEffect(() => {
    document.title = 'Contact ReachPeak — Talk to us';
  }, []);

  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [focused, setFocused] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
    if (!form.message.trim()) e.message = 'Message is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    // Use mailto as fallback — no backend needed
    const subject = encodeURIComponent(`Contact from ${form.name}`);
    const body = encodeURIComponent(`Name: ${form.name}\nEmail: ${form.email}\n\n${form.message}`);
    window.open(`mailto:hello@reachpeakapi.in?subject=${subject}&body=${body}`, '_blank');
    setSubmitted(true);
  };

  return (
    <>
      <section style={{ paddingTop: 120, paddingBottom: 80, position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: '0', right: '10%',
          width: 500, height: 400,
          background: 'radial-gradient(ellipse, rgba(224,70,50,0.06) 0%, transparent 60%)',
          filter: 'blur(80px)', pointerEvents: 'none',
        }} />

        <div style={{
          maxWidth: 1100, margin: '0 auto', padding: '0 24px',
          display: 'grid', gridTemplateColumns: '1fr', gap: 48,
        }} className="lg-contact-grid">
          {/* Left: info */}
          <div>
            <DisplayHeading as="h1">
              <GradientText>Talk to us.</GradientText>
            </DisplayHeading>
            <p style={{ fontSize: 18, color: '#94a3b8', marginTop: 16, lineHeight: 1.7, fontFamily: "'Inter', sans-serif", maxWidth: 400 }}>
              Questions about pricing, features, or integration? We'd love to help.
            </p>

            {/* Response time */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, marginTop: 32, marginBottom: 32,
              padding: '12px 16px', borderRadius: 12,
              background: 'rgba(224,70,50,0.06)', border: '1px solid rgba(224,70,50,0.12)',
              width: 'fit-content',
            }}>
              <Clock size={16} color="#E04632" />
              <span style={{ fontSize: 14, color: '#E04632', fontWeight: 500, fontFamily: "'Inter', sans-serif" }}>
                We typically reply within 2 hours
              </span>
            </div>

            {/* WhatsApp card */}
            <a href="https://wa.me/919999999999?text=Hi%20ReachPeak%2C%20I%20have%20a%20question" target="_blank" rel="noopener noreferrer" style={{
              display: 'block', padding: 24, borderRadius: 16, marginBottom: 16,
              background: 'rgba(37,211,102,0.06)', border: '1px solid rgba(37,211,102,0.15)',
              textDecoration: 'none', transition: 'border-color 0.2s, transform 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(37,211,102,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(37,211,102,0.15)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: 'linear-gradient(135deg, #25D366, #128C7E)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <MessageSquare size={20} color="white" />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>Chat on WhatsApp</div>
                  <div style={{ fontSize: 13, color: '#94a3b8' }}>The fastest way to reach us</div>
                </div>
                <ChevronRight size={18} color="#64748b" style={{ marginLeft: 'auto' }} />
              </div>
            </a>

            {/* Email card */}
            <a href="mailto:hello@reachpeakapi.in" style={{
              display: 'block', padding: 24, borderRadius: 16,
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
              textDecoration: 'none', transition: 'border-color 0.2s, transform 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: 'rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Mail size={20} color="#94a3b8" />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>hello@reachpeakapi.in</div>
                  <div style={{ fontSize: 13, color: '#94a3b8' }}>For detailed enquiries</div>
                </div>
                <ChevronRight size={18} color="#64748b" style={{ marginLeft: 'auto' }} />
              </div>
            </a>
          </div>

          {/* Right: form */}
          <div style={{
            padding: 32, borderRadius: 24,
            background: 'rgba(255,255,255,0.03)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <svg width="64" height="64" viewBox="0 0 64 64" style={{ margin: '0 auto 24px' }}>
                  <circle cx="32" cy="32" r="28" fill="none" stroke="#E04632" strokeWidth="3"
                    strokeDasharray="176" strokeDashoffset="0"
                    style={{ animation: 'circDraw 0.6s ease-out' }}
                  />
                  <path d="M20 32 L28 40 L44 24" fill="none" stroke="#E04632" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                    strokeDasharray="40" strokeDashoffset="0"
                    style={{ animation: 'checkDraw 0.4s ease-out 0.4s both' }}
                  />
                </svg>
                <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 22, color: '#f1f5f9', marginBottom: 8 }}>Message sent!</h3>
                <p style={{ fontSize: 14, color: '#94a3b8', fontFamily: "'Inter', sans-serif" }}>We'll get back to you within 2 hours.</p>
                <style>{`
                  @keyframes circDraw { from { stroke-dashoffset: 176; } to { stroke-dashoffset: 0; } }
                  @keyframes checkDraw { from { stroke-dashoffset: 40; } to { stroke-dashoffset: 0; } }
                `}</style>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 22, color: '#f1f5f9', margin: 0 }}>Send us a message</h2>
                
                <FloatingInput label="Your name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} error={errors.name} focused={focused === 'name'} onFocus={() => setFocused('name')} onBlur={() => setFocused(null)} />
                <FloatingInput label="Email address" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} error={errors.email} type="email" focused={focused === 'email'} onFocus={() => setFocused('email')} onBlur={() => setFocused(null)} />
                <FloatingTextarea label="Your message" value={form.message} onChange={v => setForm(f => ({ ...f, message: v }))} error={errors.message} focused={focused === 'msg'} onFocus={() => setFocused('msg')} onBlur={() => setFocused(null)} />

                <button type="submit" style={{
                  padding: '14px 32px', borderRadius: 12, fontSize: 16, fontWeight: 600,
                  background: 'linear-gradient(135deg, #E04632, #C83A28)',
                  color: 'white', border: 'none', cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                  boxShadow: '0 0 24px rgba(224,70,50,0.3)',
                  transition: 'transform 0.2s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
                >Send message</button>
              </form>
            )}
          </div>
        </div>

        <style>{`
          @media (min-width: 1024px) {
            .lg-contact-grid { grid-template-columns: 1fr 1fr !important; }
          }
        `}</style>
      </section>

      {/* FAQ teaser */}
      <Section className="py-16">
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 22, color: '#f1f5f9' }}>Quick answers</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, maxWidth: 900, margin: '0 auto' }}>
          {[
            { q: 'Is this the official WhatsApp API?', a: 'Yes. Meta Cloud API. No unofficial hacks.' },
            { q: 'Can I use my existing number?', a: 'Yes. One-click Embedded Signup with your current number.' },
            { q: 'Do I need Shopify?', a: 'No. Works with any platform via API, webhooks, or Zapier.' },
          ].map((faq, i) => (
            <Link key={i} to="/#faq" style={{
              display: 'block', padding: 20, borderRadius: 14,
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
              textDecoration: 'none', transition: 'border-color 0.2s',
            }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(224,70,50,0.2)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)')}
            >
              <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 6 }}>{faq.q}</div>
              <div style={{ fontSize: 13, color: '#94a3b8' }}>{faq.a}</div>
            </Link>
          ))}
        </div>
      </Section>
    </>
  );
}

/* ─── FLOATING INPUT ─── */
function FloatingInput({ label, value, onChange, error, type = 'text', focused, onFocus, onBlur }: {
  label: string; value: string; onChange: (v: string) => void; error?: string; type?: string;
  focused: boolean; onFocus: () => void; onBlur: () => void;
}) {
  const hasValue = value.length > 0;
  const active = focused || hasValue;

  return (
    <div style={{ position: 'relative' }}>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        style={{
          width: '100%', padding: '20px 16px 8px', borderRadius: 12, fontSize: 15,
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${error ? '#EF4444' : focused ? '#E04632' : 'rgba(255,255,255,0.08)'}`,
          color: '#e2e8f0', outline: 'none', fontFamily: "'Inter', sans-serif",
          transition: 'border-color 0.2s',
          boxShadow: focused ? '0 0 0 3px rgba(224,70,50,0.1)' : 'none',
          boxSizing: 'border-box',
        }}
      />
      <label style={{
        position: 'absolute', left: 16,
        top: active ? 6 : 14,
        fontSize: active ? 11 : 15,
        color: error ? '#EF4444' : focused ? '#E04632' : '#64748b',
        transition: 'all 0.2s',
        pointerEvents: 'none',
        fontFamily: "'Inter', sans-serif", fontWeight: 500,
      }}>{label}</label>
      {error && <span style={{ fontSize: 12, color: '#EF4444', marginTop: 4, display: 'block' }}>{error}</span>}
    </div>
  );
}

function FloatingTextarea({ label, value, onChange, error, focused, onFocus, onBlur }: {
  label: string; value: string; onChange: (v: string) => void; error?: string;
  focused: boolean; onFocus: () => void; onBlur: () => void;
}) {
  const hasValue = value.length > 0;
  const active = focused || hasValue;

  return (
    <div style={{ position: 'relative' }}>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        rows={4}
        style={{
          width: '100%', padding: '20px 16px 8px', borderRadius: 12, fontSize: 15,
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${error ? '#EF4444' : focused ? '#E04632' : 'rgba(255,255,255,0.08)'}`,
          color: '#e2e8f0', outline: 'none', fontFamily: "'Inter', sans-serif",
          transition: 'border-color 0.2s', resize: 'vertical',
          boxShadow: focused ? '0 0 0 3px rgba(224,70,50,0.1)' : 'none',
          boxSizing: 'border-box',
        }}
      />
      <label style={{
        position: 'absolute', left: 16,
        top: active ? 6 : 14,
        fontSize: active ? 11 : 15,
        color: error ? '#EF4444' : focused ? '#E04632' : '#64748b',
        transition: 'all 0.2s',
        pointerEvents: 'none',
        fontFamily: "'Inter', sans-serif", fontWeight: 500,
      }}>{label}</label>
      {error && <span style={{ fontSize: 12, color: '#EF4444', marginTop: 4, display: 'block' }}>{error}</span>}
    </div>
  );
}
