import { Link } from 'react-router-dom';
import { Target, Eye, Zap, HeartHandshake, ArrowRight } from 'lucide-react';

const values = [
  { icon: Eye, title: 'Transparency', desc: 'We share real delivery rates, real failure rates, and real data. No inflated numbers, no hidden surprises.' },
  { icon: Zap, title: 'Simplicity', desc: 'Complex campaigns made simple. Upload contacts, set up your message, and launch -- all in minutes.' },
  { icon: Target, title: 'Scale', desc: 'Built to handle thousands of messages daily. Whether you have 100 contacts or 100,000, the platform grows with you.' },
  { icon: HeartHandshake, title: 'Support', desc: 'Our team is here to help you succeed. From onboarding to optimization, we are with you every step.' },
];

export function AboutPage() {
  return (
    <div>
      <section className="bg-gradient-to-br from-brand to-brand-dark text-white py-20 sm:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-6">About ReachPeak API</h1>
          <p className="text-lg text-white/80 leading-relaxed max-w-2xl mx-auto">
            Making WhatsApp marketing accessible and affordable for every business.
          </p>
        </div>
      </section>

      <section className="py-20 sm:py-28 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-extrabold text-secondary mb-6">Our Mission</h2>
              <p className="text-secondary-light leading-relaxed mb-4">
                WhatsApp is where your customers are. But reaching them at scale has always been expensive, complicated, and unreliable. We built ReachPeak API to change that.
              </p>
              <p className="text-secondary-light leading-relaxed mb-4">
                Our platform eliminates the per-message costs, simplifies bulk campaign management, and provides real-time visibility into every message sent, delivered, or failed.
              </p>
              <p className="text-secondary-light leading-relaxed">
                Whether you are a small business running your first campaign or an enterprise managing hundreds of thousands of contacts, ReachPeak API gives you the tools to reach your audience effectively.
              </p>
            </div>
            <div className="bg-brand-lighter rounded-2xl p-8 border border-brand/10">
              <div className="space-y-6">
                <div>
                  <p className="text-3xl font-extrabold text-brand">500+</p>
                  <p className="text-sm text-secondary-light">Businesses served</p>
                </div>
                <div>
                  <p className="text-3xl font-extrabold text-brand">10M+</p>
                  <p className="text-sm text-secondary-light">Messages delivered</p>
                </div>
                <div>
                  <p className="text-3xl font-extrabold text-brand">90-92%</p>
                  <p className="text-sm text-secondary-light">Average delivery rate</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-secondary mb-4">Our Values</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((v) => (
              <div key={v.title} className="bg-white rounded-2xl p-6 border border-gray-200 text-center">
                <div className="w-14 h-14 bg-brand-lighter rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <v.icon className="w-7 h-7 text-brand" />
                </div>
                <h3 className="text-lg font-semibold text-secondary mb-2">{v.title}</h3>
                <p className="text-sm text-secondary-light leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-32 h-32 rounded-full mx-auto mb-6 border-4 border-brand/20 shadow-lg overflow-hidden">
            <img src="https://i.ibb.co/Nd8Bn1Rs/1769794953244.jpg" alt="Amit Rai - Founder" className="w-full h-full object-cover" />
          </div>
          <h3 className="text-xl font-bold text-secondary mb-1">Founded with Purpose</h3>
          <p className="text-brand font-semibold mb-1">Amit Rai</p>
          <p className="text-secondary-light mb-6">Founder, ReachPeak API</p>
          <p className="text-secondary-light leading-relaxed max-w-2xl mx-auto">
            "We started ReachPeak API because we saw businesses struggling with expensive, complicated WhatsApp marketing tools. We believed there had to be a simpler, more affordable way. Today, we are proud to serve hundreds of businesses who trust us to power their customer communication."
          </p>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-br from-brand to-brand-dark text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold mb-4">Ready to Get Started?</h2>
          <p className="text-lg text-white/80 mb-8">See our plans and start reaching your customers today.</p>
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-brand font-semibold rounded-xl hover:bg-gray-100 transition"
          >
            View Pricing <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
