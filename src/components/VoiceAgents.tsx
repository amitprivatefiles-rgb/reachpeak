// @ts-nocheck
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  PhoneCall, Plus, RefreshCw, X, Mic, PhoneOff, Check, Pencil, Trash2, Clock, IndianRupee, Bot,
  PhoneIncoming, PhoneOutgoing, Monitor, CheckCircle2, Search, FileText, Wallet as WalletIcon, Hash, PhoneForwarded,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BrandSpinner } from './BrandSpinner';
import { useVoiceCall, VOICE_WS } from '../lib/useVoiceCall';
import { placeAiCall, outboundStatus } from '../lib/aiCall';
import { AiCallingRequest } from './AiCallingRequest';

const ACCENT = '#E04632';

const VOICES = [
  { id: 'Aoede', label: 'Aoede', hint: 'Female · warm' },
  { id: 'Kore', label: 'Kore', hint: 'Female · confident' },
  { id: 'Leda', label: 'Leda', hint: 'Female · young, friendly' },
  { id: 'Zephyr', label: 'Zephyr', hint: 'Female · bright' },
  { id: 'Puck', label: 'Puck', hint: 'Male · upbeat' },
  { id: 'Charon', label: 'Charon', hint: 'Male · deep, calm' },
  { id: 'Fenrir', label: 'Fenrir', hint: 'Male · energetic' },
  { id: 'Orus', label: 'Orus', hint: 'Male · firm' },
];
const PURPOSES = [
  { label: 'Book appointments', text: 'Book an appointment or consultation slot for the customer.' },
  { label: 'Confirm orders', text: 'Confirm the customer\'s order and delivery details (address, landmark, preferred time).' },
  { label: 'Qualify leads', text: 'Understand what the customer is looking for (need, budget, timeline) and book a follow-up with the team.' },
  { label: 'Customer support', text: 'Answer customer questions from the brief and take a message for the team if something is not covered.' },
  { label: 'Payment reminders', text: 'Politely remind the customer about a pending payment and note when they will pay.' },
];
// Ready-made starting points. [Square brackets] = replace with the business's real details.
const TEMPLATES = [
  { id: 'clinic', label: 'Clinic / doctor', v: { agent_name: 'Riya', voice: 'Aoede', direction: 'both', purpose: 'Book an appointment or consultation slot for the customer.',
    brief: '[Clinic name], [area, city]. [Doctor name], [speciality]. Consultation fee Rs [amount], paid at the clinic. Clinic hours [10 AM to 8 PM], closed [Sunday]. Address: [full address, landmark]. Services: [list]. For reports or emergencies the patient must call [phone] or visit the clinic.',
    slots: 'Mon–Sat: 11:00 AM, 4:00 PM, 6:00 PM', instructions: 'Never give medical advice. For severe symptoms tell them to call 112 or go to the nearest hospital.' } },
  { id: 'coaching', label: 'Coaching / education', v: { agent_name: 'Aditi', voice: 'Kore', direction: 'both', purpose: 'Understand the student\'s class, subject and goal, and book a free counselling session or demo class.',
    brief: '[Institute name], [city]. Courses: [e.g. NEET, JEE, Class 9–12 boards]. Batches: [timings, online/offline]. Fees: [amount per year / month, EMI options]. Free demo class available. Address: [address].',
    slots: 'Mon–Sat: 4:00 PM, 6:00 PM; Sun: 11:00 AM', instructions: 'Ask which class the student is in first.' } },
  { id: 'realestate', label: 'Real estate', v: { agent_name: 'Arjun', voice: 'Puck', direction: 'both', purpose: 'Qualify the buyer (budget, configuration, timeline, loan need) and book a site visit.',
    brief: '[Project name] by [developer], [location]. [2BHK from Rs X lakh, 3BHK from Rs Y lakh]. Possession [month year]. RERA no. [number]. Amenities: [list]. Home loans available from [banks]. Site visits [days and hours].',
    slots: 'Sat–Sun: 11:00 AM, 2:00 PM, 5:00 PM', instructions: 'Do not quote final prices or discounts; say the sales team will share the price sheet on WhatsApp.' } },
  { id: 'salon', label: 'Salon / spa', v: { agent_name: 'Leda', voice: 'Leda', direction: 'both', purpose: 'Book a salon or spa appointment for the requested service.',
    brief: '[Salon name], [area, city]. Services and prices: [haircut Rs X, colour from Rs Y, facial Rs Z…]. Open [10 AM to 9 PM], [all days]. Address: [address].',
    slots: 'Daily: 11:00 AM, 1:00 PM, 4:00 PM, 7:00 PM', instructions: '' } },
  { id: 'finance', label: 'Finance / insurance', v: { agent_name: 'Kabir', voice: 'Charon', direction: 'both', purpose: 'Understand what the customer needs (loan, insurance, investment) and book a call with an advisor.',
    brief: '[Company name], [registration e.g. IRDAI/AMFI no.]. Products: [list]. Documents usually needed: [list]. Office hours [10 AM to 6 PM, Mon–Sat].',
    slots: 'Mon–Sat: 11:00 AM, 3:00 PM, 5:00 PM', instructions: 'Never give investment, tax or loan-approval promises. Never ask for OTPs, card or bank details.' } },
  { id: 'agency', label: 'Agency / services', v: { agent_name: 'Riya', voice: 'Aoede', direction: 'both', purpose: 'Understand the caller\'s requirement and book a free consultation call with the team.',
    brief: '[Agency name], [city]. Services: [list]. Typical packages: [from Rs X per month]. Free [30-minute] consultation. Office hours [10 AM to 7 PM, Mon–Sat].',
    slots: 'Mon–Sat: 11:00 AM, 3:00 PM, 6:00 PM', instructions: 'Do not promise custom pricing; say the team will send a proposal on WhatsApp.' } },
  { id: 'store', label: 'Online store (orders)', v: { agent_name: 'Riya', voice: 'Aoede', direction: 'both', purpose: 'Confirm the customer\'s order and delivery details (address, landmark, preferred time) and answer order questions.',
    brief: '[Store name]. Delivery in [3–5] days. Cash on delivery available. Returns/exchanges within [7] days of delivery [conditions]. Support hours [10 AM to 7 PM].',
    slots: '', instructions: 'Never ask for OTPs or payment details.' } },
];

