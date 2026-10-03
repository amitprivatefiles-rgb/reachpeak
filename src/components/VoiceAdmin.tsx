// @ts-nocheck
// Admin-only control room for AI Calling on Plivo: connect the account, set up the Plivo app,
// sync/link/assign numbers, per-account calling rules, all calls, and the operator manual.
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  PhoneCall, PlugZap, Hash, Users, ListChecks, BookOpen, RefreshCw, Check, X, ShieldCheck, KeyRound, Link2,
  AlertTriangle, CheckCircle2, Circle, Loader2, Save, Server, IndianRupee, PhoneIncoming, PhoneOutgoing, Monitor,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { BrandSpinner } from './BrandSpinner';
import { VoiceManual } from './VoiceManual';
import { VoiceAgents } from './VoiceAgents';

const ACCENT = '#E04632';
const card = { borderRadius: 16, padding: 18 };
const inputStyle = { width: '100%', padding: '9px 11px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', fontSize: 13.5, color: '#0f172a', boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 5 };
const hint = { fontSize: 12, color: '#64748b', margin: '4px 0 0', lineHeight: 1.45 };
const btn = (kind = 'ghost') => ({
  padding: '9px 14px', borderRadius: 11, fontWeight: 700, fontSize: 13.5, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
  border: kind === 'primary' || kind === 'danger' ? 'none' : '1px solid #e2e8f0',
  background: kind === 'primary' ? ACCENT : kind === 'danger' ? '#b91c1c' : '#fff', color: kind === 'primary' || kind === 'danger' ? '#fff' : '#334155',
});
const rupees = (p) => (p == null ? '—' : '₹' + (Number(p) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 }));
const fmtDur = (s) => { s = Number(s) || 0; return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const fmtWhen = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—');

async function adminVoice(action, extra = {}) {
  const { data, error } = await supabase.functions.invoke('admin-voice', { body: { action, ...extra } });
  if (error) {
    let msg = error.message;
    try { const b = await error.context?.json?.(); if (b?.error) msg = b.error; } catch { /* ignore */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

function Pill({ color, children }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color, background: color + '18', padding: '2px 9px', borderRadius: 999, whiteSpace: 'nowrap' }}>{children}</span>;
}
function Notice({ kind = 'info', children }) {
  const c = kind === 'error' ? ['#fef2f2', '#b91c1c'] : kind === 'ok' ? ['#ecfdf5', '#047857'] : ['#f1f5f9', '#334155'];
  return <div style={{ padding: '10px 12px', borderRadius: 10, background: c[0], color: c[1], fontSize: 13, marginTop: 10 }}>{children}</div>;
}

// ── Connection ──
function ConnectionTab({ status, reload }) {
  const [authId, setAuthId] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);
  const [editCreds, setEditCreds] = useState(false);
  const [confirmRotate, setConfirmRotate] = useState(false);
  const run = async (name, fn, okText) => {
    setBusy(name); setMsg(null);
    try { const r = await fn(); setMsg({ kind: 'ok', text: typeof okText === 'function' ? okText(r) : okText }); await reload(); }
    catch (e) { setMsg({ kind: 'error', text: e.message }); }
    setBusy('');
  };
  const s = status || {};
  const h = s.health || {};
  const steps = [
    { done: !!s.connected, label: 'Plivo account connected' },
    { done: !!s.plivo_app_id, label: 'Plivo app set up (answer + hangup URLs)' },
    { done: (s.numbers_linked || 0) > 0, label: 'At least one number linked to the app' },
    { done: (s.numbers_assigned || 0) > 0, label: 'A number assigned to an account + agent' },
    { done: !!h.ok && !!h.dial, label: 'Voice server online and able to dial' },
  ];
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className="rp-card" style={card}>
        <h3 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Setup progress</h3>
        <div style={{ display: 'grid', gap: 8 }}>
          {steps.map((st, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: st.done ? '#047857' : '#475569' }}>
              {st.done ? <CheckCircle2 size={17} /> : <Circle size={17} color="#cbd5e1" />}<span>{i + 1}. {st.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rp-card" style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}><KeyRound size={17} color={ACCENT} /> Plivo account</h3>
          {s.connected ? <Pill color="#10b981"><Check size={11} />Connected</Pill> : <Pill color="#f59e0b">Not connected</Pill>}
        </div>
        {s.connected && !editCreds ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10, marginTop: 12, fontSize: 13.5 }}>
              <div><div style={labelStyle}>Account</div>{s.account_name || '—'}</div>
              <div><div style={labelStyle}>Auth ID</div>{s.auth_id || '—'}</div>
              <div><div style={labelStyle}>Plivo balance</div>{s.cash_credits != null ? `$${Number(s.cash_credits).toFixed(2)}` : '—'}</div>
              <div><div style={labelStyle}>Last checked</div>{fmtWhen(s.last_verified_at)}</div>
            </div>
            {s.last_error && <Notice kind="error">Last check failed: {s.last_error}</Notice>}
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <button style={btn()} disabled={!!busy} onClick={() => run('verify', () => adminVoice('verify'), 'Plivo account checked.')}>{busy === 'verify' ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}Check now</button>
              <button style={btn()} onClick={() => setEditCreds(true)}><KeyRound size={15} />Change credentials</button>
            </div>
          </>
        ) : (
          <div style={{ marginTop: 12 }}>
            <p style={hint}>Plivo console → <b>Overview</b> page → copy <b>Auth ID</b> and <b>Auth Token</b>. The token is stored encrypted and never shown again.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginTop: 10 }}>
              <div><label style={labelStyle}>Auth ID</label><input style={inputStyle} value={authId} onChange={(e) => setAuthId(e.target.value.trim())} placeholder="e.g. MAXXXXXXXXXXXXXXXXXX" autoComplete="off" /></div>
              <div><label style={labelStyle}>Auth Token</label><input style={inputStyle} type="password" value={token} onChange={(e) => setToken(e.target.value.trim())} placeholder="paste token" autoComplete="new-password" /></div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button style={btn('primary')} disabled={!authId || !token || !!busy}
                onClick={() => run('save', () => adminVoice('save_credentials', { auth_id: authId, auth_token: token }), (r) => { setToken(''); setEditCreds(false); return `Connected to ${r.account_name || 'Plivo'}.`; })}>
                {busy === 'save' ? <Loader2 size={15} className="animate-spin" /> : <PlugZap size={15} />}Connect Plivo
              </button>
              {editCreds && <button style={btn()} onClick={() => { setEditCreds(false); setToken(''); }}>Cancel</button>}
            </div>
          </div>
        )}
      </div>

      <div className="rp-card" style={card}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}><Link2 size={17} color={ACCENT} /> Plivo app (webhooks)</h3>
        <p style={hint}>One Plivo Application holds our answer and hangup URLs. Every number you link to it is answered by ReachPeak AI.</p>
        <div style={{ display: 'grid', gap: 6, marginTop: 10, fontSize: 13 }}>
          <div><b>App ID:</b> {s.plivo_app_id || <span style={{ color: '#94a3b8' }}>not created yet</span>}</div>
          {s.webhooks && <><div style={{ wordBreak: 'break-all' }}><b>Answer URL:</b> <code>{s.webhooks.answer_url}</code></div><div style={{ wordBreak: 'break-all' }}><b>Hangup URL:</b> <code>{s.webhooks.hangup_url}</code></div></>}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <button style={btn('primary')} disabled={!s.connected || !!busy} onClick={() => run('app', () => adminVoice('setup_app'), (r) => `Plivo app ready (${r.app_id}).`)}>
            {busy === 'app' ? <Loader2 size={15} className="animate-spin" /> : <Link2 size={15} />}{s.plivo_app_id ? 'Re-apply app settings' : 'Set up Plivo app'}
          </button>
          {s.plivo_app_id && !confirmRotate && <button style={btn()} disabled={!!busy} onClick={() => setConfirmRotate(true)}><KeyRound size={15} />Rotate webhook secret</button>}
          {confirmRotate && (
            <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
              Calls in progress may drop. Continue?
              <button style={btn('danger')} onClick={() => { setConfirmRotate(false); run('rotate', () => adminVoice('rotate_secret'), 'Secret rotated and Plivo app updated.'); }}>Rotate</button>
              <button style={btn()} onClick={() => setConfirmRotate(false)}>No</button>
            </span>
          )}
        </div>
      </div>

      <div className="rp-card" style={card}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}><Server size={17} color={ACCENT} /> Voice server & security</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
          <Pill color={h.ok ? '#10b981' : '#ef4444'}>{h.ok ? 'Server online' : 'Server unreachable'}</Pill>
          <Pill color={h.dial ? '#10b981' : '#f59e0b'}>{h.dial ? 'Can place calls' : 'Cannot place calls yet'}</Pill>
          <Pill color="#475569">{h.phoneActive ?? 0} phone calls live</Pill>
          <Pill color="#475569">{h.active ?? 0} web calls live</Pill>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 13.5, color: '#334155', cursor: 'pointer' }}>
          <input type="checkbox" checked={!!s.strict_signatures} disabled={!!busy}
            onChange={(e) => run('strict', () => adminVoice('set_strict', { on: e.target.checked }), e.target.checked ? 'Strict signatures ON: unsigned webhooks are rejected.' : 'Strict signatures OFF.')} />
          <ShieldCheck size={16} /> Reject webhooks without a valid Plivo signature (turn on after the first successful real call)
        </label>
      </div>
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
    </div>
  );
}

