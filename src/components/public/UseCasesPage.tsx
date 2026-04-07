import { Link } from 'react-router-dom';
import {
  ShoppingBag, Building2, GraduationCap, Stethoscope, UtensilsCrossed, PartyPopper,
  Dumbbell, Car, ArrowRight,
} from 'lucide-react';
import { RevealSection } from '../../hooks/useScrollReveal';

const useCases = [
  {
    icon: ShoppingBag,
    title: 'E-commerce & Retail',
    desc: 'Send order confirmations, shipping updates, promotional offers, flash sale alerts, and abandoned cart reminders. Re-engage past buyers with personalized product recommendations.',
    examples: ['Order shipped notifications', 'Flash sale announcements', 'Abandoned cart recovery', 'New collection drops', 'Loyalty rewards reminders'],
  },
  {
    icon: Building2,
    title: 'Real Estate',
    desc: 'Share property listings, schedule site visits, follow up with leads, and send price updates. Track which marketing channel — Facebook, Instagram, or website — brings the most qualified buyers.',
    examples: ['New listing alerts', 'Site visit confirmations', 'Price drop notifications', 'EMI calculator links', 'Post-visit follow-ups'],
  },
  {
    icon: GraduationCap,
    title: 'Education & Coaching',
    desc: 'Communicate with students and parents at scale. Share class schedules, exam dates, fee reminders, and results. Run enrollment campaigns to fill new batches.',
    examples: ['Admission campaign blasts', 'Fee payment reminders', 'Result announcements', 'Class schedule updates', 'Parent-teacher meeting invites'],
  },
  {
    icon: Stethoscope,
    title: 'Healthcare & Clinics',
    desc: 'Send appointment reminders, lab report links, health tips, and vaccination alerts. Reduce no-shows by up to 40% with automated WhatsApp reminders.',
    examples: ['Appointment confirmations', 'Lab report delivery', 'Vaccination schedule reminders', 'Health tip campaigns', 'Feedback collection'],
  },
  {
    icon: UtensilsCrossed,
    title: 'Restaurants & Food',
    desc: 'Promote daily specials, weekend offers, and new menu items. Send loyalty rewards and collect feedback. Schedule messages at peak ordering times for maximum impact.',
    examples: ['Daily special menus', 'Weekend offer promotions', 'Loyalty point updates', 'New branch announcements', 'Customer feedback requests'],
  },
  {
    icon: Dumbbell,
    title: 'Fitness & Wellness',
    desc: 'Manage membership renewals, class bookings, and trainer schedules. Send workout reminders, nutrition tips, and special offer campaigns to keep members engaged.',
    examples: ['Membership renewal alerts', 'Class schedule updates', 'Personal trainer slots', 'Diet plan sharing', 'Referral program campaigns'],
  },
  {
    icon: PartyPopper,
    title: 'Events & Entertainment',
    desc: 'Promote upcoming events, send ticket confirmations, venue details, and last-minute updates. Run early-bird campaigns and manage guest lists efficiently.',
    examples: ['Event launch promotions', 'Ticket confirmation + QR', 'Venue & parking details', 'Last-minute updates', 'Post-event thank you messages'],
  },
  {
    icon: Car,
    title: 'Automobile & Service',
    desc: 'Send service reminders, insurance renewal alerts, new model launches, and test drive invitations. Follow up with leads from showroom visits and auto portals.',
    examples: ['Service due reminders', 'Insurance renewal alerts', 'New launch invitations', 'Test drive scheduling', 'Festive offer campaigns'],
  },
];

export function UseCasesPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand via-brand-dark to-[#0d0d1a] text-white py-24 sm:py-32">
        <div className="absolute inset-0 hero-mesh" />
        <div className="absolute inset-0 grid-pattern" />
        <div className="absolute bottom-20 left-[10%] w-64 h-64 bg-white/5 rounded-full blur-3xl animate-float" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block px-4 py-1.5 bg-white/10 text-white/90 text-sm font-semibold rounded-full mb-6 border border-white/10 backdrop-blur-sm">USE CASES</span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-6">
            Built for Every Industry
          </h1>
          <p className="text-lg text-white/70 leading-relaxed max-w-2xl mx-auto">
            See how businesses across industries use ReachPeak API to engage customers, drive sales, and grow — all through WhatsApp.
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" className="w-full"><path d="M0 60V30C240 0 480 0 720 30C960 60 1200 60 1440 30V60H0Z" fill="white"/></svg>
        </div>
      </section>

      {/* Use Cases Grid */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {useCases.map((uc, i) => (
              <RevealSection key={uc.title} delay={i * 100}>
                <div className="bg-white rounded-3xl p-8 border border-gray-200 hover:border-brand/20 hover:shadow-xl hover:shadow-brand/5 transition-all duration-500 h-full group">
                  <div className="flex items-start gap-5">
                    <div className="w-14 h-14 bg-brand/10 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-brand transition-all duration-500">
                      <uc.icon className="w-7 h-7 text-brand group-hover:text-white transition-colors duration-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-secondary mb-3">{uc.title}</h3>
                      <p className="text-sm text-secondary-light leading-relaxed mb-4">{uc.desc}</p>
                      <div className="flex flex-wrap gap-2">
                        {uc.examples.map((ex) => (
                          <span key={ex} className="inline-block px-3 py-1 bg-gray-50 text-xs text-secondary-light rounded-lg border border-gray-100">
                            {ex}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24 bg-gradient-to-br from-brand via-brand-dark to-[#0d0d1a] text-white overflow-hidden">
        <div className="absolute inset-0 hero-mesh" />
        <div className="absolute inset-0 grid-pattern" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <RevealSection>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">Don't See Your Industry?</h2>
            <p className="text-lg text-white/70 mb-8">ReachPeak API works for any business that communicates with customers via WhatsApp. Get in touch and we'll show you how.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/signup"
                className="group w-full sm:w-auto px-8 py-4 bg-white text-brand font-bold rounded-2xl hover:bg-gray-50 transition-all duration-300 flex items-center justify-center gap-2"
              >
                Get Started <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/contact"
                className="w-full sm:w-auto px-8 py-4 border-2 border-white/20 text-white font-semibold rounded-2xl hover:bg-white/10 transition-all backdrop-blur-sm"
              >
                Contact Sales
              </Link>
            </div>
          </RevealSection>
        </div>
      </section>
    </div>
  );
}