const DIRECTIONS = [
  { id: 'both', label: 'Incoming + outgoing' },
  { id: 'inbound', label: 'Incoming calls only' },
  { id: 'outbound', label: 'Outgoing calls only' },
];
const OUTCOME = {
  booked: { label: 'Booked', color: '#10b981' }, confirmed: { label: 'Confirmed', color: '#10b981' }, qualified: { label: 'Qualified', color: '#10b981' },
  rescheduled: { label: 'Rescheduled', color: '#3b82f6' }, callback: { label: 'Callback', color: '#3b82f6' }, human_requested: { label: 'Wants a human', color: '#8b5cf6' },
  cancelled: { label: 'Cancelled', color: '#64748b' }, not_interested: { label: 'Not interested', color: '#64748b' }, wrong_number: { label: 'Wrong number', color: '#64748b' },
  opt_out: { label: 'Opted out', color: '#f59e0b' }, emergency_referred: { label: 'Emergency', color: '#ef4444' }, no_response: { label: 'No response', color: '#94a3b8' },
  other: { label: 'Other', color: '#94a3b8' },
};
const SUCCESS = ['booked', 'confirmed', 'qualified', 'rescheduled', 'callback'];
const EMPTY = { name: '', business_name: '', agent_name: 'Riya', voice: 'Aoede', purpose: PURPOSES[0].text, brief: '', slots: '', instructions: '', direction: 'both', save_transcripts: true, is_active: true };