// ── Numbers ──
function NumbersTab({ status, numbers, accounts, agents, reload }) {
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);
  const [drafts, setDrafts] = useState({});
  const acctName = (id) => accounts.find((a) => a.id === id)?.full_name || accounts.find((a) => a.id === id)?.email || '—';
  const sync = async () => {
    setBusy('sync'); setMsg(null);
    try { const r = await adminVoice('sync_numbers'); setMsg({ kind: 'ok', text: `Found ${r.found} number(s) on Plivo.` }); await reload(); }
    catch (e) { setMsg({ kind: 'error', text: e.message }); }
    setBusy('');
  };
  const link = async (n) => {
    setBusy('link:' + n); setMsg(null);
    try { await adminVoice('link_number', { number: n }); setMsg({ kind: 'ok', text: `+${n} now rings ReachPeak AI.` }); await reload(); }
    catch (e) { setMsg({ kind: 'error', text: e.message }); }
    setBusy('');
  };
  const save = async (n) => {
    const d = drafts[n.number] || {};
    const user_id = d.user_id !== undefined ? d.user_id || null : n.user_id;
    let agent_id = d.agent_id !== undefined ? d.agent_id || null : n.agent_id;
    if (!user_id) agent_id = null;
    if (agent_id && !agents.some((a) => a.id === agent_id && a.user_id === user_id)) agent_id = null;
    setBusy('save:' + n.number); setMsg(null);
    const { error } = await supabase.from('voice_numbers').update({ user_id, agent_id, notes: d.notes !== undefined ? d.notes : n.notes }).eq('number', n.number);
    setBusy('');
    if (error) return setMsg({ kind: 'error', text: error.message });
    setDrafts((x) => { const y = { ...x }; delete y[n.number]; return y; });
    setMsg({ kind: 'ok', text: `+${n.number} saved.` }); reload();
  };
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className="rp-card" style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Phone numbers</h3>
          <p style={hint}>Rent numbers in the Plivo console (Phone Numbers → Buy), then sync here. Link each number to the app, then assign it to an account and the agent that answers it.</p>
        </div>
        <button style={btn('primary')} disabled={!status?.connected || !!busy} onClick={sync}>{busy === 'sync' ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}Sync from Plivo</button>
      </div>
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      {numbers.length === 0 ? (
        <div className="rp-card" style={{ ...card, textAlign: 'center', color: '#64748b' }}><Hash size={28} color="#94a3b8" /><p style={{ margin: '8px 0 0' }}>No numbers yet. Rent one in Plivo, then press "Sync from Plivo".</p></div>
      ) : (
        <div className="rp-card" style={{ ...card, padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 860 }}>
            <thead><tr style={{ background: '#f8fafc', color: '#475569', textAlign: 'left' }}>
              {['Number', 'Plivo', 'Account', 'Agent that answers', 'Notes', ''].map((h) => <th key={h} style={{ padding: '10px 12px', fontWeight: 700 }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {numbers.map((n) => {
                const d = drafts[n.number] || {};
                const uid = d.user_id !== undefined ? d.user_id : n.user_id || '';
                const aid = d.agent_id !== undefined ? d.agent_id : n.agent_id || '';
                const userAgents = agents.filter((a) => a.user_id === uid);
                const dirty = Object.keys(d).length > 0;
                return (
                  <tr key={n.number} style={{ borderTop: '1px solid #f1f5f9', verticalAlign: 'top' }}>
                    <td style={{ padding: '10px 12px' }}><b>+{n.number}</b><div style={{ color: '#94a3b8', fontSize: 12 }}>{[n.number_type, n.region, n.monthly_rental && `$${n.monthly_rental}/mo`].filter(Boolean).join(' · ')}</div></td>
                    <td style={{ padding: '10px 12px' }}>
                      {!n.on_plivo ? <Pill color="#ef4444">Removed from Plivo</Pill> : n.linked ? <Pill color="#10b981"><Check size={11} />Linked</Pill> : (
                        <button style={{ ...btn(), padding: '5px 10px', fontSize: 12 }} disabled={!status?.plivo_app_id || !!busy} onClick={() => link(n.number)}>
                          {busy === 'link:' + n.number ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={13} />}Link to app
                        </button>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', minWidth: 190 }}>
                      <select style={inputStyle} value={uid} onChange={(e) => setDrafts((x) => ({ ...x, [n.number]: { ...d, user_id: e.target.value, agent_id: '' } }))}>
                        <option value="">Unassigned</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.full_name || a.email}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '10px 12px', minWidth: 200 }}>
                      <select style={inputStyle} value={aid} disabled={!uid} onChange={(e) => setDrafts((x) => ({ ...x, [n.number]: { ...d, agent_id: e.target.value } }))}>
                        <option value="">{uid ? (userAgents.length ? 'Choose agent…' : 'This account has no agents yet') : '—'}</option>
                        {userAgents.map((a) => <option key={a.id} value={a.id}>{a.name}{a.is_active ? '' : ' (paused)'}{a.direction === 'outbound' ? ' (outgoing only)' : ''}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '10px 12px', minWidth: 160 }}><input style={inputStyle} value={d.notes !== undefined ? d.notes : n.notes || ''} onChange={(e) => setDrafts((x) => ({ ...x, [n.number]: { ...d, notes: e.target.value } }))} placeholder="optional" /></td>
                    <td style={{ padding: '10px 12px' }}>
                      <button style={{ ...btn(dirty ? 'primary' : 'ghost'), padding: '6px 11px', fontSize: 12.5 }} disabled={!dirty || !!busy} onClick={() => save(n)}>
                        {busy === 'save:' + n.number ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}Save
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p style={{ ...hint, margin: 0 }}>Currently assigned: {numbers.filter((n) => n.user_id).map((n) => `+${n.number} → ${acctName(n.user_id)}`).join(', ') || 'none'}.</p>
    </div>
  );
}

// ── Accounts ──
const DEFAULTS = { calling_enabled: true, outbound_enabled: false, caller_number: '', compliance_note: '', price_override_paise: null, max_concurrent: 3, monthly_minute_cap: null, hours_start: 9, hours_end: 21 };
function AccountsTab({ accounts, settings, numbers, agents, calls, reload }) {
  const [open, setOpen] = useState(null);
  const [manage, setManage] = useState(null);
  const [f, setF] = useState(DEFAULTS);
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);
  const minutes = useMemo(() => {
    const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
    const m = {}; for (const c of calls) if (new Date(c.started_at) >= start) m[c.user_id] = (m[c.user_id] || 0) + (c.billed_minutes || 0);
    return m;
  }, [calls]);
  const edit = (a) => { const s = settings.find((x) => x.user_id === a.id) || {}; setF({ ...DEFAULTS, ...s, caller_number: s.caller_number || '', compliance_note: s.compliance_note || '' }); setOpen(a); setMsg(null); };
  const save = async () => {
    setMsg(null);
    if (f.outbound_enabled && !f.caller_number) return setMsg({ kind: 'error', text: 'Pick a caller number (one of this account’s numbers) before enabling outgoing calls.' });
    if (f.outbound_enabled && f.compliance_note.trim().length < 5) return setMsg({ kind: 'error', text: 'Add the compliance note (which number series/consent was confirmed) before enabling outgoing calls.' });
    if (Number(f.hours_end) <= Number(f.hours_start)) return setMsg({ kind: 'error', text: 'Calling hours: the end must be after the start.' });
    setSaving(true);
    const row = {
      user_id: open.id, calling_enabled: !!f.calling_enabled, outbound_enabled: !!f.outbound_enabled, caller_number: f.caller_number || null,
      compliance_note: f.compliance_note.trim(), price_override_paise: f.price_override_paise === '' || f.price_override_paise == null ? null : Math.round(Number(f.price_override_paise)),
      max_concurrent: Math.max(1, Math.min(50, Number(f.max_concurrent) || 3)), monthly_minute_cap: f.monthly_minute_cap === '' || f.monthly_minute_cap == null ? null : Math.max(0, Number(f.monthly_minute_cap)),
      hours_start: Number(f.hours_start), hours_end: Number(f.hours_end), updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('voice_account_settings').upsert(row);
    setSaving(false);
    if (error) return setMsg({ kind: 'error', text: error.message });
    setOpen(null); reload();
  };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className="rp-card" style={{ ...card, padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 820 }}>
          <thead><tr style={{ background: '#f8fafc', color: '#475569', textAlign: 'left' }}>
            {['Account', 'AI calling', 'Outgoing', 'Numbers', 'Agents', 'Minutes this month', 'Price/min', ''].map((h) => <th key={h} style={{ padding: '10px 12px', fontWeight: 700 }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {accounts.map((a) => {
              const s = { ...DEFAULTS, ...(settings.find((x) => x.user_id === a.id) || {}) };
              const nums = numbers.filter((n) => n.user_id === a.id);
              return (
                <tr key={a.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px' }}><b>{a.full_name || '—'}</b><div style={{ color: '#94a3b8', fontSize: 12 }}>{a.email}</div></td>
                  <td style={{ padding: '10px 12px' }}>{s.calling_enabled ? <Pill color="#10b981">On</Pill> : <Pill color="#ef4444">Off</Pill>}</td>
                  <td style={{ padding: '10px 12px' }}>{s.outbound_enabled ? <Pill color="#10b981">Allowed</Pill> : <Pill color="#94a3b8">Off</Pill>}</td>
                  <td style={{ padding: '10px 12px' }}>{nums.length ? nums.map((n) => '+' + n.number).join(', ') : '—'}</td>
                  <td style={{ padding: '10px 12px' }}>{agents.filter((g) => g.user_id === a.id).length}</td>
                  <td style={{ padding: '10px 12px' }}>{minutes[a.id] || 0}{s.monthly_minute_cap != null ? ` / ${s.monthly_minute_cap}` : ''}</td>
                  <td style={{ padding: '10px 12px' }}>{s.price_override_paise != null ? rupees(s.price_override_paise) : 'Default'}</td>
                  <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}><button style={{ ...btn(), padding: '6px 11px', fontSize: 12.5, marginRight: 6 }} onClick={() => setManage(a)}>Manage agents</button><button style={{ ...btn(), padding: '6px 11px', fontSize: 12.5 }} onClick={() => edit(a)}>Rules</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {manage && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 55, overflowY: 'auto', padding: '3vh 12px' }} onClick={() => { setManage(null); reload(); }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 1250, margin: '0 auto', background: '#f6f7f9', borderRadius: 18, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: '#64748b' }}>Managing <b style={{ color: '#0f172a' }}>{manage.full_name || manage.email}</b> as admin. Test and outgoing calls bill this account's wallet.</span>
              <button onClick={() => { setManage(null); reload(); }} style={{ border: 'none', background: '#e2e8f0', borderRadius: 10, padding: 6, cursor: 'pointer' }} aria-label="Close"><X size={18} /></button>
            </div>
            <VoiceAgents ownerId={manage.id} embedded />
          </div>
        </div>
      )}
      {open && (
        <div onClick={() => setOpen(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 60, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '5vh 12px', overflowY: 'auto' }}>
          <div onClick={(e) => e.stopPropagation()} className="rp-card" style={{ width: '100%', maxWidth: 620, borderRadius: 18, padding: 20, background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Calling rules · {open.full_name || open.email}</h3>
              <button onClick={() => setOpen(null)} style={{ border: 'none', background: '#f1f5f9', borderRadius: 10, padding: 6, cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gap: 12, marginTop: 14 }}>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}><input type="checkbox" checked={!!f.calling_enabled} onChange={set('calling_enabled')} />AI calling enabled (incoming calls + test calls)</label>
              <div style={{ padding: 12, borderRadius: 12, border: '1px solid #fde68a', background: '#fffbeb' }}>
                <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, fontWeight: 700 }}><input type="checkbox" checked={!!f.outbound_enabled} onChange={set('outbound_enabled')} />Allow outgoing AI calls</label>
                <p style={hint}>TRAI: business calls must come from the right number series (140 promotional / 1600–1601 service) with consent. Enable only after Plivo has confirmed the series for this business.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginTop: 8 }}>
                  <div><label style={labelStyle}>Caller number</label>
                    <select style={inputStyle} value={f.caller_number} onChange={set('caller_number')}>
                      <option value="">Choose…</option>{numbers.filter((n) => n.user_id === open.id).map((n) => <option key={n.number} value={n.number}>+{n.number}</option>)}
                    </select></div>
                  <div><label style={labelStyle}>Compliance note</label><input style={inputStyle} value={f.compliance_note} onChange={set('compliance_note')} placeholder="e.g. 1600 series, Plivo ticket #1234" /></div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
                <div><label style={labelStyle}>Price per minute (₹)</label><input style={inputStyle} type="number" min={0} step={0.01} value={f.price_override_paise == null || f.price_override_paise === '' ? '' : Number(f.price_override_paise) / 100} onChange={(e) => setF({ ...f, price_override_paise: e.target.value === '' ? null : Math.round(Number(e.target.value) * 100) })} placeholder="default" /><p style={hint}>Empty = platform price.</p></div>
                <div><label style={labelStyle}>Max calls at once</label><input style={inputStyle} type="number" min={1} max={50} value={f.max_concurrent} onChange={set('max_concurrent')} /></div>
                <div><label style={labelStyle}>Monthly minute cap</label><input style={inputStyle} type="number" min={0} value={f.monthly_minute_cap ?? ''} onChange={(e) => setF({ ...f, monthly_minute_cap: e.target.value === '' ? null : Number(e.target.value) })} placeholder="no cap" /></div>
                <div><label style={labelStyle}>Calling hours (IST)</label>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input style={inputStyle} type="number" min={0} max={23} value={f.hours_start} onChange={set('hours_start')} /><span>to</span><input style={inputStyle} type="number" min={1} max={24} value={f.hours_end} onChange={set('hours_end')} />
                  </div><p style={hint}>Outgoing calls only.</p></div>
              </div>
            </div>
            {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button style={btn()} onClick={() => setOpen(null)}>Cancel</button>
              <button style={btn('primary')} disabled={saving} onClick={save}>{saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}Save rules</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Calls ──
function CallsTab({ calls, accounts }) {
  const [acct, setAcct] = useState('all');
  const name = (id) => accounts.find((a) => a.id === id)?.full_name || '—';
  const rows = calls.filter((c) => acct === 'all' || c.user_id === acct);
  const totals = rows.reduce((t, c) => ({ min: t.min + (c.billed_minutes || 0), charged: t.charged + (Number(c.charge_paise) || 0), plivo: t.plivo + (Number(c.provider_cost) || 0) }), { min: 0, charged: 0, plivo: 0 });
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={acct} onChange={(e) => setAcct(e.target.value)} style={{ ...inputStyle, width: 'auto' }}><option value="all">All accounts</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.full_name || a.email}</option>)}</select>
        <Pill color="#475569">{rows.length} calls</Pill><Pill color="#8b5cf6">{totals.min} min billed</Pill><Pill color="#10b981"><IndianRupee size={11} />{(totals.charged / 100).toLocaleString('en-IN')} charged</Pill>
        <Pill color="#f59e0b">Plivo cost ${totals.plivo.toFixed(2)}</Pill>
      </div>
      <div className="rp-card" style={{ ...card, padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: 900 }}>
          <thead><tr style={{ background: '#f8fafc', color: '#475569', textAlign: 'left' }}>
            {['When', 'Account', 'Type', 'Customer', 'Duration', 'Charged', 'Plivo', 'Result', 'Ended'].map((h) => <th key={h} style={{ padding: '9px 10px', fontWeight: 700 }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={9} style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>No calls yet.</td></tr>}
            {rows.map((c) => (
              <tr key={c.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{fmtWhen(c.started_at)}</td>
                <td style={{ padding: '8px 10px' }}>{name(c.user_id)}</td>
                <td style={{ padding: '8px 10px' }}>{c.direction === 'in' ? <PhoneIncoming size={14} /> : c.direction === 'out' ? <PhoneOutgoing size={14} /> : <Monitor size={14} />}</td>
                <td style={{ padding: '8px 10px' }}>{c.customer_name || (c.customer_number ? '+' + c.customer_number : '—')}</td>
                <td style={{ padding: '8px 10px' }}>{fmtDur(c.duration_sec)}</td>
                <td style={{ padding: '8px 10px' }}>{rupees(c.charge_paise)}</td>
                <td style={{ padding: '8px 10px' }}>{c.provider_bill_sec != null ? `${c.provider_bill_sec}s · $${Number(c.provider_cost || 0).toFixed(3)}` : '—'}</td>
                <td style={{ padding: '8px 10px' }}>{c.outcome || '—'}</td>
                <td style={{ padding: '8px 10px', color: '#64748b' }}>{c.hangup_cause || c.end_reason || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function VoiceAdmin() {
  const [tab, setTab] = useState('connection');
  const [status, setStatus] = useState(null);
  const [numbers, setNumbers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [agents, setAgents] = useState([]);
  const [settings, setSettings] = useState([]);
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setErr('');
    const [st, n, a, g, s, c] = await Promise.all([
      adminVoice('status').catch((e) => { setErr(e.message); return null; }),
      supabase.from('voice_numbers').select('*').order('number'),
      supabase.from('profiles').select('id, full_name, email, role, business_type').neq('role', 'admin').order('full_name'),
      supabase.from('voice_agents').select('id, user_id, name, is_active, direction').order('name'),
      supabase.from('voice_account_settings').select('*'),
      supabase.from('voice_calls').select('id, user_id, direction, customer_name, customer_number, started_at, duration_sec, billed_minutes, charge_paise, outcome, end_reason, provider_bill_sec, provider_cost, hangup_cause').order('started_at', { ascending: false }).limit(300),
    ]);
    const nums = n.data || [];
    setStatus(st ? { ...st, numbers_linked: nums.filter((x) => x.linked).length, numbers_assigned: nums.filter((x) => x.user_id && x.agent_id).length } : null);
    setNumbers(nums); setAccounts(a.data || []); setAgents(g.data || []); setSettings(s.data || []); setCalls(c.data || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const TABS = [
    { id: 'connection', label: 'Connection', icon: PlugZap },
    { id: 'numbers', label: `Numbers (${numbers.length})`, icon: Hash },
    { id: 'accounts', label: 'Accounts', icon: Users },
    { id: 'calls', label: 'Calls', icon: ListChecks },
    { id: 'manual', label: 'Manual', icon: BookOpen },
  ];
  return (
    <div className="rp-page" style={{ maxWidth: 1300, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10, fontFamily: "'Space Grotesk', sans-serif", margin: 0 }}><PhoneCall size={24} color={ACCENT} /> AI Calling Setup</h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>Admin only: connect Plivo, manage numbers, and control calling for every account.</p>
        </div>
        <button onClick={() => { setLoading(true); load(); }} style={btn()} aria-label="Refresh"><RefreshCw size={15} />Refresh</button>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {TABS.map((t) => { const I = t.icon; return (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '8px 14px', borderRadius: 999, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid ' + (tab === t.id ? ACCENT : '#e6e8ec'), background: tab === t.id ? ACCENT : '#fff', color: tab === t.id ? '#fff' : '#475569' }}><I size={15} />{t.label}</button>
        ); })}
      </div>
      {err && <Notice kind="error"><AlertTriangle size={14} style={{ verticalAlign: '-2px' }} /> {err}</Notice>}
      {loading ? <BrandSpinner label="Loading AI Calling setup…" /> : (
        tab === 'connection' ? <ConnectionTab status={status} reload={load} />
        : tab === 'numbers' ? <NumbersTab status={status} numbers={numbers} accounts={accounts} agents={agents} reload={load} />
        : tab === 'accounts' ? <AccountsTab accounts={accounts} settings={settings} numbers={numbers} agents={agents} calls={calls} reload={load} />
        : tab === 'calls' ? <CallsTab calls={calls} accounts={accounts} />
        : <VoiceManual />
      )}
    </div>
  );
}
