import { Link } from 'react-router-dom';
import { CheckCircle, Shield, ChevronDown, X as XIcon, Lock, Zap, Clock } from 'lucide-react';
import { useState } from 'react';
import { RevealSection } from '../../hooks/useScrollReveal';

const monthlyFeatures = [
  'Unlimited WhatsApp Messages',
  'Zero Per-Message Cost',
  'Bulk Contact Upload (CSV/XLS/XLSX)',
  'Rich Media Campaigns (Image/Video)',
  'A/B Message Testing',
  'Real-Time Analytics Dashboard',
  'Smart Auto-Retry (up to 3 attempts)',
  'Campaign Scheduling & Controls',
  'Agent Management & Tracking',
  'Detailed Reports & CSV Export',
  'Lead Source Analytics',
  'Contact Management & Deduplication',
  'Email Support',
  '90-92% Delivery Rate',
];

const yearlyExtras = [
  'Priority Support (faster response times)',
  'Early Access to New Features',
  'Dedicated Account Manager (for high-volume)',
  'Custom Report Templates',
];

const comparisonRows = [
  { feature: 'Unlimited Messages', monthly: true, yearly: true },
  { feature: 'Zero Per-Message Cost', monthly: true, yearly: true },
  { feature: 'Bulk Contact Upload', monthly: true, yearly: true },
  { feature: 'Rich Media Campaigns', monthly: true, yearly: true },
  { feature: 'A/B Message Testing', monthly: true, yearly: true },
  { feature: 'Real-Time Analytics', monthly: true, yearly: true },
  { feature: 'Smart Auto-Retry', monthly: true, yearly: true },
  { feature: 'Campaign Scheduling', monthly: true, yearly: true },
  { feature: 'Agent Management', monthly: true, yearly: true },
  { feature: 'Reports & CSV Export', monthly: true, yearly: true },
  { feature: 'Lead Source Analytics', monthly: true, yearly: true },
  { feature: 'Contact Deduplication', monthly: true, yearly: true },
  { feature: 'Email Support', monthly: true, yearly: true },
  { feature: 'Priority Support', monthly: false, yearly: true },
  { feature: 'Early Access to Features', monthly: false, yearly: true },
  { feature: 'Dedicated Account Manager', monthly: false, yearly: true },
  { feature: 'Custom Report Templates', monthly: false, yearly: true },
];

const trustBadges = [
  { icon: Shield, title: '7-Day Money Back', desc: 'No questions asked refund within 7 days' },
  { icon: Lock, title: 'Secure Payments', desc: 'UPI payments with encrypted processing' },
  { icon: Zap, title: '24hr Activation', desc: 'Account activated within 24 hours' },
  { icon: Clock, title: 'Cancel Anytime', desc: 'No lock-in contracts, cancel when you want' },
];