const rupees = (paise) => '₹' + ((Number(paise) || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const fmtDur = (s) => { s = Number(s) || 0; return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const fmtWhen = (iso) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const missingTable = (e) => e && (e.code === '42P01' || e.code === 'PGRST205' || /does not exist|schema cache/i.test(e.message || ''));

function Pill({ color, children }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color, background: color + '18', padding: '2px 9px', borderRadius: 999, whiteSpace: 'nowrap' }}>{children}</span>;
}
function StatCard({ icon, label, value, color, subtitle }) {
  return (
    <div className="rp-card" style={{ borderRadius: 16, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color, marginBottom: 8 }}>{icon}<span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>{label}</span></div>
      <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{value}</div>
      {subtitle && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>{subtitle}</div>}
    </div>
  );
}
const btn = (primary) => ({ padding: '10px 16px', borderRadius: 12, border: primary ? 'none' : '1px solid #e6e8ec', background: primary ? ACCENT : '#fff', color: primary ? '#fff' : '#475569', fontWeight: primary ? 700 : 600, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 });
const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', fontSize: 14, color: '#0f172a', boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 };
const hintStyle = { fontSize: 11.5, color: '#94a3b8', marginTop: 5, lineHeight: 1.4 };

function Modal({ title, onClose, children, width = 640 }) {
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 60, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '4vh 12px', overflowY: 'auto' }}>
      <div onClick={(e) => e.stopPropagation()} className="rp-card" style={{ width: '100%', maxWidth: width, borderRadius: 18, padding: 20, background: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a', fontFamily: "'Space Grotesk', sans-serif" }}>{title}</h2>
          <button onClick={onClose} aria-label="Close" style={{ border: 'none', background: '#f1f5f9', borderRadius: 10, padding: 6, cursor: 'pointer', color: '#475569' }}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function AgentEditor({ initial, userId, onClose, onSaved }) {
  const [f, setF] = useState(() => ({ ...EMPTY, ...(initial || {}) }));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e });
  const save = async () => {
    setErr('');
    if (!f.business_name.trim()) return setErr('Please enter your business name.');
    if (!f.brief.trim()) return setErr('Please add a short brief: what you offer, prices, timings. The agent only uses these facts.');
    if (/\[[^\]]{2,}\]/.test(f.brief + ' ' + f.slots + ' ' + f.purpose)) return setErr('Replace the [square-bracket] placeholders with the real details before saving.');
    setSaving(true);
    const row = {
      name: (f.name.trim() || f.business_name.trim()).slice(0, 80), business_name: f.business_name.trim().slice(0, 120), agent_name: (f.agent_name.trim() || 'Riya').slice(0, 40),
      voice: f.voice, purpose: f.purpose.trim().slice(0, 600), brief: f.brief.trim().slice(0, 6000), slots: f.slots.trim().slice(0, 1500), instructions: f.instructions.trim().slice(0, 2000),
      direction: f.direction, save_transcripts: !!f.save_transcripts, is_active: !!f.is_active,
    };
    const q = initial?.id ? supabase.from('voice_agents').update(row).eq('id', initial.id) : supabase.from('voice_agents').insert({ ...row, user_id: userId });
    const { error } = await q;
    setSaving(false);
    if (error) return setErr('Could not save: ' + error.message);
    onSaved();
  };
  return (
    <Modal title={initial?.id ? 'Edit AI agent' : 'New AI agent'} onClose={onClose} width={720}>
      {!initial?.id && (
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Start from a template</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {TEMPLATES.map((t) => (
              <button key={t.id} type="button" onClick={() => setF({ ...f, ...t.v, name: f.name || t.label })}
                style={{ padding: '6px 11px', borderRadius: 999, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', border: '1px solid #e2e8f0', background: '#fff', color: '#475569' }}>{t.label}</button>
            ))}
          </div>
          <div style={hintStyle}>Fills the form with a ready brief. Replace everything in [square brackets] with the business's real details.</div>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        <div><label style={labelStyle}>Business name *</label><input style={inputStyle} value={f.business_name} onChange={set('business_name')} placeholder="e.g. Glow Dental, Park Street" maxLength={120} /></div>
        <div><label style={labelStyle}>Agent's name</label><input style={inputStyle} value={f.agent_name} onChange={set('agent_name')} placeholder="e.g. Riya" maxLength={40} /><div style={hintStyle}>The name the agent introduces itself with.</div></div>
        <div><label style={labelStyle}>Label (only you see it)</label><input style={inputStyle} value={f.name} onChange={set('name')} placeholder="e.g. Booking line" maxLength={80} /></div>
        <div><label style={labelStyle}>Calls it handles</label>
          <select style={inputStyle} value={f.direction} onChange={set('direction')}>{DIRECTIONS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}</select></div>
      </div>

      <div style={{ marginTop: 16 }}>
        <label style={labelStyle}>Voice</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
          {VOICES.map((v) => (
            <button key={v.id} type="button" onClick={() => setF({ ...f, voice: v.id })}
              style={{ textAlign: 'left', padding: '9px 11px', borderRadius: 12, cursor: 'pointer', border: '1.5px solid ' + (f.voice === v.id ? ACCENT : '#e2e8f0'), background: f.voice === v.id ? ACCENT + '0d' : '#fff' }}>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: '#0f172a' }}>{v.label}</div><div style={{ fontSize: 11.5, color: '#64748b' }}>{v.hint}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <label style={labelStyle}>What should the call achieve?</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {PURPOSES.map((p) => (
            <button key={p.label} type="button" onClick={() => setF({ ...f, purpose: p.text })}
              style={{ padding: '6px 11px', borderRadius: 999, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', border: '1px solid ' + (f.purpose === p.text ? ACCENT : '#e2e8f0'), background: f.purpose === p.text ? ACCENT : '#fff', color: f.purpose === p.text ? '#fff' : '#475569' }}>{p.label}</button>
          ))}
        </div>
        <textarea style={{ ...inputStyle, minHeight: 60 }} value={f.purpose} onChange={set('purpose')} maxLength={600} />
      </div>

      <div style={{ marginTop: 14 }}>
        <label style={labelStyle}>Brief: facts the agent may use *</label>
        <textarea style={{ ...inputStyle, minHeight: 130 }} value={f.brief} onChange={set('brief')} maxLength={6000}
          placeholder={'Services and prices, timings, address, delivery or refund policy, offers.\ne.g. Dr. Sen (dentist). Check-up ₹500, paid at the clinic. Open 10 AM to 7 PM, closed Sunday. 12 Park Street, Kolkata. Free parking.'} />
        <div style={hintStyle}>The agent never invents prices or policies: anything not written here, it says your team will confirm on WhatsApp.</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginTop: 14 }}>
        <div><label style={labelStyle}>Available slots (optional)</label>
          <textarea style={{ ...inputStyle, minHeight: 80 }} value={f.slots} onChange={set('slots')} maxLength={1500} placeholder={'e.g. Mon–Sat: 11:00 AM, 3:00 PM, 6:00 PM'} />
          <div style={hintStyle}>Weekly. It never offers a slot that has already passed.</div></div>
        <div><label style={labelStyle}>Extra instructions (optional)</label>
          <textarea style={{ ...inputStyle, minHeight: 80 }} value={f.instructions} onChange={set('instructions')} maxLength={2000} placeholder={'e.g. Always mention free parking. Speak mostly in Bengali.'} /></div>
      </div>

      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 14, fontSize: 13, color: '#334155' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}><input type="checkbox" checked={f.save_transcripts} onChange={set('save_transcripts')} />Save call transcripts</label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}><input type="checkbox" checked={f.is_active} onChange={set('is_active')} />Agent active</label>
      </div>


      {err && <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 10, background: '#fef2f2', color: '#b91c1c', fontSize: 13 }}>{err}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
        <button type="button" onClick={onClose} style={btn(false)}>Cancel</button>
        <button type="button" onClick={save} disabled={saving} style={{ ...btn(true), opacity: saving ? 0.7 : 1 }}><Check size={16} />{saving ? 'Saving…' : 'Save agent'}</button>
      </div>
    </Modal>
  );
}

function TestCall({ agent, price, onClose, onFinished }) {
  const call = useVoiceCall();
  const [name, setName] = useState(() => { try { return localStorage.getItem('rp_test_name') || ''; } catch { return ''; } });
  const [flow, setFlow] = useState(agent.direction === 'inbound' ? 'in' : 'out');
  const linesRef = useRef(null);
  useEffect(() => { linesRef.current?.scrollTo({ top: 1e9 }); }, [call.lines]);
  const wasLive = useRef(false);
  useEffect(() => { if (call.phase === 'live') wasLive.current = true; if (call.phase === 'ended' && wasLive.current) { wasLive.current = false; setTimeout(onFinished, 2500); } }, [call.phase, onFinished]);
  const busy = call.phase === 'connecting' || call.phase === 'live';
  const begin = async () => {
    try { localStorage.setItem('rp_test_name', name.trim()); } catch { /* ignore */ }
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) return call.note('Your session expired. Please sign in again.');
    call.start(`${VOICE_WS}?mode=test`, (ws) => ws.send(JSON.stringify({ type: 'auth', token, agent_id: agent.id, name: name.trim().slice(0, 30), flow })));
  };
  const close = () => { call.stop(); onClose(); };
  return (
    <Modal title={`Test call · ${agent.agent_name} (${agent.business_name})`} onClose={close} width={560}>
      <p style={{ margin: '0 0 12px', fontSize: 13, color: '#64748b' }}>Talk to your agent like a customer would. Test calls are billed from your wallet at {rupees(price)}/min, up to 5 minutes.</p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ flex: '1 1 180px' }}><label style={labelStyle}>Customer name for the test</label><input style={inputStyle} value={name} disabled={busy} onChange={(e) => setName(e.target.value)} placeholder="e.g. Amit" maxLength={30} /></div>
        <div style={{ flex: '1 1 200px' }}><label style={labelStyle}>Simulate</label>
          <select style={inputStyle} value={flow} disabled={busy} onChange={(e) => setFlow(e.target.value)}>
            <option value="out">Agent calls the customer</option><option value="in">Customer calls the business</option>
          </select></div>
      </div>
      <div style={{ borderRadius: 16, background: '#0f172a', color: '#e2e8f0', padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 999, background: ACCENT, display: 'grid', placeItems: 'center', fontWeight: 800, color: '#fff', fontSize: 13 }}>AI</div>
          <div style={{ flex: 1 }}><div style={{ fontWeight: 700 }}>{call.phase === 'live' ? 'On call' : call.phase === 'connecting' ? 'Connecting…' : call.phase === 'ended' ? 'Call ended' : 'Ready'}</div><div style={{ fontSize: 12, color: '#94a3b8' }}>{agent.agent_name} · {VOICES.find((v) => v.id === agent.voice)?.hint || agent.voice}</div></div>
          <span style={{ fontFamily: 'monospace', color: call.phase === 'live' ? '#6EE7A0' : '#94a3b8' }}>{call.phase === 'live' ? `● ${fmtDur(call.secs)}` : call.phase.toUpperCase()}</span>
        </div>
        <div style={{ height: 4, background: '#1e293b', borderRadius: 4, marginTop: 12, overflow: 'hidden' }}><i style={{ display: 'block', height: '100%', width: `${Math.min(100, call.level * 140)}%`, background: '#6EE7A0', transition: 'width .1s' }} /></div>
        <div ref={linesRef} style={{ maxHeight: 260, minHeight: 120, overflowY: 'auto', marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {call.lines.length === 0 && <p style={{ margin: 0, color: '#94a3b8', fontSize: 13 }}>{call.phase === 'live' ? 'Listening… say hello.' : 'Press start, allow the microphone, and talk. Interrupt any time.'}</p>}
          {call.lines.map((l, i) => (
            <div key={i} style={{ alignSelf: l.role === 'agent' ? 'flex-start' : 'flex-end', maxWidth: '85%', background: l.role === 'agent' ? '#1e293b' : ACCENT, color: '#fff', padding: '8px 11px', borderRadius: 12, fontSize: 13.5, lineHeight: 1.45 }}>
              <div style={{ fontSize: 10.5, opacity: 0.7, marginBottom: 2 }}>{l.role === 'agent' ? agent.agent_name : 'You'}</div>{l.text}
            </div>
          ))}
        </div>
        {call.notes.length > 0 && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>{call.notes.map((n) => <span key={n.text} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, padding: '4px 10px', borderRadius: 999, background: n.ok ? '#10b98126' : '#ffffff14', color: n.ok ? '#6EE7A0' : '#cbd5e1' }}>{n.ok && <Check size={12} />}{n.text}</span>)}</div>}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        {busy ? <button type="button" onClick={() => call.stop()} style={{ ...btn(false), background: '#0f172a', color: '#fff', border: 'none' }}><PhoneOff size={16} />End call</button>
          : <button type="button" onClick={begin} style={btn(true)}><Mic size={16} />{call.phase === 'ended' ? 'Call again' : 'Start test call'}</button>}
      </div>
      <p style={{ margin: '12px 0 0', fontSize: 11.5, color: '#94a3b8' }}>Use headphones for the best result. The call result and transcript appear in Call logs.</p>
    </Modal>
  );
}

