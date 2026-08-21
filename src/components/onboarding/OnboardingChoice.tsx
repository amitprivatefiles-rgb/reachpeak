// @ts-nocheck
import { useEffect, useState, useCallback } from 'react';
import { Loader2, CheckCircle2, Circle, CreditCard, Wallet as WalletIcon, ArrowLeft, RefreshCw, Phone, MessageCircle, Shield, Zap } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ConnectWhatsApp } from '../ConnectWhatsApp';

const SUPPORT_PHONE_DISPLAY = '+91 85830 21893';
const SUPPORT_PHONE_WA = '918583021893';

const card = { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 16, padding: 24 };
const brand = '#E04632';

function StepRow({ done, label, sub }: { done: boolean; label: string; sub?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0' }}>
      {done ? <CheckCircle2 size={20} color="#10b981" style={{ flexShrink: 0, marginTop: 1 }} />
            : <Circle size={20} color="#475569" style={{ flexShrink: 0, marginTop: 1 }} />}
      <div>
        <p style={{ margin: 0, fontSize: 14, color: done ? '#e2e8f0' : '#94a3b8', fontWeight: done ? 600 : 400 }}>{label}</p>
        {sub && <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#64748b', lineHeight: 1.5 }}>{sub}</p>}
      </div>
    </div>
  );
}

export function OnboardingChoice({ onComplete }: { onComplete?: () => void }) {
  const [view, setView] = useState<'loading' | 'choose' | 'own_billing' | 'wallet' | 'connected'>('loading');
  const [status, setStatus] = useState<any>(null);
  const [connectedAcct, setConnectedAcct] = useState<any>(null);
  const [checking, setChecking] = useState(false);
  const [walletMsg, setWalletMsg] = useState('');
  const [savingWallet, setSavingWallet] = useState(false);

  // Load: if a WhatsApp number is already connected, show the connected state.
  // Otherwise fall back to the saved onboarding choice (or the chooser).
  useEffect(() => {
    (async () => {
      const { data: acct } = await supabase.from('whatsapp_accounts')
        .select('display_phone_number, verified_name, status, onboarded_via')
        .eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (acct) { setConnectedAcct(acct); setView('connected'); return; }

      const { data } = await supabase.functions.invoke('support', { body: { action: 'get_status' } });
      const choice = data?.onboarding_choice;
      if (choice === 'own_billing') setView('own_billing');
      else if (choice === 'wallet') setView('wallet');
      else setView('choose');
    })();
  }, []);

  const choose = async (choice: 'own_billing' | 'wallet') => {
    setView(choice);
    await supabase.functions.invoke('support', { body: { action: 'set_onboarding_choice', choice } });
    if (choice === 'own_billing') checkStatus();
  };

  const checkStatus = useCallback(async () => {
    setChecking(true);
    const { data } = await supabase.functions.invoke('check-waba-payment', { body: {} });
    setStatus(data || null);
    setChecking(false);
  }, []);

  const confirmWallet = async () => {
    setSavingWallet(true); setWalletMsg('');
    const { data, error } = await supabase.functions.invoke('support', { body: { action: 'set_onboarding_choice', choice: 'wallet' } });
    setSavingWallet(false);
    if (error || data?.error) setWalletMsg('Could not notify support. Please message us on WhatsApp.');
    else setWalletMsg('✓ Request sent! Our team will reach out on WhatsApp to set up your managed wallet.');
  };

  if (view === 'loading') {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}><Loader2 size={26} style={{ animation: 'spin 1s linear infinite', color: brand }} /></div>;
  }

  // ─────────────── ALREADY CONNECTED ───────────────
  if (view === 'connected') {
    return (
      <div style={{ maxWidth: 620, margin: '0 auto' }}>
        <div style={{ ...card, textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <CheckCircle2 size={30} color="#10b981" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', margin: '0 0 8px' }}>WhatsApp connected</h1>
          <p style={{ fontSize: 14.5, color: '#94a3b8', lineHeight: 1.6, margin: '0 0 18px' }}>
            Your WhatsApp Business number is set up and ready to send.
          </p>
          <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 6, padding: '14px 22px', borderRadius: 12, background: '#0b1220', border: '1px solid #1e293b', marginBottom: 20 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>{connectedAcct?.display_phone_number || 'Number connected'}</span>
            {connectedAcct?.verified_name && <span style={{ fontSize: 13, color: '#94a3b8' }}>{connectedAcct.verified_name}</span>}
            <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>● {connectedAcct?.status === 'connected' ? 'Active' : (connectedAcct?.status || 'Connected')}{connectedAcct?.onboarded_via === 'managed' ? ' · Managed by ReachPeak' : ''}</span>
          </div>
          <div>
            <button onClick={() => onComplete?.()} style={{ padding: '12px 28px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
              Go to dashboard →
            </button>
          </div>
          <p style={{ fontSize: 12.5, color: '#64748b', marginTop: 18 }}>
            Need to change your setup? <a href={`https://wa.me/${SUPPORT_PHONE_WA}`} target="_blank" rel="noreferrer" style={{ color: brand }}>Contact support</a>
          </p>
        </div>
      </div>
    );
  }

  // ─────────────── CHOICE SCREEN ───────────────
  if (view === 'choose') {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9', margin: '0 0 8px' }}>How do you want to send WhatsApp?</h1>
          <p style={{ fontSize: 15, color: '#94a3b8', margin: 0 }}>Choose the setup that fits you. You can switch later by contacting support.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 20 }}>
          {/* Option A */}
          <div style={{ ...card, display: 'flex', flexDirection: 'column' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <CreditCard size={22} color="#10b981" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', margin: '0 0 6px' }}>Use my own WhatsApp billing</h3>
            <p style={{ fontSize: 13.5, color: '#94a3b8', lineHeight: 1.6, margin: '0 0 14px' }}>
              Connect your own WhatsApp Business number in a couple of minutes. You self-manage everything and Meta bills you directly.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li style={{ display: 'flex', gap: 8, fontSize: 13, color: '#cbd5e1' }}><Zap size={15} color="#10b981" /> Instant self-serve setup</li>
              <li style={{ display: 'flex', gap: 8, fontSize: 13, color: '#cbd5e1' }}><Shield size={15} color="#10b981" /> 1,000 free conversations/month from Meta</li>
              <li style={{ display: 'flex', gap: 8, fontSize: 13, color: '#cbd5e1' }}><CheckCircle2 size={15} color="#10b981" /> You stay in full control of your number</li>
            </ul>
            <button onClick={() => choose('own_billing')} style={{ marginTop: 'auto', padding: '12px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
              Connect my number →
            </button>
          </div>

          {/* Option C */}
          <div style={{ ...card, display: 'flex', flexDirection: 'column' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(224,70,50,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <WalletIcon size={22} color={brand} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', margin: '0 0 6px' }}>Managed Wallet plan</h3>
            <p style={{ fontSize: 13.5, color: '#94a3b8', lineHeight: 1.6, margin: '0 0 14px' }}>
              We set everything up for you under our verified account. You just prepay a wallet — no Meta billing to manage yourself.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li style={{ display: 'flex', gap: 8, fontSize: 13, color: '#cbd5e1' }}><Shield size={15} color={brand} /> We handle all Meta setup & billing</li>
              <li style={{ display: 'flex', gap: 8, fontSize: 13, color: '#cbd5e1' }}><WalletIcon size={15} color={brand} /> Simple prepaid wallet, pay per message</li>
              <li style={{ display: 'flex', gap: 8, fontSize: 13, color: '#cbd5e1' }}><Phone size={15} color={brand} /> Personal onboarding by our team</li>
            </ul>
            <button onClick={() => choose('wallet')} style={{ marginTop: 'auto', padding: '12px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg,${brand},#c83b27)`, color: 'white', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
              Get managed setup →
            </button>
          </div>
        </div>
        <p style={{ textAlign: 'center', fontSize: 13, color: '#64748b', marginTop: 20 }}>
          Not sure? <a href={`https://wa.me/${SUPPORT_PHONE_WA}`} target="_blank" rel="noreferrer" style={{ color: brand }}>Chat with us on WhatsApp</a> — {SUPPORT_PHONE_DISPLAY}
        </p>
      </div>
    );
  }

  // ─────────────── OPTION A — connect + live status ───────────────
  if (view === 'own_billing') {
    const s = status?.steps || {};
    return (
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <button onClick={() => setView('choose')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 13, marginBottom: 16 }}>
          <ArrowLeft size={15} /> Back to options
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', margin: '0 0 6px' }}>Connect your WhatsApp number</h1>
        <p style={{ fontSize: 14, color: '#94a3b8', margin: '0 0 20px' }}>One-click secure signup through Meta. Meta bills you directly — your first 1,000 conversations each month are free.</p>

        <div style={{ marginBottom: 20 }}>
          <ConnectWhatsApp onConnected={checkStatus} />
        </div>

        {/* Live status */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Setup status</h3>
            <button onClick={checkStatus} disabled={checking} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#0b1220', border: '1px solid #334155', color: '#cbd5e1', borderRadius: 8, padding: '6px 12px', fontSize: 12.5, cursor: 'pointer' }}>
              {checking ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={13} />} Re-check
            </button>
          </div>
          <StepRow done={!!s.connected} label="WhatsApp number connected" sub={status?.account?.phone ? `${status.account.phone}${status.account.name ? ' · ' + status.account.name : ''}` : 'Complete the signup above.'} />
          <StepRow done={!!s.registered} label="Number verified & registered" sub="Meta confirms your number is ready for the Cloud API." />
          <StepRow done={!!s.ready} label="Ready to send" sub={status?.guidance || 'Once verified, you can start sending. Add a payment method in WhatsApp Manager to send beyond the free tier.'} />

          {status && !s.ready && s.connected && (
            <div style={{ marginTop: 14, padding: 14, borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
              <p style={{ margin: '0 0 8px', fontSize: 13.5, fontWeight: 700, color: '#fbbf24' }}>Add a payment method (optional until you exceed the free tier)</p>
              <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.7 }}>
                <li>Open <a href="https://business.facebook.com/wa/manage/" target="_blank" rel="noreferrer" style={{ color: brand }}>WhatsApp Manager</a></li>
                <li>Go to <strong>Billing &amp; payments</strong> → <strong>Add payment method</strong></li>
                <li>Add your card/UPI, then click <strong>Re-check</strong> above</li>
              </ol>
            </div>
          )}

          {status && s.ready && (
            <button onClick={() => onComplete?.()} style={{ marginTop: 14, width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
              Go to dashboard →
            </button>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 12.5, color: '#64748b', marginTop: 16 }}>
          Stuck? <a href={`https://wa.me/${SUPPORT_PHONE_WA}`} target="_blank" rel="noreferrer" style={{ color: brand }}>Message support</a>
        </p>
      </div>
    );
  }

  // ─────────────── OPTION C — managed wallet ───────────────
  return (
    <div style={{ maxWidth: 620, margin: '0 auto' }}>
      <button onClick={() => setView('choose')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 13, marginBottom: 16 }}>
        <ArrowLeft size={15} /> Back to options
      </button>
      <div style={{ ...card, textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(224,70,50,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <WalletIcon size={28} color={brand} />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', margin: '0 0 8px' }}>Managed Wallet setup</h1>
        <p style={{ fontSize: 14.5, color: '#94a3b8', lineHeight: 1.6, margin: '0 0 20px' }}>
          Our team sets up your WhatsApp under our verified account and configures your prepaid wallet. This is a guided, hands-on setup — just let us know and we'll take it from here.
        </p>

        <button onClick={confirmWallet} disabled={savingWallet} style={{ width: '100%', padding: '13px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg,${brand},#c83b27)`, color: 'white', fontWeight: 700, fontSize: 15, cursor: savingWallet ? 'not-allowed' : 'pointer', opacity: savingWallet ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {savingWallet ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <MessageCircle size={16} />} Request managed setup
        </button>

        {walletMsg && <p style={{ marginTop: 14, fontSize: 13.5, color: walletMsg.startsWith('✓') ? '#10b981' : '#ef4444' }}>{walletMsg}</p>}

        <div style={{ marginTop: 22, paddingTop: 20, borderTop: '1px solid #1e293b' }}>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 10px' }}>Or reach us directly:</p>
          <a href={`https://wa.me/${SUPPORT_PHONE_WA}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10, background: '#0b1220', border: '1px solid #334155', color: '#25D366', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
            <MessageCircle size={17} /> WhatsApp us · {SUPPORT_PHONE_DISPLAY}
          </a>
        </div>
      </div>
    </div>
  );
}
