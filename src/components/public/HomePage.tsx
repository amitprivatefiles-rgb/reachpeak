import { Link } from 'react-router-dom';
import {
  Send, DollarSign, RefreshCw, GitBranch, Upload, Image, BarChart3, Clock,
  Users, FileText, Contact, Activity, ArrowRight, ChevronDown, ChevronUp,
  CheckCircle, Star, Shield, Zap, UserPlus, CreditCard, Rocket,
  MessageSquare, Globe, Lock, TrendingUp, Headphones, Award,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { RevealSection, useCountUp } from '../../hooks/useScrollReveal';

const features = [
  { icon: Send, title: 'Unlimited Messaging', desc: 'Send thousands of WhatsApp messages daily with zero per-message cost. Your subscription covers everything — no surprise bills.' },
  { icon: DollarSign, title: 'Zero Hidden Fees', desc: 'One flat subscription fee. No per-message charges, no setup fees, no hidden costs. What you see is what you pay.' },
  { icon: RefreshCw, title: 'Smart Auto-Retry', desc: 'Failed messages are automatically retried up to 3 times with intelligent backoff, ensuring maximum delivery every time.' },
  { icon: GitBranch, title: 'A/B Message Testing', desc: 'Test two message variants simultaneously. See which version performs better and optimize your campaigns in real-time.' },
  { icon: Upload, title: 'Bulk Contact Import', desc: 'Upload CSV, XLS, or XLSX files. Auto-deduplication removes duplicates. Smart column detection maps your data instantly.' },
  { icon: Image, title: 'Rich Media Campaigns', desc: 'Go beyond text. Attach images, videos, and documents to make your messages engaging and increase response rates.' },
  { icon: BarChart3, title: 'Real-Time Analytics', desc: 'Live dashboard showing messages sent, delivered, failed, and delivery rates. Track every campaign\'s performance as it happens.' },
  { icon: Clock, title: 'Campaign Scheduling', desc: 'Set daily limits, schedule start times, pause and resume campaigns. Full control over when and how fast messages go out.' },
  { icon: Users, title: 'Agent Management', desc: 'Assign contacts to team members. Track individual agent performance, call outcomes, and follow-up rates in one place.' },
  { icon: FileText, title: 'Detailed Reports & Export', desc: 'Download comprehensive reports as CSV. Campaign summaries, contact lists, agent performance — all exportable in one click.' },
  { icon: Contact, title: 'Smart Contact Management', desc: 'Search, filter, edit, blacklist, and bulk-assign contacts. Maintain a clean, organized database with deduplication built in.' },
  { icon: Activity, title: 'Lead Source Tracking', desc: 'Track which channels bring the best leads — Facebook, Instagram, Website, WhatsApp, or Manual. Data-driven marketing decisions.' },
];

const steps = [
  { icon: UserPlus, number: '01', title: 'Create Your Account', desc: 'Sign up in under a minute. Enter your name, email, and password to get started with ReachPeak API.' },
  { icon: CreditCard, number: '02', title: 'Choose Plan & Pay', desc: 'Select Monthly (₹2,499) or Yearly (₹14,999). Scan our UPI QR code and submit your business details for verification.' },
  { icon: CheckCircle, number: '03', title: 'Account Activation', desc: 'Our team reviews your submission and activates your account within 24 hours. You\'ll receive a confirmation email.' },
  { icon: Rocket, number: '04', title: 'Launch Campaigns', desc: 'Upload contacts, craft your message, attach media if needed, and hit send. Watch real-time analytics roll in.' },
];

const stats = [
  { value: 10000, suffix: '+', label: 'Messages Sent Daily', icon: Send },
  { value: 500, suffix: '+', label: 'Businesses Trust Us', icon: Users },
  { value: 92, suffix: '%', label: 'Average Delivery Rate', icon: TrendingUp },
  { value: 24, suffix: '/7', label: 'Platform Availability', icon: Globe },
];

const testimonials = [
  { name: 'Rahul Sharma', business: 'ShopEase Retail', role: 'Marketing Head', quote: 'ReachPeak API completely transformed how we engage with customers. We went from manually sending 50 messages a day to running automated campaigns that reach 5,000+ contacts daily. The delivery rates are consistently above 90%, and the cost savings are incredible.' },
  { name: 'Priya Desai', business: 'EduGrowth Academy', role: 'Operations Director', quote: 'The bulk import feature saved us weeks of manual work. We uploaded our entire student database in minutes, and the A/B testing helped us find the perfect message that tripled our enrollment inquiries. A game-changer for education marketing.' },
  { name: 'Amit Patel', business: 'FreshBite Foods', role: 'Founder', quote: 'As a restaurant chain, timely communication is everything. ReachPeak\'s scheduling feature lets us send daily specials at noon and weekend offers on Fridays. We doubled customer engagement in the first month and saw a 35% increase in repeat orders.' },
  { name: 'Sneha Nair', business: 'PropertyFirst Realtors', role: 'Sales Manager', quote: 'Managing leads from multiple sources was chaotic until we started using ReachPeak. The lead source tracking shows us exactly which channel — Facebook, Instagram, or our website — brings the most qualified buyers. Smart, affordable, and effective.' },
  { name: 'Vikram Singh', business: 'FitZone Gyms', role: 'Growth Lead', quote: 'We use ReachPeak to send membership renewals, class schedules, and promotional offers. The agent management feature helps us track which staff member converts the most leads. It\'s not just a messaging tool — it\'s a complete CRM for fitness businesses.' },
];

const whyUs = [
  { icon: DollarSign, title: 'No Per-Message Cost', desc: 'Unlike other platforms that charge ₹0.50-₹1.50 per message, we charge a flat monthly fee with unlimited messages included.' },
  { icon: Lock, title: 'Enterprise-Grade Security', desc: 'Your data is encrypted and stored securely. We follow industry best practices for data protection and privacy compliance.' },
  { icon: TrendingUp, title: '90-92% Delivery Rate', desc: 'Our smart retry system, contact deduplication, and blacklist management ensure industry-leading delivery rates.' },
  { icon: Headphones, title: 'Dedicated Support', desc: 'Real humans answering your questions. Email support for all plans, priority support with faster response times for yearly subscribers.' },
  { icon: Award, title: 'Trusted by 500+ Businesses', desc: 'From startups to enterprises, businesses across India trust ReachPeak API for their WhatsApp marketing needs.' },
  { icon: Zap, title: 'Lightning-Fast Setup', desc: 'Sign up, pay, get approved, and start sending — all within 24 hours. No complex integrations, no developer needed.' },
];

const faqs = [
  { q: 'What is ReachPeak API?', a: 'ReachPeak API is a comprehensive WhatsApp marketing platform that enables businesses to send bulk campaigns, manage contacts, track analytics, and automate message delivery at scale. It\'s designed for businesses of all sizes — from small shops to large enterprises.' },
  { q: 'Is there a per-message cost?', a: 'No. You pay only your monthly (₹2,499) or yearly (₹14,999) subscription fee. All messages sent through the platform are included at zero additional cost. This makes us significantly more affordable than competitors who charge per message.' },
  { q: 'What is the typical message delivery rate?', a: 'WhatsApp campaigns typically have an 8-10% failure rate due to invalid numbers, network issues, and blocked contacts. Our smart retry system (up to 3 attempts per message) delivers a consistent 90-92% success rate, which is industry-leading.' },
  { q: 'How does the payment process work?', a: 'After selecting your plan, you\'ll see a UPI QR code. Scan it with any UPI app (Google Pay, PhonePe, Paytm, etc.), make the payment, and enter the transaction reference along with your business details. Our team verifies and activates your account within 24 hours.' },
  { q: 'Can I cancel my subscription anytime?', a: 'Yes. Monthly plans can be cancelled at any time. We offer a 7-day money-back guarantee for new subscribers — if you\'re not satisfied within the first 7 days, we\'ll refund your payment in full, no questions asked.' },
  { q: 'What file formats are supported for contact upload?', a: 'We support CSV, XLS, and XLSX files. The system auto-detects column names for phone number, name, city, and state fields. Duplicate contacts are automatically removed during import.' },
  { q: 'Can I send media files with my messages?', a: 'Yes. You can attach images (PNG, JPG, GIF, WebP up to 5MB), videos (MP4, WebM, MOV up to 16MB), and documents with your campaign messages. Rich media messages have higher engagement rates.' },
  { q: 'Is my data secure?', a: 'Absolutely. We use Supabase as our backend, which provides enterprise-grade security with PostgreSQL, Row Level Security, and encrypted data storage. Your contacts and campaign data are private and secure.' },
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

function AnimatedStat({ value, suffix, label, icon: Icon }: { value: number; suffix: string; label: string; icon: any }) {
  const { count, ref } = useCountUp(value, 2000);
  return (
    <div ref={ref as any} className="text-center group">
      <div className="w-12 h-12 bg-brand/10 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-brand group-hover:text-white transition-all duration-300">
        <Icon className="w-5 h-5 text-brand group-hover:text-white transition-colors" />
      </div>
      <p className="text-3xl sm:text-4xl font-extrabold text-secondary">
        {count.toLocaleString()}{suffix}
      </p>
      <p className="text-sm text-secondary-light mt-1">{label}</p>
    </div>
  );
}

export function HomePage() {
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand via-brand-dark to-[#0d0d1a] text-white">
        <div className="absolute inset-0 hero-mesh" />
        <div className="absolute inset-0 grid-pattern" />

        {/* Floating orbs */}
        <div className="absolute top-20 left-[10%] w-64 h-64 bg-white/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-[10%] w-80 h-80 bg-white/5 rounded-full blur-3xl animate-float-delayed" />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-brand/10 rounded-full blur-3xl animate-float-slow" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 lg:py-40">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 rounded-full text-sm font-medium mb-8 backdrop-blur-md border border-white/10 animate-fade-in">
              <Zap className="w-4 h-4 text-yellow-300" />
              <span>Trusted by 500+ businesses across India</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold leading-[1.1] mb-8 tracking-tight animate-fade-in-up">
              Supercharge Your{' '}
              <span className="relative inline-block">
                WhatsApp
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none">
                  <path d="M2 8C50 2 100 2 150 6C200 10 250 4 298 8" stroke="rgba(255,255,255,0.4)" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </span>{' '}
              Marketing
            </h1>
            <p className="text-lg sm:text-xl text-white/70 leading-relaxed mb-12 max-w-3xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              Send unlimited messages at zero per-message cost. Upload contacts in bulk, create powerful campaigns with rich media, A/B test your messages, and track real-time analytics — all from one intuitive dashboard built for growing businesses.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <Link
                to="/signup"
                className="group w-full sm:w-auto px-8 py-4 bg-white text-brand font-bold rounded-2xl hover:bg-gray-50 transition-all duration-300 text-base flex items-center justify-center gap-2 hover:shadow-xl hover:shadow-white/20"
              >
                Start Free — Get Approved in 24hrs
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/pricing"
                className="w-full sm:w-auto px-8 py-4 border-2 border-white/20 text-white font-semibold rounded-2xl hover:bg-white/10 hover:border-white/40 transition-all duration-300 text-base backdrop-blur-sm"
              >
                View Pricing →
              </Link>
            </div>
            <p className="text-white/40 text-sm mt-6 animate-fade-in" style={{ animationDelay: '0.6s' }}>
              No credit card required • 7-day money-back guarantee • Setup in 24 hours
            </p>
          </div>
        </div>

        {/* Bottom curve */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" className="w-full"><path d="M0 60V30C240 0 480 0 720 30C960 60 1200 60 1440 30V60H0Z" fill="white"/></svg>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
            {stats.map((stat) => (
              <AnimatedStat key={stat.label} {...stat} />
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 sm:py-32 mesh-gradient" id="features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealSection className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 bg-brand/10 text-brand text-sm font-semibold rounded-full mb-4">POWERFUL FEATURES</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-secondary mb-5">
              Everything You Need to{' '}
              <span className="text-gradient">Scale Your Outreach</span>
            </h2>
            <p className="text-lg text-secondary-light max-w-2xl mx-auto">
              From contact management to campaign analytics — a complete WhatsApp marketing toolkit designed for businesses that want to grow.
            </p>
          </RevealSection>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <RevealSection key={f.title} delay={i * 80}>
                <div className="bg-white rounded-2xl p-7 border border-gray-200/80 card-3d group h-full">
                  <div className="w-14 h-14 bg-brand/10 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-brand transition-all duration-500">
                    <f.icon className="w-6 h-6 text-brand group-hover:text-white transition-colors duration-500" />
                  </div>
                  <h3 className="text-lg font-bold text-secondary mb-2">{f.title}</h3>
                  <p className="text-sm text-secondary-light leading-relaxed">{f.desc}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 sm:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealSection className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 bg-brand/10 text-brand text-sm font-semibold rounded-full mb-4">HOW IT WORKS</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-secondary mb-5">
              Get Started in <span className="text-gradient">4 Simple Steps</span>
            </h2>
            <p className="text-lg text-secondary-light max-w-2xl mx-auto">From signup to your first campaign in under 24 hours. No technical knowledge required.</p>
          </RevealSection>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 lg:gap-8">
            {steps.map((step, i) => (
              <RevealSection key={step.title} delay={i * 150} className="relative">
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-px bg-gradient-to-r from-brand/30 to-brand/5" />
                )}
                <div className="text-center">
                  <div className="relative inline-block mb-5">
                    <div className="w-20 h-20 bg-gradient-to-br from-brand/10 to-brand/5 rounded-3xl flex items-center justify-center mx-auto border border-brand/10">
                      <step.icon className="w-9 h-9 text-brand" />
                    </div>
                    <span className="absolute -top-1.5 -right-1.5 w-8 h-8 bg-brand text-white rounded-xl flex items-center justify-center text-xs font-bold shadow-lg shadow-brand/30">
                      {step.number}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-secondary mb-2">{step.title}</h3>
                  <p className="text-sm text-secondary-light leading-relaxed">{step.desc}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-24 sm:py-32 bg-[#FAFAFA] grid-pattern-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealSection className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 bg-brand/10 text-brand text-sm font-semibold rounded-full mb-4">WHY REACHPEAK</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-secondary mb-5">
              Why Businesses <span className="text-gradient">Choose Us</span>
            </h2>
            <p className="text-lg text-secondary-light max-w-2xl mx-auto">We're not just another messaging tool. Here's what makes us different.</p>
          </RevealSection>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {whyUs.map((item, i) => (
              <RevealSection key={item.title} delay={i * 100}>
                <div className="bg-white rounded-2xl p-7 border border-gray-200/80 h-full hover:border-brand/20 hover:shadow-xl hover:shadow-brand/5 transition-all duration-500 group">
                  <div className="w-12 h-12 bg-brand/5 rounded-xl flex items-center justify-center mb-4 group-hover:bg-brand/10 transition-colors">
                    <item.icon className="w-6 h-6 text-brand" />
                  </div>
                  <h3 className="text-lg font-bold text-secondary mb-2">{item.title}</h3>
                  <p className="text-sm text-secondary-light leading-relaxed">{item.desc}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-24 sm:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealSection className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 bg-brand/10 text-brand text-sm font-semibold rounded-full mb-4">PRICING</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-secondary mb-5">
              Simple, <span className="text-gradient">Transparent</span> Pricing
            </h2>
            <p className="text-lg text-secondary-light max-w-2xl mx-auto">No per-message fees. No hidden charges. One flat rate for unlimited WhatsApp campaigns.</p>
          </RevealSection>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <RevealSection delay={0}>
              <div className="bg-white rounded-3xl p-8 border border-gray-200 hover:border-brand/30 hover:shadow-xl hover:shadow-brand/5 transition-all duration-500 h-full">
                <h3 className="text-2xl font-bold text-secondary mb-1">Monthly Plan</h3>
                <p className="text-secondary-light text-sm mb-6">Perfect for growing businesses</p>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-5xl font-extrabold text-secondary">&#8377;2,499</span>
                  <span className="text-secondary-light">/month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {['Unlimited WhatsApp Messages', 'Bulk Contact Upload', 'Rich Media Campaigns', 'A/B Testing', 'Real-Time Analytics', 'Smart Auto-Retry'].map((f) => (
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
              <div className="bg-gradient-to-br from-brand/5 to-brand/10 rounded-3xl p-8 border-2 border-brand relative h-full glow-brand">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-5 py-1.5 bg-brand text-white text-xs font-bold rounded-full whitespace-nowrap shadow-lg shadow-brand/30">
                  BEST VALUE — Save ₹14,989/year
                </div>
                <h3 className="text-2xl font-bold text-secondary mb-1">Yearly Plan</h3>
                <p className="text-secondary-light text-sm mb-6">For established businesses</p>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-5xl font-extrabold text-secondary">&#8377;14,999</span>
                  <span className="text-secondary-light">/year</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {['Everything in Monthly', 'Priority Support', 'Early Access to Features', 'Dedicated Account Manager', 'Custom Report Templates', 'Extended Data Retention'].map((f) => (
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
          <RevealSection className="text-center mt-10" delay={300}>
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-green-50 border border-green-200 rounded-full">
              <Shield className="w-5 h-5 text-green-600" />
              <span className="text-sm text-green-800 font-medium">7-Day Money-Back Guarantee — No Questions Asked</span>
            </div>
            <div className="mt-4">
              <Link to="/pricing" className="text-brand font-medium hover:text-brand-dark transition inline-flex items-center gap-1.5">
                See Full Feature Comparison <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* Transparency Section */}
      <section className="py-20 bg-[#FAFAFA]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealSection>
            <div className="bg-white rounded-3xl p-10 border border-gray-200 shadow-sm">
              <div className="flex items-start gap-6">
                <div className="hidden sm:flex w-16 h-16 bg-brand/10 rounded-2xl items-center justify-center flex-shrink-0">
                  <Shield className="w-8 h-8 text-brand" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-secondary mb-4">Our Commitment to Honesty</h3>
                  <p className="text-secondary-light leading-relaxed mb-6">
                    We believe you deserve the truth. WhatsApp campaigns typically have an 8-10% message failure rate due to invalid numbers, network issues, DND-registered contacts, and blocked numbers. Unlike competitors who hide this, we show you exact sent vs. failed counts in real-time.
                  </p>
                  <div className="bg-gray-50 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-secondary">Delivery Success Rate</span>
                      <span className="text-sm font-bold text-brand">90-92%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div className="bg-gradient-to-r from-brand to-[#FF6B4A] h-3 rounded-full transition-all duration-1000" style={{ width: '91%' }} />
                    </div>
                    <p className="text-xs text-secondary-light mt-2">Our smart retry system (up to 3 attempts) minimizes failures and maximizes your reach.</p>
                  </div>
                </div>
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 sm:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealSection className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 bg-brand/10 text-brand text-sm font-semibold rounded-full mb-4">TESTIMONIALS</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-secondary mb-5">
              Loved by <span className="text-gradient">Business Owners</span>
            </h2>
            <p className="text-lg text-secondary-light">Don't take our word for it — here's what our customers say.</p>
          </RevealSection>

          {/* Featured testimonial */}
          <RevealSection>
            <div className="max-w-4xl mx-auto mb-12">
              <div className="bg-gradient-to-br from-brand/5 to-white rounded-3xl p-8 sm:p-10 border border-brand/10 relative">
                <MessageSquare className="absolute top-6 right-6 w-10 h-10 text-brand/10" />
                <div className="flex gap-1 mb-6">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-5 h-5 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-lg sm:text-xl text-secondary leading-relaxed mb-8 italic">
                  "{testimonials[activeTestimonial].quote}"
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-brand/10 rounded-2xl flex items-center justify-center">
                      <span className="text-brand font-bold text-lg">{testimonials[activeTestimonial].name[0]}</span>
                    </div>
                    <div>
                      <p className="font-bold text-secondary">{testimonials[activeTestimonial].name}</p>
                      <p className="text-sm text-secondary-light">{testimonials[activeTestimonial].role} · {testimonials[activeTestimonial].business}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {testimonials.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveTestimonial(i)}
                        className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                          i === activeTestimonial ? 'bg-brand w-8' : 'bg-gray-300 hover:bg-gray-400'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 sm:py-32 bg-[#FAFAFA]" id="faq">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealSection className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 bg-brand/10 text-brand text-sm font-semibold rounded-full mb-4">FAQ</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-secondary mb-5">Frequently Asked Questions</h2>
            <p className="text-secondary-light">Everything you need to know about ReachPeak API.</p>
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

      {/* Final CTA */}
      <section className="relative py-24 sm:py-32 bg-gradient-to-br from-brand via-brand-dark to-[#0d0d1a] text-white overflow-hidden">
        <div className="absolute inset-0 hero-mesh" />
        <div className="absolute inset-0 grid-pattern" />
        <div className="absolute top-10 left-[15%] w-48 h-48 bg-white/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-10 right-[15%] w-64 h-64 bg-white/5 rounded-full blur-3xl animate-float-delayed" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <RevealSection>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-6 leading-tight">
              Ready to Scale Your<br />WhatsApp Marketing?
            </h2>
            <p className="text-lg text-white/70 mb-10 max-w-2xl mx-auto">
              Join 500+ businesses across India growing with ReachPeak API. Get approved and start sending within 24 hours.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/signup"
                className="group w-full sm:w-auto px-10 py-4 bg-white text-brand font-bold rounded-2xl hover:bg-gray-50 transition-all duration-300 text-base flex items-center justify-center gap-2 hover:shadow-xl hover:shadow-white/20"
              >
                Get Started Today
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/contact"
                className="w-full sm:w-auto px-10 py-4 border-2 border-white/20 text-white font-semibold rounded-2xl hover:bg-white/10 transition-all text-base backdrop-blur-sm"
              >
                Talk to Sales
              </Link>
            </div>
            <p className="text-white/40 text-sm mt-6">No credit card required • 7-day money-back guarantee</p>
          </RevealSection>
        </div>
      </section>
    </div>
  );
}
