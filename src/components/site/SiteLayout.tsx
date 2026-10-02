import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight, Menu, X } from 'lucide-react';
import { DemoProvider, DemoButton } from './ui';
import { TalkProvider, TalkButton } from './TalkToAI';
import { INDUSTRIES, SUPPORT_EMAIL, WA_DISPLAY, WA_NUMBER } from './data';
import './site.css';

function Brand() {
  return <Link to="/" className="rp-brand" aria-label="ReachPeak API home"><img src="/logo-mark.png" alt="" />ReachPeak<small>API</small></Link>;
}

function Nav() {
  const [menu, setMenu] = useState(false);
  const [drop, setDrop] = useState(false);
  const loc = useLocation();
  useEffect(() => { setMenu(false); setDrop(false); }, [loc.pathname]);
  // Lock page scroll while the mobile menu is open: freeze the body in place so the page keeps its position,
  // then restore it on close (or stay at the top if a menu link navigated to another page).
  const pathRef = useRef(loc.pathname);
  pathRef.current = loc.pathname;
  useEffect(() => {
    if (!menu) return;
    const y = window.scrollY, openedOn = pathRef.current, body = document.body;
    const prev = { position: body.style.position, top: body.style.top, left: body.style.left, right: body.style.right, width: body.style.width };
    Object.assign(body.style, { position: 'fixed', top: `-${y}px`, left: '0', right: '0', width: '100%' });
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false); };
    window.addEventListener('keydown', onKey);
    return () => {
      Object.assign(body.style, prev);
      window.scrollTo({ top: pathRef.current === openedOn ? y : 0, behavior: 'instant' as ScrollBehavior });
      window.removeEventListener('keydown', onKey);
    };
  }, [menu]);
  return (
    <>
    <header className="rp-nav">
      <div className="rp-wrap">
        <Brand />
        <nav className="rp-navlinks" aria-label="Main">
          <NavLink to="/ai-calling" className={({ isActive }) => (isActive ? 'on' : '')}>AI Calling</NavLink>
          <NavLink to="/whatsapp" className={({ isActive }) => (isActive ? 'on' : '')}>WhatsApp</NavLink>
          <div className="rp-drop" onMouseEnter={() => setDrop(true)} onMouseLeave={() => setDrop(false)}>
            <button type="button" aria-expanded={drop} onClick={() => setDrop(!drop)}>Industries <ChevronDown size={15} /></button>
            {drop && (
              <div className="rp-dropmenu">
                {INDUSTRIES.map((i) => <Link key={i.slug} to={`/solutions/${i.slug}`}><b>{i.name}</b><span>{i.short}</span></Link>)}
                <Link to="/use-cases"><b>All use cases →</b><span>Every journey, by goal.</span></Link>
              </div>
            )}
          </div>
          <NavLink to="/pricing" className={({ isActive }) => (isActive ? 'on' : '')}>Pricing</NavLink>
          <NavLink to="/about" className={({ isActive }) => (isActive ? 'on' : '')}>About</NavLink>
        </nav>
        <div className="rp-navright">
          <Link to="/login" className="rp-login">Log in</Link>
          <DemoButton className="rp-btn primary sm" label="Demo call" />
          <button type="button" className="rp-burger" onClick={() => setMenu(!menu)} aria-label={menu ? 'Close menu' : 'Open menu'} aria-expanded={menu} aria-controls="rp-mobile-menu">{menu ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </div>
    </header>
    {/* Outside the header on purpose: the header's backdrop blur would otherwise trap this fixed panel inside the 68px bar. */}
    {menu && (
      <div className="rp-mobile" id="rp-mobile-menu" role="dialog" aria-modal="true" aria-label="Menu">
        <nav className="rp-mlinks" aria-label="Mobile">
          {[['/ai-calling', 'AI Calling'], ['/whatsapp', 'WhatsApp'], ['/use-cases', 'Use cases'], ['/pricing', 'Pricing'], ['/about', 'About'], ['/contact', 'Contact']].map(([to, label]) => (
            <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'on' : '')}>{label}<ChevronRight size={18} /></NavLink>
          ))}
        </nav>
        <div className="sub">Industries</div>
        <div className="rp-mind">
          {INDUSTRIES.map((i) => <Link key={i.slug} to={`/solutions/${i.slug}`}>{i.name}</Link>)}
        </div>
        <div className="rp-mcta" onClick={() => setMenu(false)}>
          <TalkButton />
          <DemoButton className="rp-btn ghost" label="Get a demo call" />
          <Link to="/signup" className="rp-btn ghost">Get started</Link>
          <Link to="/login" className="rp-mlogin">Already a customer? <b>Log in</b></Link>
        </div>
      </div>
    )}
    </>
  );
}

function Footer() {
  return (
    <footer className="rp-foot">
      <div className="rp-wrap">
        <div className="rp-foot-grid">
          <div>
            <Brand />
            <p className="rp-body" style={{ maxWidth: 320, marginTop: 16 }}>AI calling agents and the official WhatsApp Business API, for every Indian business that talks to customers.</p>
            <p className="rp-body" style={{ marginTop: 16 }}>WhatsApp: <a href={`https://wa.me/${WA_NUMBER}`} target="_blank" rel="noreferrer" style={{ color: 'var(--ink)', fontWeight: 600 }}>{WA_DISPLAY}</a><br />Email: <span style={{ color: 'var(--ink)', fontWeight: 600, userSelect: 'all' }}>{SUPPORT_EMAIL}</span></p>
          </div>
          <div><h4>Product</h4><ul><li><Link to="/ai-calling">AI Calling</Link></li><li><Link to="/whatsapp">WhatsApp API</Link></li><li><Link to="/use-cases">Use cases</Link></li><li><Link to="/pricing">Pricing</Link></li></ul></div>
          <div><h4>Industries</h4><ul>{INDUSTRIES.map((i) => <li key={i.slug}><Link to={`/solutions/${i.slug}`}>{i.name}</Link></li>)}</ul></div>
          <div><h4>Company</h4><ul><li><Link to="/about">About</Link></li><li><Link to="/contact">Contact</Link></li><li><Link to="/login">Log in</Link></li><li><Link to="/signup">Get started</Link></li></ul></div>
          <div><h4>Legal</h4><ul><li><Link to="/privacy-policy">Privacy</Link></li><li><Link to="/terms">Terms</Link></li><li><Link to="/refund-policy">Refunds</Link></li><li><Link to="/data-deletion">Data deletion</Link></li></ul></div>
        </div>
        <div className="rp-foot-bottom">
          <span>© {new Date().getFullYear()} ReachPeak Technologies · Kolkata, India</span>
          <span>ReachPeak API is a product of ReachPeak Technologies, alongside PeakCart.</span>
        </div>
      </div>
    </footer>
  );
}

export function SiteLayout() {
  const loc = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);
  return (
    <div className="rp">
      <DemoProvider><TalkProvider>
        <Nav />
        <main><Outlet /></main>
        <Footer />
      </TalkProvider></DemoProvider>
    </div>
  );
}
