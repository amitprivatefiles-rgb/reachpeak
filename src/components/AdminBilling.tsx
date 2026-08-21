// @ts-nocheck
import { useEffect, useState } from 'react';
import { CreditCard, Loader2, Copy, Check, Shield, Zap, Tag, Users, Plus, Minus } from 'lucide-react';
import { supabase } from '../lib/supabase';

const RUPEE = (paise: number) => '₹' + (Number(paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const CATEGORIES = ['marketing', 'utility', 'authentication', 'service'];

export function AdminBilling() {
  const [loading, setLoading] = useState(true);
  const [cfg, setCfg] = useState<any>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [copied, setCopied] = useState(false);

  // gateway form
  const [keyId, setKeyId] = useState('');
  const [keySecret, setKeySecret] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [mode, setMode] = useState<'live' | 'test'>('live');
  const [savingGw, setSavingGw] = useState(false);

  // pricing form
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [savingPrice, setSavingPrice] = useState(false);

  // wallets
  const [wallets, setWallets] = useState<any[]>([]);
  const [loadingWallets, setLoadingWallets] = useState(false);

  // adjust
  const [adjUser, setAdjUser] = useState<any>(null);
  const [adjAmount, setAdjAmount] = useState(0);
  const [adjDir, setAdjDir] = useState<'credit' | 'debit'>('credit');
  const [adjNote, setAdjNote] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  const [banner, setBanner] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const flash = (kind, text) => { setBanner({ kind, text }); setTimeout(() => setBanner(null), 4000); };

  const call = async (action: string, extra: any = {}) => {
    const { data, error } = await supabase.functions.invoke('admin-billing', { body: { action, ...extra } });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const loadConfig = async () => {
    try {
      const data = await call('get_config');
      setCfg(data);
      setWebhookUrl(data.webhook_url || '');
      if (data.gateway) { setKeyId(data.gateway.key_id || ''); setMode(data.gateway.mode || 'live'); }
      const pr: Record<string, number> = {};
      for (const c of CATEGORIES) { const row = (data.pricing || []).find((x: any) => x.category === c); pr[c] = row ? row.price_paise : 0; }
      setPrices(pr);
    } catch (e: any) { flash('err', e.message); }
    setLoading(false);
  };
  useEffect(() => { loadConfig(); }, []);

  const loadWallets = async () => {
    setLoadingWallets(true);
    try { const data = await call('list_wallets'); setWallets(data.wallets || []); }
    catch (e: any) { flash('err', e.message); }
    setLoadingWallets(false);
  };
  useEffect(() => { loadWallets(); }, []);

  const saveGateway = async () => {
    if (!keyId) { flash('err', 'Key ID is required'); return; }
    if (!cfg?.gateway && !keySecret) { flash('err', 'Key Secret is required for first-time setup'); return; }
    setSavingGw(true);
    try {
      const body: any = { gateway: 'razorpay', key_id: keyId, mode };
      if (keySecret) body.key_secret = keySecret;
      if (webhookSecret) body.webhook_secret = webhookSecret;
      await call('save_gateway', body);
      setKeySecret(''); setWebhookSecret('');
      await loadConfig();
      flash('ok', 'Payment gateway saved.');
    } catch (e: any) { flash('err', e.message); }
    setSavingGw(false);
  };

  const savePricing = async () => {
    setSavingPrice(true);
    try {
      const payload = CATEGORIES.map(c => ({ category: c, price_paise: Math.round(Number(prices[c]) || 0) }));
      await call('set_pricing', { prices: payload });
      flash('ok', 'Pricing updated.');
    } catch (e: any) { flash('err', e.message); }
    setSavingPrice(false);
  };

  const doAdjust = async () => {
    if (!adjUser || adjAmount <= 0) { flash('err', 'Pick a user and a positive amount'); return; }
    setAdjusting(true);
    try {
      await call('adjust_wallet', { user_id: adjUser.user_id, amount_paise: Math.round(adjAmount * 100), direction: adjDir, note: adjNote });
      setAdjUser(null); setAdjAmount(0); setAdjNote('');
      await loadWallets();
      flash('ok', 'Wallet adjusted.');
    } catch (e: any) { flash('err', e.message); }
    setAdjusting(false);
  };

  const copyWebhook = () => { navigator.clipboard.writeText(webhookUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const card = { padding: 20, borderRadius: 14, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 20 };
  const label = { fontSize: 13, color: '#94a3b8', fontWeight: 500, display: 'block', marginBottom: 6 };
  const input = { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #334155', background: '#0b1220', color: '#e2e8f0', fontSize: 14 };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: '#E04632' }} /></div>;

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#3b82f6,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CreditCard size={20} color="white" />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#f1f5f9' }}>Billing &amp; Payments</h2>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Configure the payment gateway users recharge through, set per-message pricing, and manage wallets.</p>
        </div>
      </div>

      {banner && (
        <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13,
          background: banner.kind === 'err' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
          border: `1px solid ${banner.kind === 'err' ? '#ef444440' : '#10b98140'}`,
          color: banner.kind === 'err' ? '#ef4444' : '#10b981' }}>{banner.text}</div>
      )}

      {/* ── Payment Gateway (Razorpay) ── */}
      <div style={card}>
        <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600, color: '#f1f5f9' }}>Payment Gateway — Razorpay</h3>
        <p style={{ margin: '0 0 16px', fontSize: 12, color: '#64748b' }}>
          {cfg?.gateway ? <span style={{ color: '#10b981' }}>✓ Configured ({cfg.gateway.mode} mode){cfg.gateway.webhook_configured ? ' · webhook set' : ' · webhook NOT set'}</span> : 'Not configured — users cannot recharge until you add keys.'}
        </p>
        <div style={{ display: 'grid', gap: 14 }}>
          <div><label style={label}>Key ID</label><input style={{ ...input, fontFamily: 'monospace' }} value={keyId} onChange={e => setKeyId(e.target.value)} placeholder="rzp_live_... or rzp_test_..." /></div>
          <div><label style={label}>Key Secret {cfg?.gateway && <span style={{ color: '#475569' }}>(leave blank to keep current)</span>}</label>
            <input style={{ ...input, fontFamily: 'monospace' }} type="password" value={keySecret} onChange={e => setKeySecret(e.target.value)} placeholder={cfg?.gateway ? '•••• configured' : 'Razorpay Key Secret'} /></div>
          <div><label style={label}>Webhook Secret {cfg?.gateway?.webhook_configured && <span style={{ color: '#475569' }}>(leave blank to keep current)</span>}</label>
            <input style={{ ...input, fontFamily: 'monospace' }} type="password" value={webhookSecret} onChange={e => setWebhookSecret(e.target.value)} placeholder={cfg?.gateway?.webhook_configured ? '•••• configured' : 'From Razorpay → Webhooks'} /></div>
          <div>
            <label style={label}>Mode</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['test', 'live'] as const).map(m => (
                <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: 10, borderRadius: 8, textTransform: 'capitalize', cursor: 'pointer', fontWeight: mode === m ? 700 : 400,
                  border: `1px solid ${mode === m ? (m === 'live' ? '#10b981' : '#3b82f6') : '#334155'}`,
                  background: mode === m ? (m === 'live' ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)') : '#0b1220',
                  color: mode === m ? (m === 'live' ? '#10b981' : '#3b82f6') : '#64748b' }}>
                  {m === 'live' ? <Shield size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} /> : <Zap size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />}{m}
                </button>
              ))}
            </div>
          </div>
          <button onClick={saveGateway} disabled={savingGw} style={{ padding: 12, borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: 'white', fontWeight: 700, cursor: 'pointer', opacity: savingGw ? 0.6 : 1 }}>
            {savingGw ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', verticalAlign: 'middle' }} /> : 'Save Gateway'}
          </button>
          {webhookUrl && (
            <div style={{ borderTop: '1px solid #1e293b', paddingTop: 14 }}>
              <label style={label}>Webhook URL <span style={{ color: '#64748b' }}>(add in Razorpay → Settings → Webhooks; events: order.paid, payment.captured, payment.failed)</span></label>
              <div style={{ display: 'flex', gap: 8 }}>
                <code style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid #334155', background: '#0b1220', color: '#10b981', fontSize: 12, wordBreak: 'break-all' }}>{webhookUrl}</code>
                <button onClick={copyWebhook} style={{ padding: 10, borderRadius: 8, border: '1px solid #334155', background: '#0b1220', color: copied ? '#10b981' : '#94a3b8', cursor: 'pointer' }}>{copied ? <Check size={16} /> : <Copy size={16} />}</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Per-message pricing ── */}
      <div style={card}>
        <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}><Tag size={16} /> Per-message pricing (₹ per message)</h3>
        <p style={{ margin: '0 0 16px', fontSize: 12, color: '#64748b' }}>What each user's wallet is charged per WhatsApp message, by category. This is your margin over Meta's cost.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12 }}>
          {CATEGORIES.map(c => (
            <div key={c}>
              <label style={{ ...label, textTransform: 'capitalize' }}>{c}</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#64748b' }}>₹</span>
                <input style={input} type="number" min={0} step={0.01} value={(prices[c] ?? 0) / 100}
                  onChange={e => setPrices({ ...prices, [c]: Math.round(Number(e.target.value) * 100) })} />
              </div>
            </div>
          ))}
        </div>
        <button onClick={savePricing} disabled={savingPrice} style={{ marginTop: 16, padding: '10px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#E04632,#c83b27)', color: 'white', fontWeight: 700, cursor: 'pointer', opacity: savingPrice ? 0.6 : 1 }}>
          {savingPrice ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', verticalAlign: 'middle' }} /> : 'Save Pricing'}
        </button>
      </div>

      {/* ── Wallet oversight ── */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}><Users size={16} /> User wallets</h3>
          <button onClick={loadWallets} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0b1220', color: '#94a3b8', cursor: 'pointer', fontSize: 12 }}>Refresh</button>
        </div>
        {loadingWallets ? <div style={{ padding: 20, textAlign: 'center' }}><Loader2 size={18} style={{ animation: 'spin 1s linear infinite', color: '#64748b' }} /></div> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ color: '#64748b', textAlign: 'left' }}>
                  <th style={{ padding: '8px 10px' }}>User</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Balance</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Reserved</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Recharged</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Spent</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Msgs</th>
                  <th style={{ padding: '8px 10px' }}></th>
                </tr>
              </thead>
              <tbody>
                {wallets.length === 0 && <tr><td colSpan={7} style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>No wallets yet.</td></tr>}
                {wallets.map(w => (
                  <tr key={w.user_id} style={{ borderTop: '1px solid #1e293b', color: '#e2e8f0' }}>
                    <td style={{ padding: '8px 10px' }}>{w.email || w.user_id.slice(0, 8)}<div style={{ fontSize: 11, color: '#64748b' }}>{w.full_name || ''}</div></td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: w.balance_paise < 20000 ? '#fbbf24' : '#10b981' }}>{RUPEE(w.balance_paise)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: '#f59e0b' }}>{RUPEE(w.held_paise)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>{RUPEE(w.recharged_paise)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>{RUPEE(w.spent_paise)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>{w.messages_charged}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                      <button onClick={() => { setAdjUser(w); setAdjDir('credit'); setAdjAmount(0); }} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #334155', background: '#0b1220', color: '#93c5fd', cursor: 'pointer', fontSize: 12 }}>Adjust</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Adjust modal ── */}
      {adjUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setAdjUser(null)}>
          <div style={{ width: 420, maxWidth: '92vw', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14, padding: 22 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, color: '#f1f5f9' }}>Adjust wallet</h3>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: '#64748b' }}>{adjUser.email || adjUser.user_id} · balance {RUPEE(adjUser.balance_paise)}</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button onClick={() => setAdjDir('credit')} style={{ flex: 1, padding: 10, borderRadius: 8, cursor: 'pointer', fontWeight: 600, border: `1px solid ${adjDir === 'credit' ? '#10b981' : '#334155'}`, background: adjDir === 'credit' ? 'rgba(16,185,129,0.1)' : '#0b1220', color: adjDir === 'credit' ? '#10b981' : '#64748b' }}><Plus size={14} style={{ verticalAlign: 'middle' }} /> Credit</button>
              <button onClick={() => setAdjDir('debit')} style={{ flex: 1, padding: 10, borderRadius: 8, cursor: 'pointer', fontWeight: 600, border: `1px solid ${adjDir === 'debit' ? '#ef4444' : '#334155'}`, background: adjDir === 'debit' ? 'rgba(239,68,68,0.1)' : '#0b1220', color: adjDir === 'debit' ? '#ef4444' : '#64748b' }}><Minus size={14} style={{ verticalAlign: 'middle' }} /> Debit</button>
            </div>
            <label style={label}>Amount (₹)</label>
            <input style={{ ...input, marginBottom: 12 }} type="number" min={0} step={1} value={adjAmount} onChange={e => setAdjAmount(Number(e.target.value))} />
            <label style={label}>Note (optional)</label>
            <input style={{ ...input, marginBottom: 16 }} value={adjNote} onChange={e => setAdjNote(e.target.value)} placeholder="e.g. free starter credit" />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setAdjUser(null)} style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #334155', background: '#0b1220', color: '#94a3b8', cursor: 'pointer' }}>Cancel</button>
              <button onClick={doAdjust} disabled={adjusting} style={{ padding: '10px 16px', borderRadius: 8, border: 'none', background: adjDir === 'credit' ? '#10b981' : '#ef4444', color: 'white', fontWeight: 700, cursor: 'pointer', opacity: adjusting ? 0.6 : 1 }}>
                {adjusting ? '…' : `${adjDir === 'credit' ? 'Credit' : 'Debit'} ${RUPEE(Math.round(adjAmount * 100))}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
