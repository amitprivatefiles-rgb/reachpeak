import { Link } from 'react-router-dom';
import { CheckCircle, Shield, ChevronDown, ChevronUp, X as XIcon } from 'lucide-react';
import { useState } from 'react';

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
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition"
      >
        <span className="text-secondary font-medium pr-4">{q}</span>
        {open ? <ChevronUp className="w-5 h-5 text-brand flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-6 pb-4 animate-fade-in">
          <p className="text-secondary-light text-sm leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

export function PricingPage() {
  return (
    <div>
      <section className="bg-gradient-to-br from-brand to-brand-dark text-white py-20 sm:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-6">Simple, Transparent Pricing</h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">No per-message fees. No hidden charges. Just one flat rate for unlimited WhatsApp marketing.</p>
        </div>
      </section>

      <section className="py-20 sm:py-28 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl p-8 border border-gray-200 flex flex-col">
              <h3 className="text-2xl font-bold text-secondary mb-1">Monthly Plan</h3>
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
                className="block text-center w-full px-6 py-3 border-2 border-brand text-brand font-semibold rounded-xl hover:bg-brand-lighter transition"
              >
                Get Started
              </Link>
            </div>

            <div className="bg-brand-lighter rounded-2xl p-8 border-2 border-brand flex flex-col relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-5 py-1.5 bg-brand text-white text-xs font-bold rounded-full whitespace-nowrap">
                BEST VALUE -- Save &#8377;14,989/year
              </div>
              <h3 className="text-2xl font-bold text-secondary mb-1">Yearly Plan</h3>
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
                className="block text-center w-full px-6 py-3 bg-brand text-white font-semibold rounded-xl hover:bg-brand-dark transition"
              >
                Get Started
              </Link>
            </div>
          </div>

          <div className="mt-12 flex items-center justify-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
            <Shield className="w-6 h-6 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-800 font-medium">7-Day Money-Back Guarantee -- No Questions Asked</p>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-extrabold text-secondary mb-8 text-center">Feature Comparison</h2>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-6 py-4 text-sm font-semibold text-secondary">Feature</th>
                    <th className="text-center px-6 py-4 text-sm font-semibold text-secondary">Monthly</th>
                    <th className="text-center px-6 py-4 text-sm font-semibold text-brand">Yearly</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row, i) => (
                    <tr key={row.feature} className={`border-b border-gray-100 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                      <td className="px-6 py-3 text-sm text-secondary-light">{row.feature}</td>
                      <td className="px-6 py-3 text-center">
                        {row.monthly ? <CheckCircle className="w-5 h-5 text-green-500 mx-auto" /> : <XIcon className="w-5 h-5 text-gray-300 mx-auto" />}
                      </td>
                      <td className="px-6 py-3 text-center">
                        {row.yearly ? <CheckCircle className="w-5 h-5 text-green-500 mx-auto" /> : <XIcon className="w-5 h-5 text-gray-300 mx-auto" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-extrabold text-secondary mb-8 text-center">Pricing FAQ</h2>
          <div className="space-y-3">
            {faqs.map((faq) => <FAQItem key={faq.q} q={faq.q} a={faq.a} />)}
          </div>
        </div>
      </section>
    </div>
  );
}
