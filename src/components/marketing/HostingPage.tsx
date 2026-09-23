import { useState } from 'react';
import { Section, DisplayHeading, GradientText } from './Shared';
import { Check, Server, Shield, Zap, Globe, Clock, ArrowRight, ChevronRight, CheckCircle2 } from 'lucide-react';

type PlanId = 'monthly' | 'yearly' | '48months';
type Step = 'pricing' | 'billing' | 'gmail' | 'thankyou';

const PLANS = {
  monthly: {
    id: 'monthly',
    name: 'Monthly',
    price: 799,
    effectivePrice: 799,
    duration: 'month',
    savings: null,
    features: [
      '10 GB NVMe SSD Storage',
      'Unlimited Bandwidth',
      'Free SSL Certificate',
      '99.9% Uptime SLA',
      'Daily Backups',
      '24/7 Support',
    ]
  },
  yearly: {
    id: 'yearly',
    name: 'Yearly',
    price: 6999,
    effectivePrice: 583,
    duration: 'year',
    savings: 'Save ~27%',
    features: [
      '10 GB NVMe SSD Storage',
      'Unlimited Bandwidth',
      'Free SSL Certificate',
      '99.9% Uptime SLA',
      'Daily Backups',
      '24/7 Support',
    ]
  },
  '48months': {
    id: '48months',
    name: '48 Months',
    price: 11000,
    effectivePrice: 229,
    duration: '4 years',
    savings: 'Save ~71%',
    isPopular: true,
    features: [
      '10 GB NVMe SSD Storage',
      'Unlimited Bandwidth',
      'Free SSL Certificate',
      '99.9% Uptime SLA',
      'Daily Backups',
      '24/7 Support',
      'Free Domain',
      'Priority Support',
    ]
  }
};

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", 
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", 
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", 
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", 
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
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

