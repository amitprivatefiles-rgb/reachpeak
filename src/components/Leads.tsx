// @ts-nocheck
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Inbox as InboxIcon, Plus, RefreshCw, Search, X, Check, Users, Sparkles, Trophy, Clock, Code2, Copy, Trash2, PhoneCall } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BrandSpinner } from './BrandSpinner';

const ACCENT = '#E04632';
const STATUSES = [
  { id: 'new', label: 'New', color: '#3b82f6' },
  { id: 'contacted', label: 'Contacted', color: '#8b5cf6' },
  { id: 'qualified', label: 'Qualified', color: '#f59e0b' },
  { id: 'won', label: 'Won', color: '#10b981' },
  { id: 'lost', label: 'Lost', color: '#94a3b8' },
];
const STATUS = Object.fromEntries(STATUSES.map((s) => [s.id, s]));
const API_URL = `${(import.meta.env.VITE_SUPABASE_URL || 'https://xykynbfsogwxecqzhfdm.supabase.co').replace(/\/+$/, '')}/functions/v1/ingest-event`;

const fmtAge = (iso) => { const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000); if (m < 1) return 'just now'; if (m < 60) return `${m} min ago`; const h = Math.round(m / 60); if (h < 24) return `${h} h ago`; return `${Math.round(h / 24)} d ago`; };
const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', fontSize: 14, color: '#0f172a', boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 };
const btn = (primary) => ({ padding: '10px 16px', borderRadius: 12, border: primary ? 'none' : '1px solid #e6e8ec', background: primary ? ACCENT : '#fff', color: primary ? '#fff' : '#475569', fontWeight: primary ? 700 : 600, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 });
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
function Modal({ title, onClose, children, width = 560 }) {
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 60, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '5vh 12px', overflowY: 'auto' }}>
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

function LeadEditor({ lead, userId, onClose, onSaved }) {
  const [f, setF] = useState(() => ({ name: lead?.name || '', phone: lead?.phone || '', email: lead?.email || '', source: lead?.source || 'Manual', interest: lead?.interest || '', status: lead?.status || 'new', notes: lead?.notes || '' }));
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    setErr('');
    const digits = f.phone.replace(/\D/g, '');
    if (!f.name.trim() && !digits) return setErr('Add at least a name or a phone number.');
    if (digits && !(digits.length === 10 || (digits.length >= 11 && digits.length <= 15))) return setErr('Please enter a valid phone number, e.g. 98765 43210.');
    setSaving(true);
    const row = { name: f.name.trim() || null, phone: digits || null, email: f.email.trim() || null, source: f.source.trim().slice(0, 60) || 'Manual', interest: f.interest.trim() || null, status: f.status, notes: f.notes };
    const { error } = lead?.id ? await supabase.from('leads').update(row).eq('id', lead.id) : await supabase.from('leads').insert({ ...row, user_id: userId });
    setSaving(false);
    if (error) return setErr(error.code === '23505' ? 'A lead with this phone number already exists.' : 'Could not save: ' + error.message);
    onSaved();
  };
  return (
    <Modal title={lead?.id ? 'Lead details' : 'Add a lead'} onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        <div><label style={labelStyle}>Name</label><input style={inputStyle} value={f.name} onChange={set('name')} maxLength={120} placeholder="e.g. Rahul Sharma" /></div>
        <div><label style={labelStyle}>Phone (WhatsApp)</label><input style={inputStyle} value={f.phone} onChange={set('phone')} inputMode="tel" placeholder="e.g. 98765 43210" /></div>
        <div><label style={labelStyle}>Email</label><input style={inputStyle} value={f.email} onChange={set('email')} maxLength={200} placeholder="optional" /></div>
        <div><label style={labelStyle}>Source</label><input style={inputStyle} value={f.source} onChange={set('source')} maxLength={60} placeholder="e.g. Instagram, Walk-in, Referral" /></div>
        <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Interested in</label><input style={inputStyle} value={f.interest} onChange={set('interest')} maxLength={300} placeholder="e.g. 2BHK in Rajarhat, NEET coaching, Hair spa" /></div>
        <div><label style={labelStyle}>Status</label>
          <select style={inputStyle} value={f.status} onChange={set('status')}>{STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></div>
        <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Notes</label><textarea style={{ ...inputStyle, minHeight: 80 }} value={f.notes} onChange={set('notes')} maxLength={4000} /></div>
      </div>
      {!lead?.id && <p style={{ fontSize: 12, color: '#64748b', margin: '10px 0 0' }}>If you have a "New Lead" journey switched on, this person gets your WhatsApp reply right away.</p>}
      {lead?.payload && Object.keys(lead.payload).filter((k) => !['manual', 'lead_id'].includes(k)).length > 0 && (
        <details style={{ marginTop: 12, fontSize: 12, color: '#475569' }}><summary style={{ cursor: 'pointer' }}>Form / API data</summary>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#f8fafc', padding: 10, borderRadius: 10, marginTop: 6 }}>{JSON.stringify(lead.payload, null, 2)}</pre></details>
      )}
      {err && <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 10, background: '#fef2f2', color: '#b91c1c', fontSize: 13 }}>{err}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        <button onClick={onClose} style={btn(false)}>Cancel</button>
        <button onClick={save} disabled={saving} style={{ ...btn(true), opacity: saving ? 0.7 : 1 }}><Check size={16} />{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </Modal>
  );
}

