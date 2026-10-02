import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import './auth.css';

const FEATURES = [
  'AI calling agents in Hindi, English & Hinglish',
  'WhatsApp campaigns, journeys & shared inbox',
  'Prepaid wallet: AI calling billed per minute',
];

function Brand() {
  return <Link to="/" className="rpa-brand" aria-label="ReachPeak API home"><img src="/logo-mark.png" alt="" />ReachPeak<small>API</small></Link>;
}

/** Shared light layout for /login and /signup (matches the marketing site). Form logic lives in the pages. */
export function AuthShell({ headline, lead, children }: { headline: ReactNode; lead: string; children: ReactNode }) {
  return (
    <div className="rpa">
      <aside className="rpa-panel">
        <Brand />
        <div>
          <span className="rpa-live"><i />AI calling + WhatsApp · live</span>
          <h2 className="rpa-h">{headline}</h2>
          <p className="rpa-lead">{lead}</p>
          <ul className="rpa-feats">{FEATURES.map((f) => <li key={f}><Check size={18} />{f}</li>)}</ul>
        </div>
        <div className="rpa-quote">
          <p>“Most businesses don’t lose customers to competitors. They lose them to slow replies.”</p>
          <span>Amit Rai · Founder, ReachPeak Technologies</span>
        </div>
      </aside>
      <main className="rpa-main">
        <div className="rpa-top">
          <Brand />
          <Link to="/" className="rpa-back"><ArrowLeft size={16} />Back to site</Link>
        </div>
        <div className="rpa-center"><div className="rpa-box">{children}</div></div>
        <div className="rpa-foot">© {new Date().getFullYear()} ReachPeak Technologies · <Link to="/privacy-policy">Privacy</Link> · <Link to="/terms">Terms</Link></div>
      </main>
    </div>
  );
}
