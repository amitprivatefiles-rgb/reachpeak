// @ts-nocheck
import { BrandSpinner } from './BrandSpinner';
import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Scale, Plus, Search, X, Loader2, RefreshCw, MessageSquare, Clock,
  AlertTriangle, CheckCircle2, XCircle, RotateCcw, Package, IndianRupee,
  TrendingUp, Timer, Flag, ChevronRight, Filter,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const ACCENT = '#E04632';

const TYPES = [
  { id: 'return', label: 'Return' },
  { id: 'exchange', label: 'Exchange' },
  { id: 'refund', label: 'Refund' },
  { id: 'damaged', label: 'Damaged / Defective' },
  { id: 'wrong_item', label: 'Wrong Item' },
  { id: 'missing_item', label: 'Missing Item' },
  { id: 'size_issue', label: 'Size Issue' },
  { id: 'not_delivered', label: 'Not Delivered' },
  { id: 'late_delivery', label: 'Late Delivery' },
  { id: 'quality_issue', label: 'Quality Issue' },
  { id: 'cancellation', label: 'Cancellation' },
  { id: 'other', label: 'Other' },
];
const TYPE_LABEL = Object.fromEntries(TYPES.map(t => [t.id, t.label]));

const TYPE_PHRASE = {
  return: 'return request', exchange: 'exchange request', refund: 'refund request',
  damaged: 'damaged item report', wrong_item: 'wrong item report', missing_item: 'missing item report',
  size_issue: 'size issue', not_delivered: 'delivery issue', late_delivery: 'delivery delay',
  quality_issue: 'quality concern', cancellation: 'cancellation request', other: 'request',
};
// Build the "Request" line the customer sees: type + order + reason (single line, no breaks).
// Map every detail into the 3 vars of the approved UTILITY template dispute_status_update_v2:
//   {{1}} = name, "request for {{2}}", {{3}} = type + reason + the status update.
// {{2}} is just the order ref so it always reads well after "request for" for any dispute type.
function v2Body(name, type, order, reason, message) {
  const nm = (name || 'there').replace(/\s+/g, ' ').trim();
  const orderRef = order ? `order #${order}` : 'your recent order';
  let ctx = TYPE_PHRASE[type] || 'request';
  ctx = ctx.charAt(0).toUpperCase() + ctx.slice(1);
  const r = (reason || '').replace(/\s+/g, ' ').trim();
  if (r) ctx += ` — ${r}`;
  const msg = (message || '').replace(/\s+/g, ' ').trim();
  const detail = (msg ? `${ctx}. ${msg}` : ctx).replace(/\s+/g, ' ').trim();
  return [nm, orderRef, detail];
}

const STATUSES = [
  { id: 'open', label: 'Open', color: '#f59e0b' },
  { id: 'in_progress', label: 'In Progress', color: '#3b82f6' },
  { id: 'awaiting_customer', label: 'Awaiting Customer', color: '#8b5cf6' },
  { id: 'escalated', label: 'Escalated', color: '#ef4444' },
  { id: 'resolved', label: 'Resolved', color: '#10b981' },
  { id: 'rejected', label: 'Rejected', color: '#64748b' },
];
const STATUS_MAP = Object.fromEntries(STATUSES.map(s => [s.id, s]));
const ACTIVE_STATUSES = ['open', 'in_progress', 'awaiting_customer', 'escalated'];

const PRIORITIES = [
  { id: 'low', label: 'Low', color: '#94a3b8' },
  { id: 'normal', label: 'Normal', color: '#3b82f6' },
  { id: 'high', label: 'High', color: '#f59e0b' },
  { id: 'urgent', label: 'Urgent', color: '#ef4444' },
];
const PRIORITY_MAP = Object.fromEntries(PRIORITIES.map(p => [p.id, p]));

const NOTIFY_PRESETS = {
  open: "We've received your request and opened a ticket for it. Our team will look into it shortly.",
  in_progress: "Good news — our team is now actively working on your request. We'll update you soon.",
  awaiting_customer: "We need a little more information to process your request. Could you please share the details?",
  escalated: "Your request has been escalated to our senior team for priority handling. Thank you for your patience.",
  resolved: "Good news — your request has been resolved successfully. Thank you for shopping with us!",
  rejected: "After careful review, we're unable to approve this request. Please reply if you have any questions — we're happy to help.",
};

