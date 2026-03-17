import { Link } from 'react-router-dom';

const LOGO_URL = 'https://i.ibb.co/K3M8zPq/Avatar.png';

export function PublicFooter() {
  return (
    <footer className="bg-secondary text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <img src={LOGO_URL} alt="ReachPeak API" className="w-9 h-9 rounded-lg" />
              <span className="text-xl font-bold text-white">ReachPeak API</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Scale your WhatsApp marketing like never before. Affordable, powerful, and built for growing businesses.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Platform</h4>
            <ul className="space-y-3">
              {[
                { to: '/', label: 'Home' },
                { to: '/about', label: 'About' },
                { to: '/pricing', label: 'Pricing' },
                { to: '/contact', label: 'Contact' },
              ].map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-gray-400 hover:text-brand transition">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Legal</h4>
            <ul className="space-y-3">
              {[
                { to: '/privacy-policy', label: 'Privacy Policy' },
                { to: '/terms', label: 'Terms & Conditions' },
                { to: '/refund-policy', label: 'Refund Policy' },
              ].map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-gray-400 hover:text-brand transition">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Get Started</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/signup" className="text-sm text-gray-400 hover:text-brand transition">
                  Create Account
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-sm text-gray-400 hover:text-brand transition">
                  Log In
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-sm text-gray-400 hover:text-brand transition">
                  View Plans
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-700/50">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} ReachPeak API. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
