import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ChevronDown, Menu, X } from 'lucide-react';
import { DemoProvider, DemoButton } from './ui';
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
  useEffect(() => { document.body.style.overflow = menu ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [menu]);
  return (
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
          <button type="button" className="rp-burger" onClick={() => setMenu(!menu)} aria-label={menu ? 'Close menu' : 'Open menu'}>{menu ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </div>
      {menu && (
        <div className="rp-mobile">
          <Link to="/ai-calling">AI Calling</Link>
          <Link to="/whatsapp">WhatsApp</Link>
          <Link to="/pricing">Pricing</Link>
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
          <div className="sub">Industries</div>
          {INDUSTRIES.map((i) => <Link key={i.slug} to={`/solutions/${i.slug}`}>{i.name}</Link>)}
          <Link to="/use-cases">All use cases</Link>
          <div className="sub">Account</div>
          <Link to="/login">Log in</Link>
          <Link to="/signup">Get started</Link>
        </div>
      )}
    </header>
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
      <DemoProvider>
        <Nav />
        <main><Outlet /></main>
        <Footer />
      </DemoProvider>
    </div>
  );
}