function CallCustomer({ agents, status, onClose, onPlaced }) {
  const callable = agents.filter((a) => a.is_active && a.direction !== 'inbound');
  const [agentId, setAgentId] = useState(callable[0]?.id || '');
  const [to, setTo] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const go = async () => {
    setMsg(null); setBusy(true);
    try { const r = await placeAiCall({ agent_id: agentId, to, name }); setMsg({ ok: true, text: `Calling now. The customer's phone is ringing; the agent will talk for up to ${r.minutes} min. The result appears in Call logs.` }); onPlaced?.(); }
    catch (e) { setMsg({ ok: false, text: e.message }); }
    setBusy(false);
  };
  return (
    <Modal title="Call a customer with AI" onClose={onClose} width={520}>
      {!status?.allowed ? (
        <div style={{ padding: 12, borderRadius: 12, background: '#fffbeb', color: '#92400e', fontSize: 13.5 }}>{status?.reason || 'Checking…'}</div>
      ) : callable.length === 0 ? (
        <div style={{ padding: 12, borderRadius: 12, background: '#fffbeb', color: '#92400e', fontSize: 13.5 }}>None of your agents can make outgoing calls. Edit an agent and set "Calls it handles" to include outgoing calls.</div>
      ) : (
        <>
          <p style={{ margin: '0 0 12px', fontSize: 13, color: '#64748b' }}>The AI phones the customer from +{status.callerNumber}, introduces your business and handles the call. Billed per minute from your wallet. Calls are allowed {status.hours[0]}:00 to {status.hours[1]}:00 (India time).</p>
          <div style={{ display: 'grid', gap: 12 }}>
            <div><label style={labelStyle}>Agent</label><select style={inputStyle} value={agentId} onChange={(e) => setAgentId(e.target.value)}>{callable.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <div><label style={labelStyle}>Customer mobile</label><input style={inputStyle} value={to} onChange={(e) => setTo(e.target.value)} inputMode="tel" placeholder="e.g. 98765 43210" /></div>
              <div><label style={labelStyle}>Customer name</label><input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} maxLength={30} placeholder="e.g. Rahul" /></div>
            </div>
            <p style={{ ...hintStyle, marginTop: 0 }}>Only call people who asked to be contacted (they enquired, booked or are your customers).</p>
          </div>
        </>
      )}
      {msg && <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 10, background: msg.ok ? '#ecfdf5' : '#fef2f2', color: msg.ok ? '#047857' : '#b91c1c', fontSize: 13 }}>{msg.text}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        <button type="button" onClick={onClose} style={btn(false)}>Close</button>
        {status?.allowed && callable.length > 0 && <button type="button" onClick={go} disabled={busy || !to.trim() || !agentId} style={{ ...btn(true), opacity: busy || !to.trim() ? 0.6 : 1 }}><PhoneForwarded size={16} />{busy ? 'Placing call…' : 'Call now'}</button>}
      </div>
    </Modal>
  );
}

