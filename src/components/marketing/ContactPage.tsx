import { useState, useEffect } from 'react';
import { Section, DisplayHeading } from './Shared';
import { Mail, Phone, MapPin, Clock, Zap, MessageSquare } from 'lucide-react';

export function ContactPage() {
  useEffect(() => {
    document.title = 'Contact ReachPeak — Talk to us';
  }, []);

  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: 'General Inquiry', message: '' });
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
    const subjectLine = encodeURIComponent(`[${form.subject}] Message from ${form.name}`);
    const bodyText = encodeURIComponent(`Name: ${form.name}\nEmail: ${form.email}\nPhone: ${form.phone}\n\n${form.message}`);
    window.open(`mailto:support@reachpeakapi.in?subject=${subjectLine}&body=${bodyText}`, '_blank');
    setSubmitted(true);
  };

  const contactCards = [
    {
      icon: <Mail size={24} color="#3B82F6" />,
      title: 'Email Us',
      value: 'support@reachpeakapi.in',
      desc: 'We respond within 24 hours',
      bg: '#3B82F610',
    },
    {
      icon: <Phone size={24} color="#10B981" />,
      title: 'WhatsApp Support',
      value: '+91 6290678045',
      desc: 'Mon-Sat, 9 AM - 7 PM IST',
      bg: '#10B98110',
    },
    {
      icon: <MapPin size={24} color="#EF4444" />,
      title: 'Office Location',
      value: 'Kolkata, India',
      desc: 'West Bengal',
      bg: '#EF444410',
    },
    {
      icon: <Clock size={24} color="#F59E0B" />,
      title: 'Business Hours',
      value: 'Mon - Sat: 9 AM - 7 PM',
      desc: 'Sunday: Closed',
      bg: '#F59E0B10',
    },
    {
      icon: <MessageSquare size={24} color="#8B5CF6" />,
      title: 'Join our Channel',
      value: 'reachpeak.in/channel',
      desc: 'Weekly product updates',
      bg: '#8B5CF610',
    },
  ];

  return (
    <>
      {/* Cards on top */}
      <section style={{ paddingTop: 120, paddingBottom: 40 }}>
        <div style={{
          maxWidth: 1280, margin: '0 auto', padding: '0 24px',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20,
        }}>
          {contactCards.map((card, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 16,
              padding: 24,
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: card.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 16,
              }}>
                {card.icon}
              </div>
              <h3 style={{
                fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 700,
                color: '#f1f5f9', marginBottom: 8,
              }}>{card.title}</h3>
              <div style={{
                fontSize: 14, fontWeight: 600, color: '#e2e8f0',
                fontFamily: "'Inter', sans-serif", marginBottom: 4, wordBreak: 'break-all',
              }}>{card.value}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', fontFamily: "'Inter', sans-serif" }}>{card.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Main Grid: Form + Right Sidebar */}
      <Section className="py-16">
        <div style={{
          maxWidth: 1280, margin: '0 auto',
          display: 'grid', gridTemplateColumns: '1fr', gap: 48,
        }} className="mkt-2col">
          {/* Form */}
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 20,
            padding: 32,
          }}>
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: 'rgba(224,70,50,0.1)', border: '2px solid #E04632',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 24px',
                }}>
                  <Zap size={32} color="#E04632" />
                </div>
                <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 22, color: '#f1f5f9', marginBottom: 8 }}>Message Sent!</h3>
                <p style={{ fontSize: 14, color: '#94a3b8', fontFamily: "'Inter', sans-serif" }}>We'll get back to you within 24 hours.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <DisplayHeading as="h2">Send Us a Message</DisplayHeading>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#f1f5f9', marginBottom: 6, fontFamily: "'Inter', sans-serif" }}>Name *</label>
                  <input
                    type="text"
                    placeholder="Your name"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    style={inputStyle(!!errors.name)}
                  />
                  {errors.name && <span style={errorStyle}>{errors.name}</span>}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#f1f5f9', marginBottom: 6, fontFamily: "'Inter', sans-serif" }}>Email *</label>
                    <input
                      type="email"
                      placeholder="you@email.com"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      style={inputStyle(!!errors.email)}
                    />
                    {errors.email && <span style={errorStyle}>{errors.email}</span>}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#f1f5f9', marginBottom: 6, fontFamily: "'Inter', sans-serif" }}>Phone</label>
                    <input
                      type="text"
                      placeholder="+91 98765 43210"
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      style={inputStyle(false)}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#f1f5f9', marginBottom: 6, fontFamily: "'Inter', sans-serif" }}>Subject</label>
                  <select
                    value={form.subject}
                    onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                    style={selectStyle}
                  >
                    <option value="General Inquiry">General Inquiry</option>
                    <option value="Sales Support">Sales Support</option>
                    <option value="Technical Help">Technical Help</option>
                    <option value="Billing / Payment">Billing / Payment</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#f1f5f9', marginBottom: 6, fontFamily: "'Inter', sans-serif" }}>Message *</label>
                  <textarea
                    placeholder="How can we help?"
                    value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    rows={5}
                    style={textareaStyle(!!errors.message)}
                  />
                  {errors.message && <span style={errorStyle}>{errors.message}</span>}
                </div>

                <button type="submit" style={{
                  padding: '14px 32px', borderRadius: 12, fontSize: 16, fontWeight: 600,
                  background: 'linear-gradient(135deg, #E04632, #C83A28)',
                  color: 'white', border: 'none', cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                  boxShadow: '0 0 24px rgba(224,70,50,0.3)',
                  transition: 'transform 0.2s',
                  width: 'fit-content',
                  marginTop: 8,
                }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
                >Send Message</button>
              </form>
            )}
          </div>

          {/* Right sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Quick Response */}
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 20,
              padding: 32,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <Zap size={20} color="#E04632" />
                <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Quick Response</h3>
              </div>
              <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.6, fontFamily: "'Inter', sans-serif", margin: 0 }}>
                Our support team typically responds within 4-6 hours during business hours. For urgent issues, reach out via WhatsApp for faster resolution.
              </p>
              
              <div style={{
                marginTop: 24, padding: 16, borderRadius: 12,
                background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)',
              }}>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Average response time</div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 700, color: '#E04632' }}>&lt; 6 Hours</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>During business hours (Mon-Sat, 9 AM - 7 PM IST)</div>
              </div>
            </div>

            {/* FAQ */}
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 20,
              padding: 32,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <MessageSquare size={20} color="#E04632" />
                <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>FAQ</h3>
              </div>
              <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.6, fontFamily: "'Inter', sans-serif", marginBottom: 20 }}>
                Looking for quick answers? Many common questions are answered in our FAQ section.
              </p>
              <a href="/#faq" style={{
                fontSize: 14, fontWeight: 600, color: '#E04632', textDecoration: 'none',
                fontFamily: "'Inter', sans-serif", display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
                View FAQ Section →
              </a>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}

const inputStyle = (hasError: boolean) => ({
  width: '100%',
  padding: '12px 16px',
  borderRadius: 10,
  fontSize: 15,
  background: 'rgba(255,255,255,0.04)',
  border: `1px solid ${hasError ? '#EF4444' : 'rgba(255,255,255,0.08)'}`,
  color: '#e2e8f0',
  outline: 'none',
  fontFamily: "'Inter', sans-serif",
  boxSizing: 'border-box' as const,
  transition: 'border-color 0.2s',
});

const selectStyle = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: 10,
  fontSize: 15,
  background: 'rgba(13,20,36,0.98)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#e2e8f0',
  outline: 'none',
  fontFamily: "'Inter', sans-serif",
  boxSizing: 'border-box' as const,
};

const textareaStyle = (hasError: boolean) => ({
  width: '100%',
  padding: '12px 16px',
  borderRadius: 10,
  fontSize: 15,
  background: 'rgba(255,255,255,0.04)',
  border: `1px solid ${hasError ? '#EF4444' : 'rgba(255,255,255,0.08)'}`,
  color: '#e2e8f0',
  outline: 'none',
  fontFamily: "'Inter', sans-serif",
  boxSizing: 'border-box' as const,
  resize: 'vertical' as const,
  transition: 'border-color 0.2s',
});

const errorStyle = {
  fontSize: 12,
  color: '#EF4444',
  marginTop: 4,
  display: 'block',
};
