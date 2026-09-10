// @ts-nocheck
import { useEffect, useState, useCallback } from 'react';
import { Wallet as WalletIcon, Plus, Loader2, ArrowDownCircle, ArrowUpCircle, Clock, AlertTriangle, RefreshCw, Gift, ShieldCheck, Sparkles, Check, Zap, Lock, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// 1 token = ₹1 = 100 paise. Balance/pricing are stored in paise.
const TOKENS = (paise: number) => (Number(paise || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const RUPEE = (paise: number) => '₹' + (Number(paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const PRESETS = [5000, 10000, 20000, 50000];
const MIN_RUPEES = 5000;
const LOW_BALANCE_PAISE = 20000; // ₹200 → low-balance banner

// First-recharge welcome offer (mirrors wallet-webhook logic exactly)
const OFFERS = [
  { pay: 10000, tokens: 12000, bonus: 2000, pct: 20, tag: 'Popular' },
  { pay: 20000, tokens: 30000, bonus: 10000, pct: 50, tag: 'Best value' },
];

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
  credit:  { label: 'Tokens added',   color: '#10b981', sign: '+', icon: ArrowUpCircle },
  adjust:  { label: 'Admin credit',   color: '#10b981', sign: '+', icon: ArrowUpCircle },
  debit:   { label: 'Message sent',   color: '#ef4444', sign: '−', icon: ArrowDownCircle },
  hold:    { label: 'Reserved',       color: '#f59e0b', sign: '−', icon: Clock },
  release: { label: 'Released',        color: '#3b82f6', sign: '+', icon: RefreshCw },
};

function txLabel(t: any) {
  const src = t?.meta?.source;
  if (src === 'recharge_bonus') return { label: 'Welcome bonus 🎁', color: '#a855f7', sign: '+', icon: Gift };
  if (src === 'recharge') return { label: 'Tokens purchased', color: '#10b981', sign: '+', icon: ArrowUpCircle };
  return TYPE_META[t.type] || TYPE_META.debit;
}

export function Wallet() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<any>(null);
  const [txns, setTxns] = useState<any[]>([]);
  const [pricing, setPricing] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState(MIN_RUPEES);
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

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel('wallet-' + user.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets', filter: `user_id=eq.${user.id}` }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallet_transactions', filter: `user_id=eq.${user.id}` }, () => loadAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, loadAll]);

  const recharge = async (overrideAmount?: number) => {
    const amt = overrideAmount ?? amount;
    setMsg(null);
    if (amt < MIN_RUPEES) { setMsg({ kind: 'err', text: `Minimum recharge is ₹${MIN_RUPEES.toLocaleString('en-IN')}.` }); return; }
    setPaying(true);
    try {
      const ok = await loadRazorpay();
      if (!ok) throw new Error('Could not load payment gateway. Check your connection.');

      const { data, error } = await supabase.functions.invoke('create-recharge-order', { body: { amount: amt } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const rzp = new (window as any).Razorpay({
        key: data.key_id,
        order_id: data.order_id,
        amount: data.amount_paise,
        currency: data.currency || 'INR',
        name: 'ReachPeak',
        description: `${TOKENS(data.amount_paise)} tokens · WhatsApp messaging`,
        prefill: data.prefill || {},
        theme: { color: '#E04632' },
        handler: () => {
          setMsg({ kind: 'info', text: 'Payment received — adding tokens to your wallet…' });
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
  const hasRecharged = txns.some((t: any) => t.type === 'credit' && (t.meta?.source === 'recharge' || t.meta?.source === 'recharge_bonus'));
  const offerEligible = !hasRecharged;

  const card = { padding: 20, borderRadius: 14, background: '#ffffff', border: '1px solid #e6e8ec' };

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#E04632,#c83b27)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <WalletIcon size={20} color="white" />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Tokens & Wallet</h2>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Tokens power your WhatsApp Business messaging · 1 token = ₹1</p>
        </div>
      </div>

      {low && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '12px 16px', borderRadius: 10, marginBottom: 16, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24', fontSize: 14 }}>
          <AlertTriangle size={18} /> Your token balance is low. Top up to keep your WhatsApp messages sending without interruption.
        </div>
      )}

      {/* Balance card */}
      <div style={{ position: 'relative', overflow: 'hidden', padding: 24, borderRadius: 16, marginBottom: 16, background: 'linear-gradient(135deg,#ffffff,#0f172a)', border: '1px solid #e6e8ec' }}>
        <div style={{ position: 'absolute', right: -30, top: -30, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle,rgba(224,70,50,0.18),transparent 70%)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ margin: 0, fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Available balance</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 8 }}>
              <span style={{ fontSize: 44, fontWeight: 800, lineHeight: 1, color: low ? '#fbbf24' : '#0f172a' }}>{TOKENS(balance)}</span>
              <span style={{ fontSize: 16, fontWeight: 600, color: '#64748b' }}>tokens</span>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: 13, color: '#64748b' }}>≈ {RUPEE(balance)} of messaging{held > 0 ? ` · ${TOKENS(held)} tokens reserved for in-flight messages` : ''}</p>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)' }}>
            <ShieldCheck size={15} color="#10b981" />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#10b981' }}>Tokens never expire</span>
          </div>
        </div>
      </div>

      {/* Welcome offer (first recharge only) */}
      {offerEligible && (
        <div style={{ padding: 20, borderRadius: 16, marginBottom: 16, background: 'linear-gradient(135deg,rgba(168,85,247,0.10),rgba(224,70,50,0.08))', border: '1px solid rgba(168,85,247,0.35)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Gift size={18} color="#c084fc" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Welcome offer — first recharge only</h3>
          </div>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b' }}>Get bonus tokens on your very first top-up. Applied automatically the moment your payment succeeds.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 12 }}>
            {OFFERS.map((o) => (
              <button key={o.pay} onClick={() => recharge(o.pay)} disabled={paying} style={{
                textAlign: 'left', cursor: paying ? 'not-allowed' : 'pointer', opacity: paying ? 0.7 : 1,
                position: 'relative', padding: 18, borderRadius: 14, background: '#0f172a',
                border: `1px solid ${o.pct === 50 ? 'rgba(168,85,247,0.55)' : '#2a3752'}`,
              }}>
                <span style={{ position: 'absolute', top: 12, right: 12, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999, color: o.pct === 50 ? '#e9d5ff' : '#93c5fd', background: o.pct === 50 ? 'rgba(168,85,247,0.2)' : 'rgba(59,130,246,0.15)' }}>{o.tag}</span>
                <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Pay {RUPEE(o.pay * 100)}</p>
                <p style={{ margin: '6px 0 2px', fontSize: 30, fontWeight: 800, color: '#0f172a' }}>{o.tokens.toLocaleString('en-IN')} <span style={{ fontSize: 15, color: '#64748b', fontWeight: 600 }}>tokens</span></p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 6, padding: '3px 9px', borderRadius: 999, background: 'rgba(16,185,129,0.12)' }}>
                  <Sparkles size={13} color="#10b981" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>+{o.bonus.toLocaleString('en-IN')} bonus ({o.pct}% extra)</span>
                </div>
                <p style={{ margin: '12px 0 0', fontSize: 12, fontWeight: 700, color: '#E04632', display: 'flex', alignItems: 'center', gap: 5 }}>
                  {paying ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={13} />} Recharge & claim
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recharge (any amount) */}
      <div style={{ ...card, marginBottom: 16 }}>
        <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: '#1f2937' }}>{offerEligible ? 'Or top up any amount' : 'Add tokens'}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {PRESETS.map(v => (
            <button key={v} onClick={() => setAmount(v)} style={{
              padding: '8px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 600,
              border: `1px solid ${amount === v ? '#E04632' : '#d1d5db'}`,
              background: amount === v ? 'rgba(224,70,50,0.12)' : '#0f172a',
              color: amount === v ? '#E04632' : '#64748b',
            }}>{v.toLocaleString('en-IN')} tokens</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#64748b' }}>₹</span>
            <input type="number" min={MIN_RUPEES} step={500} value={amount} onChange={e => setAmount(Math.max(0, Number(e.target.value)))}
              style={{ width: '100%', padding: '10px 12px 10px 26px', borderRadius: 8, border: '1px solid #d1d5db', background: '#0f172a', color: '#1f2937', fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          <button onClick={() => recharge()} disabled={paying} style={{
            padding: '10px 20px', borderRadius: 8, border: 'none', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
            background: 'linear-gradient(135deg,#E04632,#c83b27)', color: 'white', fontWeight: 700, fontSize: 14, cursor: paying ? 'not-allowed' : 'pointer', opacity: paying ? 0.6 : 1,
          }}>
            {paying ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={16} />} Get {TOKENS(amount * 100)} tokens
          </button>
        </div>
        <p style={{ margin: '8px 0 0', fontSize: 11, color: '#64748b' }}>Minimum ₹{MIN_RUPEES.toLocaleString('en-IN')} · 1 token = ₹1 · GST invoice issued for every payment.</p>
      </div>

      {msg && (
        <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13,
          background: msg.kind === 'err' ? 'rgba(239,68,68,0.1)' : msg.kind === 'ok' ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)',
          border: `1px solid ${msg.kind === 'err' ? '#ef444440' : msg.kind === 'ok' ? '#10b98140' : '#3b82f640'}`,
          color: msg.kind === 'err' ? '#ef4444' : msg.kind === 'ok' ? '#10b981' : '#93c5fd' }}>{msg.text}</div>
      )}

      {/* Trust strip */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        {[
          { icon: Lock, text: 'Secure checkout by Razorpay' },
          { icon: ShieldCheck, text: 'PCI-DSS compliant payments' },
          { icon: Check, text: 'Official WhatsApp Business Platform' },
        ].map((b, i) => (
          <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 12px', borderRadius: 10, background: '#ffffff', border: '1px solid #e6e8ec', fontSize: 12.5, color: '#64748b' }}>
            <b.icon size={15} color="#10b981" /> {b.text}
          </div>
        ))}
      </div>

      {/* Honest disclosure */}
      <div style={{ display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 10, marginBottom: 24, background: '#0f172a', border: '1px solid #e6e8ec' }}>
        <Info size={16} color="#64748b" style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: '#64748b' }}>
          Messages are delivered through Meta's official WhatsApp Business Platform, which charges per conversation. ReachPeak converts that usage into tokens and bills you for it. Payments are processed securely by Razorpay; <strong style={{ color: '#64748b' }}>ReachPeak is the merchant of record</strong> and issues your GST invoice.
        </p>
      </div>

      {/* Per-message pricing */}
      {pricing.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#64748b', margin: '0 0 10px' }}>What each message costs</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {pricing.map((p: any) => (
              <div key={p.category} style={{ padding: '8px 14px', borderRadius: 8, background: '#ffffff', border: '1px solid #e6e8ec', fontSize: 13 }}>
                <span style={{ color: '#64748b', textTransform: 'capitalize' }}>{p.category}</span>
                <span style={{ color: '#0f172a', fontWeight: 700, marginLeft: 8 }}>{p.price_paise === 0 ? 'Free' : `${TOKENS(p.price_paise)} tokens`}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      <h3 style={{ fontSize: 14, fontWeight: 600, color: '#64748b', margin: '0 0 10px' }}>Transaction history</h3>
      <div style={{ borderRadius: 12, border: '1px solid #e6e8ec', overflow: 'hidden' }}>
        {txns.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: 14 }}>No transactions yet.</div>}
        {txns.map((t: any) => {
          const m = txLabel(t);
          const Icon = m.icon;
          return (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderTop: '1px solid #ffffff', background: '#0f172a' }}>
              <Icon size={18} color={m.color} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14, color: '#1f2937' }}>{m.label}{t.meta?.category ? ` · ${t.meta.category}` : ''}</p>
                <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>{new Date(t.created_at).toLocaleString('en-IN')}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: m.color }}>{m.sign}{TOKENS(t.amount_paise)} <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>tokens</span></p>
                <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>bal {TOKENS(t.balance_after)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
