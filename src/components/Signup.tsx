import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { User, Mail, Lock, Eye, EyeOff, Loader2, Check, ArrowRight } from 'lucide-react';

const LOGO_URL = 'https://i.ibb.co/K3M8zPq/Avatar.png';

const FEATURES = [
  'Bulk campaigns & automated journeys',
  'Order Guard — COD fraud & RTO protection',
  'Prepaid wallet, live analytics & shared Inbox',
];

export function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: '', email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { full_name: form.full_name } },
      });
      if (signUpError) {
        if (signUpError.message?.toLowerCase().includes('rate limit') || signUpError.message?.toLowerCase().includes('email')) {
          throw new Error('Too many signup attempts. Please wait a few minutes and try again, or contact the admin to create your account.');
        }
        throw signUpError;
      }
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        throw new Error('An account with this email already exists. Please log in instead.');
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });
      if (signInError) {
        setSuccess('Account created! Please check your email to confirm your account, then log in to start.');
        return;
      }
      navigate('/app');
    } catch (err: any) {
      setError(err.message || 'Error creating account');
    } finally {
      setLoading(false);
    }
  };

  const inputWrap: React.CSSProperties = { position: 'relative', display: 'flex', alignItems: 'center' };
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '13px 14px 13px 44px', borderRadius: 12,
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.10)',
    color: '#f1f5f9', fontSize: 15, outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s', boxSizing: 'border-box',
  };
  const focusOn = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = '#E04632'; e.target.style.boxShadow = '0 0 0 3px rgba(224,70,50,0.15)'; };
  const focusOff = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = 'rgba(255,255,255,0.10)'; e.target.style.boxShadow = 'none'; };

  return (
    <div style={{ height: '100dvh', display: 'flex', overflow: 'hidden', background: '#070B14', fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        .rp-login-brand { display: none; }
        .rp-login-mobilehead { display: flex; }
        @media (min-width: 920px) { .rp-login-brand { display: flex; } .rp-login-mobilehead { display: none; } }
        .rp-login-input::placeholder { color: #64748b; }
        .rp-login-form { overflow-y: auto; }
      `}</style>

      {/* Brand panel */}
      <div className="rp-login-brand" style={{ flex: '1.05', position: 'relative', flexDirection: 'column', justifyContent: 'space-between', padding: '48px 52px', overflow: 'hidden', background: 'linear-gradient(150deg,#0b1424 0%,#0a1020 55%,#120b12 100%)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ position: 'absolute', top: -120, right: -80, width: 460, height: 460, borderRadius: '50%', background: 'radial-gradient(circle,rgba(224,70,50,0.16),transparent 68%)', filter: 'blur(8px)' }} />
        <div style={{ position: 'absolute', bottom: -140, left: -100, width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle,rgba(16,185,129,0.12),transparent 70%)', filter: 'blur(8px)' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={LOGO_URL} alt="" style={{ width: 42, height: 42, borderRadius: 11, border: '1px solid rgba(255,255,255,0.12)' }} />
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.01em' }}>ReachPeak</span>
        </div>
        <div style={{ position: 'relative', maxWidth: 440 }}>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 38, lineHeight: 1.12, fontWeight: 700, color: '#f8fafc', margin: 0, letterSpacing: '-0.02em' }}>
            Start scaling on WhatsApp today.
          </h2>
          <p style={{ color: '#94a3b8', fontSize: 16, lineHeight: 1.6, margin: '18px 0 28px' }}>Set up in minutes — campaigns, automations, and fraud protection in one place.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {FEATURES.map((f) => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 24, height: 24, borderRadius: 7, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Check size={14} color="#10b981" />
                </span>
                <span style={{ color: '#cbd5e1', fontSize: 15 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
        <p style={{ position: 'relative', color: '#475569', fontSize: 13, margin: 0 }}>© {new Date().getFullYear()} ReachPeak · WhatsApp Business Platform</p>
      </div>

      {/* Form panel */}
      <div className="rp-login-form" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div className="rp-login-mobilehead" style={{ alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 22 }}>
            <img src={LOGO_URL} alt="" style={{ width: 40, height: 40, borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)' }} />
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 19, fontWeight: 700, color: '#f1f5f9' }}>ReachPeak</span>
          </div>

          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, color: '#f8fafc', margin: '0 0 6px', letterSpacing: '-0.01em' }}>Create your account</h1>
          <p style={{ color: '#94a3b8', fontSize: 15, margin: '0 0 24px' }}>Start scaling your WhatsApp revenue</p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }} autoComplete="off">
            {error && <div style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', padding: '11px 14px', borderRadius: 10, fontSize: 13.5, fontWeight: 500 }}>{error}</div>}
            {success && (
              <div style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.25)', color: '#34d399', padding: '11px 14px', borderRadius: 10, fontSize: 13.5, fontWeight: 500 }}>
                {success}
                <Link to="/login" style={{ display: 'block', marginTop: 8, color: '#34d399', fontWeight: 700, textDecoration: 'none' }}>Go to Login →</Link>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#94a3b8', marginBottom: 7 }}>Full name</label>
              <div style={inputWrap}>
                <User size={17} color="#64748b" style={{ position: 'absolute', left: 15, pointerEvents: 'none' }} />
                <input className="rp-login-input" type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required placeholder="Your full name" style={inputStyle} onFocus={focusOn} onBlur={focusOff} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#94a3b8', marginBottom: 7 }}>Email address</label>
              <div style={inputWrap}>
                <Mail size={17} color="#64748b" style={{ position: 'absolute', left: 15, pointerEvents: 'none' }} />
                <input className="rp-login-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required autoComplete="new-password" placeholder="you@company.com" style={inputStyle} onFocus={focusOn} onBlur={focusOff} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#94a3b8', marginBottom: 7 }}>Password</label>
              <div style={inputWrap}>
                <Lock size={17} color="#64748b" style={{ position: 'absolute', left: 15, pointerEvents: 'none' }} />
                <input className="rp-login-input" type={showPw ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} placeholder="Minimum 6 characters" style={{ ...inputStyle, paddingRight: 46 }} onFocus={focusOn} onBlur={focusOff} />
                <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? 'Hide password' : 'Show password'} style={{ position: 'absolute', right: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} style={{ width: '100%', padding: '13px', borderRadius: 12, marginTop: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'linear-gradient(135deg,#E04632,#c83b27)', color: 'white', fontWeight: 700, fontSize: 15, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.75 : 1, boxShadow: '0 8px 24px rgba(224,70,50,0.25)' }}>
              {loading ? <><Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} /> Creating account…</> : <>Create account <ArrowRight size={17} /></>}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 22, color: '#94a3b8', fontSize: 14 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#f87171', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