function CallDetail({ row, onClose }) {
  const [transcript, setTranscript] = useState(null);
  useEffect(() => {
    supabase.from('voice_calls').select('transcript').eq('id', row.id).maybeSingle().then(({ data }) => {
      const t = []; for (const [r, x] of data?.transcript || []) { if (t.length && t[t.length - 1][0] === r) t[t.length - 1][1] += x; else t.push([r, x]); }
      setTranscript(t);
    });
  }, [row.id]);
  const o = OUTCOME[row.outcome] || (row.outcome ? { label: row.outcome, color: '#94a3b8' } : null);
  return (
    <Modal title="Call details" onClose={onClose} width={620}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        {o && <Pill color={o.color}>{o.label}</Pill>}
        <Pill color="#475569">{row.direction === 'in' ? 'Incoming' : row.direction === 'out' ? 'Outgoing' : 'Test call'}</Pill>
        <span style={{ fontSize: 12.5, color: '#64748b' }}>{fmtWhen(row.started_at)} · {fmtDur(row.duration_sec)} · {rupees(row.charge_paise)}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, fontSize: 13 }}>
        <div><div style={labelStyle}>Agent</div>{row.agent_label || '—'}</div>
        <div><div style={labelStyle}>Customer</div>{row.customer_name || '—'}{row.customer_number ? ` · +${row.customer_number}` : ''}</div>
        {row.when_text && <div><div style={labelStyle}>When</div>{row.when_text}</div>}
      </div>
      {row.summary && <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: '#f8fafc', fontSize: 13.5, color: '#0f172a' }}><b>Summary: </b>{row.summary}{row.details ? <div style={{ marginTop: 6, color: '#475569' }}>{row.details}</div> : null}</div>}
      <div style={{ marginTop: 14 }}>
        <div style={labelStyle}>Transcript</div>
        {transcript === null ? <BrandSpinner label="Loading…" /> : transcript.length === 0 ? <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>No transcript saved for this call.</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 340, overflowY: 'auto' }}>
            {transcript.map(([r, x], i) => <div key={i} style={{ fontSize: 13.5, lineHeight: 1.45 }}><b style={{ color: r === 'agent' ? ACCENT : '#0f172a' }}>{r === 'agent' ? (row.agent_label ? 'Agent' : 'AI') : 'Customer'}: </b>{x.trim()}</div>)}
          </div>
        )}
      </div>
    </Modal>
  );
}

