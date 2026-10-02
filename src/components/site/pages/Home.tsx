import { Link } from 'react-router-dom';
import { ArrowRight, Check, Clock, PhoneMissed, CalendarX, ShieldCheck, Mic, MessageCircle, Workflow, Database, Languages, FileAudio } from 'lucide-react';
import { CallCard, CtaBand, DemoButton, Faq, Head, Live, Ch, Checks } from '../ui';
import { INDUSTRIES, STAGES, INTEGRATIONS, LANGS_LIVE, LANGS_NEXT, WA_NUMBER } from '../data';

const FAQ = [
  { q: 'Is AI calling live?', a: 'Yes. ReachPeak’s AI calling agents are live today. Book a demo and an agent will call your own phone, in Hindi, English or Hinglish.' },
  { q: 'What kind of businesses use ReachPeak?', a: 'Any business that talks to customers: clinics, coaching institutes, real estate teams, salons and studios, finance and insurance teams, agencies and service firms, and online brands.' },
  { q: 'Does the AI sound like a robot?', a: 'No. Agents hold natural conversations, handle interruptions and Indian accents, and speak Hindi, English and Hinglish. Every call is recorded and transcribed, so you can hear exactly what was said.' },
  { q: 'What happens if the customer doesn’t pick up?', a: 'The journey continues on WhatsApp automatically, with the same context, so a missed call never means a lost lead.' },
  { q: 'Is this the official WhatsApp Business API?', a: 'Yes. ReachPeak uses Meta’s official WhatsApp Cloud API. You connect your number through Meta’s Embedded Signup in a few clicks.' },
  { q: 'Is calling compliant?', a: 'Agents are consent-first and DND-aware: they call people who enquired or opted in, during sensible hours. You control who is called and when.' },
  { q: 'How does pricing work?', a: <>A flat platform plan, plus usage. WhatsApp conversations are charged by Meta at Meta’s published rates, with no markup from us. AI calling is billed per minute from your prepaid wallet. <Link to="/pricing" className="rp-link">See pricing</Link></> },
  { q: 'Where is my data stored?', a: 'Your data is stored in India, and we never sell or share it. See our privacy policy for details.' },
];

