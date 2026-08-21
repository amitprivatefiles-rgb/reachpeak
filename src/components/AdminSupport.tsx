// @ts-nocheck
import { useEffect, useState, useCallback } from 'react';
import { LifeBuoy, Loader2, Phone, Ticket, RefreshCw, MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

const brand = '#E04632';
const card = { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14, padding: 20 };
const sel = { padding: '6px 10px', borderRadius: 7, border: '1px solid #334155', background: '#0b1220', color: '#e2e8f0', fontSize: 12.5 };

const TICKET_STATUSES = ['open', 'in_progress', 'resolved', 'closed'];
const CALLBACK_STATUSES = ['requested', 'contacted', 'done', 'cancelled'];

export function AdminSupport() {
  const [tab, setTab] = useState<'tickets' | 'callbacks'>('tickets');
  const [tickets, setTickets] = useState<any[]>([]);
  const [callbacks, setCallbacks] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [l, s] = await Promise.all([
      supabase.functions.invoke('admin-support', { body: { action: 'list', kind: 'all' } }),
      supabase.functions.invoke('admin-support', { body: { action: 'stats' } }),
    ]);
    setTickets(l.data?.tickets || []);
    setCallbacks(l.data?.callbacks || []);
    setStats(s.data || {});
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const updateTicket = async (id: string, patch: any) => {
    setTickets(ts => ts.map(t => t.id === id ? { ...t, ...patch } : t));
    await supabase.functions.invoke('admin-support', { body: { action: 'update_ticket', id, ...patch } });
    load();
  };
  const updateCallback = async (id: string, patch: any) => {
    setCallbacks(cs => cs.map(c => c.id === id ? { ...c, ...patch } : c));
    await supabase.functions.invoke('admin-support', { body: { action: 'update_callback', id, ...patch } });
    load();
  };

  const Stat = ({ label, value, color }: any) => (
    <div style={{ ...card, padding: 16, flex: 1, minWidth: 140 }}>
      <p style={{ margin: 0, fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      <p style={{ margin: '6px 0 0', fontSize: 28, fontWeight: 800, color }}>{value ?? 0}</p>
    </div>
  );

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg,${brand},#c83b27)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LifeBuoy size={20} color="white" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#f1f5f9' }}>Support console</h2>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Tickets & callback requests from your customers.</p>
          </div>
        </div>
        <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#0b1220', border: '1px solid #334155', color: '#cbd5e1', borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer' }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <Stat label="Open tickets" value={stats.open_tickets} color="#3b82f6" />
        <Stat label="Pending callbacks" value={stats.pending_callbacks} color="#f59e0b" />
        <Stat label="Queued messages" value={stats.queued_notifications} color="#a78bfa" />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[['tickets', `Tickets (${tickets.length})`, Ticket], ['callbacks', `Callbacks (${callbacks.length})`, Phone]].map(([id, label, Icon]: any) => (
          <button key={id} onClick={() => setTab(id)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 9, fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
            border: `1px solid ${tab === id ? brand : '#334155'}`, background: tab === id ? 'rgba(224,70,50,0.12)' : '#0b1220', color: tab === id ? brand : '#94a3b8' }}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: brand }} /></div>
      ) : tab === 'tickets' ? (
        tickets.length === 0 ? <p style={{ color: '#64748b', fontSize: 14 }}>No tickets yet.</p> :
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tickets.map(t => (
            <div key={t.id} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>{t.subject}</p>
                  <p style={{ margin: '6px 0 0', fontSize: 13, color: '#cbd5e1', lineHeight: 1.6 }}>{t.message}</p>
                  <p style={{ margin: '8px 0 0', fontSize: 11.5, color: '#64748b' }}>
                    {t.category} · {t.contact_phone ? `📞 ${t.contact_phone} · ` : ''}{new Date(t.created_at).toLocaleString('en-IN')}
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                  <select style={sel} value={t.status} onChange={e => updateTicket(t.id, { status: e.target.value })}>
                    {TICKET_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                  <select style={sel} value={t.priority} onChange={e => updateTicket(t.id, { priority: e.target.value })}>
                    {['low', 'normal', 'high', 'urgent'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {t.contact_phone && (
                    <a href={`https://wa.me/${t.contact_phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#25D366', textDecoration: 'none' }}>
                      <MessageCircle size={13} /> Reply on WhatsApp
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        callbacks.length === 0 ? <p style={{ color: '#64748b', fontSize: 14 }}>No callback requests yet.</p> :
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {callbacks.map(c => (
            <div key={c.id} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>{c.name || 'Customer'} · {c.phone}</p>
                  {c.reason && <p style={{ margin: '6px 0 0', fontSize: 13, color: '#cbd5e1' }}>{c.reason}</p>}
                  <p style={{ margin: '8px 0 0', fontSize: 11.5, color: '#64748b' }}>
                    {c.preferred_time ? `⏰ ${c.preferred_time} · ` : ''}{new Date(c.created_at).toLocaleString('en-IN')}
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                  <select style={sel} value={c.status} onChange={e => updateCallback(c.id, { status: e.target.value })}>
                    {CALLBACK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <a href={`tel:+${c.phone.replace(/[^0-9]/g, '')}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: brand, textDecoration: 'none' }}>
                    <Phone size={13} /> Call now
                  </a>
                  <a href={`https://wa.me/${c.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#25D366', textDecoration: 'none' }}>
                    <MessageCircle size={13} /> WhatsApp
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
