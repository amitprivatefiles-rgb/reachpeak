import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { User, Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { AuthShell } from './auth/AuthShell';

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

  return (
    <AuthShell headline={<>No customer should <em>have to wait.</em></>} lead="Set up in minutes: AI calling agents, WhatsApp automation and a shared inbox, in one place.">
      <h1 className="rpa-title">Create your account</h1>
      <p className="rpa-sub">Put AI calling and WhatsApp to work for your business.</p>

      <form onSubmit={handleSubmit} className="rpa-form" autoComplete="off">
        {error && <div className="rpa-msg err" role="alert">{error}</div>}
        {success && (
          <div className="rpa-msg ok" role="status">
            {success}
            <br /><Link to="/login">Go to login →</Link>
          </div>
        )}

        <div className="rpa-field">
          <label htmlFor="su-name">Full name</label>
          <div className="rpa-input">
            <User size={18} />
            <input id="su-name" type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required autoComplete="name" placeholder="Your full name" />
          </div>
        </div>

        <div className="rpa-field">
          <label htmlFor="su-email">Email address</label>
          <div className="rpa-input">
            <Mail size={18} />
            <input id="su-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required autoComplete="new-password" placeholder="you@company.com" />
          </div>
        </div>

        <div className="rpa-field">
          <label htmlFor="su-pw">Password</label>
          <div className="rpa-input">
            <Lock size={18} />
            <input id="su-pw" type={showPw ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} placeholder="Minimum 6 characters" style={{ paddingRight: 50 }} />
            <button type="button" className="rpa-eye" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? 'Hide password' : 'Show password'}>
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading} className="rpa-btn">
          {loading ? <><Loader2 size={18} className="rpa-spin" /> Creating account…</> : <>Create account <ArrowRight size={18} /></>}
        </button>
        <p className="rpa-note">Next, you’ll choose a plan: ₹2,499/month or ₹14,999/year.</p>
      </form>

      <p className="rpa-switch">Already have an account? <Link to="/login">Sign in</Link></p>
    </AuthShell>
  );
}
