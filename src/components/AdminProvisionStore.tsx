// @ts-nocheck
import { useEffect, useState, useCallback } from 'react';
import { Store, Loader2, KeyRound, CheckCircle2, Link2, RefreshCw, Wallet as WalletIcon, Phone, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';

const brand = '#E04632';
const card = { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14, padding: 20 };
const input = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0b1220', color: '#e2e8f0', fontSize: 14, boxSizing: 'border-box' as const };
const label = { fontSize: 12.5, color: '#94a3b8', marginBottom: 5, display: 'block', fontWeight: 600 };
const RUPEE = (paise: number) => '₹' + (Number(paise || 0) / 100).toLocaleString('en-IN');

export function AdminProvisionStore() {
  const [cfg, setCfg] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // token setup
  const [sysToken, setSysToken] = useState('');
  const [bizId, setBizId] = useState('');
  const [savingTok, setSavingTok] = useState(false);
  const [tokMsg, setTokMsg] = useState<{ k: 'ok' | 'err'; t: string } | null>(null);

  // provision form
  const [email, setEmail] = useState('');
  const [phoneId, setPhoneId] = useState('');
  const [wabaId, setWabaId] = useState('');
  const [storeName, setStoreName] = useState('');
  const [openingCredit, setOpeningCredit] = useState('');
  const [provisioning, setProvisioning] = useState(false);
  const [provMsg, setProvMsg] = useState<{ k: 'ok' | 'err'; t: string } | null>(null);

  const load = useCallback(async () => {
    const [c, l] = await Promise.all([
      supabase.functions.invoke('admin-provision-store', { body: { action: 'get_config' } }),
      supabase.functions.invoke('admin-provision-store', { body: { action: 'list_managed' } }),
    ]);
    setCfg(c.data || {});
    setBizId(c.data?.business_id || '');
    setAccounts(l.data?.accounts || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const saveToken = async () => {
    setTokMsg(null);
    if (!cfg?.token_configured && !sysToken.trim()) { setTokMsg({ k: 'err', t: 'Paste your System User token.' }); return; }
    setSavingTok(true);
    const { data, error } = await supabase.functions.invoke('admin-provision-store', {
      body: { action: 'save_system_token', system_token: sysToken, business_id: bizId },
    });
    setSavingTok(false);
    if (error || data?.error) { setTokMsg({ k: 'err', t: data?.error || 'Failed to save token.' }); return; }
    setTokMsg({ k: 'ok', t: 'System token saved ✓ You can now provision stores.' });
    setSysToken('');
    load();
  };

  const provision = async () => {
    setProvMsg(null);
    if (!email.trim() || !phoneId.trim()) { setProvMsg({ k: 'err', t: 'Store email and phone number ID are required.' }); return; }
    setProvisioning(true);
    const opening_credit_paise = openingCredit ? Math.round(Number(openingCredit) * 100) : 0;
    const { data, error } = await supabase.functions.invoke('admin-provision-store', {
      body: { action: 'provision', email, phone_number_id: phoneId, waba_id: wabaId, store_name: storeName, opening_credit_paise },
    });
    setProvisioning(false);
    if (error || data?.error) { setProvMsg({ k: 'err', t: data?.error || 'Provisioning failed.' }); return; }
    setProvMsg({ k: 'ok', t: `✓ Linked ${data.account?.phone || phoneId} to ${data.account?.email}${data.credited_paise ? ` · credited ${RUPEE(data.credited_paise)}` : ''}. The store can send now.` });
    setEmail(''); setPhoneId(''); setWabaId(''); setStoreName(''); setOpeningCredit('');
    load();
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: brand }} /></div>;

  const configured = !!cfg?.token_configured;

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg,${brand},#c83b27)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Store size={20} color="white" />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#f1f5f9' }}>Provision store (Managed Wallet)</h2>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Link a store's WhatsApp number (added under your BM) to their account. Your BM pays Meta; their wallet is debited.</p>
        </div>
      </div>

      {/* ── System token setup ── */}
      <div style={{ ...card, marginBottom: 20, borderColor: configured ? '#1e3a2e' : '#3a2e1e' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <KeyRound size={18} color={configured ? '#10b981' : '#f59e0b'} />
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>System User token</h3>
          {configured && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#10b981', fontWeight: 700 }}><CheckCircle2 size={13} /> Configured</span>}
        </div>
        <p style={{ fontSize: 12.5, color: '#94a3b8', lineHeight: 1.6, margin: '0 0 12px' }}>
          One permanent token from your Business Manager (Business Settings → System Users) with <strong>whatsapp_business_messaging</strong> + <strong>whatsapp_business_management</strong>. Lets ReachPeak send from any number in your BM. {configured && 'Leave blank to keep the current token; paste a new one to rotate.'}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 10, alignItems: 'end' }}>
          <div><label style={label}>System User token {configured && '(paste only to rotate)'}</label>
            <input style={input} type="password" placeholder={configured ? '•••••••• (saved)' : 'EAAG…'} value={sysToken} onChange={e => setSysToken(e.target.value)} /></div>
          <div><label style={label}>Business ID (optional)</label>
            <input style={input} placeholder="Business Manager ID" value={bizId} onChange={e => setBizId(e.target.value)} /></div>
          <button onClick={saveToken} disabled={savingTok} style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: `linear-gradient(135deg,${brand},#c83b27)`, color: 'white', fontWeight: 700, fontSize: 14, cursor: savingTok ? 'not-allowed' : 'pointer', opacity: savingTok ? 0.6 : 1, height: 40 }}>
            {savingTok ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : 'Save'}
          </button>
        </div>
        {tokMsg && <p style={{ marginTop: 10, fontSize: 13, color: tokMsg.k === 'ok' ? '#10b981' : '#ef4444' }}>{tokMsg.t}</p>}
      </div>

      {/* ── Provision a store ── */}
      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <Link2 size={18} color={brand} />
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Link a store's number</h3>
        </div>
        {!configured && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 14px', borderRadius: 8, marginBottom: 14, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24', fontSize: 13 }}>
            <AlertTriangle size={16} /> Save your System User token above first.
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
          <div><label style={label}>Store email *</label><input style={input} placeholder="store@example.com" value={email} onChange={e => setEmail(e.target.value)} /></div>
          <div><label style={label}>Store name</label><input style={input} placeholder="Jutti Express" value={storeName} onChange={e => setStoreName(e.target.value)} /></div>
          <div><label style={label}>Phone number ID *</label><input style={input} placeholder="from WhatsApp Manager" value={phoneId} onChange={e => setPhoneId(e.target.value)} /></div>
          <div><label style={label}>WABA ID (optional)</label><input style={input} placeholder="WhatsApp Business Account ID" value={wabaId} onChange={e => setWabaId(e.target.value)} /></div>
          <div><label style={label}>Opening wallet credit ₹ (optional)</label><input style={input} type="number" min={0} placeholder="0" value={openingCredit} onChange={e => setOpeningCredit(e.target.value)} /></div>
        </div>
        <p style={{ fontSize: 11.5, color: '#64748b', margin: '10px 0 0' }}>Find the <strong>Phone number ID</strong> in WhatsApp Manager → your number → API Setup (a long numeric ID, not the phone number itself).</p>
        <button onClick={provision} disabled={provisioning || !configured} style={{ marginTop: 14, padding: '11px 22px', borderRadius: 9, border: 'none', background: configured ? `linear-gradient(135deg,#10b981,#059669)` : '#334155', color: 'white', fontWeight: 700, fontSize: 14.5, cursor: (provisioning || !configured) ? 'not-allowed' : 'pointer', opacity: provisioning ? 0.6 : 1, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          {provisioning ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Link2 size={15} />} Provision store
        </button>
        {provMsg && <p style={{ marginTop: 12, fontSize: 13.5, color: provMsg.k === 'ok' ? '#10b981' : '#ef4444' }}>{provMsg.t}</p>}
      </div>

      {/* ── Managed stores ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Managed stores ({accounts.length})</h3>
        <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#0b1220', border: '1px solid #334155', color: '#cbd5e1', borderRadius: 8, padding: '7px 12px', fontSize: 12.5, cursor: 'pointer' }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>
      {accounts.length === 0 ? <p style={{ color: '#64748b', fontSize: 14 }}>No managed stores yet.</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {accounts.map(a => (
            <div key={a.id} style={{ ...card, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{a.full_name || a.email}</p>
                <p style={{ margin: '3px 0 0', fontSize: 12.5, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Phone size={12} /> {a.display_phone_number || a.phone_number_id} · {a.email}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 12.5, color: a.is_active ? '#10b981' : '#64748b', fontWeight: 600 }}>{a.is_active ? '● Active' : '○ Inactive'}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#cbd5e1' }}><WalletIcon size={13} color="#10b981" /> {RUPEE(a.wallet_balance_paise)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
