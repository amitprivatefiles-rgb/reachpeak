// @ts-nocheck
// Shown on the AI Calling page while AI Calling is not active for the account: explains the feature
// and lets the business request it. The ReachPeak admin then sets up their number + agent and turns it on.
import { useEffect, useState } from 'react';
import { PhoneCall, PhoneIncoming, PhoneOutgoing, Clock, CheckCircle2, Send, Loader2, XCircle, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';

const ACCENT = '#E04632';
const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', fontSize: 14, color: '#0f172a', boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 };
const fmt = (iso) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export function AiCallingRequest({ userId, pricePaise = 400 }: { userId: string; pricePaise?: number }) {
  const [req, setReq] = useState(undefined);
  const [f, setF] = useState({ use_case: '', calls: 'Up to 500 minutes / month', direction: 'Incoming calls (customers call us)', contact: '', notes: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const load = async () => {
    const { data } = await supabase.from('feature_requests').select('*').eq('user_id', userId).eq('feature', 'ai_calling').order('created_at', { ascending: false }).limit(1);
    setReq((data || [])[0] || null);
  };
  useEffect(() => { if (userId) load(); }, [userId]);
  const submit = async () => {
    setErr('');
    if (f.use_case.trim().length < 10) return setErr('Tell us in a line or two what the AI should handle (e.g. "Answer enquiries and book clinic appointments").');
    setBusy(true);
    const { error } = await supabase.from('feature_requests').insert({ user_id: userId, feature: 'ai_calling', details: { ...f, use_case: f.use_case.trim().slice(0, 600), notes: f.notes.trim().slice(0, 600), contact: f.contact.trim().slice(0, 40) } });
    setBusy(false);
    if (error) return setErr(error.code === '23505' ? 'You already have a request in progress.' : 'Could not send the request. Please try again.');
    load();
  };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const rupees = '₹' + (pricePaise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 });

  return (
    <div className="rp-page" style={{ maxWidth: 980, margin: '0 auto' }}>
      <div className="rp-card" style={{ borderRadius: 20, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: ACCENT + '14', color: ACCENT, display: 'grid', placeItems: 'center' }}><PhoneCall size={24} /></div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0f172a', fontFamily: "'Space Grotesk', sans-serif" }}>AI Calling</h1>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>An AI voice agent that answers and makes calls for your business in Hindi, English and Hinglish.</p>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#92400e', background: '#fef3c7', padding: '4px 10px', borderRadius: 999 }}>Not active on your account yet</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, margin: '20px 0' }}>
          {[
            { icon: PhoneIncoming, t: 'Answers every call', d: 'Your own business number, picked up instantly, day and night.' },
            { icon: Sparkles, t: 'Books, confirms, follows up', d: 'Appointments, orders, callbacks; results and transcripts in your dashboard.' },
            { icon: PhoneOutgoing, t: 'Calls your leads', d: 'One click to call a new enquiry within seconds (after compliance setup).' },
            { icon: Clock, t: `${rupees} per minute`, d: 'From your wallet, only for minutes used. Unanswered calls are free.' },
          ].map((x) => { const I = x.icon; return (
            <div key={x.t} style={{ padding: 14, borderRadius: 14, background: '#f8fafc' }}>
              <I size={18} color={ACCENT} /><div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14, marginTop: 6 }}>{x.t}</div><div style={{ fontSize: 12.5, color: '#64748b', marginTop: 3, lineHeight: 1.45 }}>{x.d}</div>
            </div>
          ); })}
        </div>

        {req === undefined ? null : req && req.status === 'pending' ? (
          <div style={{ padding: 16, borderRadius: 14, background: '#ecfdf5', color: '#065f46' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}><CheckCircle2 size={18} />Request received {fmt(req.created_at)}</div>
            <p style={{ margin: '6px 0 0', fontSize: 13.5, lineHeight: 1.5 }}>Our team will set up your business phone number and AI agent, then switch AI Calling on for you. You'll see the full AI Calling page here as soon as it's ready.</p>
          </div>
        ) : (
          <div>
            {req && req.status === 'rejected' && (
              <div style={{ padding: 12, borderRadius: 12, background: '#fef2f2', color: '#991b1b', fontSize: 13.5, marginBottom: 14, display: 'flex', gap: 8 }}>
                <XCircle size={17} style={{ flexShrink: 0, marginTop: 1 }} /><span>Your last request ({fmt(req.created_at)}) was not approved{req.admin_note ? `: ${req.admin_note}` : '.'} You can send a new one below.</span>
              </div>
            )}
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>Request AI Calling</h2>
            <div style={{ display: 'grid', gap: 12 }}>
              <div><label style={labelStyle}>What should the AI handle? *</label><textarea style={{ ...inputStyle, minHeight: 70 }} value={f.use_case} onChange={set('use_case')} maxLength={600} placeholder="e.g. Answer enquiries and book appointments for our clinic; call new leads from our website form" /></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                <div><label style={labelStyle}>Calls needed</label>
                  <select style={inputStyle} value={f.direction} onChange={set('direction')}>
                    {['Incoming calls (customers call us)', 'Outgoing calls (we call customers)', 'Both incoming and outgoing'].map((o) => <option key={o}>{o}</option>)}
                  </select></div>
                <div><label style={labelStyle}>Expected volume</label>
                  <select style={inputStyle} value={f.calls} onChange={set('calls')}>
                    {['Up to 500 minutes / month', '500 to 2,000 minutes / month', '2,000 to 10,000 minutes / month', 'More than 10,000 minutes / month'].map((o) => <option key={o}>{o}</option>)}
                  </select></div>
                <div><label style={labelStyle}>Your phone (for our setup call)</label><input style={inputStyle} value={f.contact} onChange={set('contact')} inputMode="tel" placeholder="e.g. 98765 43210" /></div>
              </div>
              <div><label style={labelStyle}>Anything else?</label><input style={inputStyle} value={f.notes} onChange={set('notes')} maxLength={600} placeholder="e.g. preferred city for the number, languages, timings" /></div>
            </div>
            {err && <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 10, background: '#fef2f2', color: '#b91c1c', fontSize: 13 }}>{err}</div>}
            <button onClick={submit} disabled={busy} style={{ marginTop: 16, padding: '11px 20px', borderRadius: 12, border: 'none', background: ACCENT, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, opacity: busy ? 0.7 : 1 }}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}Request AI Calling
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