export default function Home() {
  return (
    <>
      {/* hero */}
      <section className="rp-hero"><div className="rp-wrap rp-split">
        <div>
          <Live>AI calling + WhatsApp · live</Live>
          <h1 className="rp-h1">Every lead, called in <em>60 seconds.</em></h1>
          <p className="rp-lead">ReachPeak’s AI agents call, qualify and book your customers in Hindi, English or Hinglish, then follow up on WhatsApp. For every business that talks to customers.</p>
          <div className="rp-btns"><DemoButton /><Link to="/signup" className="rp-btn ghost">Get started <ArrowRight size={17} /></Link></div>
          <div className="rp-trust">
            <span><ShieldCheck size={16} />Official WhatsApp Business API</span>
            <span><Check size={16} />Consent-first, DND-aware</span>
            <span><Check size={16} />Data stored in India</span>
          </div>
        </div>
        <CallCard />
      </div></section>

      {/* problem */}
      <section className="rp-sec rp-dark"><div className="rp-wrap rp-split">
        <div>
          <span className="rp-eyebrow">The real competitor</span>
          <h2 className="rp-h2">Customers don’t leave for a better offer. <em>They leave because nobody called back.</em></h2>
          <div className="rp-grid" style={{ marginTop: 36, gap: 14 }}>
            {[[<Clock size={20} />, 'The 9 PM enquiry', 'A form at night gets a call the next afternoon. By then they’ve booked elsewhere.'], [<PhoneMissed size={20} />, 'The missed call', 'Your team is busy with a customer. The next customer hangs up and calls a competitor.'], [<CalendarX size={20} />, 'The no-show', 'A booked slot nobody reminded about. Time and money you already spent, gone.']].map(([ic, t, d]) => (
              <div key={t as string} style={{ display: 'grid', gridTemplateColumns: '44px 1fr', gap: 16 }}><div className="rp-icon" style={{ margin: 0, background: 'rgba(224,70,50,.15)' }}>{ic}</div><div><div className="rp-h3">{t}</div><p className="rp-body">{d}</p></div></div>
            ))}
          </div>
        </div>
        <div>
          <div className="rp-stat">7×</div>
          <p className="rp-quote" style={{ marginTop: 18 }}>Leads contacted within an hour are nearly <em>seven times</em> more likely to qualify.</p>
          <p className="rp-src">Source: Harvard Business Review, “The Short Life of Online Sales Leads”, 2011</p>
          <p className="rp-lead" style={{ color: '#E4E4E0' }}>ReachPeak calls in 60 seconds. Not 60 minutes.</p>
        </div>
      </div></section>

      {/* how it works */}
      <section className="rp-sec"><div className="rp-wrap">
        <Head eyebrow="How it works" title={<>From enquiry to booked, <em>without anyone waiting.</em></>} lead="Connect your lead sources once. ReachPeak handles the first call, the follow-ups and the reminders." />
        <div className="rp-steps">
          {[['01', 'A lead comes in', 'Website form, ad lead, missed call, booking or any event from your system via API.'], ['02', 'An AI agent calls', 'Within 60 seconds, in Hindi, English or Hinglish, sounding like your best team member.'], ['03', 'It qualifies or books', 'Need and budget captured, appointment booked, outcome logged with a transcript.'], ['04', 'WhatsApp follows up', 'Confirmations, reminders and links. Missed call? The journey continues on WhatsApp.']].map(([n, t, d]) => (
            <div className="rp-step" key={n}><span className="n">STEP {n}</span><h3>{t}</h3><p>{d}</p></div>
          ))}
        </div>
      </div></section>

      {/* journey */}
      <section className="rp-sec" style={{ paddingTop: 0 }}><div className="rp-wrap">
        <Head eyebrow="One platform, the whole journey" title={<>Six moments where businesses <em>lose customers.</em> We cover all six.</>} />
        <div className="rp-journey">
          {STAGES.map((s) => <div className="rp-jc" key={s.k}><span className="k">{s.k}</span><h3>{s.title}</h3><p>{s.text}</p><div className="ch"><Ch ch={s.ch} /></div></div>)}
        </div>
      </div></section>

      {/* industries */}
      <section className="rp-sec" style={{ background: '#F2F1EC' }}><div className="rp-wrap">
        <Head eyebrow="Built for every business" title={<>Different industries. <em>Same problem.</em></>} lead="If your customers call, message or book, ReachPeak works for you. Pick your industry to see the journeys." />
        <div className="rp-grid rp-g4">
          {INDUSTRIES.map((i) => (
            <Link to={`/solutions/${i.slug}`} key={i.slug} className="rp-card hover"><div className="rp-ind"><h3>{i.name}</h3><p>{i.short}</p><span className="rp-link">See journeys <ArrowRight size={15} /></span></div></Link>
          ))}
          <Link to="/use-cases" className="rp-card hover" style={{ background: 'var(--ink)', color: '#fff', borderColor: 'var(--ink)' }}><div className="rp-ind"><h3>Something else?</h3><p style={{ color: '#B8BAC1' }}>Browse every journey by goal: respond, book, remind, collect, re-engage.</p><span className="rp-link" style={{ color: '#F06850' }}>All use cases <ArrowRight size={15} /></span></div></Link>
        </div>
      </div></section>

      {/* two products */}
      <section className="rp-sec"><div className="rp-wrap">
        <Head eyebrow="Voice + WhatsApp" title={<>Two channels. <em>One customer journey.</em></>} lead="Most tools do calls or WhatsApp. ReachPeak runs both as one journey, so every conversation picks up where the last one left off." />
        <div className="rp-grid rp-g2">
          <div className="rp-card">
            <div className="rp-icon"><Mic size={22} /></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}><h3 className="rp-h3" style={{ fontSize: 24 }}>AI Calling Agents</h3><Live /></div>
            <p className="rp-body">Agents that call within 60 seconds, qualify, book and follow up, in your customer’s language.</p>
            <Checks items={['Instant calls on new leads and events', 'Qualification, booking and rescheduling', 'Payment, renewal and document reminders', 'Recordings, transcripts and outcomes for every call']} />
            <Link to="/ai-calling" className="rp-link" style={{ marginTop: 22 }}>Explore AI calling <ArrowRight size={15} /></Link>
          </div>
          <div className="rp-card">
            <div className="rp-icon g"><MessageCircle size={22} /></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}><h3 className="rp-h3" style={{ fontSize: 24 }}>WhatsApp Business API</h3><Live /></div>
            <p className="rp-body">The official API, with everything you need to run customer conversations at scale.</p>
            <Checks items={['Broadcasts and scheduled campaigns', 'Automated journeys and reminders', 'Shared team inbox with quick replies', 'Template manager synced with Meta']} />
            <Link to="/whatsapp" className="rp-link" style={{ marginTop: 22 }}>Explore WhatsApp <ArrowRight size={15} /></Link>
          </div>
        </div>
      </div></section>

      {/* built for india */}
      <section className="rp-sec rp-dark"><div className="rp-wrap">
        <Head eyebrow="Built for India" title={<>Speaks your customer’s language. <em>Respects their time.</em></>} />
        <div className="rp-grid rp-g2" style={{ alignItems: 'start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><Languages size={22} /><h3 className="rp-h3">Languages</h3></div>
            <div className="rp-langs">{LANGS_LIVE.map((l) => <span key={l} className="rp-lang on">{l}</span>)}{LANGS_NEXT.map((l) => <span key={l} className="rp-lang">{l}<small>rolling out</small></span>)}</div>
          </div>
          <div className="rp-grid" style={{ gap: 22 }}>
            {[[<ShieldCheck size={20} />, 'Consent-first, DND-aware', 'Agents call people who enquired or opted in, during sensible hours.'], [<FileAudio size={20} />, 'Every call recorded and transcribed', 'Hear any call, read any transcript, see every outcome.'], [<Database size={20} />, 'Your data stays in India', 'Stored in India. Never sold, never shared.']].map(([ic, t, d]) => (
              <div key={t as string} style={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: 14 }}><span style={{ color: '#F06850', marginTop: 2 }}>{ic}</span><div><div className="rp-h3" style={{ fontSize: 18 }}>{t}</div><p className="rp-body">{d}</p></div></div>
            ))}
          </div>
        </div>
      </div></section>

      {/* integrations */}
      <section className="rp-sec tight"><div className="rp-wrap rp-split">
        <div>
          <span className="rp-eyebrow"><Workflow size={14} />Integrations</span>
          <h2 className="rp-h2" style={{ fontSize: 'clamp(30px,3.6vw,44px)' }}>Works with the tools <em>you already use.</em></h2>
          <p className="rp-lead">Send leads from your website, CRM or store, or push any event through our API and webhooks.</p>
        </div>
        <div className="rp-logos">{INTEGRATIONS.map((x) => <span key={x} className="rp-logo">{x}</span>)}</div>
      </div></section>

      {/* founder */}
      <section className="rp-sec" style={{ background: '#F2F1EC' }}><div className="rp-wrap rp-founder">
        <div className="rp-mono">AR</div>
        <div>
          <p className="rp-quote">“Most businesses don’t lose customers to competitors. They lose them to slow replies. <em>We built ReachPeak so nobody has to wait.</em>”</p>
          <p className="rp-sig"><b>Amit Rai</b>, Founder, ReachPeak Technologies · Kolkata. Message me directly on <a href={`https://wa.me/${WA_NUMBER}`} target="_blank" rel="noreferrer" className="rp-link">WhatsApp</a>.</p>
        </div>
      </div></section>

      {/* faq */}
      <section className="rp-sec"><div className="rp-wrap">
        <Head center eyebrow="Questions" title="Frequently asked" />
        <Faq items={FAQ} />
      </div></section>

      <CtaBand />
    </>
  );
}
