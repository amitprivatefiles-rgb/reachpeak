import { Link } from 'react-router-dom';
import { ArrowRight, Zap, UserCheck, CalendarCheck, BellRing, Wallet, Star, PhoneOff, ShieldCheck, Clock, FileAudio, SlidersHorizontal } from 'lucide-react';
import { CallCard, CtaBand, DemoButton, Faq, Head, Live, WaChat } from '../ui';
import { TalkButton } from '../TalkToAI';
import { LANGS_LIVE, LANGS_NEXT, INTEGRATIONS } from '../data';

const USES = [
  [<Zap size={22} />, 'Speed-to-lead', 'Call every new enquiry within 60 seconds, day or night, before a competitor does.'],
  [<UserCheck size={22} />, 'Lead qualification', 'Need, budget and timeline captured. Hot leads go to your team with a summary.'],
  [<CalendarCheck size={22} />, 'Booking', 'Appointments, site visits, demos and classes booked straight into the conversation.'],
  [<BellRing size={22} />, 'Reminders & no-shows', 'A reminder the day before. Can’t make it? Rescheduled on the spot.'],
  [<Wallet size={22} />, 'Payments & renewals', 'Polite reminders for dues, EMIs, fees and renewals, with a link on WhatsApp.'],
  [<Star size={22} />, 'Feedback & win-back', 'Post-service feedback, reviews and “it’s been a while” calls.'],
];

const OUTCOMES = ['Qualified', 'Booked', 'Callback requested', 'Not interested', 'Wrong number', 'No answer → WhatsApp'];

const FAQ = [
  { q: 'Is AI calling available now?', a: 'Yes, it’s live. Book a demo and an agent will call your own phone.' },
  { q: 'Which languages are supported?', a: `${LANGS_LIVE.join(', ')} today. ${LANGS_NEXT.join(', ')} are rolling out.` },
  { q: 'What does the agent sound like?', a: 'Natural and polite. Agents handle interruptions, hesitations and Indian accents, and stick to the script and facts you give them.' },
  { q: 'Can I control what the agent says?', a: 'Yes. You set the goal, the script, the questions to ask, what it may offer and when to hand over to a human.' },
  { q: 'How do leads reach the agent?', a: `Through ${INTEGRATIONS.slice(0, 5).join(', ')}, or connected tools like HubSpot, LeadSquared, Shopify and WooCommerce.` },
  { q: 'What happens after a call?', a: 'The outcome and transcript are logged instantly, your team is notified for hot leads, and the right WhatsApp follow-up is sent automatically.' },
  { q: 'Who does the agent call?', a: 'Only people who enquired or opted in, during sensible hours, respecting DND. You decide the rules.' },
  { q: 'How is AI calling priced?', a: 'Per minute of talk time, deducted from your prepaid ReachPeak wallet. Top up any time, and you only pay for the minutes your agents actually use.' },
];

