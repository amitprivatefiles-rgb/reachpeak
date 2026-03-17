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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-4">
            <img src={LOGO_URL} alt="ReachPeak API" className="w-12 h-12 rounded-xl" />
          </Link>
          <h1 className="text-3xl font-bold text-secondary mb-2">Welcome Back</h1>
          <p className="text-secondary-light">Sign in to your ReachPeak API account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-secondary mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-secondary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
                placeholder="you@email.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-secondary mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-secondary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
                placeholder="Enter your password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand text-white py-3 px-4 rounded-xl font-semibold hover:bg-brand-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-secondary-light mt-6">
          Don't have an account?{' '}
          <Link to="/signup" className="text-brand font-medium hover:text-brand-dark transition">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
