import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { AuthShell } from './auth/AuthShell';

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

  return (
    <AuthShell headline={<>Every lead, called in <em>60 seconds.</em></>} lead="AI calling agents and WhatsApp, working together for your business, all from one dashboard.">
      <h1 className="rpa-title">Welcome back</h1>
      <p className="rpa-sub">Sign in to continue to your dashboard.</p>

      <form onSubmit={handleSubmit} className="rpa-form">
        {error && <div className="rpa-msg err" role="alert">{error}</div>}

        <div className="rpa-field">
          <label htmlFor="email">Email address</label>
          <div className="rpa-input">
            <Mail size={18} />
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@company.com" />
          </div>
        </div>

        <div className="rpa-field">
          <label htmlFor="password">Password</label>
          <div className="rpa-input">
            <Lock size={18} />
            <input id="password" type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" placeholder="Enter your password" style={{ paddingRight: 50 }} />
            <button type="button" className="rpa-eye" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? 'Hide password' : 'Show password'} title={showPw ? 'Hide password' : 'Show password'}>
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading} className="rpa-btn">
          {loading ? <><Loader2 size={18} className="rpa-spin" /> Signing in…</> : <>Sign in <ArrowRight size={18} /></>}
        </button>
      </form>

      <p className="rpa-switch">New to ReachPeak? <Link to="/signup">Create an account</Link></p>
    </AuthShell>
  );
}
