import { createContext, useContext, useEffect, useMemo, useState, ReactNode, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { X, Plus, Phone, MessageCircle, Check, Copy } from 'lucide-react';
import { INDUSTRIES, WA_NUMBER, WA_DISPLAY, Channel } from './data';

/* ---------- demo-call modal (opens WhatsApp with the visitor's details) ---------- */
const DemoCtx = createContext<{ open: (industry?: string) => void }>({ open: () => {} });
export const useDemo = () => useContext(DemoCtx);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ open: boolean; industry?: string }>({ open: false });
  const value = useMemo(() => ({ open: (industry?: string) => setState({ open: true, industry }) }), []);
  return (
    <DemoCtx.Provider value={value}>
      {children}
      {state.open && <DemoModal industry={state.industry} onClose={() => setState({ open: false })} />}
    </DemoCtx.Provider>
  );
}

function DemoModal({ industry, onClose }: { industry?: string; onClose: () => void }) {
  const [f, setF] = useState({ name: '', business: '', phone: '', industry: industry || '', lang: 'Hindi' });
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  const text = `Hi ReachPeak, I'd like a demo call of your AI calling agents.\n\nName: ${f.name}\nBusiness: ${f.business}\nIndustry: ${f.industry || '-'}\nPhone for the demo: ${f.phone}\nPreferred language: ${f.lang}`;
  const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
  const submit = (e: FormEvent) => { e.preventDefault(); setSent(true); };
  const copy = async () => { try { await navigator.clipboard.writeText(WA_DISPLAY); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* clipboard unavailable */ } };
  return (
    <div className="rp-modal-bg" onClick={onClose} role="dialog" aria-modal="true" aria-label="Get a demo call">
      <div className="rp-modal" onClick={(e) => e.stopPropagation()}>
        <button className="rp-x" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <span className="rp-live"><i />AI calling is live</span>
        {!sent ? (
          <>
            <h2>Hear it on your own phone.</h2>
            <p className="rp-body">Tell us about your business. We’ll set up a short demo call from an AI agent, in the language you choose.</p>
            <form className="rp-form" onSubmit={submit}>
              <div className="rp-row2">
                <div className="rp-field"><label htmlFor="d-name">Your name</label><input id="d-name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" /></div>
                <div className="rp-field"><label htmlFor="d-phone">Phone (for the demo call)</label><input id="d-phone" required inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} autoComplete="tel" placeholder="+91" /></div>
              </div>
              <div className="rp-field"><label htmlFor="d-biz">Business name</label><input id="d-biz" required value={f.business} onChange={(e) => setF({ ...f, business: e.target.value })} autoComplete="organization" /></div>
              <div className="rp-row2">
                <div className="rp-field"><label htmlFor="d-ind">Industry</label>
                  <select id="d-ind" value={f.industry} onChange={(e) => setF({ ...f, industry: e.target.value })}>
                    <option value="">Choose…</option>
                    {INDUSTRIES.map((i) => <option key={i.slug} value={i.name}>{i.name}</option>)}
                    <option value="Other">Other</option>
                  </select></div>
                <div className="rp-field"><label htmlFor="d-lang">Demo language</label>
                  <select id="d-lang" value={f.lang} onChange={(e) => setF({ ...f, lang: e.target.value })}>
                    <option>Hindi</option><option>English</option><option>Hinglish</option>
                  </select></div>
              </div>
              <button className="rp-btn primary" type="submit"><MessageCircle size={18} />Continue on WhatsApp</button>
              <p className="rp-note">We’ll open WhatsApp with your details filled in. Just press send, and our team will schedule your demo call.</p>
            </form>
          </>
        ) : (
          <>
            <h2>One last step.</h2>
            <p className="rp-body">Open WhatsApp and press send. Your details are already in the message.</p>
            <div className="rp-btns" style={{ marginTop: 20 }}>
              <a className="rp-btn primary" href={url} target="_blank" rel="noreferrer"><MessageCircle size={18} />Open WhatsApp</a>
            </div>
            <p className="rp-note" style={{ marginTop: 18 }}>WhatsApp didn’t open? Message us at</p>
            <button className="rp-copy" onClick={copy} type="button">{copied ? <Check size={16} /> : <Copy size={16} />}{WA_DISPLAY}</button>
          </>
        )}
      </div>
    </div>
  );
}

export function DemoButton({ className = 'rp-btn primary', label = 'Get a demo call', industry }: { className?: string; label?: string; industry?: string }) {
  const { open } = useDemo();
  return <button type="button" className={className} onClick={() => open(industry)}><Phone size={17} />{label}</button>;
}

/* ---------- small pieces ---------- */
export const Live = ({ children = 'Live' }: { children?: ReactNode }) => <span className="rp-live"><i />{children}</span>;
export const Ch = ({ ch }: { ch: Channel[] }) => <>{ch.map((c) => <span key={c} className={`rp-tag ${c === 'WhatsApp' ? 'g' : ''}`}>{c === 'Voice' ? <Phone size={11} /> : <MessageCircle size={11} />}{c}</span>)}</>;
export function Head({ eyebrow, title, lead, center }: { eyebrow?: ReactNode; title: ReactNode; lead?: ReactNode; center?: boolean }) {
  return (
    <div className={`rp-head ${center ? 'rp-center' : ''}`}>
      {eyebrow && <span className="rp-eyebrow">{eyebrow}</span>}
      <h2 className="rp-h2">{title}</h2>
      {lead && <p className="rp-lead">{lead}</p>}
    </div>
  );
}
export function Checks({ items }: { items: ReactNode[] }) {
  return <ul className="rp-list">{items.map((t, i) => <li key={i}><Check size={18} />{t}</li>)}</ul>;
}

