import { Link } from 'react-router-dom';
import { Target, Eye, Zap, HeartHandshake, ArrowRight } from 'lucide-react';
import { RevealSection, useCountUp } from '../../hooks/useScrollReveal';

const values = [
  { icon: Eye, title: 'Transparency', desc: 'We share real delivery rates, real failure rates, and real data. No inflated numbers, no hidden surprises. We believe honesty builds trust.' },
  { icon: Zap, title: 'Simplicity', desc: 'Complex campaigns made simple. Upload contacts, set up your message, and launch — all in minutes. No developer or technical expertise required.' },
  { icon: Target, title: 'Scale', desc: 'Built to handle thousands of messages daily. Whether you have 100 contacts or 100,000, the platform grows with your business.' },
  { icon: HeartHandshake, title: 'Support', desc: 'Our team is here to help you succeed. From onboarding to campaign optimization, we provide responsive, human support at every step.' },
];

const milestones = [
  { year: '2024', title: 'Founded', desc: 'ReachPeak API was born from a simple idea — make WhatsApp marketing affordable for every business in India.' },
  { year: '2024', title: 'First 100 Businesses', desc: 'Within months, 100 businesses across e-commerce, education, and real estate trusted us with their customer communication.' },
  { year: '2025', title: '500+ Businesses', desc: 'Crossed 500 active businesses, 10M+ messages delivered, and expanded our feature set with A/B testing and agent management.' },
  { year: '2025', title: 'Enterprise Features', desc: 'Launched advanced campaign scheduling, rich media support, lead source analytics, and dedicated account management.' },
];

