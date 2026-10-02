import { useState, FormEvent } from 'react';
import { MessageCircle, Mail, MapPin, Phone, Copy, Check } from 'lucide-react';
import { DemoButton, Head } from '../ui';
import { WA_NUMBER, WA_DISPLAY, SUPPORT_EMAIL, SALES_EMAIL } from '../data';

function CopyText({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500); } catch { /* ignore */ } };
  return <button type="button" className="rp-copy" onClick={copy}>{ok ? <Check size={15} /> : <Copy size={15} />}{text}</button>;
}

export default function Contact() {
  const [f, setF] = useState({ name: '', business: '', topic: 'Sales', msg: '' });
  const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(`Hi ReachPeak,\n\nName: ${f.name}\nBusiness: ${f.business}\nTopic: ${f.topic}\n\n${f.msg}`)}`;
  const submit = (e: FormEvent) => { e.preventDefault(); window.open(url, '_blank', 'noopener'); };
  return (
    <>
      <section className="rp-hero" style={{ paddingBottom: 32 }}><div className="rp-wrap">
        <span className="rp-eyebrow">Contact</span>
        <h1 className="rp-h1">Talk to a human. <em>Fast.</em></h1>
        <p className="rp-lead">We practise what we sell: the quickest way to reach us is WhatsApp, and we reply quickly.</p>
      </div></section>
      <section className="rp-sec" style={{ paddingTop: 16 }}><div className="rp-wrap rp-split" style={{ alignItems: 'start' }}>
        <div className="rp-grid" style={{ gap: 16 }}>
          <div className="rp-card"><div className="rp-icon g"><MessageCircle size={22} /></div><h3 className="rp-h3">WhatsApp (fastest)</h3><p className="rp-body">Sales, demos and support.</p><div className="rp-btns" style={{ marginTop: 16 }}><a className="rp-btn primary sm" href={`https://wa.me/${WA_NUMBER}`} target="_blank" rel="noreferrer"><MessageCircle size={16} />Open WhatsApp</a><CopyText text={WA_DISPLAY} /></div></div>
          <div className="rp-card"><div className="rp-icon"><Phone size={22} /></div><h3 className="rp-h3">Hear AI calling</h3><p className="rp-body">An AI agent calls your phone, in your language.</p><div style={{ marginTop: 16 }}><DemoButton className="rp-btn ink sm" /></div></div>
          <div className="rp-card"><div className="rp-icon"><Mail size={22} /></div><h3 className="rp-h3">Email</h3><p className="rp-body">Support: <b style={{ color: 'var(--ink)', userSelect: 'all' }}>{SUPPORT_EMAIL}</b><br />Partnerships: <b style={{ color: 'var(--ink)', userSelect: 'all' }}>{SALES_EMAIL}</b></p></div>
          <div className="rp-card"><div className="rp-icon"><MapPin size={22} /></div><h3 className="rp-h3">Office</h3><p className="rp-body">ReachPeak Technologies, Kolkata, India</p></div>
        </div>
        <div className="rp-card">
          <Head eyebrow="Send a message" title="We’ll reply on WhatsApp" />
          <form className="rp-form" style={{ marginTop: -20 }} onSubmit={submit}>
            <div className="rp-row2">
              <div className="rp-field"><label htmlFor="c-name">Name</label><input id="c-name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" /></div>
              <div className="rp-field"><label htmlFor="c-biz">Business</label><input id="c-biz" value={f.business} onChange={(e) => setF({ ...f, business: e.target.value })} autoComplete="organization" /></div>
            </div>
            <div className="rp-field"><label htmlFor="c-topic">Topic</label><select id="c-topic" value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })}><option>Sales</option><option>AI calling demo</option><option>Support</option><option>Partnership</option></select></div>
            <div className="rp-field"><label htmlFor="c-msg">Message</label><textarea id="c-msg" required value={f.msg} onChange={(e) => setF({ ...f, msg: e.target.value })} /></div>
            <button className="rp-btn primary" type="submit"><MessageCircle size={18} />Send on WhatsApp</button>
            <p className="rp-note">Opens WhatsApp with your message filled in. Just press send.</p>
          </form>
        </div>
      </div></section>
    </>
  );
}
