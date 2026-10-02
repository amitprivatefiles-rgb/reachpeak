import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { CtaBand, Head } from '../ui';
import { WA_NUMBER } from '../data';

const PRINCIPLES = [
  ['No customer should wait.', 'Speed is respect. Every lead deserves a fast, polite answer.'],
  ['Tell the truth about the product.', 'Including what it can’t do yet.'],
  ['Built for India first.', 'Indian languages, WhatsApp and the phone call are the main case, not the edge case.'],
  ['Consent before contact.', 'We help businesses talk to people who asked to hear from them.'],
  ['Your data is yours.', 'Stored in India. Never sold, never shared.'],
  ['Answer every customer.', 'Including ours. The founder’s WhatsApp is public.'],
];

export default function About() {
  return (
    <>
      <section className="rp-hero"><div className="rp-wrap" style={{ maxWidth: 980 }}>
        <span className="rp-eyebrow">About ReachPeak</span>
        <h1 className="rp-h1">We’re building the <em>front office</em> for India’s businesses.</h1>
        <p className="rp-lead" style={{ maxWidth: 760 }}>Every business that talks to customers loses some of them to slow replies, missed calls and forgotten follow-ups. ReachPeak API gives every business an AI team that calls, books, reminds and follows up, on the phone and on WhatsApp.</p>
      </div></section>

      <section className="rp-sec rp-dark"><div className="rp-wrap rp-split">
        <div>
          <span className="rp-eyebrow">Our story</span>
          <h2 className="rp-h2">Started on WhatsApp. <em>Grew into voice.</em></h2>
        </div>
        <div className="rp-grid" style={{ gap: 18 }}>
          <p className="rp-body" style={{ fontSize: 18, color: '#E4E4E0' }}>ReachPeak API began in 2025 as a WhatsApp Business messaging platform. We learned the hard parts: template rules, quality ratings, opt-in, and conversations that matter to real customers.</p>
          <p className="rp-body" style={{ fontSize: 18, color: '#E4E4E0' }}>Our customers kept telling us the same thing: many people still trust a phone call more than a link. So we built AI calling agents that call in 60 seconds, in Hindi, English and Hinglish, and work together with WhatsApp as one journey.</p>
          <p className="rp-body" style={{ fontSize: 18, color: '#E4E4E0' }}>We build from Kolkata, close to the businesses we serve.</p>
        </div>
      </div></section>

      <section className="rp-sec"><div className="rp-wrap">
        <Head eyebrow="How we work" title={<>Principles we <em>hold ourselves to.</em></>} />
        <div className="rp-journey">
          {PRINCIPLES.map(([t, d], i) => <div className="rp-jc" key={t}><span className="k">0{i + 1}</span><h3 style={{ fontSize: 26 }}>{t}</h3><p>{d}</p></div>)}
        </div>
      </div></section>

      <section className="rp-sec" style={{ background: '#F2F1EC' }}><div className="rp-wrap rp-split">
        <div>
          <span className="rp-eyebrow">The company</span>
          <h2 className="rp-h2">ReachPeak <em>Technologies.</em></h2>
          <p className="rp-lead">ReachPeak API is built by ReachPeak Technologies, Kolkata, the company behind PeakCart, a profit-first commerce platform for Indian brands.</p>
        </div>
        <div className="rp-card">
          <div className="rp-founder" style={{ gridTemplateColumns: 'auto 1fr', gap: 22 }}>
            <div className="rp-mono" style={{ width: 84, height: 84, fontSize: 32 }}>AR</div>
            <div><div className="rp-h3">Amit Rai</div><p className="rp-body" style={{ margin: '4px 0 0' }}>Founder, ReachPeak Technologies</p></div>
          </div>
          <p className="rp-body" style={{ marginTop: 20, fontSize: 16.5 }}>“Most businesses don’t lose customers to competitors. They lose them to slow replies. We built ReachPeak so nobody has to wait.”</p>
          <a href={`https://wa.me/${WA_NUMBER}`} target="_blank" rel="noreferrer" className="rp-link" style={{ marginTop: 18 }}>Message Amit on WhatsApp <ArrowRight size={15} /></a>
        </div>
      </div></section>

      <section className="rp-sec tight"><div className="rp-wrap rp-center">
        <p className="rp-lead" style={{ margin: '0 auto' }}>Want to see it for your business? <Link to="/use-cases" className="rp-link">Browse use cases <ArrowRight size={15} /></Link></p>
      </div></section>
      <CtaBand />
    </>
  );
}
