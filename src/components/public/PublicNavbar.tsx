import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ArrowRight } from 'lucide-react';

const LOGO_URL = 'https://i.ibb.co/K3M8zPq/Avatar.png';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/use-cases', label: 'Use Cases' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/contact', label: 'Contact' },
];

export function PublicNavbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setOpen(false); }, [location.pathname]);

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'glass border-b border-gray-200/50 shadow-sm'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-18">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img src={LOGO_URL} alt="ReachPeak API" className="w-9 h-9 rounded-lg transition-transform group-hover:scale-110" />
            <span className="text-xl font-bold text-brand">ReachPeak<span className="text-secondary"> API</span></span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                  location.pathname === link.to
                    ? 'text-brand bg-brand/5'
                    : 'text-secondary-light hover:text-brand hover:bg-brand/5'
                }`}
              >
                {link.label}
                {location.pathname === link.to && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-brand rounded-full" />
                )}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className="px-5 py-2.5 text-sm font-medium text-secondary hover:text-brand transition-colors duration-300"
            >
              Log In
            </Link>
            <Link
              to="/signup"
              className="group px-5 py-2.5 text-sm font-semibold text-white bg-brand rounded-xl hover:bg-brand-dark transition-all duration-300 hover:shadow-lg hover:shadow-brand/25 flex items-center gap-2"
            >
              Get Started
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 text-secondary-light hover:text-brand transition rounded-lg hover:bg-brand/5"
          >
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ${
          open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="glass border-t border-gray-200/50 px-4 py-4 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`block px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                location.pathname === link.to
                  ? 'bg-brand/10 text-brand'
                  : 'text-secondary-light hover:bg-gray-50'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-3 border-t border-gray-100 space-y-2">
            <Link
              to="/login"
              className="block px-4 py-3 text-center text-sm font-medium text-secondary hover:text-brand transition rounded-xl"
            >
              Log In
            </Link>
            <Link
              to="/signup"
              className="block px-4 py-3 text-center text-sm font-semibold text-white bg-brand rounded-xl hover:bg-brand-dark transition"
            >
              Get Started →
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