function CaptureHelp({ onClose, onNavigate }) {
  const sample = `curl -X POST ${API_URL} \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "event_type": "lead_created",
    "dedupe_key": "form-123",
    "contact": { "name": "Rahul Sharma", "phone": "9876543210" },
    "payload": { "source": "Website form", "interest": "Free consultation", "email": "rahul@example.com" }
  }'`;
  const [copied, setCopied] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(sample); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ } };
  return (
    <Modal title="Get leads in automatically" onClose={onClose} width={680}>
      <ol style={{ margin: 0, paddingLeft: 18, color: '#334155', fontSize: 14, lineHeight: 1.6 }}>
        <li>Create an API key in <button onClick={() => { onClose(); onNavigate?.('integrations'); }} style={{ border: 'none', background: 'none', color: ACCENT, fontWeight: 700, cursor: 'pointer', padding: 0 }}>Integrations → API keys</button>.</li>
        <li>Send each new enquiry (website form, Facebook/Instagram lead ad via Zapier/Make, Google Sheets, your CRM) to this address:</li>
      </ol>
      <div style={{ position: 'relative', marginTop: 10 }}>
        <pre style={{ margin: 0, background: '#0f172a', color: '#e2e8f0', padding: 14, borderRadius: 12, fontSize: 12, overflowX: 'auto' }}>{sample}</pre>
        <button onClick={copy} style={{ position: 'absolute', top: 8, right: 8, ...btn(false), padding: '6px 10px', fontSize: 12 }}>{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? 'Copied' : 'Copy'}</button>
      </div>
      <p style={{ fontSize: 13, color: '#475569', margin: '12px 0 0' }}>Each lead appears here instantly, repeat enquiries from the same number are merged, and your "New Lead" journey can reply on WhatsApp within seconds. Use a unique <code>dedupe_key</code> per enquiry (e.g. the form submission ID).</p>
      <p style={{ fontSize: 13, color: '#475569', margin: '8px 0 0' }}>Appointments and payments work the same way: send <code>appointment_booked</code> (with <code>payload.appointment_at</code>), <code>appointment_missed</code>, <code>appointment_completed</code>, <code>payment_due</code> (with <code>payload.due_date</code>), <code>payment_overdue</code> or <code>renewal_due</code> (with <code>payload.renewal_date</code>), and the matching journeys run.</p>
    </Modal>
  );
}

