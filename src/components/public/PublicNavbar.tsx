import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const LOGO_URL = 'https://i.ibb.co/K3M8zPq/Avatar.png';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/contact', label: 'Contact' },
];

export function PublicNavbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={LOGO_URL} alt="ReachPeak API" className="w-9 h-9 rounded-lg" />
            <span className="text-xl font-bold text-brand">ReachPeak API</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-medium transition ${
                  location.pathname === link.to
                    ? 'text-brand'
                    : 'text-secondary-light hover:text-brand'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-medium text-secondary hover:text-brand transition"
            >
              Log In
            </Link>
            <Link
              to="/signup"
              className="px-5 py-2.5 text-sm font-medium text-white bg-brand rounded-lg hover:bg-brand-dark transition"
            >
              Sign Up
            </Link>
          </div>

          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 text-secondary-light hover:text-brand transition"
          >
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden bg-white border-t border-gray-200 animate-fade-in">
          <div className="px-4 py-4 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                  location.pathname === link.to
                    ? 'bg-brand-lighter text-brand'
                    : 'text-secondary-light hover:bg-gray-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-gray-100 space-y-2">
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="block px-4 py-2.5 text-center text-sm font-medium text-secondary hover:text-brand transition"
              >
                Log In
              </Link>
              <Link
                to="/signup"
                onClick={() => setOpen(false)}
                className="block px-4 py-2.5 text-center text-sm font-medium text-white bg-brand rounded-lg hover:bg-brand-dark transition"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
