import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const LOGO_URL = 'https://i.ibb.co/K3M8zPq/Avatar.png';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#070B14', fontFamily: "'Inter', sans-serif" }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(224,70,50,0.08) 0%, transparent 60%)',
        filter: 'blur(80px)', pointerEvents: 'none',
      }} />

      <div className="w-full max-w-md" style={{ position: 'relative', zIndex: 10 }}>
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6 transition hover:opacity-80">
            <img src={LOGO_URL} alt="ReachPeak" style={{ width: 48, height: 48, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }} />
          </Link>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 }}>
            Welcome back
          </h1>
          <p style={{ color: '#94a3b8', fontSize: 16 }}>Sign in to continue to ReachPeak</p>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: 32,
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                color: '#EF4444', padding: '12px 16px', borderRadius: 12, fontSize: 14, fontWeight: 500,
              }}>
                {error}
              </div>
            )}
            
            <div>
              <label htmlFor="email" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                style={{
                  width: '100%', padding: '14px 16px', borderRadius: 12,
                  background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#f1f5f9', fontSize: 15, outline: 'none', transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#E04632'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>
            
            <div>
              <label htmlFor="password" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{
                  width: '100%', padding: '14px 16px', borderRadius: 12,
                  background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#f1f5f9', fontSize: 15, outline: 'none', transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#E04632'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '14px', borderRadius: 12,
                background: '#E04632', color: 'white', fontWeight: 600, fontSize: 16,
                border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
                transition: 'background 0.2s', marginTop: 8,
              }}
              onMouseOver={(e) => !loading && (e.currentTarget.style.background = '#c83b27')}
              onMouseOut={(e) => !loading && (e.currentTarget.style.background = '#E04632')}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 32, color: '#94a3b8', fontSize: 14 }}>
          Don't have an account?{' '}
          <Link to="/signup" style={{ color: '#E04632', fontWeight: 600, textDecoration: 'none' }}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
