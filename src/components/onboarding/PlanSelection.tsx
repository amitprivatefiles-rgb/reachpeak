import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Shield, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../contexts/SubscriptionContext';

const monthlyFeatures = [
  'WhatsApp broadcasts & campaigns',
  'Template manager + Meta sync',
  'Team inbox (24h window, quick replies)',
  'Contacts, tags & import',
  'Scheduled campaigns',
  'Basic analytics',
  '1 WhatsApp number',
  'Email support'
];

const yearlyExtras = [
  'Automated journeys (abandoned cart, reminders, etc.)',
  'OrderGuard™ COD/RTO scoring & routing',
  'Payment links in chat (Razorpay)',
  'A/B testing + auto-retry',
  'Shopify/WooCommerce/PeakCart + API & webhooks',
  'Advanced analytics & exports',
  'AI Calling Agents (priority early access)',
  'Priority WhatsApp support'
];

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export function PlanSelection() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { refresh } = useSubscription();
  const [processing, setProcessing] = useState<'monthly' | 'yearly' | null>(null);
  const [msg, setMsg] = useState<{ kind: 'err' | 'info'; text: string } | null>(null);

  // Poll until the webhook activates the subscription, then enter the app.
  const waitForActivation = async () => {
    for (let i = 0; i < 12; i++) {
      const { data } = await supabase.from('subscriptions')
        .select('status').eq('user_id', user!.id)
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (data?.status === 'active') { await refresh(); navigate('/app', { replace: true }); return; }
      await new Promise(r => setTimeout(r, 2000));
    }
    setMsg({ kind: 'info', text: 'Payment received — activating your account. This can take a few seconds; refresh if it doesn\'t update.' });
  };

  const selectPlan = async (plan: 'monthly' | 'yearly') => {
    setMsg(null);
    setProcessing(plan);
    try {
      const ok = await loadRazorpay();
      if (!ok) throw new Error('Could not load the payment gateway. Check your connection.');

      const { data, error } = await supabase.functions.invoke('create-subscription-order', { body: { plan } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.already_active) { navigate('/app', { replace: true }); return; }

      const rzp = new (window as any).Razorpay({
        key: data.key_id,
        order_id: data.order_id,
        amount: data.amount_paise,
        currency: data.currency || 'INR',
        name: 'ReachPeak API',
        description: `${data.plan_label} plan`,
        prefill: data.prefill || {},
        theme: { color: '#E04632' },
        handler: () => {
          setMsg({ kind: 'info', text: 'Payment received — activating your account…' });
          waitForActivation();
        },
        modal: { ondismiss: () => { setProcessing(null); setMsg({ kind: 'info', text: 'Payment cancelled.' }); } },
      });
      rzp.on('payment.failed', (resp: any) => { setProcessing(null); setMsg({ kind: 'err', text: 'Payment failed: ' + (resp?.error?.description || 'unknown') }); });
      rzp.open();
    } catch (err: any) {
      setProcessing(null);
      setMsg({ kind: 'err', text: err.message || 'Could not start payment.' });
    }
  };

  const busy = processing !== null;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2.5 mb-6">
            <img src="https://i.ibb.co/K3M8zPq/Avatar.png" alt="ReachPeak API" className="w-10 h-10 rounded-lg" />
            <span className="text-2xl font-bold text-brand">ReachPeak API</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-secondary mb-3">Choose Your Plan</h1>
          <p className="text-secondary-light text-lg">Select a plan to activate your account and start sending WhatsApp campaigns</p>
        </div>

        {msg && (
          <div className={`max-w-4xl mx-auto mb-6 px-4 py-3 rounded-xl text-sm font-medium ${msg.kind === 'err' ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-blue-50 border border-blue-200 text-blue-700'}`}>
            {msg.text}
          </div>
        )}

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
              disabled={busy}
              className="w-full px-6 py-3 border-2 border-brand text-brand font-semibold rounded-xl hover:bg-brand-lighter transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {processing === 'monthly' ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</> : 'Select Monthly Plan'}
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
              disabled={busy}
              className="w-full px-6 py-3 bg-brand text-white font-semibold rounded-xl hover:bg-brand-dark transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {processing === 'yearly' ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</> : 'Select Yearly Plan'}
            </button>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl max-w-4xl mx-auto">
          <Shield className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-800 font-medium">Secure payment via Razorpay -- 7-Day Money-Back Guarantee</p>
        </div>

        <div className="text-center mt-6">
          <button onClick={() => signOut()} className="text-sm text-secondary-light hover:text-secondary underline">
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
