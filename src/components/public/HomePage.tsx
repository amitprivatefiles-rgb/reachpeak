import { Link } from 'react-router-dom';
import {
  Send, DollarSign, RefreshCw, GitBranch, Upload, Image, BarChart3, Clock,
  Users, FileText, Contact, Activity, ArrowRight, ChevronDown, ChevronUp,
  CheckCircle, Star, Shield, Zap, UserPlus, CreditCard, Rocket,
} from 'lucide-react';
import { useState } from 'react';

const features = [
  { icon: Send, title: 'Unlimited Messages', desc: 'Send without limits, no per-message cost' },
  { icon: DollarSign, title: 'Zero Messaging Cost', desc: 'Pay only your plan fee, messages are free' },
  { icon: RefreshCw, title: 'Smart Auto-Retry', desc: 'Failed messages auto-retry up to 3 times before blacklisting' },
  { icon: GitBranch, title: 'A/B Message Testing', desc: 'Test message variants to maximize engagement' },
  { icon: Upload, title: 'Bulk Contact Import', desc: 'Upload CSV/XLS/XLSX with auto-deduplication' },
  { icon: Image, title: 'Rich Media Campaigns', desc: 'Send images, videos, and documents with your messages' },
  { icon: BarChart3, title: 'Real-Time Analytics', desc: 'Live tracking of sent, failed, delivery rates' },
  { icon: Clock, title: 'Campaign Scheduling', desc: 'Play, pause, complete campaigns with daily limits' },
  { icon: Users, title: 'Agent Management', desc: 'Assign agents and track per-agent performance' },
  { icon: FileText, title: 'Detailed Reports', desc: 'Download campaign, contact, and agent reports as CSV' },
  { icon: Contact, title: 'Contact Management', desc: 'Search, filter, edit, blacklist, bulk assign contacts' },
  { icon: Activity, title: 'Lead Source Tracking', desc: 'Track conversions by source (Facebook, Instagram, etc.)' },
];

const steps = [
  { icon: UserPlus, title: 'Sign Up & Choose Your Plan', desc: 'Create your account and select monthly or yearly billing' },
  { icon: CreditCard, title: 'Make Payment & Submit Details', desc: 'Pay via QR code and fill in your business information' },
  { icon: CheckCircle, title: 'Get Approved', desc: 'Our team reviews and activates your account within 24 hours' },
  { icon: Rocket, title: 'Start Sending', desc: 'Set up your first campaign and track results in real-time' },
];

const stats = [
  { value: '10,000+', label: 'Messages Sent Daily' },
  { value: '500+', label: 'Businesses Trust Us' },
  { value: '90-92%', label: 'Delivery Rate' },
  { value: '24/7', label: 'Platform Uptime' },
];

const testimonials = [
  { name: 'Rahul Sharma', business: 'ShopEase Retail', quote: 'ReachPeak API transformed our customer outreach. We went from manually sending messages to running automated campaigns that reach thousands daily.' },
  { name: 'Priya Desai', business: 'EduGrowth Academy', quote: 'The bulk import and A/B testing features alone saved us countless hours. The delivery rates are consistently above 90%.' },
  { name: 'Amit Patel', business: 'FreshBite Foods', quote: 'Simple, affordable, and effective. We doubled our customer engagement within the first month of using ReachPeak API.' },
];