export function HostingPage() {
  const [step, setStep] = useState<Step>('pricing');
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>('48months');
  
  const [billing, setBilling] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    gstin: '',
    address: '',
    state: '',
    pincode: ''
  });
  
  const [processing, setProcessing] = useState(false);
  const [paymentId, setPaymentId] = useState('');
  const [gmail, setGmail] = useState('');
  const [gmailError, setGmailError] = useState('');

  const selectedPlan = PLANS[selectedPlanId];
  const gst = selectedPlan.price * 0.18;
  const total = selectedPlan.price + gst;

  const handlePlanSelect = (id: PlanId) => {
    setSelectedPlanId(id);
    setStep('billing');
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    
    try {
      const isLoaded = await loadRazorpay();
      if (!isLoaded) {
        alert('Razorpay failed to load. Please check your connection.');
        setProcessing(false);
        return;
      }

      const fnUrl = 'https://xykynbfsogwxecqzhfdm.supabase.co/functions/v1/create-hosting-order';
      const resp = await fetch(fnUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan.id, billing }),
      });
      const data = await resp.json();
      if (!resp.ok || !data?.ok) throw new Error(data?.error || 'Failed to create order');

      const rzp = new (window as any).Razorpay({
        key: data.key_id,
        order_id: data.order_id,
        amount: data.amount_paise,
        currency: 'INR',
        name: 'ReachPeak Hosting',
        description: `${selectedPlan.name} Hosting Plan`,
        prefill: { name: billing.name, email: billing.email, contact: billing.phone },
        theme: { color: '#E04632' },
        handler: (response: any) => {
          setPaymentId(response.razorpay_payment_id);
          setStep('gmail');
          setProcessing(false);
        },
        modal: { ondismiss: () => setProcessing(false) },
      });
      rzp.open();
    } catch (err) {
      console.error(err);
      alert('An error occurred while initiating payment.');
      setProcessing(false);
    }
  };

  const handleGmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gmail.endsWith('@gmail.com')) {
      setGmailError('Please enter a valid @gmail.com address');
      return;
    }
    
    setProcessing(true);
    try {
      const fnUrl = 'https://xykynbfsogwxecqzhfdm.supabase.co/functions/v1/create-hosting-order';
      const resp = await fetch(fnUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activate', payment_id: paymentId, gmail }),
      });
      const data = await resp.json();
      if (!resp.ok || data?.error) throw new Error(data?.error || 'Failed to save');
      setStep('thankyou');
    } catch (err) {
      console.error(err);
      alert('Failed to save Gmail. Please contact support.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-white pt-24 pb-16 font-sans selection:bg-[#E04632]/30">
      <Section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {step === 'pricing' && (
          <div className="space-y-16 animate-fade-in">
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <DisplayHeading className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                Premium Hosting for <GradientText>Peak Performance</GradientText>
              </DisplayHeading>
              <p className="text-lg text-gray-400">
                Lightning-fast NVMe storage, unmetered bandwidth, and legendary support. 
                Everything your business needs to scale.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 items-start">
              {Object.values(PLANS).map((plan) => (
                <div 
                  key={plan.id}
                  className={`relative flex flex-col p-8 rounded-3xl backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 cursor-pointer
                    ${plan.isPopular 
                      ? 'bg-gradient-to-b from-[#E04632]/10 to-[rgba(255,255,255,0.02)] border-2 border-[#E04632] shadow-[0_0_30px_rgba(224,70,50,0.15)] scale-105 z-10' 
                      : 'bg-[rgba(255,255,255,0.03)] border border-white/10 hover:border-white/20'}`}
                  onClick={() => handlePlanSelect(plan.id as PlanId)}
                >
                  {plan.isPopular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-[#E04632] to-[#F06850] rounded-full text-sm font-bold tracking-wider uppercase text-white shadow-lg">
                      Best Value
                    </div>
                  )}
                  
                  <div className="mb-8">
                    <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-4xl font-extrabold">₹{plan.effectivePrice}</span>
                      <span className="text-gray-400">/mo</span>
                    </div>
                    <div className="min-h-[24px]">
                      {plan.savings && (
                        <span className="text-emerald-400 text-sm font-medium">{plan.savings}</span>
                      )}
                    </div>
                    {plan.id !== 'monthly' && (
                      <p className="text-sm text-gray-400 mt-2">Billed as ₹{plan.price} for {plan.duration}</p>
                    )}
                  </div>

                  <ul className="space-y-4 mb-8 flex-1">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-[#E04632] shrink-0 mt-0.5" />
                        <span className="text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors
                    ${plan.isPopular 
                      ? 'bg-gradient-to-r from-[#E04632] to-[#F06850] text-white hover:opacity-90' 
                      : 'bg-white/10 text-white hover:bg-white/20'}`}>
                    Choose {plan.name}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-12 border-t border-white/10">
              <div className="flex flex-col items-center text-center gap-3">
                <Server className="w-8 h-8 text-[#E04632]" />
                <h4 className="font-semibold text-white">NVMe SSDs</h4>
                <p className="text-sm text-gray-400">Up to 10x faster than standard SSDs</p>
              </div>
              <div className="flex flex-col items-center text-center gap-3">
                <Shield className="w-8 h-8 text-[#E04632]" />
                <h4 className="font-semibold text-white">Enhanced Security</h4>
                <p className="text-sm text-gray-400">Free SSL & DDoS protection included</p>
              </div>
              <div className="flex flex-col items-center text-center gap-3">
                <Zap className="w-8 h-8 text-[#E04632]" />
                <h4 className="font-semibold text-white">Litespeed Cache</h4>
                <p className="text-sm text-gray-400">Optimized for maximum performance</p>
              </div>
              <div className="flex flex-col items-center text-center gap-3">
                <Globe className="w-8 h-8 text-[#E04632]" />
                <h4 className="font-semibold text-white">Global CDN</h4>
                <p className="text-sm text-gray-400">Fast delivery around the world</p>
              </div>
            </div>
          </div>
        )}

        {step === 'billing' && (
          <div className="max-w-5xl mx-auto animate-fade-in">
            <button 
              onClick={() => setStep('pricing')}
              className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
            >
              <ChevronRight className="w-4 h-4 rotate-180" /> Back to Plans
            </button>
            
            <div className="grid lg:grid-cols-[1fr_400px] gap-8">
              <div className="bg-[rgba(255,255,255,0.03)] border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
                <h2 className="text-2xl font-bold mb-6">Billing Details</h2>
                <form id="billing-form" onSubmit={handlePayment} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300">Full Name *</label>
                      <input required type="text" value={billing.name} onChange={e => setBilling({...billing, name: e.target.value})}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#E04632] focus:ring-1 focus:ring-[#E04632] transition-colors" placeholder="John Doe" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300">Email Address *</label>
                      <input required type="email" value={billing.email} onChange={e => setBilling({...billing, email: e.target.value})}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#E04632] focus:ring-1 focus:ring-[#E04632] transition-colors" placeholder="john@example.com" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300">Phone Number *</label>
                      <input required type="tel" value={billing.phone} onChange={e => setBilling({...billing, phone: e.target.value})}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#E04632] focus:ring-1 focus:ring-[#E04632] transition-colors" placeholder="+91 98765 43210" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300">Company Name *</label>
                      <input required type="text" value={billing.company} onChange={e => setBilling({...billing, company: e.target.value})}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#E04632] focus:ring-1 focus:ring-[#E04632] transition-colors" placeholder="Acme Corp" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">GSTIN <span className="text-gray-500 font-normal">(Leave blank if not applicable)</span></label>
                    <input type="text" value={billing.gstin} onChange={e => setBilling({...billing, gstin: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#E04632] focus:ring-1 focus:ring-[#E04632] transition-colors" placeholder="22AAAAA0000A1Z5" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Billing Address *</label>
                    <textarea required value={billing.address} onChange={e => setBilling({...billing, address: e.target.value})} rows={3}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#E04632] focus:ring-1 focus:ring-[#E04632] transition-colors" placeholder="123 Business Park, Sector 4..." />
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300">State *</label>
                      <select required value={billing.state} onChange={e => setBilling({...billing, state: e.target.value})}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#E04632] focus:ring-1 focus:ring-[#E04632] transition-colors appearance-none">
                        <option value="">Select State</option>
                        {INDIAN_STATES.map(state => <option key={state} value={state} className="bg-[#070B14]">{state}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300">Pincode *</label>
                      <input required type="text" value={billing.pincode} onChange={e => setBilling({...billing, pincode: e.target.value})}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#E04632] focus:ring-1 focus:ring-[#E04632] transition-colors" placeholder="400001" />
                    </div>
                  </div>
                </form>
              </div>

              <div className="lg:sticky lg:top-32 h-fit space-y-6">
                <div className="bg-[rgba(255,255,255,0.03)] border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
                  <h3 className="text-xl font-bold mb-6">Order Summary</h3>
                  <div className="space-y-4 text-sm">
                    <div className="flex justify-between items-center border-b border-white/10 pb-4">
                      <div>
                        <p className="font-semibold text-white">{selectedPlan.name} Hosting</p>
                        <p className="text-gray-400">Duration: {selectedPlan.duration}</p>
                      </div>
                      <p className="font-bold">₹{selectedPlan.price.toLocaleString()}</p>
                    </div>
                    <div className="flex justify-between items-center text-gray-400 pb-4">
                      <p>GST (18%)</p>
                      <p>₹{gst.toLocaleString()}</p>
                    </div>
                    <div className="flex justify-between items-center text-lg font-bold text-white pt-2">
                      <p>Total</p>
                      <p className="text-[#E04632]">₹{total.toLocaleString()}</p>
                    </div>
                  </div>
                  
                  <button 
                    form="billing-form"
                    type="submit"
                    disabled={processing}
                    className="w-full mt-8 py-4 bg-gradient-to-r from-[#E04632] to-[#F06850] text-white rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {processing ? (
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      'Proceed to Payment'
                    )}
                  </button>
                  <p className="text-xs text-gray-500 text-center mt-4">Secure, encrypted checkout via Razorpay</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'gmail' && (
          <div className="max-w-md mx-auto mt-12 animate-fade-in">
            <div className="bg-[rgba(255,255,255,0.03)] border border-white/10 rounded-3xl p-8 backdrop-blur-xl text-center">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-8 h-8 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Payment Successful!</h2>
              <p className="text-gray-400 mb-8">Just one last step to activate your hosting.</p>
              
              <form onSubmit={handleGmailSubmit} className="space-y-4 text-left">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Enter Gmail for Activation *</label>
                  <p className="text-xs text-gray-500 mb-2">Your hosting account and Google Workspace (if applicable) will be linked to this email.</p>
                  <input 
                    required 
                    type="email" 
                    value={gmail} 
                    onChange={e => { setGmail(e.target.value); setGmailError(''); }}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#E04632] focus:ring-1 focus:ring-[#E04632] transition-colors" 
                    placeholder="your.name@gmail.com" 
                  />
                  {gmailError && <p className="text-red-400 text-sm mt-1">{gmailError}</p>}
                </div>
                
                <button 
                  type="submit"
                  disabled={processing}
                  className="w-full py-4 bg-gradient-to-r from-[#E04632] to-[#F06850] text-white rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Activate Account'
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {step === 'thankyou' && (
          <div className="max-w-2xl mx-auto mt-12 animate-fade-in">
            <div className="bg-[rgba(255,255,255,0.03)] border border-white/10 rounded-3xl p-12 backdrop-blur-xl text-center">
              <CheckCircle2 className="w-24 h-24 text-emerald-500 mx-auto mb-8 animate-bounce-slow" />
              <h2 className="text-4xl font-bold mb-4">Thank You for Your Purchase!</h2>
              
              <div className="bg-black/20 rounded-2xl p-6 my-8 inline-block text-left w-full max-w-md mx-auto">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Plan</span>
                    <span className="font-semibold text-white">{selectedPlan.name} Hosting</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Amount Paid</span>
                    <span className="font-semibold text-white">₹{total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/10 pt-3">
                    <span className="text-gray-400">Activation Email</span>
                    <span className="font-semibold text-[#E04632]">{gmail}</span>
                  </div>
                </div>
              </div>
              
              <p className="text-lg text-gray-300 mb-2">
                Your hosting account will be activated within 24 hours.
              </p>
              <p className="text-gray-500 mb-8">
                You'll receive a confirmation email shortly with your login credentials and setup instructions.
              </p>
              
              <button onClick={() => window.location.href = '/'} className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors inline-flex items-center gap-2">
                Return to Home
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </Section>
    </div>
  );
}
