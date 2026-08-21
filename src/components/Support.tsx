// @ts-nocheck
import { useEffect, useState, useCallback } from 'react';
import { LifeBuoy, Loader2, Phone, MessageCircle, Plus, Ticket, Clock, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

const SUPPORT_PHONE_DISPLAY = '+91 85830 21893';
const SUPPORT_PHONE_WA = '918583021893';
const brand = '#E04632';
const card = { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14, padding: 20 };
const input = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0b1220', color: '#e2e8f0', fontSize: 14, boxSizing: 'border-box' as const };

const STATUS_META: Record<string, { color: string; label: string }> = {
  open: { color: '#3b82f6', label: 'Open' },
  in_progress: { color: '#f59e0b', label: 'In progress' },
  resolved: { color: '#10b981', label: 'Resolved' },
  closed: { color: '#64748b', label: 'Closed' },
  requested: { color: '#3b82f6', label: 'Requested' },
  contacted: { color: '#f59e0b', label: 'Contacted' },
  done: { color: '#10b981', label: 'Done' },
  cancelled: { color: '#64748b', label: 'Cancelled' },
};

export function Support() {
  const [tab, setTab] = useState<'ticket' | 'callback'>('ticket');
  const [tickets, setTickets] = useState<any[]>([]);
  const [callbacks, setCallbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  // ticket form
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('general');
  const [message, setMessage] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // callback form
  const [cbName, setCbName] = useState('');
  const [cbPhone, setCbPhone] = useState('');
  const [cbReason, setCbReason] = useState('');
  const [cbTime, setCbTime] = useState('');
  const [cbSubmitting, setCbSubmitting] = useState(false);

  const load = useCallback(async () => {
    const [t, c] = await Promise.all([
      supabase.functions.invoke('support', { body: { action: 'list_tickets' } }),
      supabase.functions.invoke('support', { body: { action: 'list_callbacks' } }),
    ]);
    setTickets(t.data?.tickets || []);
    setCallbacks(c.data?.callbacks || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const submitTicket = async () => {
    setMsg(null);
    if (!subject.trim() || !message.trim()) { setMsg({ kind: 'err', text: 'Please add a subject and a message.' }); return; }
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke('support', {
      body: { action: 'create_ticket', subject, category, message, contact_phone: contactPhone },
    });
    setSubmitting(false);
    if (error || data?.error) { setMsg({ kind: 'err', text: data?.error || 'Could not create ticket.' }); return; }
    setMsg({ kind: 'ok', text: 'Ticket created! Our team will get back to you soon.' });
    setSubject(''); setMessage(''); setContactPhone(''); setCategory('general');
    load();
  };

  const submitCallback = async () => {
    setMsg(null);
    if (!cbPhone.trim() || cbPhone.replace(/[^0-9]/g, '').length < 10) { setMsg({ kind: 'err', text: 'Please enter a valid phone number.' }); return; }
    setCbSubmitting(true);
    const { data, error } = await supabase.functions.invoke('support', {
      body: { action: 'request_callback', name: cbName, phone: cbPhone, reason: cbReason, preferred_time: cbTime },
    });
    setCbSubmitting(false);
    if (error || data?.error) { setMsg({ kind: 'err', text: data?.error || 'Could not request callback.' }); return; }
    setMsg({ kind: 'ok', text: 'Callback requested! We\'ll call you back and send a WhatsApp confirmation.' });
    setCbName(''); setCbPhone(''); setCbReason(''); setCbTime('');
    load();
  };

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg,${brand},#c83b27)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LifeBuoy size={20} color="white" />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#f1f5f9' }}>Support</h2>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Raise a ticket or request a callback — we're here to help.</p>
        </div>
      </div>

      {/* Quick WhatsApp */}
      <a href={`https://wa.me/${SUPPORT_PHONE_WA}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.3)', color: '#25D366', fontWeight: 600, fontSize: 14, textDecoration: 'none', margin: '8px 0 20px' }}>
        <MessageCircle size={17} /> Chat on WhatsApp · {SUPPORT_PHONE_DISPLAY}
      </a>

      {msg && (
        <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13.5,
          background: msg.kind === 'err' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
          border: `1px solid ${msg.kind === 'err' ? '#ef444440' : '#10b98140'}`,
          color: msg.kind === 'err' ? '#ef4444' : '#10b981' }}>{msg.text}</div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[['ticket', 'Create ticket', Ticket], ['callback', 'Request callback', Phone]].map(([id, label, Icon]: any) => (
          <button key={id} onClick={() => setTab(id)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 9, fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
            border: `1px solid ${tab === id ? brand : '#334155'}`, background: tab === id ? 'rgba(224,70,50,0.12)' : '#0b1220', color: tab === id ? brand : '#94a3b8' }}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 20 }}>
        {/* Form */}
        <div style={card}>
          {tab === 'ticket' ? (
            <>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', margin: '0 0 14px' }}>New support ticket</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input style={input} placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} />
                <select style={input} value={category} onChange={e => setCategory(e.target.value)}>
                  <option value="general">General</option>
                  <option value="billing">Billing / Wallet</option>
                  <option value="whatsapp">WhatsApp setup</option>
                  <option value="technical">Technical issue</option>
                  <option value="account">Account</option>
                  <option value="other">Other</option>
                </select>
                <textarea style={{ ...input, minHeight: 110, resize: 'vertical' }} placeholder="Describe your issue…" value={message} onChange={e => setMessage(e.target.value)} />
                <input style={input} placeholder="Contact phone (optional — for WhatsApp updates)" value={contactPhone} onChange={e => setContactPhone(e.target.value)} />
                <button onClick={submitTicket} disabled={submitting} style={{ padding: '11px', borderRadius: 9, border: 'none', background: `linear-gradient(135deg,${brand},#c83b27)`, color: 'white', fontWeight: 700, fontSize: 14.5, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                  {submitting ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={15} />} Submit ticket
                </button>
              </div>
            </>
          ) : (
            <>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', margin: '0 0 14px' }}>Request a callback</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input style={input} placeholder="Your name" value={cbName} onChange={e => setCbName(e.target.value)} />
                <input style={input} placeholder="Phone number (with country code)" value={cbPhone} onChange={e => setCbPhone(e.target.value)} />
                <input style={input} placeholder="Best time to call (optional)" value={cbTime} onChange={e => setCbTime(e.target.value)} />
                <textarea style={{ ...input, minHeight: 80, resize: 'vertical' }} placeholder="What's this about? (optional)" value={cbReason} onChange={e => setCbReason(e.target.value)} />
                <button onClick={submitCallback} disabled={cbSubmitting} style={{ padding: '11px', borderRadius: 9, border: 'none', background: `linear-gradient(135deg,${brand},#c83b27)`, color: 'white', fontWeight: 700, fontSize: 14.5, cursor: cbSubmitting ? 'not-allowed' : 'pointer', opacity: cbSubmitting ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                  {cbSubmitting ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Phone size={15} />} Request callback
                </button>
              </div>
            </>
          )}
        </div>

        {/* History */}
        <div style={card}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', margin: '0 0 14px' }}>{tab === 'ticket' ? 'My tickets' : 'My callback requests'}</h3>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: brand }} /></div>
          ) : tab === 'ticket' ? (
            tickets.length === 0 ? <p style={{ color: '#64748b', fontSize: 13.5 }}>No tickets yet.</p> :
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {tickets.map(t => {
                const sm = STATUS_META[t.status] || STATUS_META.open;
                return (
                  <div key={t.id} style={{ padding: 12, borderRadius: 10, background: '#0b1220', border: '1px solid #1e293b' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <p style={{ margin: 0, fontSize: 13.5, color: '#e2e8f0', fontWeight: 600 }}>{t.subject}</p>
                      <span style={{ fontSize: 11, fontWeight: 700, color: sm.color, whiteSpace: 'nowrap' }}>{sm.label}</span>
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>{t.message?.slice(0, 120)}{t.message?.length > 120 ? '…' : ''}</p>
                    <p style={{ margin: '6px 0 0', fontSize: 11, color: '#64748b' }}>{t.category} · {new Date(t.created_at).toLocaleString('en-IN')}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            callbacks.length === 0 ? <p style={{ color: '#64748b', fontSize: 13.5 }}>No callback requests yet.</p> :
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {callbacks.map(c => {
                const sm = STATUS_META[c.status] || STATUS_META.requested;
                return (
                  <div key={c.id} style={{ padding: 12, borderRadius: 10, background: '#0b1220', border: '1px solid #1e293b' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <p style={{ margin: 0, fontSize: 13.5, color: '#e2e8f0', fontWeight: 600 }}>{c.phone}</p>
                      <span style={{ fontSize: 11, fontWeight: 700, color: sm.color }}>{sm.label}</span>
                    </div>
                    {c.reason && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>{c.reason}</p>}
                    <p style={{ margin: '6px 0 0', fontSize: 11, color: '#64748b' }}>{new Date(c.created_at).toLocaleString('en-IN')}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
