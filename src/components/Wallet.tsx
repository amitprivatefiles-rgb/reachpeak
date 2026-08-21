// @ts-nocheck
import { useEffect, useState, useCallback } from 'react';
import { Wallet as WalletIcon, Plus, Loader2, ArrowDownCircle, ArrowUpCircle, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const RUPEE = (paise: number) => '₹' + (Number(paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const PRESETS = [1000, 2000, 5000, 10000];
const LOW_BALANCE_PAISE = 20000; // ₹200 → show low-balance banner

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

const TYPE_META: Record<string, { label: string; color: string; sign: string; icon: any }> = {
  credit:  { label: 'Recharge',      color: '#10b981', sign: '+', icon: ArrowUpCircle },
  adjust:  { label: 'Admin credit',  color: '#10b981', sign: '+', icon: ArrowUpCircle },
  debit:   { label: 'Message sent',  color: '#ef4444', sign: '−', icon: ArrowDownCircle },
  hold:    { label: 'Reserved',      color: '#f59e0b', sign: '−', icon: Clock },
  release: { label: 'Refund',        color: '#3b82f6', sign: '+', icon: RefreshCw },
};

export function Wallet() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<any>(null);
  const [txns, setTxns] = useState<any[]>([]);
  const [pricing, setPricing] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState(1000);
  const [paying, setPaying] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err' | 'info'; text: string } | null>(null);

  const loadAll = useCallback(async () => {
    if (!user) return;
    const [{ data: w }, { data: t }, { data: p }] = await Promise.all([
      supabase.from('wallets').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('wallet_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
      supabase.from('message_pricing').select('*').order('category'),
    ]);
    setWallet(w || { balance_paise: 0, held_paise: 0 });
    setTxns(t || []);
    setPricing(p || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Live balance updates (webhook credit lands server-side → realtime pushes it here)
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel('wallet-' + user.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets', filter: `user_id=eq.${user.id}` }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallet_transactions', filter: `user_id=eq.${user.id}` }, () => loadAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, loadAll]);

  const recharge = async () => {
    setMsg(null);
    if (amount < 1000) { setMsg({ kind: 'err', text: 'Minimum recharge is ₹1000.' }); return; }
    setPaying(true);
    try {
      const ok = await loadRazorpay();
      if (!ok) throw new Error('Could not load payment gateway. Check your connection.');

      const { data, error } = await supabase.functions.invoke('create-recharge-order', { body: { amount } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const rzp = new (window as any).Razorpay({
        key: data.key_id,
        order_id: data.order_id,
        amount: data.amount_paise,
        currency: data.currency || 'INR',
        name: 'ReachPeak Wallet',
        description: `Wallet recharge · ${RUPEE(data.amount_paise)}`,
        prefill: data.prefill || {},
        theme: { color: '#E04632' },
        handler: () => {
          setMsg({ kind: 'info', text: 'Payment received — crediting your wallet…' });
          // The wallet-webhook credits server-side; realtime will refresh the balance.
          setTimeout(loadAll, 2500);
          setTimeout(loadAll, 6000);
        },
        modal: { ondismiss: () => setMsg({ kind: 'info', text: 'Payment cancelled.' }) },
      });
      rzp.on('payment.failed', (resp: any) => setMsg({ kind: 'err', text: 'Payment failed: ' + (resp?.error?.description || 'unknown') }));
      rzp.open();
    } catch (err: any) {
      setMsg({ kind: 'err', text: err.message || 'Recharge failed' });
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: '#E04632' }} /></div>;
  }

  const balance = wallet?.balance_paise ?? 0;
  const held = wallet?.held_paise ?? 0;
  const low = balance < LOW_BALANCE_PAISE;

  return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#E04632,#c83b27)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <WalletIcon size={20} color="white" />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#f1f5f9' }}>Wallet</h2>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Prepaid balance — each WhatsApp message deducts a small per-message fee.</p>
        </div>
      </div>

      {low && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '12px 16px', borderRadius: 10, marginBottom: 16, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24', fontSize: 14 }}>
          <AlertTriangle size={18} /> Your balance is low. Recharge to keep sending WhatsApp messages without interruption.
        </div>
      )}

      {/* Balance + recharge */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ padding: 20, borderRadius: 14, background: '#0f172a', border: '1px solid #1e293b' }}>
          <p style={{ margin: 0, fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Available balance</p>
          <p style={{ margin: '8px 0 0', fontSize: 34, fontWeight: 800, color: low ? '#fbbf24' : '#10b981' }}>{RUPEE(balance)}</p>
          {held > 0 && <p style={{ margin: '6px 0 0', fontSize: 12, color: '#f59e0b' }}>{RUPEE(held)} reserved for in-flight messages</p>}
        </div>

        <div style={{ padding: 20, borderRadius: 14, background: '#0f172a', border: '1px solid #1e293b' }}>
          <p style={{ margin: '0 0 10px', fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recharge</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            {PRESETS.map(v => (
              <button key={v} onClick={() => setAmount(v)} style={{
                padding: '8px 12px', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 600,
                border: `1px solid ${amount === v ? '#E04632' : '#334155'}`,
                background: amount === v ? 'rgba(224,70,50,0.12)' : '#0b1220',
                color: amount === v ? '#E04632' : '#94a3b8',
              }}>₹{v.toLocaleString('en-IN')}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="number" min={1000} step={500} value={amount} onChange={e => setAmount(Math.max(0, Number(e.target.value)))}
              style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0b1220', color: '#e2e8f0', fontSize: 14 }} />
            <button onClick={recharge} disabled={paying} style={{
              padding: '10px 18px', borderRadius: 8, border: 'none', display: 'flex', alignItems: 'center', gap: 6,
              background: 'linear-gradient(135deg,#E04632,#c83b27)', color: 'white', fontWeight: 700, fontSize: 14, cursor: paying ? 'not-allowed' : 'pointer', opacity: paying ? 0.6 : 1,
            }}>
              {paying ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={16} />} Recharge
            </button>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 11, color: '#64748b' }}>Minimum ₹1000. Secure payment via Razorpay.</p>
        </div>
      </div>

      {msg && (
        <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13,
          background: msg.kind === 'err' ? 'rgba(239,68,68,0.1)' : msg.kind === 'ok' ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)',
          border: `1px solid ${msg.kind === 'err' ? '#ef444440' : msg.kind === 'ok' ? '#10b98140' : '#3b82f640'}`,
          color: msg.kind === 'err' ? '#ef4444' : msg.kind === 'ok' ? '#10b981' : '#93c5fd' }}>{msg.text}</div>
      )}

      {/* Pricing */}
      {pricing.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#94a3b8', margin: '0 0 10px' }}>Per-message pricing</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {pricing.map(p => (
              <div key={p.category} style={{ padding: '8px 14px', borderRadius: 8, background: '#0f172a', border: '1px solid #1e293b', fontSize: 13 }}>
                <span style={{ color: '#94a3b8', textTransform: 'capitalize' }}>{p.category}</span>
                <span style={{ color: '#f1f5f9', fontWeight: 700, marginLeft: 8 }}>{RUPEE(p.price_paise)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      <h3 style={{ fontSize: 14, fontWeight: 600, color: '#94a3b8', margin: '0 0 10px' }}>Transaction history</h3>
      <div style={{ borderRadius: 12, border: '1px solid #1e293b', overflow: 'hidden' }}>
        {txns.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: 14 }}>No transactions yet.</div>}
        {txns.map(t => {
          const m = TYPE_META[t.type] || TYPE_META.debit;
          const Icon = m.icon;
          return (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderTop: '1px solid #0f172a', background: '#0b1220' }}>
              <Icon size={18} color={m.color} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14, color: '#e2e8f0' }}>{m.label}{t.meta?.category ? ` · ${t.meta.category}` : ''}</p>
                <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>{new Date(t.created_at).toLocaleString('en-IN')}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: m.color }}>{m.sign}{RUPEE(t.amount_paise)}</p>
                <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>bal {RUPEE(t.balance_after)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
