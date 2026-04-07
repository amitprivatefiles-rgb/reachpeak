import { useState } from 'react';
import { Mail, Phone, MapPin, Clock, Send, CheckCircle, MessageSquare, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { RevealSection } from '../../hooks/useScrollReveal';

const contactMethods = [
  { icon: Mail, title: 'Email Us', desc: 'support@reachpeakapi.in', sub: 'We respond within 24 hours', color: 'bg-blue-500/10 text-blue-500' },
  { icon: Phone, title: 'WhatsApp Support', desc: '+91 6290678045', sub: 'Mon-Sat, 9 AM - 7 PM IST', color: 'bg-green-500/10 text-green-500' },
  { icon: MapPin, title: 'Office Location', desc: 'Kolkata, India', sub: 'West Bengal', color: 'bg-brand/10 text-brand' },
  { icon: Clock, title: 'Business Hours', desc: 'Mon - Sat: 9 AM - 7 PM', sub: 'Sunday: Closed', color: 'bg-amber-500/10 text-amber-500' },
];

export function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: 'General Inquiry', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand via-brand-dark to-[#0d0d1a] text-white py-24 sm:py-28">
        <div className="absolute inset-0 hero-mesh" />
        <div className="absolute inset-0 grid-pattern" />
        <div className="absolute top-20 left-[20%] w-48 h-48 bg-white/5 rounded-full blur-3xl animate-float" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block px-4 py-1.5 bg-white/10 text-white/90 text-sm font-semibold rounded-full mb-6 border border-white/10 backdrop-blur-sm">GET IN TOUCH</span>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-4">Contact Us</h1>
          <p className="text-lg text-white/70">Have questions? We're here to help you scale your WhatsApp marketing.</p>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" className="w-full"><path d="M0 60V30C240 0 480 0 720 30C960 60 1200 60 1440 30V60H0Z" fill="white"/></svg>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {contactMethods.map((m, i) => (
              <RevealSection key={m.title} delay={i * 100}>
                <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-brand/20 hover:shadow-lg transition-all duration-500 text-center h-full group">
                  <div className={`w-14 h-14 ${m.color} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                    <m.icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-secondary mb-1">{m.title}</h3>
                  <p className="text-secondary text-sm font-medium">{m.desc}</p>
                  <p className="text-secondary-light text-xs mt-1">{m.sub}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* Form + Info */}
      <section className="py-16 bg-[#FAFAFA]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12">
            <RevealSection>
              <h2 className="text-2xl font-bold text-secondary mb-6">Send Us a Message</h2>
              {submitted ? (
                <div className="bg-green-50 border border-green-200 rounded-3xl p-10 text-center animate-scale-in">
                  <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-green-800 mb-2">Message Sent!</h3>
                  <p className="text-green-700">Thank you for reaching out. We'll get back to you within 24 hours.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1.5">Name *</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-secondary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all duration-300 bg-white"
                      placeholder="Your name"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1.5">Email *</label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-secondary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all duration-300 bg-white"
                        placeholder="you@email.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1.5">Phone</label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-secondary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all duration-300 bg-white"
                        placeholder="+91 98765 43210"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1.5">Subject</label>
                    <select
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-secondary focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all duration-300 bg-white"
                    >
                      <option>General Inquiry</option>
                      <option>Technical Support</option>
                      <option>Billing & Payments</option>
                      <option>Feature Request</option>
                      <option>Partnership</option>
                      <option>Enterprise Plan</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1.5">Message *</label>
                    <textarea
                      required
                      rows={5}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-secondary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all duration-300 resize-none bg-white"
                      placeholder="How can we help?"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-8 py-3.5 bg-brand text-white font-semibold rounded-xl hover:bg-brand-dark transition-all duration-300 flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-brand/20"
                  >
                    <Send className="w-4 h-4" /> Send Message
                  </button>
                </form>
              )}
            </RevealSection>

            <RevealSection delay={200}>
              <div className="space-y-6">
                <div className="bg-white rounded-3xl p-8 border border-gray-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center">
                      <Zap className="w-5 h-5 text-brand" />
                    </div>
                    <h3 className="text-lg font-bold text-secondary">Quick Response</h3>
                  </div>
                  <p className="text-secondary-light text-sm leading-relaxed mb-4">
                    Our support team typically responds within 4-6 hours during business hours. For urgent issues, reach out via WhatsApp for faster resolution.
                  </p>
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <p className="text-xs text-secondary-light mb-1">Average response time</p>
                    <p className="text-2xl font-bold text-brand">&lt; 6 Hours</p>
                    <p className="text-xs text-secondary-light mt-1">During business hours (Mon-Sat, 9 AM - 7 PM IST)</p>
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-8 border border-gray-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-brand" />
                    </div>
                    <h3 className="text-lg font-bold text-secondary">FAQ</h3>
                  </div>
                  <p className="text-secondary-light text-sm leading-relaxed mb-4">
                    Looking for quick answers? Many common questions are answered in our FAQ section.
                  </p>
                  <Link to="/#faq" className="inline-flex items-center gap-1.5 text-brand font-medium text-sm hover:text-brand-dark transition">
                    View FAQ Section →
                  </Link>
                </div>
              </div>
            </RevealSection>
          </div>
        </div>
      </section>
    </div>
  );
}