export function VoiceAgents({ ownerId, embedded }: { ownerId?: string; embedded?: boolean } = {}) {
  const { user, isAdmin } = useAuth();
  const [access, setAccess] = useState(undefined); // AI Calling switched on for this account by the admin?
  const [tab, setTab] = useState('agents');
  const [agents, setAgents] = useState([]);
  const [calls, setCalls] = useState([]);
  const [price, setPrice] = useState(400);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notReady, setNotReady] = useState(false);
  const [editing, setEditing] = useState(null);   // {} new | row
  const [testing, setTesting] = useState(null);   // agent row
  const [detail, setDetail] = useState(null);     // call row
  const [confirmDel, setConfirmDel] = useState(null);
  const [search, setSearch] = useState('');
  const [agentFilter, setAgentFilter] = useState('all');
  const [numbersByAgent, setNumbersByAgent] = useState({});
  const [outbound, setOutbound] = useState(null);
  const [calling, setCalling] = useState(false);

  const uid = ownerId || user?.id;
  const load = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    const [a, c, p, w, n] = await Promise.all([
      supabase.from('voice_agents').select('*').eq('user_id', uid).order('created_at', { ascending: true }),
      supabase.from('voice_calls').select('id,agent_id,agent_label,direction,customer_number,customer_name,started_at,duration_sec,billed_minutes,charge_paise,outcome,summary,when_text,details,end_reason')
        .eq('user_id', uid).order('started_at', { ascending: false }).limit(300),
      supabase.from('message_pricing').select('price_paise').eq('category', 'voice_minute').maybeSingle(),
      supabase.from('wallets').select('balance_paise').eq('user_id', uid).maybeSingle(),
      supabase.from('voice_numbers').select('number, agent_id').eq('user_id', uid),
    ]);
    if (missingTable(a.error) || missingTable(c.error)) { setNotReady(true); setLoading(false); return; }
    setNotReady(false);
    setAgents(a.data || []); setCalls(c.data || []);
    if (p.data?.price_paise != null) setPrice(Number(p.data.price_paise));
    supabase.from('voice_account_settings').select('price_override_paise, calling_enabled').eq('user_id', uid).maybeSingle().then(({ data }) => {
      if (data?.price_override_paise != null) setPrice(Number(data.price_override_paise));
      setAccess(!!data?.calling_enabled);
    });
    setBalance(w.data ? Number(w.data.balance_paise) : null);
    const byAgent = {}; for (const r of n.data || []) if (r.agent_id) (byAgent[r.agent_id] = byAgent[r.agent_id] || []).push(r.number);
    setNumbersByAgent(byAgent);
    outboundStatus(uid).then(setOutbound).catch(() => setOutbound(null));
    setLoading(false);
  }, [uid]);
  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const month = calls.filter((c) => new Date(c.started_at) >= monthStart);
    const mins = month.reduce((s, c) => s + (c.billed_minutes || 0), 0);
    const spend = month.reduce((s, c) => s + (Number(c.charge_paise) || 0), 0);
    const wins = month.filter((c) => SUCCESS.includes(c.outcome)).length;
    return { count: month.length, mins, spend, wins, rate: month.length ? Math.round((wins / month.length) * 100) : 0 };
  }, [calls]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return calls.filter((c) => (agentFilter === 'all' || c.agent_id === agentFilter)
      && (!q || [c.customer_name, c.customer_number, c.summary, c.agent_label].some((v) => String(v || '').toLowerCase().includes(q))));
  }, [calls, search, agentFilter]);

  const del = async (row) => {
    await supabase.from('voice_agents').delete().eq('id', row.id);
    setConfirmDel(null); load();
  };

  // Not active for this business yet: show the request page (admins and the admin setup view always see everything).
  if (!embedded && !isAdmin && access === undefined) return <BrandSpinner label="Loading AI Calling…" />;
  if (!embedded && !isAdmin && access === false) return <AiCallingRequest userId={uid} pricePaise={price} />;

  if (!loading && notReady) {
    return (
      <div className="rp-page" style={{ maxWidth: 900, margin: '0 auto' }}>
        <div className="rp-card" style={{ borderRadius: 18, padding: 40, textAlign: 'center' }}>
          <PhoneCall size={36} style={{ color: ACCENT }} />
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '12px 0 6px', fontFamily: "'Space Grotesk', sans-serif" }}>AI Calling is being set up</h2>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>Your AI voice agents will appear here shortly. Please check back soon.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rp-page" style={{ maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10, fontFamily: "'Space Grotesk', sans-serif", margin: 0 }}>
            <PhoneCall size={24} style={{ color: ACCENT }} /> {embedded ? 'Agents & calls' : 'AI Calling'}
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>AI voice agents that talk to your customers in Hindi, English and Hinglish: book, confirm and follow up.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} className="rp-tap" style={{ ...btn(false), padding: '10px 12px' }} aria-label="Refresh"><RefreshCw size={16} /></button>
          {agents.length > 0 && <button onClick={() => setCalling(true)} className="rp-tap" style={btn(false)}><PhoneForwarded size={16} /> Call a customer</button>}
          <button onClick={() => setEditing({})} className="rp-tap" style={btn(true)}><Plus size={17} /> New agent</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
        <StatCard icon={<PhoneCall size={18} />} label="Calls this month" value={stats.count} color="#3b82f6" />
        <StatCard icon={<Clock size={18} />} label="Minutes" value={stats.mins} color="#8b5cf6" subtitle={`${rupees(price)} per minute`} />
        <StatCard icon={<CheckCircle2 size={18} />} label="Successful" value={stats.wins} color="#10b981" subtitle={`${stats.rate}% booked / confirmed / callback`} />
        <StatCard icon={<IndianRupee size={18} />} label="Spent this month" value={rupees(stats.spend)} color="#f97316" />
        <StatCard icon={<WalletIcon size={18} />} label="Wallet" value={balance == null ? '—' : rupees(balance)} color={ACCENT} subtitle={balance != null && price > 0 ? `≈ ${Math.floor(balance / price)} min of calls` : undefined} />
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[{ id: 'agents', label: `Agents (${agents.length})` }, { id: 'calls', label: `Call logs (${calls.length})` }].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className="rp-tap"
            style={{ padding: '8px 15px', borderRadius: 999, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', border: '1px solid ' + (tab === t.id ? ACCENT : '#e6e8ec'), background: tab === t.id ? ACCENT : '#fff', color: tab === t.id ? '#fff' : '#475569' }}>{t.label}</button>
        ))}
      </div>

      {loading ? <BrandSpinner label="Loading AI Calling…" /> : tab === 'agents' ? (
        agents.length === 0 ? (
          <div className="rp-card" style={{ borderRadius: 16, padding: 44, textAlign: 'center', color: '#64748b' }}>
            <Bot size={34} style={{ color: ACCENT }} />
            <h3 style={{ color: '#0f172a', margin: '10px 0 6px' }}>Create your first AI agent</h3>
            <p style={{ margin: '0 0 16px', fontSize: 14 }}>Tell it about your business in plain words. Then test it right here in your browser.</p>
            <button onClick={() => setEditing({})} style={btn(true)}><Plus size={16} /> New agent</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {agents.map((a) => {
              const n = calls.filter((c) => c.agent_id === a.id).length;
              return (
                <div key={a.id} className="rp-card" style={{ borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: ACCENT + '14', color: ACCENT, display: 'grid', placeItems: 'center', flexShrink: 0 }}><Bot size={20} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                      <div style={{ fontSize: 12.5, color: '#64748b' }}>{a.agent_name} · {VOICES.find((v) => v.id === a.voice)?.hint || a.voice}</div>
                    </div>
                    {!a.is_active && <Pill color="#94a3b8">Paused</Pill>}
                  </div>
                  <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{a.purpose || 'General customer calls'}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <Pill color="#475569">{a.direction === 'inbound' ? <><PhoneIncoming size={11} />Incoming</> : a.direction === 'outbound' ? <><PhoneOutgoing size={11} />Outgoing</> : <><PhoneCall size={11} />In + out</>}</Pill>
                    {(numbersByAgent[a.id] || []).length ? numbersByAgent[a.id].map((num) => <Pill key={num} color="#10b981"><Hash size={11} />+{num}</Pill>) : <Pill color="#94a3b8">No phone number yet</Pill>}
                    <Pill color="#3b82f6">{n} call{n === 1 ? '' : 's'}</Pill>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button onClick={() => setTesting(a)} style={{ ...btn(true), flex: 1, justifyContent: 'center', padding: '9px 12px' }}><Mic size={15} />Test call</button>
                    <button onClick={() => setEditing(a)} style={{ ...btn(false), padding: '9px 12px' }} aria-label="Edit"><Pencil size={15} /></button>
                    <button onClick={() => setConfirmDel(a)} style={{ ...btn(false), padding: '9px 12px', color: '#b91c1c' }} aria-label="Delete"><Trash2 size={15} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
            <select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #e6e8ec', background: '#fff', color: '#475569', fontSize: 13 }}>
              <option value="all">All agents</option>{agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 360 }}>
              <Search size={15} style={{ position: 'absolute', left: 10, top: 10, color: '#94a3b8' }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, number, summary…" style={{ ...inputStyle, padding: '8px 12px 8px 32px', fontSize: 13 }} />
            </div>
          </div>
          {filtered.length === 0 ? (
            <div className="rp-card" style={{ borderRadius: 16, padding: 40, textAlign: 'center', color: '#64748b' }}>
              <FileText size={30} style={{ color: '#94a3b8' }} /><p style={{ margin: '10px 0 0' }}>{calls.length ? 'No calls match your filters.' : 'No calls yet. Make a test call from the Agents tab.'}</p>
            </div>
          ) : (
            <div className="rp-card" style={{ borderRadius: 16, overflow: 'hidden' }}>
              {filtered.map((c, i) => {
                const o = OUTCOME[c.outcome] || (c.outcome ? { label: c.outcome, color: '#94a3b8' } : null);
                const Icon = c.direction === 'in' ? PhoneIncoming : c.direction === 'out' ? PhoneOutgoing : Monitor;
                return (
                  <button key={c.id} onClick={() => setDetail(c)} style={{ display: 'flex', width: '100%', textAlign: 'left', gap: 12, alignItems: 'center', padding: '12px 14px', border: 'none', borderTop: i ? '1px solid #f1f5f9' : 'none', background: '#fff', cursor: 'pointer' }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: '#f1f5f9', color: '#475569', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon size={16} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <b style={{ fontSize: 14, color: '#0f172a' }}>{c.customer_name || (c.customer_number ? '+' + c.customer_number : c.direction === 'web' ? 'Test call' : 'Unknown caller')}</b>
                        {o && <Pill color={o.color}>{o.label}</Pill>}
                      </div>
                      <div style={{ fontSize: 12.5, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.summary || c.agent_label || '—'}</div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 12, color: '#64748b', flexShrink: 0 }}>
                      <div>{fmtWhen(c.started_at)}</div><div>{fmtDur(c.duration_sec)} · {rupees(c.charge_paise)}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {editing && <AgentEditor initial={editing.id ? editing : null} userId={uid} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {testing && <TestCall agent={testing} price={price} onClose={() => { setTesting(null); load(); }} onFinished={load} />}
      {detail && <CallDetail row={detail} onClose={() => setDetail(null)} />}
      {calling && <CallCustomer agents={agents} status={outbound} onClose={() => setCalling(false)} onPlaced={() => setTimeout(load, 4000)} />}
      {confirmDel && (
        <Modal title="Delete agent?" onClose={() => setConfirmDel(null)} width={420}>
          <p style={{ margin: '0 0 16px', color: '#475569', fontSize: 14 }}>"{confirmDel.name}" will be deleted. Its past call logs stay in your history.</p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={() => setConfirmDel(null)} style={btn(false)}>Cancel</button>
            <button onClick={() => del(confirmDel)} style={{ ...btn(true), background: '#b91c1c' }}><Trash2 size={15} />Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
