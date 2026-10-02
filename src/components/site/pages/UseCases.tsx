import { Link } from 'react-router-dom';
import { Ch, CtaBand, Head, Live } from '../ui';
import { INDUSTRIES } from '../data';

const GOALS: { goal: string; lead: string; rows: { use: string; who: string; ch: ('Voice' | 'WhatsApp')[] }[] }[] = [
  { goal: 'Respond & qualify', lead: 'Reach every enquiry first, and know who is serious.', rows: [
    { use: 'Call new leads within 60 seconds', who: 'Every industry', ch: ['Voice'] },
    { use: 'Qualify budget, need and timeline', who: 'Real estate, education, finance, services', ch: ['Voice'] },
    { use: 'Call back missed calls automatically', who: 'Clinics, salons, services', ch: ['Voice', 'WhatsApp'] },
  ] },
  { goal: 'Book & remind', lead: 'Turn interest into a booked slot, and make sure they show up.', rows: [
    { use: 'Book appointments, visits, demos and classes', who: 'Clinics, real estate, education, salons', ch: ['Voice', 'WhatsApp'] },
    { use: 'Remind the day before, reschedule on the spot', who: 'Clinics, salons, education, services', ch: ['Voice', 'WhatsApp'] },
    { use: 'Confirm new orders and addresses', who: 'Online & retail brands', ch: ['Voice', 'WhatsApp'] },
  ] },
  { goal: 'Collect', lead: 'Get paid on time without awkward follow-ups.', rows: [
    { use: 'Payment, EMI and fee reminders with links', who: 'Finance, education, services', ch: ['Voice', 'WhatsApp'] },
    { use: 'Renewal reminders before expiry', who: 'Insurance, memberships, subscriptions', ch: ['Voice', 'WhatsApp'] },
    { use: 'Document and KYC requests', who: 'Finance, education, real estate', ch: ['WhatsApp'] },
  ] },
  { goal: 'Update & support', lead: 'Keep customers informed so they never have to chase you.', rows: [
    { use: 'Order, shipping and delivery updates', who: 'Online & retail brands', ch: ['WhatsApp'] },
    { use: 'Service and project status updates', who: 'Services, agencies, real estate', ch: ['WhatsApp'] },
    { use: 'Shared inbox for every customer question', who: 'Every industry', ch: ['WhatsApp'] },
  ] },
  { goal: 'Re-engage', lead: 'Bring customers back, and learn what they think.', rows: [
    { use: 'Feedback and review requests', who: 'Every industry', ch: ['WhatsApp', 'Voice'] },
    { use: '“It’s been a while” win-back reminders', who: 'Salons, clinics, retail', ch: ['WhatsApp', 'Voice'] },
    { use: 'Abandoned cart recovery', who: 'Online & retail brands', ch: ['WhatsApp', 'Voice'] },
  ] },
];

export default function UseCases() {
  return (
    <>
      <section className="rp-hero" style={{ paddingBottom: 40 }}><div className="rp-wrap">
        <Live>AI calling + WhatsApp · live</Live>
        <h1 className="rp-h1">Every journey, <em>by goal.</em></h1>
        <p className="rp-lead">Whatever you sell, customers need the same things: a fast answer, a booked slot, a timely reminder and a clear update. Here’s how ReachPeak covers each one.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 28 }}>{INDUSTRIES.map((i) => <Link key={i.slug} to={`/solutions/${i.slug}`} className="rp-tag n" style={{ fontSize: 12, padding: '10px 14px' }}>{i.name}</Link>)}</div>
      </div></section>
      {GOALS.map((g, idx) => (
        <section key={g.goal} className="rp-sec tight" style={idx % 2 ? { background: '#F2F1EC' } : undefined}><div className="rp-wrap">
          <Head eyebrow={`0${idx + 1}`} title={g.goal} lead={g.lead} />
          <div className="rp-table-wrap"><table className="rp-table">
            <thead><tr><th>Use case</th><th style={{ textAlign: 'left', width: 'auto' }}>Who uses it</th><th>Channel</th></tr></thead>
            <tbody>{g.rows.map((r) => <tr key={r.use}><td style={{ fontWeight: 600 }}>{r.use}</td><td style={{ textAlign: 'left', width: 'auto', color: 'var(--mut)' }}>{r.who}</td><td><div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}><Ch ch={r.ch} /></div></td></tr>)}</tbody>
          </table></div>
        </div></section>
      ))}
      <CtaBand />
    </>
  );
}
