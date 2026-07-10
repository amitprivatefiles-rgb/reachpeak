import { Link } from 'react-router-dom';

const PRODUCT_LINKS = [
  { to: '/#campaigns', label: 'Campaigns' },
  { to: '/#orderguard', label: 'OrderGuard™' },
  { to: '/#inbox', label: 'Inbox & Payments' },
  { to: '/#journeys', label: 'Journeys' },
  { to: '/ai-calling', label: 'AI Calling Agents (Early access)' },
  { to: '/pricing', label: 'Pricing' },
];

const SOLUTION_LINKS = [
  { to: '/solutions/ecommerce', label: 'E-commerce' },
  { to: '/solutions/clinics', label: 'Clinics' },
  { to: '/solutions/salons', label: 'Salons' },
  { to: '/solutions/education', label: 'Education' },
  { to: '/solutions/real-estate', label: 'Real Estate' },
  { to: '/solutions/services', label: 'Services' },
];

const COMPANY_LINKS = [
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

const LEGAL_LINKS = [
  { to: '/privacy-policy', label: 'Privacy Policy' },
  { to: '/terms', label: 'Terms of Service' },
  { to: '/refund-policy', label: 'Refund Policy' },
  { to: '/data-deletion', label: 'Data Deletion' },
];

export function MarketingFooter() {
  return (
    <footer style={{
      background: '#050810',
      borderTop: '1px solid rgba(255,255,255,0.04)',
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '64px 24px 32px' }}>
        {/* Link columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 lg:col-span-1">
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 16 }}>
              <img src="/logo.png" alt="ReachPeak" style={{ width: 36, height: 36, borderRadius: 8 }} />
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 18, color: 'white', letterSpacing: '-0.02em' }}>
                ReachPeak
              </span>
            </Link>
            <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, maxWidth: 240 }}>
              Turn WhatsApp into your #1 revenue channel. Campaigns, journeys, payments, and fraud protection — one platform.
            </p>
          </div>

          <FooterColumn title="Product" links={PRODUCT_LINKS} />
          <FooterColumn title="Solutions" links={SOLUTION_LINKS} />
          <FooterColumn title="Company" links={COMPANY_LINKS} />
          <FooterColumn title="Legal" links={LEGAL_LINKS} />
        </div>

        {/* Bottom */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.04)',
          paddingTop: 24,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
        }}>
          <p style={{ fontSize: 13, color: '#475569' }}>
            © {new Date().getFullYear()} ReachPeak. All rights reserved.
          </p>
          <p style={{ fontSize: 13, color: '#475569' }}>
            Made in India 🇮🇳
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: Array<{ to: string; label: string }> }) {
  return (
    <div>
      <h4 style={{
        fontSize: 12, fontWeight: 600, color: '#64748b',
        textTransform: 'uppercase', letterSpacing: '0.08em',
        marginBottom: 16,
      }}>{title}</h4>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {links.map(l => (
          <li key={l.to}>
            <Link to={l.to} style={{
              fontSize: 14, color: '#94a3b8', textDecoration: 'none',
              transition: 'color 0.2s',
            }}
              onMouseEnter={e => (e.currentTarget.style.color = '#e2e8f0')}
              onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
            >{l.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
