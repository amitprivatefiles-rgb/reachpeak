import { Link } from 'react-router-dom';
import { ArrowRight, Megaphone, Workflow, Inbox, FileCheck, CreditCard, BarChart3, ShieldCheck, Link2, Gauge } from 'lucide-react';
import { CtaBand, DemoButton, Faq, Head, Live, WaChat } from '../ui';

const FEATURES = [
  [<Megaphone size={22} />, 'Broadcasts & campaigns', 'Send approved templates to the right segments, scheduled for the right time, with an approval workflow.'],
  [<Workflow size={22} />, 'Automated journeys', 'Booking confirmations, reminders, follow-ups and updates, triggered by real events.'],
  [<Inbox size={22} />, 'Shared team inbox', 'Your whole team replies from one number, with quick replies and full customer history.'],
  [<FileCheck size={22} />, 'Template manager', 'Create, submit and track templates, synced with Meta.'],
  [<CreditCard size={22} />, 'Payment links in chat', 'Send a payment link mid-conversation. Customers pay in a tap.'],
  [<BarChart3 size={22} />, 'Analytics', 'Delivery, reads, replies and results for every campaign and journey.'],
];

const FAQ = [
  { q: 'Is this the official WhatsApp Business API?', a: 'Yes. ReachPeak runs on Meta’s official WhatsApp Cloud API.' },
  { q: 'How long does it take to get started?', a: 'You connect your number through Meta’s Embedded Signup in a few clicks. Verification is usually done within 24 hours.' },
  { q: 'Will my number get blocked?', a: 'We follow Meta’s messaging policies, watch your number’s quality rating, and pause campaigns automatically if quality drops. Messaging people who opted in is the best protection.' },
  { q: 'What does WhatsApp cost?', a: 'Our platform plan, plus Meta’s own conversation charges at Meta’s published rates. We don’t add a markup on Meta’s charges.' },
  { q: 'Can my whole team use it?', a: 'Yes. The shared inbox lets multiple people reply from one business number.' },
];

export default function WhatsApp() {
  return (
    <>
      <section className="rp-hero"><div className="rp-wrap rp-split">
        <div>
          <Live>Official WhatsApp Business API</Live>
          <h1 className="rp-h1">India’s real inbox, <em>run properly.</em></h1>
          <p className="rp-lead">Broadcasts, automated journeys, a shared team inbox and payment links, on the official API. And it works hand in hand with our AI calling agents.</p>
          <div className="rp-btns"><Link to="/signup" className="rp-btn primary">Get started <ArrowRight size={17} /></Link><DemoButton className="rp-btn ghost" /></div>
        </div>
        <WaChat title="Aarogya Skin Clinic" msgs={[
          { text: <>Hi Priya, your appointment with Dr. Mehta is confirmed for <b>Sat, 11:30 AM</b>. Reply 1 to reschedule.</>, time: '10:02 AM', btns: ['Add to calendar', 'Reschedule'] },
          { text: 'Reminder: see you tomorrow at 11:30 AM. Please arrive 10 minutes early.', time: 'Fri 6:00 PM' },
          { me: true, text: 'Thank you, I’ll be there!', time: 'Fri 6:04 PM' },
        ]} />
      </div></section>

      <section className="rp-sec" style={{ paddingTop: 24 }}><div className="rp-wrap">
        <Head eyebrow="Everything in one place" title={<>Every customer conversation, <em>in one place.</em></>} />
        <div className="rp-grid rp-g3">
          {FEATURES.map(([ic, t, d]) => <div className="rp-card" key={t as string}><div className="rp-icon g">{ic}</div><h3 className="rp-h3">{t}</h3><p className="rp-body">{d}</p></div>)}
        </div>
      </div></section>

      <section className="rp-sec rp-dark"><div className="rp-wrap">
        <Head eyebrow="Getting started" title={<>Live in a day, <em>not a month.</em></>} />
        <div className="rp-steps">
          {[['01', 'Connect your number', 'Meta’s Embedded Signup, in a few clicks.'], ['02', 'Import contacts', 'CSV, your CRM, your store or our API.'], ['03', 'Pick your journeys', 'Ready-made flows for your industry, editable.'], ['04', 'Go live', 'Track every message, reply and result.']].map(([n, t, d]) => (
            <div className="rp-step" key={n}><span className="n">STEP {n}</span><h3>{t}</h3><p>{d}</p></div>
          ))}
        </div>
      </div></section>

      <section className="rp-sec"><div className="rp-wrap rp-grid rp-g3">
        {[[<ShieldCheck size={22} />, 'Policy-safe by design', 'Opt-in focused, quality rating monitored, campaigns paused if quality drops.'], [<Link2 size={22} />, 'Connects to everything', 'Website forms, CRMs, Shopify, WooCommerce, PeakCart, Zapier, API and webhooks.'], [<Gauge size={22} />, 'Works with AI calling', 'A missed AI call becomes a WhatsApp message with the same context, automatically.']].map(([ic, t, d]) => (
          <div key={t as string}><div className="rp-icon">{ic}</div><h3 className="rp-h3">{t}</h3><p className="rp-body">{d}</p></div>
        ))}
      </div></section>

      <section className="rp-sec" style={{ paddingTop: 0 }}><div className="rp-wrap">
        <Head center eyebrow="Questions" title="WhatsApp, answered" />
        <Faq items={FAQ} />
      </div></section>
      <CtaBand />
    </>
  );
}
