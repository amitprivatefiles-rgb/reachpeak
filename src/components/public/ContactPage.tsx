import { useState } from 'react';
import { Mail, Phone, MapPin, Clock, Send, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: 'General Inquiry', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div>
      <section className="bg-gradient-to-br from-brand to-brand-dark text-white py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-extrabold mb-4">Contact Us</h1>
          <p className="text-lg text-white/80">Have questions? We are here to help.</p>
        </div>
      </section>
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-2xl font-bold text-secondary mb-6">Send Us a Message</h2>
              {submitted ? (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center animate-scale-in">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-green-800 mb-2">Message Sent!</h3>
                  <p className="text-green-700">Thank you for reaching out. We will get back to you within 24 hours.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1.5">Name</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-secondary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
                      placeholder="Your name"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1.5">Email</label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-secondary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
                        placeholder="you@email.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1.5">Phone</label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-secondary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
                        placeholder="+91 98765 43210"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1.5">Subject</label>
                    <select
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-secondary focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition bg-white"
                    >
                      <option>General Inquiry</option>
                      <option>Technical Support</option>
                      <option>Billing & Payments</option>
                      <option>Feature Request</option>
                      <option>Partnership</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1.5">Message</label>
                    <textarea
                      required
                      rows={5}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-secondary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition resize-none"
                      placeholder="How can we help?"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-8 py-3 bg-brand text-white font-semibold rounded-xl hover:bg-brand-dark transition flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" /> Send Message
                  </button>
                </form>
              )}
            </div>

            <div>
              <h2 className="text-2xl font-bold text-secondary mb-6">Direct Contact</h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-brand-lighter rounded-xl flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-brand" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-secondary mb-1">Email</h3>
                    <p className="text-secondary-light text-sm">support@reachpeakapi.in</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-brand-lighter rounded-xl flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 text-brand" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-secondary mb-1">WhatsApp Support</h3>
                    <p className="text-secondary-light text-sm">+91 6290678045</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-brand-lighter rounded-xl flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-brand" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-secondary mb-1">Business Hours</h3>
                    <p className="text-secondary-light text-sm">Monday - Saturday: 9:00 AM - 7:00 PM IST</p>
                    <p className="text-secondary-light text-sm">Sunday: Closed</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-brand-lighter rounded-xl flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-brand" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-secondary mb-1">Office</h3>
                    <p className="text-secondary-light text-sm">Kolkata, India</p>
                  </div>
                </div>
              </div>
              <div className="mt-8 p-6 bg-gray-50 rounded-2xl border border-gray-200">
                <p className="text-sm text-secondary-light">
                  Looking for quick answers? Check our{' '}
                  <Link to="/#faq" className="text-brand font-medium hover:text-brand-dark transition">
                    FAQ section
                  </Link>{' '}
                  for common questions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