function AnimatedStat({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const { count, ref } = useCountUp(value);
  return (
    <div ref={ref as any} className="text-center">
      <p className="text-4xl sm:text-5xl font-extrabold text-brand">{count.toLocaleString()}{suffix}</p>
      <p className="text-sm text-secondary-light mt-2">{label}</p>
    </div>
  );
}

export function AboutPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand via-brand-dark to-[#0d0d1a] text-white py-24 sm:py-32">
        <div className="absolute inset-0 hero-mesh" />
        <div className="absolute inset-0 grid-pattern" />
        <div className="absolute top-20 right-[20%] w-64 h-64 bg-white/5 rounded-full blur-3xl animate-float" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block px-4 py-1.5 bg-white/10 text-white/90 text-sm font-semibold rounded-full mb-6 border border-white/10 backdrop-blur-sm">OUR STORY</span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-6">About ReachPeak API</h1>
          <p className="text-lg text-white/70 leading-relaxed max-w-2xl mx-auto">
            We're on a mission to make WhatsApp marketing accessible, affordable, and effective for every business across India.
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" className="w-full"><path d="M0 60V30C240 0 480 0 720 30C960 60 1200 60 1440 30V60H0Z" fill="white"/></svg>
        </div>
      </section>

      {/* Mission */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <RevealSection>
              <span className="inline-block px-4 py-1.5 bg-brand/10 text-brand text-sm font-semibold rounded-full mb-4">OUR MISSION</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-secondary mb-6">Democratizing WhatsApp Marketing</h2>
              <p className="text-secondary-light leading-relaxed mb-4">
                WhatsApp is where your customers are. With over 500 million users in India alone, it's the most powerful channel for direct customer communication. But reaching them at scale has always been expensive, complicated, and unreliable.
              </p>
              <p className="text-secondary-light leading-relaxed mb-4">
                We built ReachPeak API to change that. Our platform eliminates the per-message costs that make WhatsApp marketing prohibitively expensive for small and medium businesses. Instead of paying ₹0.50-₹1.50 per message, you pay one flat monthly fee for unlimited messaging.
              </p>
              <p className="text-secondary-light leading-relaxed">
                Beyond affordability, we focus on simplicity. Upload your contacts, craft your message, and launch your campaign — all in minutes, no developer required. Real-time analytics show you exactly what's working, so you can optimize as you go.
              </p>
            </RevealSection>
            <RevealSection delay={200}>
              <div className="bg-gradient-to-br from-brand/5 to-brand/10 rounded-3xl p-10 border border-brand/10">
                <div className="grid grid-cols-1 gap-8">
                  <AnimatedStat value={500} suffix="+" label="Businesses Served" />
                  <AnimatedStat value={10} suffix="M+" label="Messages Delivered" />
                  <AnimatedStat value={92} suffix="%" label="Average Delivery Rate" />
                </div>
              </div>
            </RevealSection>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-24 bg-[#FAFAFA] grid-pattern-dark">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealSection className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 bg-brand/10 text-brand text-sm font-semibold rounded-full mb-4">OUR JOURNEY</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-secondary mb-5">From Idea to Impact</h2>
          </RevealSection>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-brand/30 via-brand/20 to-brand/5 md:-translate-x-px" />
            <div className="space-y-12">
              {milestones.map((m, i) => (
                <RevealSection key={m.title} delay={i * 150}>
                  <div className={`relative flex items-start gap-8 ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                    <div className={`flex-1 ${i % 2 === 0 ? 'md:text-right' : 'md:text-left'} hidden md:block`}>
                      <div className={`bg-white rounded-2xl p-6 border border-gray-200 hover:border-brand/20 hover:shadow-lg transition-all duration-500 inline-block ${i % 2 === 0 ? 'ml-auto' : 'mr-auto'}`}>
                        <span className="text-brand font-bold text-sm">{m.year}</span>
                        <h3 className="text-lg font-bold text-secondary mt-1">{m.title}</h3>
                        <p className="text-sm text-secondary-light mt-2 leading-relaxed">{m.desc}</p>
                      </div>
                    </div>
                    {/* Dot */}
                    <div className="absolute left-6 md:left-1/2 w-3 h-3 bg-brand rounded-full -translate-x-1.5 mt-2 ring-4 ring-white z-10" />
                    {/* Mobile card */}
                    <div className="ml-14 md:hidden bg-white rounded-2xl p-6 border border-gray-200 flex-1">
                      <span className="text-brand font-bold text-sm">{m.year}</span>
                      <h3 className="text-lg font-bold text-secondary mt-1">{m.title}</h3>
                      <p className="text-sm text-secondary-light mt-2 leading-relaxed">{m.desc}</p>
                    </div>
                    <div className="flex-1 hidden md:block" />
                  </div>
                </RevealSection>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealSection className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 bg-brand/10 text-brand text-sm font-semibold rounded-full mb-4">OUR VALUES</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-secondary mb-5">What We Stand For</h2>
          </RevealSection>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((v, i) => (
              <RevealSection key={v.title} delay={i * 100}>
                <div className="bg-white rounded-2xl p-7 border border-gray-200 text-center card-3d h-full">
                  <div className="w-16 h-16 bg-brand/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
                    <v.icon className="w-7 h-7 text-brand" />
                  </div>
                  <h3 className="text-lg font-bold text-secondary mb-3">{v.title}</h3>
                  <p className="text-sm text-secondary-light leading-relaxed">{v.desc}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* Founder */}
      <section className="py-24 bg-[#FAFAFA]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealSection>
            <div className="bg-white rounded-3xl p-10 border border-gray-200 text-center shadow-sm">
              <div className="w-36 h-36 rounded-full mx-auto mb-6 border-4 border-brand/20 shadow-xl overflow-hidden ring-4 ring-brand/5">
                <img src="https://i.ibb.co/Nd8Bn1Rs/1769794953244.jpg" alt="Amit Rai - Founder" className="w-full h-full object-cover" />
              </div>
              <h3 className="text-2xl font-bold text-secondary mb-1">Amit Rai</h3>
              <p className="text-brand font-semibold mb-6">Founder & CEO, ReachPeak API</p>
              <p className="text-secondary-light leading-relaxed max-w-2xl mx-auto text-lg italic">
                "We started ReachPeak API because we saw businesses struggling with expensive, complicated WhatsApp marketing tools. We believed there had to be a simpler, more affordable way. Today, we're proud to serve 500+ businesses who trust us to power their customer communication — and we're just getting started."
              </p>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24 bg-gradient-to-br from-brand via-brand-dark to-[#0d0d1a] text-white overflow-hidden">
        <div className="absolute inset-0 hero-mesh" />
        <div className="absolute inset-0 grid-pattern" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <RevealSection>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">Ready to Join Us?</h2>
            <p className="text-lg text-white/70 mb-8">See our plans and start reaching your customers today.</p>
            <Link
              to="/pricing"
              className="group inline-flex items-center gap-2 px-8 py-4 bg-white text-brand font-bold rounded-2xl hover:bg-gray-50 transition-all duration-300 hover:shadow-xl hover:shadow-white/20"
            >
              View Pricing <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </RevealSection>
        </div>
      </section>
    </div>
  );
}