const faqs = [
  { q: 'What is ReachPeak API?', a: 'ReachPeak API is a WhatsApp marketing platform that lets businesses send bulk campaigns, manage contacts, track analytics, and automate message delivery at scale.' },
  { q: 'Is there a per-message cost?', a: 'No. You pay only your monthly or yearly subscription fee. All messages sent through the platform are included at no additional cost.' },
  { q: 'What is the message failure rate?', a: 'WhatsApp campaigns typically have an 8-10% failure rate due to invalid numbers, network issues, and blocked contacts. Our smart retry system delivers a consistent 90-92% success rate.' },
  { q: 'How does payment work?', a: 'After selecting your plan, you scan a UPI QR code to make payment. Then submit your business details and payment reference for verification. Your account is activated within 24 hours.' },
  { q: 'Can I cancel anytime?', a: 'Yes. Monthly plans can be cancelled at any time. We also offer a 7-day money-back guarantee for new subscribers.' },
  { q: 'What file formats are supported for contact upload?', a: 'We support CSV, XLS, and XLSX files. The system auto-detects column names for phone number, name, city, and state fields.' },
  { q: 'Do you support media messages?', a: 'Yes. You can attach images (PNG, JPG, GIF, WebP) and videos (MP4, WebM, MOV) to your campaign messages.' },
  { q: 'How fast are messages delivered?', a: 'Messages begin delivering immediately when a campaign starts. Delivery speed depends on your contact list size and daily limits configured per campaign.' },
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

export function HomePage() {
  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-brand to-brand-dark text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/15 rounded-full text-sm font-medium mb-8 backdrop-blur-sm">
              <Zap className="w-4 h-4" />
              Scale Your WhatsApp Marketing Like Never Before
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6 tracking-tight">
              Supercharge Your WhatsApp Marketing
            </h1>
            <p className="text-lg sm:text-xl text-white/80 leading-relaxed mb-10 max-w-2xl mx-auto">
              Send unlimited messages at zero per-message cost. Upload contacts, create campaigns, track results -- all from one powerful dashboard.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/signup"
                className="w-full sm:w-auto px-8 py-3.5 bg-white text-brand font-semibold rounded-xl hover:bg-gray-100 transition text-base flex items-center justify-center gap-2"
              >
                Get Started Free <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/pricing"
                className="w-full sm:w-auto px-8 py-3.5 border-2 border-white/30 text-white font-semibold rounded-xl hover:bg-white/10 transition text-base"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-12 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl sm:text-4xl font-extrabold text-brand">{stat.value}</p>
                <p className="text-sm text-secondary-light mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28 bg-gray-50" id="features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-secondary mb-4">Everything You Need</h2>
            <p className="text-lg text-secondary-light max-w-2xl mx-auto">Powerful features designed to help you send, track, and optimize your WhatsApp campaigns at scale.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-brand/30 hover:shadow-lg hover:shadow-brand/5 transition-all duration-300 group">
                <div className="w-12 h-12 bg-brand-lighter rounded-xl flex items-center justify-center mb-4 group-hover:bg-brand group-hover:text-white transition-colors duration-300">
                  <f.icon className="w-6 h-6 text-brand group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-lg font-semibold text-secondary mb-2">{f.title}</h3>
                <p className="text-sm text-secondary-light leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-secondary mb-4">How It Works</h2>
            <p className="text-lg text-secondary-light max-w-2xl mx-auto">Get started in 4 simple steps</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {steps.map((step, i) => (
              <div key={step.title} className="text-center relative">
                <div className="w-16 h-16 bg-brand-lighter rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <step.icon className="w-8 h-8 text-brand" />
                </div>
                <div className="absolute -top-2 -right-2 md:top-0 md:right-auto md:left-1/2 md:-translate-x-1/2 w-7 h-7 bg-brand text-white rounded-full flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </div>
                <h3 className="text-lg font-semibold text-secondary mb-2">{step.title}</h3>
                <p className="text-sm text-secondary-light leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-secondary mb-4">Plans & Pricing</h2>
            <p className="text-lg text-secondary-light max-w-2xl mx-auto">Simple, transparent pricing with no hidden fees</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl p-8 border border-gray-200">
              <h3 className="text-xl font-bold text-secondary mb-1">Monthly</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-extrabold text-secondary">&#8377;2,499</span>
                <span className="text-secondary-light">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {['Unlimited WhatsApp Messages', 'Bulk Contact Upload', 'Rich Media Campaigns', 'Real-Time Analytics'].map((f) => (
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
            <div className="bg-brand-lighter rounded-2xl p-8 border-2 border-brand relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-brand text-white text-xs font-bold rounded-full">
                BEST VALUE
              </div>
              <h3 className="text-xl font-bold text-secondary mb-1">Yearly</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-extrabold text-secondary">&#8377;14,999</span>
                <span className="text-secondary-light">/year</span>
              </div>
              <ul className="space-y-3 mb-8">
                {['Everything in Monthly', 'Priority Support', 'Early Access to Features', 'Dedicated Account Manager'].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-secondary-light">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />{f}
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
          <div className="text-center mt-8">
            <Link to="/pricing" className="text-brand font-medium hover:text-brand-dark transition inline-flex items-center gap-1">
              See Full Pricing Details <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200 text-center">
            <Shield className="w-10 h-10 text-brand mx-auto mb-4" />
            <h3 className="text-xl font-bold text-secondary mb-3">Our Commitment to Transparency</h3>
            <p className="text-secondary-light leading-relaxed">
              We believe in transparency -- WhatsApp campaigns typically have an 8-10% message failure rate due to invalid numbers, network issues, and blocked contacts. Our smart retry system minimizes this, delivering a consistent 90-92% success rate.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-secondary mb-4">What Our Customers Say</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-white rounded-2xl p-6 border border-gray-200">
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-secondary-light leading-relaxed mb-6">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-lighter rounded-full flex items-center justify-center">
                    <span className="text-brand font-bold text-sm">{t.name[0]}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-secondary">{t.name}</p>
                    <p className="text-xs text-secondary-light">{t.business}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28 bg-white" id="faq">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-secondary mb-4">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq) => <FAQItem key={faq.q} q={faq.q} a={faq.a} />)}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-br from-brand to-brand-dark text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">Ready to Scale Your Marketing?</h2>
          <p className="text-lg text-white/80 mb-8">Join hundreds of businesses growing with ReachPeak API.</p>
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-brand font-semibold rounded-xl hover:bg-gray-100 transition text-base"
          >
            Get Started Today <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
