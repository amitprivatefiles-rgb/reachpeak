import { useNavigate } from 'react-router-dom';
import { CheckCircle, Shield } from 'lucide-react';

const monthlyFeatures = [
  'Unlimited WhatsApp Messages',
  'Bulk Contact Upload',
  'Rich Media Campaigns',
  'A/B Message Testing',
  'Real-Time Analytics Dashboard',
  'Smart Auto-Retry',
  'Campaign Scheduling & Controls',
  'Agent Management & Tracking',
  'Reports & CSV Export',
  'Lead Source Analytics',
  'Email Support',
  '90-92% Delivery Rate',
];

const yearlyExtras = [
  'Priority Support',
  'Early Access to Features',
  'Dedicated Account Manager',
  'Custom Report Templates',
];

export function PlanSelection() {
  const navigate = useNavigate();

  const selectPlan = (plan: 'monthly' | 'yearly') => {
    navigate('/payment-details', { state: { plan } });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2.5 mb-6">
            <img src="https://i.ibb.co/K3M8zPq/Avatar.png" alt="ReachPeak API" className="w-10 h-10 rounded-lg" />
            <span className="text-2xl font-bold text-brand">ReachPeak API</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-secondary mb-3">Choose Your Plan</h1>
          <p className="text-secondary-light text-lg">Select a plan to start sending unlimited WhatsApp campaigns</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl p-8 border border-gray-200 flex flex-col hover:shadow-lg transition-shadow">
            <h3 className="text-2xl font-bold text-secondary mb-1">Monthly</h3>
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
            <button
              onClick={() => selectPlan('monthly')}
              className="w-full px-6 py-3 border-2 border-brand text-brand font-semibold rounded-xl hover:bg-brand-lighter transition"
            >
              Select Monthly Plan
            </button>
          </div>

          <div className="bg-brand-lighter rounded-2xl p-8 border-2 border-brand flex flex-col relative hover:shadow-lg transition-shadow">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-5 py-1.5 bg-brand text-white text-xs font-bold rounded-full whitespace-nowrap">
              BEST VALUE -- Save &#8377;14,989/year
            </div>
            <h3 className="text-2xl font-bold text-secondary mb-1">Yearly</h3>
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
                <span className="text-xs font-semibold text-brand uppercase tracking-wider">Plus:</span>
              </li>
              {yearlyExtras.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-secondary font-medium">
                  <CheckCircle className="w-4 h-4 text-brand mt-0.5 flex-shrink-0" />{f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => selectPlan('yearly')}
              className="w-full px-6 py-3 bg-brand text-white font-semibold rounded-xl hover:bg-brand-dark transition"
            >
              Select Yearly Plan
            </button>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl max-w-4xl mx-auto">
          <Shield className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-800 font-medium">7-Day Money-Back Guarantee -- No Questions Asked</p>
        </div>
      </div>
    </div>
  );
}
