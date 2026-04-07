import { Link } from 'react-router-dom';
import { Mail, Phone, ArrowRight } from 'lucide-react';

const LOGO_URL = 'https://i.ibb.co/K3M8zPq/Avatar.png';

export function PublicFooter() {
  return (
    <footer className="bg-secondary text-gray-300">
      {/* Newsletter CTA */}
      <div className="border-b border-gray-700/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Ready to grow your business?</h3>
              <p className="text-gray-400 text-sm">Start sending unlimited WhatsApp campaigns today.</p>
            </div>
            <Link
              to="/signup"
              className="group flex items-center gap-2 px-6 py-3 bg-brand text-white font-semibold rounded-xl hover:bg-brand-dark transition-all duration-300 hover:shadow-lg hover:shadow-brand/20"
            >
              Get Started Free <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <img src={LOGO_URL} alt="ReachPeak API" className="w-10 h-10 rounded-xl" />
              <span className="text-xl font-bold text-white">ReachPeak API</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed mb-6 max-w-sm">
              India's affordable WhatsApp marketing platform. Send unlimited messages, manage contacts, run campaigns, and track results — all for one flat monthly fee.
            </p>
            <div className="flex flex-col gap-2">
              <a href="mailto:support@reachpeakapi.in" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-brand transition">
                <Mail className="w-4 h-4" /> support@reachpeakapi.in
              </a>
              <a href="tel:+916290678045" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-brand transition">
                <Phone className="w-4 h-4" /> +91 6290678045
              </a>
            </div>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-5">Platform</h4>
            <ul className="space-y-3">
              {[
                { to: '/', label: 'Home' },
                { to: '/about', label: 'About Us' },
                { to: '/use-cases', label: 'Use Cases' },
                { to: '/pricing', label: 'Pricing' },
                { to: '/contact', label: 'Contact' },
              ].map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-gray-400 hover:text-brand transition-colors duration-300">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-5">Legal</h4>
            <ul className="space-y-3">
              {[
                { to: '/privacy-policy', label: 'Privacy Policy' },
                { to: '/terms', label: 'Terms & Conditions' },
                { to: '/refund-policy', label: 'Refund Policy' },
              ].map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-gray-400 hover:text-brand transition-colors duration-300">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Get Started */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-5">Get Started</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/signup" className="text-sm text-gray-400 hover:text-brand transition-colors duration-300">
                  Create Account
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-sm text-gray-400 hover:text-brand transition-colors duration-300">
                  Log In
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-sm text-gray-400 hover:text-brand transition-colors duration-300">
                  View Plans
                </Link>
              </li>
            </ul>
            <div className="mt-6 px-4 py-3 bg-white/5 rounded-xl border border-white/5">
              <p className="text-xs text-gray-400">
                <span className="text-white font-semibold">500+</span> businesses trust ReachPeak API
              </p>
            </div>
          </div>
        </div>

        <div className="mt-14 pt-8 border-t border-gray-700/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} ReachPeak API. All rights reserved.
          </p>
          <p className="text-xs text-gray-600">Affordable WhatsApp marketing for growing businesses.</p>
        </div>
      </div>
    </footer>
  );
}
