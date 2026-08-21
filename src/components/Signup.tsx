import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const LOGO_URL = 'https://i.ibb.co/K3M8zPq/Avatar.png';

export function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: '', email: '', password: '' });
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
        options: {
          data: { full_name: form.full_name },
        },
      });
      if (signUpError) {
        if (signUpError.message?.toLowerCase().includes('rate limit') || signUpError.message?.toLowerCase().includes('email')) {
          throw new Error('Too many signup attempts. Please wait a few minutes and try again, or contact the admin to create your account.');
        }
        throw signUpError;
      }

      // If user was created but identities is empty, email already exists
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        throw new Error('An account with this email already exists. Please log in instead.');
      }

      // Try to auto-login immediately (works if email confirmation is disabled)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });

      if (signInError) {
        // Email confirmation is enabled — user needs to confirm email first
        setSuccess(
          'Account created successfully! Please check your email to confirm your account, then log in to start.'
        );
        return;
      }

      // Auto-login succeeded — straight into the dashboard (no approval / plan selection)
      navigate('/app');
    } catch (err: any) {
      setError(err.message || 'Error creating account');
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
            Create your account
          </h1>
          <p style={{ color: '#94a3b8', fontSize: 16 }}>Start scaling your WhatsApp revenue</p>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: 32,
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }} autoComplete="off">
            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                color: '#EF4444', padding: '12px 16px', borderRadius: 12, fontSize: 14, fontWeight: 500,
              }}>
                {error}
              </div>
            )}
            {success && (
              <div style={{
                background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
                color: '#10B981', padding: '12px 16px', borderRadius: 12, fontSize: 14, fontWeight: 500,
              }}>
                {success}
                <Link to="/login" style={{ display: 'block', marginTop: 8, color: '#10B981', fontWeight: 600, textDecoration: 'none' }}>
                  Go to Login →
                </Link>
              </div>
            )}
            
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                Full Name
              </label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                required
                placeholder="Your full name"
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
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                Email Address
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                autoComplete="new-password"
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
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                Password
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={6}
                placeholder="Minimum 6 characters"
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
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 32, color: '#94a3b8', fontSize: 14 }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#E04632', fontWeight: 600, textDecoration: 'none' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
