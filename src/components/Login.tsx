import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, Eye, EyeOff, Loader2, Check, ArrowRight } from 'lucide-react';

const LOGO_URL = 'https://i.ibb.co/K3M8zPq/Avatar.png';

const FEATURES = [
  'Bulk campaigns & automated journeys',
  'Order Guard — COD fraud & RTO protection',
  'Prepaid wallet, live analytics & shared Inbox',
];

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
    } catch {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const inputWrap: React.CSSProperties = { position: 'relative', display: 'flex', alignItems: 'center' };
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '13px 14px 13px 44px', borderRadius: 12,
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.10)',
    color: '#f1f5f9', fontSize: 15, outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
    boxSizing: 'border-box',
  };
  const focusOn = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = '#E04632';
    e.target.style.boxShadow = '0 0 0 3px rgba(224,70,50,0.15)';
  };
  const focusOff = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = 'rgba(255,255,255,0.10)';
    e.target.style.boxShadow = 'none';
  };

  return (
    <div style={{ height: '100dvh', display: 'flex', overflow: 'hidden', background: '#070B14', fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        .rp-login-brand { display: none; }
        .rp-login-mobilehead { display: flex; }
        @media (min-width: 920px) {
          .rp-login-brand { display: flex; }
          .rp-login-mobilehead { display: none; }
        }
        .rp-login-input::placeholder { color: #64748b; }
        .rp-login-form { overflow-y: auto; }
      `}</style>

      {/* ── Brand panel (desktop) ── */}
      <div className="rp-login-brand" style={{
        flex: '1.05', position: 'relative', flexDirection: 'column', justifyContent: 'space-between',
        padding: '48px 52px', overflow: 'hidden',
        background: 'linear-gradient(150deg,#0b1424 0%,#0a1020 55%,#120b12 100%)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ position: 'absolute', top: -120, right: -80, width: 460, height: 460, borderRadius: '50%', background: 'radial-gradient(circle,rgba(224,70,50,0.16),transparent 68%)', filter: 'blur(8px)' }} />
        <div style={{ position: 'absolute', bottom: -140, left: -100, width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle,rgba(16,185,129,0.12),transparent 70%)', filter: 'blur(8px)' }} />

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={LOGO_URL} alt="" style={{ width: 42, height: 42, borderRadius: 11, border: '1px solid rgba(255,255,255,0.12)' }} />
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.01em' }}>ReachPeak</span>
        </div>

        <div style={{ position: 'relative', maxWidth: 440 }}>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 38, lineHeight: 1.12, fontWeight: 700, color: '#f8fafc', margin: 0, letterSpacing: '-0.02em' }}>
            Turn WhatsApp into your growth engine.
          </h2>
          <p style={{ color: '#94a3b8', fontSize: 16, lineHeight: 1.6, margin: '18px 0 28px' }}>
            Campaigns, order automation, and fraud protection — all from one dashboard.
          </p>
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

      {/* ── Form panel ── */}
      <div className="rp-login-form" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          {/* Mobile logo header */}
          <div className="rp-login-mobilehead" style={{ alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 22 }}>
            <img src={LOGO_URL} alt="" style={{ width: 40, height: 40, borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)' }} />
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 19, fontWeight: 700, color: '#f1f5f9' }}>ReachPeak</span>
          </div>

          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, color: '#f8fafc', margin: '0 0 6px', letterSpacing: '-0.01em' }}>Welcome back</h1>
          <p style={{ color: '#94a3b8', fontSize: 15, margin: '0 0 26px' }}>Sign in to continue to your dashboard</p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error && (
              <div style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', padding: '11px 14px', borderRadius: 10, fontSize: 13.5, fontWeight: 500 }}>
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#94a3b8', marginBottom: 7 }}>Email address</label>
              <div style={inputWrap}>
                <Mail size={17} color="#64748b" style={{ position: 'absolute', left: 15, pointerEvents: 'none' }} />
                <input id="email" className="rp-login-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@company.com" style={inputStyle} onFocus={focusOn} onBlur={focusOff} />
              </div>
            </div>

            <div>
              <label htmlFor="password" style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#94a3b8', marginBottom: 7 }}>Password</label>
              <div style={inputWrap}>
                <Lock size={17} color="#64748b" style={{ position: 'absolute', left: 15, pointerEvents: 'none' }} />
                <input id="password" className="rp-login-input" type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" placeholder="Enter your password" style={{ ...inputStyle, paddingRight: 46 }} onFocus={focusOn} onBlur={focusOff} />
                <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? 'Hide password' : 'Show password'} title={showPw ? 'Hide password' : 'Show password'}
                  style={{ position: 'absolute', right: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '13px', borderRadius: 12, marginTop: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: 'linear-gradient(135deg,#E04632,#c83b27)', color: 'white', fontWeight: 700, fontSize: 15, border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.75 : 1, boxShadow: '0 8px 24px rgba(224,70,50,0.25)', transition: 'opacity 0.15s' }}>
              {loading ? <><Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} /> Signing in…</> : <>Sign in <ArrowRight size={17} /></>}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 24, color: '#94a3b8', fontSize: 14 }}>
            Don't have an account?{' '}
            <Link to="/signup" style={{ color: '#f87171', fontWeight: 600, textDecoration: 'none' }}>Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
