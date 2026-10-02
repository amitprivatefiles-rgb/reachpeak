import { Link } from 'react-router-dom';
import { Check, Minus } from 'lucide-react';
import { CtaBand, DemoButton, Faq, Head, Live } from '../ui';

const MONTHLY = ['WhatsApp broadcasts & scheduled campaigns', 'Template manager synced with Meta', 'Shared team inbox with quick replies', 'Contacts, tags and CSV import', 'Basic analytics', '1 WhatsApp number', 'Email support'];
const YEARLY = ['Everything in Monthly, plus:', 'AI calling agents, billed per minute from your wallet', 'Automated journeys and reminders', 'Payment links in chat', 'A/B testing and auto-retry', 'Integrations: API, webhooks, Shopify, WooCommerce, PeakCart', 'Order confirmation & COD risk checks for online stores', 'Advanced analytics and exports', 'Priority WhatsApp support'];

const TABLE: { cat: string; rows: [string, boolean, boolean][] }[] = [
  { cat: 'AI Calling', rows: [['AI calling agents (Hindi, English, Hinglish)', false, true], ['Recordings, transcripts and outcomes', false, true], ['Voice + WhatsApp journeys', false, true]] },
  { cat: 'WhatsApp', rows: [['Broadcasts & scheduled campaigns', true, true], ['Template manager', true, true], ['Shared team inbox', true, true], ['Contacts & tags', true, true], ['A/B testing + auto-retry', false, true]] },
  { cat: 'Automation', rows: [['Automated journeys & reminders', false, true], ['Payment links in chat', false, true], ['Order confirmation & COD risk checks', false, true]] },
  { cat: 'Integrations', rows: [['API & webhooks', false, true], ['Shopify / WooCommerce / PeakCart', false, true]] },
  { cat: 'Support', rows: [['Email support', true, true], ['Priority WhatsApp support', false, true]] },
];

const FAQ = [
  { q: 'What else do I pay for?', a: 'Only what you use. AI calling is billed per minute from your prepaid ReachPeak wallet. WhatsApp conversations are charged by Meta at Meta’s published rates, with no markup from us.' },
  { q: 'How does the wallet work?', a: 'Top up your ReachPeak wallet in rupees, and every AI calling minute is deducted from it. You only pay for the minutes your agents actually use.' },
  { q: 'Which plan includes AI calling?', a: 'AI calling agents are part of the Yearly plan. Book a demo to hear an agent call your own phone first.' },
  { q: 'Can I switch from Monthly to Yearly?', a: 'Yes, you can upgrade any time.' },
  { q: 'Do you provide a GST invoice?', a: 'Yes. Add your GSTIN at checkout and your GST invoice is emailed to you.' },
  { q: 'What happens at renewal?', a: 'Plans renew automatically unless cancelled. We remind you before a yearly renewal.' },
  { q: 'Not sure which plan fits?', a: 'Message us on WhatsApp or book a demo call. We’ll recommend the right plan honestly, even if it’s the smaller one.' },
];

export default function Pricing() {
  return (
    <>
      <section className="rp-hero" style={{ paddingBottom: 32 }}><div className="rp-wrap rp-center">
        <span className="rp-eyebrow">Pricing</span>
        <h1 className="rp-h1">Simple plans. <em>Honest usage.</em></h1>
        <p className="rp-lead">A flat platform plan in rupees, plus what you actually use. No hidden fees.</p>
      </div></section>

      <section className="rp-sec" style={{ paddingTop: 16 }}><div className="rp-wrap">
        <div className="rp-plans">
          <div className="rp-plan">
            <h3 className="rp-h3" style={{ fontSize: 22 }}>Monthly</h3>
            <p className="rp-body">WhatsApp essentials for getting started.</p>
            <div className="rp-price">₹2,499<small>/ month</small></div>
            <p className="rp-note">+ GST · Meta conversation charges billed by Meta</p>
            <Link to="/signup" className="rp-btn ghost">Choose Monthly</Link>
            <ul className="rp-list">{MONTHLY.map((f) => <li key={f}><Check size={18} />{f}</li>)}</ul>
          </div>
          <div className="rp-plan best">
            <span className="best-tag">Best value</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}><h3 className="rp-h3" style={{ fontSize: 22 }}>Yearly</h3><Live>AI calling</Live></div>
            <p className="rp-body">AI calling, automation and integrations.</p>
            <div className="rp-price">₹14,999<small>/ year</small></div>
            <p className="rp-note">≈ ₹1,250/month · save ₹14,989 vs monthly · + GST · AI calling per minute from wallet</p>
            <Link to="/signup" className="rp-btn primary">Choose Yearly</Link>
            <ul className="rp-list">{YEARLY.map((f, i) => i === 0 ? <li key={f} style={{ gridTemplateColumns: '1fr', fontWeight: 600 }}>{f}</li> : <li key={f}><Check size={18} />{f}</li>)}</ul>
          </div>
        </div>
        <p className="rp-body rp-center" style={{ marginTop: 28 }}>Want to hear AI calling first? <DemoButton className="rp-link" label="Get a demo call" /></p>
      </div></section>

      <section className="rp-sec tight"><div className="rp-wrap">
        <Head eyebrow="Compare" title="What’s in each plan" />
        <div className="rp-table-wrap"><table className="rp-table">
          <thead><tr><th>Feature</th><th>Monthly</th><th>Yearly</th></tr></thead>
          <tbody>
            {TABLE.map((c) => [<tr key={c.cat} className="cat"><td colSpan={3}>{c.cat}</td></tr>, ...c.rows.map(([n, m, y]) => <tr key={n}><td>{n}</td><td>{m ? <Check className="y" size={18} /> : <Minus className="n" size={18} />}</td><td>{y ? <Check className="y" size={18} /> : <Minus className="n" size={18} />}</td></tr>)])}
          </tbody>
        </table></div>
      </div></section>

      <section className="rp-sec"><div className="rp-wrap">
        <Head center eyebrow="Questions" title="Pricing, answered" />
        <Faq items={FAQ} />
      </div></section>
      <CtaBand />
    </>
  );
}