export function Leads({ onNavigate }: { onNavigate?: (p: string) => void }) {
  const { user } = useAuth();
  const uid = user?.id;
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notReady, setNotReady] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);

  const load = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    const { data, error } = await supabase.from('leads').select('*').eq('user_id', uid).order('last_activity_at', { ascending: false }).limit(1000);
    if (missingTable(error)) { setNotReady(true); setLoading(false); return; }
    setLeads(data || []); setLoading(false);
  }, [uid]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!uid) return;
    const ch = supabase.channel('leads-live').on('postgres_changes', { event: '*', schema: 'public', table: 'leads', filter: `user_id=eq.${uid}` }, () => load()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [uid, load]);

  const stats = useMemo(() => {
    const week = Date.now() - 7 * 864e5, day = new Date(); day.setHours(0, 0, 0, 0);
    const won = leads.filter((l) => l.status === 'won').length, closed = leads.filter((l) => ['won', 'lost'].includes(l.status)).length;
    return {
      today: leads.filter((l) => new Date(l.created_at) >= day).length,
      week: leads.filter((l) => new Date(l.created_at).getTime() >= week).length,
      open: leads.filter((l) => ['new', 'contacted', 'qualified'].includes(l.status)).length,
      won, rate: closed ? Math.round((won / closed) * 100) : 0,
    };
  }, [leads]);
  const sources = useMemo(() => [...new Set(leads.map((l) => l.source).filter(Boolean))].sort(), [leads]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => (statusFilter === 'all' || l.status === statusFilter) && (sourceFilter === 'all' || l.source === sourceFilter)
      && (!q || [l.name, l.phone, l.email, l.interest, l.notes].some((v) => String(v || '').toLowerCase().includes(q))));
  }, [leads, statusFilter, sourceFilter, search]);

  const setStatus = async (lead, status) => {
    setLeads((ls) => ls.map((l) => (l.id === lead.id ? { ...l, status } : l)));
    await supabase.from('leads').update({ status }).eq('id', lead.id);
  };
  const del = async (lead) => { await supabase.from('leads').delete().eq('id', lead.id); setConfirmDel(null); load(); };

  if (!loading && notReady) {
    return <div className="rp-page" style={{ maxWidth: 900, margin: '0 auto' }}><div className="rp-card" style={{ borderRadius: 18, padding: 40, textAlign: 'center' }}><InboxIcon size={34} style={{ color: ACCENT }} /><h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '12px 0 6px' }}>Leads are being set up</h2><p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>Please check back shortly.</p></div></div>;
  }

  return (
    <div className="rp-page" style={{ maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10, fontFamily: "'Space Grotesk', sans-serif", margin: 0 }}><InboxIcon size={24} style={{ color: ACCENT }} /> Leads</h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>Every enquiry in one place: forms, ads, calls and walk-ins. Reply first, win more.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={load} style={{ ...btn(false), padding: '10px 12px' }} aria-label="Refresh"><RefreshCw size={16} /></button>
          <button onClick={() => setShowHelp(true)} style={btn(false)}><Code2 size={16} /> Connect forms & ads</button>
          <button onClick={() => setEditing({})} style={btn(true)}><Plus size={17} /> Add lead</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
        <StatCard icon={<Sparkles size={18} />} label="New today" value={stats.today} color="#3b82f6" subtitle={`${stats.week} this week`} />
        <StatCard icon={<Clock size={18} />} label="Open leads" value={stats.open} color="#8b5cf6" subtitle="new, contacted, qualified" />
        <StatCard icon={<Trophy size={18} />} label="Won" value={stats.won} color="#10b981" subtitle={`${stats.rate}% of closed leads`} />
        <StatCard icon={<Users size={18} />} label="All leads" value={leads.length} color={ACCENT} />
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        {[{ id: 'all', label: 'All' }, ...STATUSES].map((s) => (
          <button key={s.id} onClick={() => setStatusFilter(s.id)} style={{ padding: '7px 13px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1px solid ' + (statusFilter === s.id ? ACCENT : '#e6e8ec'), background: statusFilter === s.id ? ACCENT : '#fff', color: statusFilter === s.id ? '#fff' : '#475569' }}>{s.label}</button>
        ))}
        <div style={{ flex: 1 }} />
        {sources.length > 1 && (
          <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #e6e8ec', background: '#fff', color: '#475569', fontSize: 13 }}>
            <option value="all">All sources</option>{sources.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 320 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: 10, color: '#94a3b8' }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone, interest…" style={{ ...inputStyle, padding: '8px 12px 8px 32px', fontSize: 13 }} />
        </div>
      </div>

      {loading ? <BrandSpinner label="Loading leads…" /> : filtered.length === 0 ? (
        <div className="rp-card" style={{ borderRadius: 16, padding: 44, textAlign: 'center', color: '#64748b' }}>
          <InboxIcon size={32} style={{ color: '#94a3b8' }} />
          <h3 style={{ color: '#0f172a', margin: '10px 0 6px' }}>{leads.length ? 'No leads match your filters' : 'No leads yet'}</h3>
          {!leads.length && <p style={{ margin: '0 0 16px', fontSize: 14 }}>Add one by hand, or connect your website form and ads so enquiries land here automatically.</p>}
          {!leads.length && <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}><button onClick={() => setShowHelp(true)} style={btn(false)}><Code2 size={16} /> Connect forms & ads</button><button onClick={() => setEditing({})} style={btn(true)}><Plus size={16} /> Add lead</button></div>}
        </div>
      ) : (
        <div className="rp-card" style={{ borderRadius: 16, overflow: 'hidden' }}>
          {filtered.map((l, i) => {
            const st = STATUS[l.status] || STATUS.new;
            return (
              <div key={l.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 14px', borderTop: i ? '1px solid #f1f5f9' : 'none', flexWrap: 'wrap' }}>
                <button onClick={() => setEditing(l)} style={{ flex: '1 1 240px', minWidth: 0, textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <b style={{ fontSize: 14, color: '#0f172a' }}>{l.name || (l.phone ? '+' + l.phone : 'Unknown')}</b>
                    {l.created_by === 'call' && <Pill color="#8b5cf6"><PhoneCall size={11} />AI call</Pill>}
                    {l.enquiry_count > 1 && <Pill color="#f59e0b">{l.enquiry_count} enquiries</Pill>}
                  </div>
                  <div style={{ fontSize: 12.5, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {[l.phone && '+' + l.phone, l.interest, l.source].filter(Boolean).join(' · ')}
                  </div>
                </button>
                <div style={{ fontSize: 12, color: '#94a3b8', minWidth: 70, textAlign: 'right' }}>{fmtAge(l.last_activity_at || l.created_at)}</div>
                <select value={l.status} onChange={(e) => setStatus(l, e.target.value)} aria-label="Lead status"
                  style={{ padding: '6px 10px', borderRadius: 999, border: '1px solid ' + st.color + '55', background: st.color + '14', color: st.color, fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}>
                  {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
                <button onClick={() => setConfirmDel(l)} aria-label="Delete lead" style={{ border: 'none', background: 'none', color: '#cbd5e1', cursor: 'pointer', padding: 4 }}><Trash2 size={16} /></button>
              </div>
            );
          })}
        </div>
      )}

      {editing && <LeadEditor lead={editing.id ? editing : null} userId={uid} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {showHelp && <CaptureHelp onClose={() => setShowHelp(false)} onNavigate={onNavigate} />}
      {confirmDel && (
        <Modal title="Delete lead?" onClose={() => setConfirmDel(null)} width={420}>
          <p style={{ margin: '0 0 16px', color: '#475569', fontSize: 14 }}>{confirmDel.name || '+' + confirmDel.phone} will be removed from your leads.</p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={() => setConfirmDel(null)} style={btn(false)}>Cancel</button>
            <button onClick={() => del(confirmDel)} style={{ ...btn(true), background: '#b91c1c' }}><Trash2 size={15} />Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