const RESOLUTION_TYPES = [
  { id: 'refund_issued', label: 'Refund Issued' },
  { id: 'replacement_sent', label: 'Replacement Sent' },
  { id: 'exchanged', label: 'Exchanged' },
  { id: 'store_credit', label: 'Store Credit' },
  { id: 'rejected', label: 'Request Rejected' },
  { id: 'none', label: 'No Action Needed' },
];

function Badge({ color, children }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700,
      color, background: color + '18', padding: '2px 9px', borderRadius: 999 }}>{children}</span>
  );
}

function StatCard({ icon, label, value, color, subtitle }) {
  return (
    <div className="rp-card" style={{ borderRadius: 16, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color, marginBottom: 8 }}>
        {icon}<span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>{label}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{value}</div>
      {subtitle && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>{subtitle}</div>}
    </div>
  );
}

function fmtAge(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3.6e6);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function Disputes({ onNavigate }: { onNavigate?: (p: string) => void }) {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all'); // all | active | <status>
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);
  const [prefill, setPrefill] = useState(null);

  // Prefill from the Inbox "Raise dispute" action.
  useEffect(() => {
    try {
      const raw = localStorage.getItem('rp_new_dispute');
      if (raw) { localStorage.removeItem('rp_new_dispute'); setPrefill(JSON.parse(raw)); setShowCreate(true); }
    } catch {}
  }, []);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('disputes').select('*')
      .eq('user_id', user.id).order('created_at', { ascending: false });
    setDisputes(data || []);
    setLoading(false);
  }, [user]);
  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const now = Date.now();
    const total = disputes.length;
    const active = disputes.filter(d => ACTIVE_STATUSES.includes(d.status)).length;
    const resolved = disputes.filter(d => d.status === 'resolved').length;
    const important = disputes.filter(d => ACTIVE_STATUSES.includes(d.status) && ['high', 'urgent'].includes(d.priority)).length;
    const overdue = disputes.filter(d => ACTIVE_STATUSES.includes(d.status) && d.due_at && new Date(d.due_at).getTime() < now).length;
    const closed = disputes.filter(d => d.status === 'resolved' || d.status === 'rejected');
    const rate = total ? Math.round((resolved / total) * 100) : 0;
    const refunded = disputes.reduce((s, d) => s + (Number(d.refund_amount) || 0), 0);
    // avg resolution time (hours) over resolved
    const resolvedWithTime = disputes.filter(d => d.status === 'resolved' && d.resolved_at);
    const avgH = resolvedWithTime.length
      ? Math.round(resolvedWithTime.reduce((s, d) => s + (new Date(d.resolved_at).getTime() - new Date(d.created_at).getTime()) / 3.6e6, 0) / resolvedWithTime.length)
      : 0;
    return { total, active, resolved, important, overdue, rate, refunded, avgH };
  }, [disputes]);

  const filtered = useMemo(() => {
    let list = disputes;
    if (statusFilter === 'active') list = list.filter(d => ACTIVE_STATUSES.includes(d.status));
    else if (statusFilter !== 'all') list = list.filter(d => d.status === statusFilter);
    if (typeFilter !== 'all') list = list.filter(d => d.dispute_type === typeFilter);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(d =>
      (d.contact_name || '').toLowerCase().includes(q) ||
      (d.contact_phone || '').includes(q) ||
      (d.order_external_id || '').toLowerCase().includes(q) ||
      (d.reason || '').toLowerCase().includes(q));
    return list;
  }, [disputes, statusFilter, typeFilter, search]);

  return (
    <div className="rp-page" style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10, fontFamily: "'Space Grotesk', sans-serif" }}>
            <Scale size={24} style={{ color: ACCENT }} /> Customer Disputes
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>Track returns, exchanges & complaints — resolve faster, keep customers happy.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} className="rp-tap" style={{ padding: '10px 12px', borderRadius: 12, border: '1px solid #e6e8ec', background: '#fff', color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={16} />
          </button>
          <button onClick={() => setShowCreate(true)} className="rp-tap" style={{ padding: '10px 16px', borderRadius: 12, border: 'none', background: ACCENT, color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={17} /> New Dispute
          </button>
        </div>
      </div>

      {/* Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
        <StatCard icon={<Scale size={18} />} label="Total" value={stats.total} color="#8b5cf6" />
        <StatCard icon={<Clock size={18} />} label="Active" value={stats.active} color="#3b82f6" />
        <StatCard icon={<Flag size={18} />} label="Important" value={stats.important} color="#f59e0b" subtitle="high / urgent, open" />
        <StatCard icon={<AlertTriangle size={18} />} label="Overdue" value={stats.overdue} color="#ef4444" subtitle="past due date" />
        <StatCard icon={<CheckCircle2 size={18} />} label="Resolved" value={stats.resolved} color="#10b981" subtitle={`${stats.rate}% resolution rate`} />
        <StatCard icon={<Timer size={18} />} label="Avg Resolve" value={stats.avgH ? `${stats.avgH}h` : '—'} color="#0ea5e9" />
        <StatCard icon={<IndianRupee size={18} />} label="Refunded" value={`₹${stats.refunded.toLocaleString('en-IN')}`} color="#f97316" />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[{ id: 'all', label: 'All' }, { id: 'active', label: 'Active' }, ...STATUSES].map(s => (
            <button key={s.id} onClick={() => setStatusFilter(s.id)} className="rp-tap"
              style={{ padding: '7px 13px', borderRadius: 999, fontSize: 13, fontWeight: 600, border: '1px solid ' + (statusFilter === s.id ? ACCENT : '#e6e8ec'),
                background: statusFilter === s.id ? ACCENT : '#fff', color: statusFilter === s.id ? '#fff' : '#475569' }}>
              {s.label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #e6e8ec', background: '#fff', color: '#475569', fontSize: 13 }}>
          <option value="all">All types</option>
          {TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: 10, color: '#94a3b8' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, phone, order…"
            style={{ padding: '8px 12px 8px 32px', borderRadius: 10, border: '1px solid #e6e8ec', background: '#fff', fontSize: 13, minWidth: 220 }} />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <BrandSpinner label="Loading disputes…" />
      ) : filtered.length === 0 ? (
        <div className="rp-card" style={{ borderRadius: 16, padding: 48, textAlign: 'center', color: '#64748b' }}>
          <Scale size={40} style={{ margin: '0 auto 12px', color: '#cbd5e1' }} />
          <p style={{ fontWeight: 600 }}>No disputes {statusFilter !== 'all' || typeFilter !== 'all' || search ? 'match your filters' : 'yet'}</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Create one when a customer wants a return, exchange or has a complaint.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
          {filtered.map(d => {
            const st = STATUS_MAP[d.status] || STATUSES[0];
            const pr = PRIORITY_MAP[d.priority] || PRIORITIES[1];
            const overdue = ACTIVE_STATUSES.includes(d.status) && d.due_at && new Date(d.due_at).getTime() < Date.now();
            return (
              <div key={d.id} onClick={() => setSelected(d)} className="rp-card rp-tap" style={{ borderRadius: 16, padding: 16, cursor: 'pointer', borderLeft: `3px solid ${st.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.contact_name || d.contact_phone || 'Unknown'}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>{d.contact_phone}</div>
                  </div>
                  <Badge color={st.color}>{st.label}</Badge>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                  <Badge color="#6366f1"><Package size={11} /> {TYPE_LABEL[d.dispute_type] || d.dispute_type}</Badge>
                  {d.order_external_id && <Badge color="#0ea5e9">#{d.order_external_id}</Badge>}
                  <Badge color={pr.color}><Flag size={10} /> {pr.label}</Badge>
                  {overdue && <Badge color="#ef4444"><AlertTriangle size={10} /> Overdue</Badge>}
                  {d.created_by === 'auto' && <Badge color="#8b5cf6">🤖 Auto-detected</Badge>}
                </div>
                {d.reason && <p style={{ fontSize: 13, color: '#475569', marginTop: 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{d.reason}</p>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, fontSize: 12, color: '#94a3b8' }}>
                  <span>{fmtAge(d.created_at)}</span>
                  <ChevronRight size={15} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && <CreateDispute user={user} prefill={prefill} onClose={() => { setShowCreate(false); setPrefill(null); }} onCreated={() => { setShowCreate(false); setPrefill(null); load(); }} />}
      {selected && <DisputeDetail dispute={selected} user={user} onClose={() => setSelected(null)} onChanged={() => { load(); }} onNavigate={onNavigate} />}
    </div>
  );
}

// ─────────── Create Dispute ───────────
function CreateDispute({ user, onClose, onCreated, prefill }) {
  const [contactQuery, setContactQuery] = useState('');
  const [contacts, setContacts] = useState([]);
  const [contact, setContact] = useState(null);
  const [orders, setOrders] = useState([]);
  const [orderId, setOrderId] = useState('');
  const [type, setType] = useState('return');
  const [priority, setPriority] = useState('normal');
  const [reason, setReason] = useState('');
  const [dueDays, setDueDays] = useState('3');
  const [saving, setSaving] = useState(false);
  const [notify, setNotify] = useState(true);
  const [notifyMsg, setNotifyMsg] = useState("We've received your request and our team will look into it shortly. We'll keep you updated here.");

  // Prefill (from Inbox "Raise dispute"): resolve the contact + their orders.
  useEffect(() => {
    if (!prefill?.phone) return;
    let cancelled = false;
    (async () => {
      const { data: c } = await supabase.from('contacts').select('id, name, phone_number')
        .eq('user_id', user.id).eq('phone_number', prefill.phone).maybeSingle();
      if (cancelled) return;
      const cc = c || { id: null, name: prefill.name, phone_number: prefill.phone };
      setContact(cc); setContactQuery(cc.name || cc.phone_number); setContacts([]);
      const { data: o } = await supabase.from('orders').select('external_order_id, total, status, created_at')
        .eq('user_id', user.id).eq('contact_phone', prefill.phone).order('created_at', { ascending: false }).limit(30);
      if (cancelled) return;
      setOrders(o || []);
      setOrderId(prefill.order || (o && o[0]?.external_order_id) || '');
    })();
    return () => { cancelled = true; };
  }, [prefill, user]);

  useEffect(() => {
    const q = contactQuery.trim();
    if (q.length < 2 || contact) { return; }
    let cancel = false;
    (async () => {
      const { data } = await supabase.from('contacts').select('id, name, phone_number')
        .eq('user_id', user.id)
        .or(`name.ilike.%${q}%,phone_number.ilike.%${q}%`).limit(8);
      if (!cancel) setContacts(data || []);
    })();
    return () => { cancel = true; };
  }, [contactQuery, contact, user]);

  const pickContact = async (c) => {
    setContact(c); setContacts([]); setContactQuery(c.name || c.phone_number);
    const { data } = await supabase.from('orders').select('external_order_id, total, status, created_at')
      .eq('user_id', user.id).eq('contact_phone', c.phone_number).order('created_at', { ascending: false }).limit(30);
    setOrders(data || []);
    const o = (data || [])[0];
    setOrderId(o?.external_order_id || '');
  };

  const save = async () => {
    if (!contact) return;
    setSaving(true);
    const ord = orders.find(o => o.external_order_id === orderId);
    const due = dueDays ? new Date(Date.now() + Number(dueDays) * 864e5).toISOString() : null;
    const now = new Date().toISOString();
    const timeline: any[] = [{ at: now, action: 'created', note: `Dispute opened (${TYPE_LABEL[type]})` }];

    // Optionally notify the customer on WhatsApp right away.
    let notifyErr: string | null = null;
    if (notify && notifyMsg.trim() && contact.phone_number) {
      const message = notifyMsg.replace(/\s+/g, ' ').trim();
      try {
        const { data: conv } = await supabase.from('conversations').select('id')
          .eq('user_id', user.id).eq('contact_phone', contact.phone_number).maybeSingle();
        const { error: sErr } = await supabase.functions.invoke('send-message', {
          body: { to: contact.phone_number, type: 'template', template: { name: 'dispute_status_update_v2', language: 'en', bodyParams: v2Body(contact.name, type, orderId, reason, message) }, conversation_id: conv?.id || null },
        });
        if (sErr) throw sErr;
        timeline.push({ at: new Date().toISOString(), action: 'notified', note: `Customer notified on WhatsApp: "${message}"` });
      } catch (e: any) { notifyErr = e?.message || 'could not send'; }
    }

    const { error } = await supabase.from('disputes').insert({
      user_id: user.id,
      contact_id: contact.id, contact_phone: contact.phone_number, contact_name: contact.name,
      order_external_id: orderId || null, order_total: ord?.total ?? null,
      dispute_type: type, priority, reason: reason || null, status: 'open', due_at: due, timeline,
    });
    setSaving(false);
    if (error) { alert('Could not create dispute: ' + error.message); return; }
    if (notifyErr) alert('Dispute created ✓ — but the customer WhatsApp update could not be sent: ' + notifyErr);
    onCreated();
  };

  return (
    <Modal onClose={onClose} title="New Dispute">
      {/* contact */}
      <Field label="Customer">
        <div style={{ position: 'relative' }}>
          <input value={contactQuery} onChange={e => { setContactQuery(e.target.value); setContact(null); }}
            placeholder="Search customer by name or phone…" style={inp} />
          {contacts.length > 0 && !contact && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, background: '#fff', border: '1px solid #e6e8ec', borderRadius: 12, marginTop: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.08)', maxHeight: 220, overflowY: 'auto' }}>
              {contacts.map(c => (
                <div key={c.id} onClick={() => pickContact(c)} className="rp-tap" style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 14 }}>{c.name || 'Unknown'}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>{c.phone_number}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Field>
      {contact && (
        <Field label="Order">
          <select value={orderId} onChange={e => setOrderId(e.target.value)} style={inp}>
            <option value="">— No specific order —</option>
            {orders.map(o => <option key={o.external_order_id} value={o.external_order_id}>#{o.external_order_id} · ₹{o.total} · {o.status}</option>)}
          </select>
          {orders.length === 0 && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>No orders found for this customer.</div>}
        </Field>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Type">
          <select value={type} onChange={e => setType(e.target.value)} style={inp}>{TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select>
        </Field>
        <Field label="Priority">
          <select value={priority} onChange={e => setPriority(e.target.value)} style={inp}>{PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select>
        </Field>
      </div>
      <Field label="Reason / details">
        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="What is the customer's issue?" style={{ ...inp, resize: 'vertical' }} />
      </Field>
      <Field label="Resolve within (days)">
        <input type="number" min="0" value={dueDays} onChange={e => setDueDays(e.target.value)} style={inp} />
      </Field>
      <div style={{ background: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: 12, padding: 12, marginBottom: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, color: '#166534', fontSize: 13.5 }}>
          <input type="checkbox" checked={notify} onChange={e => setNotify(e.target.checked)} style={{ width: 16, height: 16 }} />
          <MessageSquare size={15} /> Notify the customer on WhatsApp now
        </label>
        {notify && (
          <textarea value={notifyMsg} onChange={e => setNotifyMsg(e.target.value)} rows={2} placeholder="Message to send the customer…" style={{ ...inp, resize: 'vertical', marginTop: 8 }} />
        )}
      </div>
      <button onClick={save} disabled={!contact || saving} className="rp-tap"
        style={{ width: '100%', padding: 12, borderRadius: 12, border: 'none', background: contact ? ACCENT : '#cbd5e1', color: '#fff', fontWeight: 700, marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Create Dispute
      </button>
    </Modal>
  );
}

// ─────────── Dispute Detail ───────────
function DisputeDetail({ dispute, user, onClose, onChanged, onNavigate }) {
  const [d, setD] = useState(dispute);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState('');
  const [resolution, setResolution] = useState(d.resolution || '');
  const [resolutionType, setResolutionType] = useState(d.resolution_type || '');
  const [refund, setRefund] = useState(d.refund_amount || '');
  const [notifyMsg, setNotifyMsg] = useState(NOTIFY_PRESETS[d.status] || '');
  const [notifying, setNotifying] = useState(false);
  const st = STATUS_MAP[d.status] || STATUSES[0];

  const patch = async (changes, timelineEntry) => {
    setSaving(true);
    const timeline = [...(d.timeline || [])];
    if (timelineEntry) timeline.push({ at: new Date().toISOString(), ...timelineEntry });
    const body = { ...changes, timeline };
    if (changes.status === 'resolved' && !d.resolved_at) body.resolved_at = new Date().toISOString();
    const { data, error } = await supabase.from('disputes').update(body).eq('id', d.id).select('*').single();
    setSaving(false);
    if (!error && data) { setD(data); onChanged(); }
    else if (error) alert('Update failed: ' + error.message);
  };

  const setStatus = (s) => patch({ status: s }, { action: 'status', note: `Status → ${STATUS_MAP[s]?.label || s}` });
  const saveResolution = () => patch(
    { resolution, resolution_type: resolutionType || null, refund_amount: refund === '' ? null : Number(refund), status: 'resolved' },
    { action: 'resolved', note: `Resolved${resolutionType ? ' · ' + (RESOLUTION_TYPES.find(r => r.id === resolutionType)?.label) : ''}${refund ? ' · ₹' + refund + ' refund' : ''}` }
  );
  const addNote = () => { if (note.trim()) { patch({}, { action: 'note', note: note.trim() }); setNote(''); } };
  const messageCustomer = () => {
    try { localStorage.setItem('rp_open_contact', d.contact_phone); } catch {}
    onNavigate && onNavigate('inbox');
  };
  const notifyCustomer = async () => {
    // WhatsApp body params can't contain line breaks — collapse whitespace.
    const message = notifyMsg.replace(/\s+/g, ' ').trim();
    if (!message) return;
    setNotifying(true);
    try {
      const { data: conv } = await supabase.from('conversations').select('id')
        .eq('user_id', user.id).eq('contact_phone', d.contact_phone).maybeSingle();
      const { error } = await supabase.functions.invoke('send-message', {
        body: {
          to: d.contact_phone,
          type: 'template',
          template: { name: 'dispute_status_update_v2', language: 'en', bodyParams: v2Body(d.contact_name, d.dispute_type, d.order_external_id, d.reason, message) },
          conversation_id: conv?.id || null,
        },
      });
      if (error) throw error;
      await patch({}, { action: 'notified', note: `Customer notified on WhatsApp: "${message}"` });
      alert('✓ Update sent to the customer on WhatsApp.');
    } catch (e: any) {
      alert('Could not send the update: ' + (e?.message || 'the status-update template may still be under review — please try again shortly'));
    } finally { setNotifying(false); }
  };

  return (
    <Modal onClose={onClose} title={
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{d.contact_name || d.contact_phone} <Badge color={st.color}>{st.label}</Badge></span>
    } wide>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        <Badge color="#6366f1"><Package size={11} /> {TYPE_LABEL[d.dispute_type]}</Badge>
        {d.order_external_id && <Badge color="#0ea5e9">Order #{d.order_external_id}</Badge>}
        {d.order_total != null && <Badge color="#10b981">₹{d.order_total}</Badge>}
        <Badge color={(PRIORITY_MAP[d.priority] || PRIORITIES[1]).color}><Flag size={10} /> {(PRIORITY_MAP[d.priority] || PRIORITIES[1]).label}</Badge>
        {d.due_at && <Badge color="#94a3b8"><Clock size={10} /> due {new Date(d.due_at).toLocaleDateString('en-IN')}</Badge>}
      </div>
      {d.reason && <div style={{ background: '#f8fafc', border: '1px solid #eef2f7', borderRadius: 12, padding: 12, fontSize: 14, color: '#334155', marginBottom: 14 }}>{d.reason}</div>}

      {/* Status workflow */}
      <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>UPDATE STATUS</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {STATUSES.map(s => (
          <button key={s.id} onClick={() => setStatus(s.id)} disabled={saving || d.status === s.id} className="rp-tap"
            style={{ padding: '7px 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 600, cursor: d.status === s.id ? 'default' : 'pointer',
              border: '1px solid ' + (d.status === s.id ? s.color : '#e6e8ec'), background: d.status === s.id ? s.color : '#fff', color: d.status === s.id ? '#fff' : '#475569' }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Resolution */}
      <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>RESOLUTION</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <select value={resolutionType} onChange={e => setResolutionType(e.target.value)} style={inp}>
          <option value="">Resolution type…</option>
          {RESOLUTION_TYPES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
        <div style={{ position: 'relative' }}>
          <IndianRupee size={14} style={{ position: 'absolute', left: 10, top: 12, color: '#94a3b8' }} />
          <input type="number" value={refund} onChange={e => setRefund(e.target.value)} placeholder="Refund amount" style={{ ...inp, paddingLeft: 28 }} />
        </div>
      </div>
      <textarea value={resolution} onChange={e => setResolution(e.target.value)} rows={2} placeholder="Resolution notes…" style={{ ...inp, resize: 'vertical', marginBottom: 8 }} />
      <button onClick={saveResolution} disabled={saving} className="rp-tap" style={{ padding: '9px 16px', borderRadius: 10, border: 'none', background: '#10b981', color: '#fff', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <CheckCircle2 size={15} /> Save & Mark Resolved
      </button>

      {/* Message customer */}
      <button onClick={messageCustomer} className="rp-tap" style={{ marginLeft: 8, padding: '9px 16px', borderRadius: 10, border: '1px solid ' + ACCENT, background: '#fff', color: ACCENT, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <MessageSquare size={15} /> Message customer
      </button>

      {/* Notify customer over WhatsApp */}
      <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', margin: '18px 0 6px' }}>NOTIFY CUSTOMER ON WHATSAPP</div>
      <textarea value={notifyMsg} onChange={e => setNotifyMsg(e.target.value)} rows={2} placeholder="Update to send the customer…" style={{ ...inp, resize: 'vertical', marginBottom: 8 }} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={notifyCustomer} disabled={notifying || !notifyMsg.trim()} className="rp-tap"
          style={{ padding: '9px 16px', borderRadius: 10, border: 'none', background: '#25D366', color: '#fff', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {notifying ? <Loader2 size={15} className="animate-spin" /> : <MessageSquare size={15} />} Send WhatsApp update
        </button>
        <button onClick={() => setNotifyMsg(NOTIFY_PRESETS[d.status] || '')} className="rp-tap"
          style={{ padding: '9px 12px', borderRadius: 10, border: '1px solid #e6e8ec', background: '#fff', color: '#64748b', fontWeight: 600, fontSize: 13 }}>
          Suggested for “{st.label}”
        </button>
      </div>

      {/* Timeline */}
      <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', margin: '18px 0 8px' }}>ACTIVITY</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="Add an internal note…" style={inp} onKeyDown={e => e.key === 'Enter' && addNote()} />
        <button onClick={addNote} className="rp-tap" style={{ padding: '0 16px', borderRadius: 10, border: '1px solid #e6e8ec', background: '#fff', color: '#475569', fontWeight: 600 }}>Add</button>
      </div>
      <div style={{ borderLeft: '2px solid #eef2f7', paddingLeft: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[...(d.timeline || [])].reverse().map((t, i) => (
          <div key={i} style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: -19, top: 4, width: 8, height: 8, borderRadius: 999, background: ACCENT }} />
            <div style={{ fontSize: 13, color: '#334155' }}>{t.note}</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>{new Date(t.at).toLocaleString('en-IN')}</div>
          </div>
        ))}
        {(!d.timeline || d.timeline.length === 0) && <div style={{ fontSize: 13, color: '#94a3b8' }}>No activity yet.</div>}
      </div>
    </Modal>
  );
}

// ─────────── shared modal + fields ───────────
const inp = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #e6e8ec', background: '#fff', fontSize: 14, color: '#0f172a', outline: 'none' };
function Field({ label, children }) {
  return <div style={{ marginBottom: 12 }}><label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#475569', marginBottom: 5 }}>{label}</label>{children}</div>;
}
function Modal({ title, children, onClose, wide }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', zIndex: 60, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 16, overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} className="rp-card" style={{ borderRadius: 20, padding: 22, width: '100%', maxWidth: wide ? 620 : 460, marginTop: 40, marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', fontFamily: "'Space Grotesk', sans-serif" }}>{title}</h3>
          <button onClick={onClose} className="rp-tap" style={{ color: '#94a3b8' }}><X size={22} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