export default function AICalling() {
  return (
    <>
      <section className="rp-hero"><div className="rp-wrap rp-split">
        <div>
          <Live>Now live</Live>
          <h1 className="rp-h1">AI agents that call like your <em>best team member.</em></h1>
          <p className="rp-lead">They call every lead within 60 seconds, qualify, book and follow up, in Hindi, English or Hinglish. They never get tired, never forget a follow-up, and log every word.</p>
          <div className="rp-btns"><TalkButton /><DemoButton className="rp-btn ghost" label="Hear it on your phone" /></div>
        </div>
        <CallCard />
      </div></section>

      <section className="rp-sec" style={{ paddingTop: 24 }}><div className="rp-wrap">
        <Head eyebrow="What the agents do" title={<>One agent. <em>Six jobs</em> your team never has time for.</>} />
        <div className="rp-grid rp-g3">
          {USES.map(([ic, t, d]) => <div className="rp-card" key={t as string}><div className="rp-icon">{ic}</div><h3 className="rp-h3">{t}</h3><p className="rp-body">{d}</p></div>)}
        </div>
      </div></section>

      <section className="rp-sec rp-dark"><div className="rp-wrap rp-split">
        <div>
          <span className="rp-eyebrow">Anatomy of a call</span>
          <h2 className="rp-h2">Sixty seconds from form <em>to a real conversation.</em></h2>
          <div className="rp-grid" style={{ marginTop: 32, gap: 18 }}>
            {[['0:00', 'Lead arrives', 'A form, ad lead, booking or API event triggers the agent.'], ['0:45', 'The call connects', 'The agent greets them by name, in their language, and states why it’s calling.'], ['2:30', 'The goal is met', 'Questions answered, details captured, slot booked or handed to your team.'], ['2:31', 'Everything is logged', 'Outcome, recording and transcript saved. WhatsApp confirmation sent.']].map(([t, h, d]) => (
              <div key={t} style={{ display: 'grid', gridTemplateColumns: '64px 1fr', gap: 16 }}><span style={{ font: '600 14px/1.6 var(--mono)', color: '#F06850' }}>{t}</span><div><div className="rp-h3" style={{ fontSize: 18 }}>{h}</div><p className="rp-body">{d}</p></div></div>
            ))}
          </div>
          <p className="rp-src">Example timing. Real calls vary.</p>
        </div>
        <div>
          <span className="rp-eyebrow">Every call ends with an outcome</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 20 }}>{OUTCOMES.map((o) => <span key={o} className="rp-tag n" style={{ fontSize: 12, padding: '10px 14px' }}>{o}</span>)}</div>
          <div className="rp-grid" style={{ marginTop: 36, gap: 20 }}>
            {[[<FileAudio size={20} />, 'Recordings & transcripts', 'Listen to any call or read it in seconds.'], [<SlidersHorizontal size={20} />, 'Your script, your rules', 'Goals, questions, offers and hand-over rules you control.'], [<ShieldCheck size={20} />, 'Consent-first, DND-aware', 'Calls only people who should hear from you.'], [<Clock size={20} />, 'Sensible calling hours', 'No 11 PM calls. You set the window.']].map(([ic, t, d]) => (
              <div key={t as string} style={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: 14 }}><span style={{ color: '#F06850', marginTop: 2 }}>{ic}</span><div><div className="rp-h3" style={{ fontSize: 17 }}>{t}</div><p className="rp-body">{d}</p></div></div>
            ))}
          </div>
        </div>
      </div></section>

      <section className="rp-sec"><div className="rp-wrap rp-split rev">
        <div>
          <span className="rp-eyebrow"><PhoneOff size={14} />Missed call ≠ lost lead</span>
          <h2 className="rp-h2">If they don’t pick up, <em>WhatsApp does the rest.</em></h2>
          <p className="rp-lead">Voice and WhatsApp run as one journey. A missed call becomes a WhatsApp message with the same context, and a reply can book the slot or ask for a callback.</p>
          <Link to="/whatsapp" className="rp-link" style={{ marginTop: 24 }}>How WhatsApp works with calls <ArrowRight size={15} /></Link>
        </div>
        <WaChat title="Green Valley Homes" msgs={[
          { text: <>Hi Vikram, we just tried calling about the 2BHK at Green Valley. When’s a good time to talk, or shall we book a site visit?</>, time: '6:42 PM', btns: ['Book a site visit', 'Call me later'] },
          { me: true, text: 'Book a site visit', time: '6:50 PM' },
          { text: <>Done! Sunday, 11:00 AM. Location pin and directions below. See you there 🏡</>, time: '6:50 PM' },
        ]} />
      </div></section>

      <section className="rp-sec rp-dark tight"><div className="rp-wrap">
        <Head eyebrow="Languages" title={<>Speaks the way <em>your customers speak.</em></>} />
        <div className="rp-langs">{LANGS_LIVE.map((l) => <span key={l} className="rp-lang on">{l}</span>)}{LANGS_NEXT.map((l) => <span key={l} className="rp-lang">{l}<small>rolling out</small></span>)}</div>
      </div></section>

      <section className="rp-sec"><div className="rp-wrap">
        <Head center eyebrow="Questions" title="AI calling, answered" />
        <Faq items={FAQ} />
      </div></section>
      <CtaBand title={<>Hear an agent call <em>your own phone.</em></>} lead="A short demo, in the language you choose. Then decide." />
    </>
  );
}
