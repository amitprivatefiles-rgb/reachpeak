import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const LOGO_URL = 'https://i.ibb.co/K3M8zPq/Avatar.png';

export function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Clear any existing auth session so signup starts completely fresh
  // This prevents the admin's email from being autofilled when they visit /signup
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        supabase.auth.signOut();
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { full_name: form.full_name },
        },
      });
      if (signUpError) throw signUpError;
      navigate('/select-plan');
    } catch (err: any) {
      setError(err.message || 'Error creating account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-4">
            <img src={LOGO_URL} alt="ReachPeak API" className="w-12 h-12 rounded-xl" />
          </Link>
          <h1 className="text-3xl font-bold text-secondary mb-2">Create Your Account</h1>
          <p className="text-secondary-light">Start scaling your WhatsApp marketing today</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
          <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-secondary mb-1.5">Full Name</label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-secondary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary mb-1.5">Email Address</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                autoComplete="new-password"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-secondary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
                placeholder="you@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary mb-1.5">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={6}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-secondary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
                placeholder="Minimum 6 characters"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand text-white py-3 px-4 rounded-xl font-semibold hover:bg-brand-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-secondary-light mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-brand font-medium hover:text-brand-dark transition">
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
}