/* ---------- live call card (cycles through industries) ---------- */
export function CallCard({ only }: { only?: string }) {
  const list = only ? INDUSTRIES.filter((i) => i.slug === only) : INDUSTRIES.filter((i) => ['clinics', 'real-estate', 'education', 'ecommerce'].includes(i.slug));
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const [s, setS] = useState(0);
  const [n, setN] = useState(reduced ? 99 : 0);
  const sc = list[s % list.length];
  useEffect(() => {
    if (reduced) return;
    const total = sc.call.lines.length + 3;
    const t = setTimeout(() => {
      if (n < total) setN(n + 1);
      else if (list.length > 1) { setS((x) => (x + 1) % list.length); setN(0); }
    }, n === 0 ? 500 : n <= sc.call.lines.length ? 1500 : 1300);
    return () => clearTimeout(t);
  }, [n, s, sc, list.length, reduced]);
  const shown = sc.call.lines.slice(0, Math.min(n, sc.call.lines.length));
  const done = n > sc.call.lines.length;
  const secs = Math.min(n, sc.call.lines.length) * 9 + 4;
  return (
    <div>
      <div className="rp-call" aria-label="Example AI call">
        <div className="rp-call-top">
          <div className="rp-ava">AI</div>
          <div><b>Calling {sc.call.who}</b><small>{sc.call.ctx}</small></div>
          <span className="rp-timer">● 00:{String(secs).padStart(2, '0')}</span>
        </div>
        <div className="rp-wave" aria-hidden="true">{Array.from({ length: 34 }, (_, i) => <i key={i} style={{ animationDelay: `${(i % 9) * 0.09}s`, animationPlayState: done ? 'paused' : 'running' }} />)}</div>
        <div className="rp-lines">
          {shown.map(([who, line], i) => <div key={`${s}-${i}`} className={`rp-line ${who === 'AI' ? 'ai' : ''}`}><span>{who === 'AI' ? 'AI agent' : who}</span><div>{line}</div></div>)}
        </div>
        <div className="rp-outcome" style={{ visibility: done ? 'visible' : 'hidden' }}>
          <span className="rp-chip"><Check size={13} />{sc.call.outcome}</span>
          {n > sc.call.lines.length + 1 && <span className="rp-chip wa"><MessageCircle size={13} />Confirmation sent on WhatsApp</span>}
        </div>
      </div>
      {list.length > 1 && (
        <div className="rp-scn">{list.map((x, i) => <button key={x.slug} className={i === s % list.length ? 'on' : ''} onClick={() => { setS(i); setN(reduced ? 99 : 0); }}>{({ clinics: 'Clinic', education: 'Coaching', 'real-estate': 'Real estate', ecommerce: 'Retail', salons: 'Salon', finance: 'Finance', services: 'Services' } as Record<string, string>)[x.slug] || x.name}</button>)}</div>
      )}
      <p className="rp-illus">Illustrative call · example business</p>
    </div>
  );
}

/* ---------- WhatsApp chat mock ---------- */
export function WaChat({ title = 'Your Business', msgs }: { title?: string; msgs: { me?: boolean; text: ReactNode; time: string; btns?: string[] }[] }) {
  return (
    <div className="rp-wa">
      <div className="rp-wa-h"><img src="/logo-mark.png" alt="" /><div><b>{title}</b><small>business account</small></div></div>
      <div className="rp-wa-b">
        {msgs.map((m, i) => (
          <div key={i} className={`rp-msg ${m.me ? 'me' : ''}`}>
            {m.text}<time>{m.time}</time>
            {m.btns && <div className="btnrow">{m.btns.map((b) => <span key={b}>{b}</span>)}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- FAQ ---------- */
export function Faq({ items }: { items: { q: string; a: ReactNode }[] }) {
  return (
    <div className="rp-faq">
      {items.map((x) => (
        <details key={x.q}><summary>{x.q}<Plus size={20} /></summary><p>{x.a}</p></details>
      ))}
    </div>
  );
}

/* ---------- CTA band ---------- */
export function CtaBand({ title, lead }: { title?: ReactNode; lead?: ReactNode }) {
  return (
    <section className="rp-sec tight"><div className="rp-wrap">
      <div className="rp-ctaband">
        <Live>AI calling + WhatsApp, live</Live>
        <h2 className="rp-h2" style={{ marginTop: 20 }}>{title || <>No customer should <em>have to wait.</em></>}</h2>
        <p className="rp-lead" style={{ marginInline: 'auto' }}>{lead || 'Hear an AI agent call your own phone, or get started today.'}</p>
        <div className="rp-btns" style={{ justifyContent: 'center' }}>
          <DemoButton />
          <Link to="/signup" className="rp-btn ghost">Get started</Link>
        </div>
      </div>
    </div></section>
  );
}