const faqs = [
  { q: 'Can I switch from Monthly to Yearly?', a: 'Yes! You can upgrade from a Monthly plan to a Yearly plan at any time. Contact our support team and we will handle the transition for you.' },
  { q: 'What happens when my plan expires?', a: 'When your plan expires, you will be prompted to renew. Your data and campaigns will remain intact, but you will not be able to send new messages until you renew.' },
  { q: 'Is there a free trial?', a: 'We do not offer a free trial at this time, but we do have a 7-day money-back guarantee. If you are not satisfied, we will refund your payment in full.' },
  { q: 'How do I make payment?', a: 'After selecting your plan, you will be shown a UPI QR code. Scan it with any UPI app, make the payment, and enter the transaction reference on our form.' },
  { q: 'What is included in Priority Support?', a: 'Priority Support means faster response times (within 4 hours during business hours), a dedicated support channel, and escalation priority for any issues you face.' },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border rounded-2xl overflow-hidden transition-all duration-300 ${open ? 'border-brand/30 shadow-lg shadow-brand/5' : 'border-gray-200 hover:border-brand/20'}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-5 text-left transition-colors"
      >
        <span className="text-secondary font-semibold pr-4">{q}</span>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${open ? 'bg-brand text-white rotate-180' : 'bg-gray-100 text-gray-500'}`}>
          <ChevronDown className="w-4 h-4" />
        </div>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-6 pb-5">
          <p className="text-secondary-light text-sm leading-relaxed">{a}</p>
        </div>
      </div>
    </div>
  );
}

export function PricingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand via-brand-dark to-[#0d0d1a] text-white py-24 sm:py-32">
        <div className="absolute inset-0 hero-mesh" />
        <div className="absolute inset-0 grid-pattern" />
        <div className="absolute top-20 left-[15%] w-48 h-48 bg-white/5 rounded-full blur-3xl animate-float" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block px-4 py-1.5 bg-white/10 text-white/90 text-sm font-semibold rounded-full mb-6 border border-white/10 backdrop-blur-sm">PRICING</span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-6">Simple, Transparent Pricing</h1>
          <p className="text-lg text-white/70 max-w-2xl mx-auto">No per-message fees. No hidden charges. Just one flat rate for unlimited WhatsApp marketing.</p>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" className="w-full"><path d="M0 60V30C240 0 480 0 720 30C960 60 1200 60 1440 30V60H0Z" fill="white"/></svg>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            <RevealSection>
              <div className="bg-white rounded-3xl p-8 border border-gray-200 flex flex-col h-full hover:border-brand/30 hover:shadow-xl hover:shadow-brand/5 transition-all duration-500">
                <h3 className="text-2xl font-bold text-secondary mb-1">Monthly Plan</h3>
                <p className="text-secondary-light text-sm mb-6">Perfect for growing businesses</p>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-5xl font-extrabold text-secondary">&#8377;2,499</span>
                  <span className="text-secondary-light">/month</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {monthlyFeatures.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-secondary-light">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/signup"
                  className="block text-center w-full px-6 py-3.5 border-2 border-brand text-brand font-semibold rounded-xl hover:bg-brand hover:text-white transition-all duration-300"
                >
                  Get Started
                </Link>
              </div>
            </RevealSection>

            <RevealSection delay={150}>
              <div className="bg-gradient-to-br from-brand/5 to-brand/10 rounded-3xl p-8 border-2 border-brand flex flex-col relative h-full glow-brand">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-5 py-1.5 bg-brand text-white text-xs font-bold rounded-full whitespace-nowrap shadow-lg shadow-brand/30">
                  BEST VALUE — Save &#8377;14,989/year
                </div>
                <h3 className="text-2xl font-bold text-secondary mb-1">Yearly Plan</h3>
                <p className="text-secondary-light text-sm mb-6">For established businesses</p>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-5xl font-extrabold text-secondary">&#8377;14,999</span>
                  <span className="text-secondary-light">/year</span>
                </div>
                <ul className="space-y-3 mb-4 flex-1">
                  {monthlyFeatures.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-secondary-light">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />{f}
                    </li>
                  ))}
                  <li className="pt-2 border-t border-brand/20">
                    <span className="text-xs font-semibold text-brand uppercase tracking-wider">Plus Yearly Extras:</span>
                  </li>
                  {yearlyExtras.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-secondary font-medium">
                      <CheckCircle className="w-4 h-4 text-brand mt-0.5 flex-shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/signup"
                  className="block text-center w-full px-6 py-3.5 bg-brand text-white font-semibold rounded-xl hover:bg-brand-dark transition-all duration-300 shadow-lg shadow-brand/20"
                >
                  Get Started
                </Link>
              </div>
            </RevealSection>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-16 bg-[#FAFAFA]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {trustBadges.map((badge, i) => (
              <RevealSection key={badge.title} delay={i * 100}>
                <div className="bg-white rounded-2xl p-5 border border-gray-200 text-center h-full hover:border-brand/20 hover:shadow-lg transition-all duration-500">
                  <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <badge.icon className="w-5 h-5 text-green-600" />
                  </div>
                  <h4 className="font-bold text-secondary text-sm mb-1">{badge.title}</h4>
                  <p className="text-xs text-secondary-light">{badge.desc}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealSection className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 bg-brand/10 text-brand text-sm font-semibold rounded-full mb-4">COMPARE</span>
            <h2 className="text-3xl font-extrabold text-secondary">Feature Comparison</h2>
          </RevealSection>
          <RevealSection>
            <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-6 py-4 text-sm font-semibold text-secondary">Feature</th>
                      <th className="text-center px-6 py-4 text-sm font-semibold text-secondary">Monthly</th>
                      <th className="text-center px-6 py-4 text-sm font-semibold text-brand">Yearly ⭐</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonRows.map((row, i) => (
                      <tr key={row.feature} className={`border-b border-gray-100 transition-colors hover:bg-brand/[0.02] ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                        <td className="px-6 py-3.5 text-sm text-secondary-light">{row.feature}</td>
                        <td className="px-6 py-3.5 text-center">
                          {row.monthly ? <CheckCircle className="w-5 h-5 text-green-500 mx-auto" /> : <XIcon className="w-5 h-5 text-gray-300 mx-auto" />}
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          {row.yearly ? <CheckCircle className="w-5 h-5 text-green-500 mx-auto" /> : <XIcon className="w-5 h-5 text-gray-300 mx-auto" />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 bg-[#FAFAFA]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealSection className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 bg-brand/10 text-brand text-sm font-semibold rounded-full mb-4">FAQ</span>
            <h2 className="text-3xl font-extrabold text-secondary mb-4">Pricing FAQ</h2>
          </RevealSection>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <RevealSection key={faq.q} delay={i * 60}>
                <FAQItem q={faq.q} a={faq.a} />
              </RevealSection>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
