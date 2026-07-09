import { useState } from 'react';

const LOGOS = [
  { name: 'WhatsApp', src: '/logos/whatsapp.svg' },
  { name: 'Meta', src: '/logos/meta.svg' },
  { name: 'Shopify', src: '/logos/shopify.svg' },
  { name: 'WooCommerce', src: '/logos/woocommerce.svg' },
  { name: 'Razorpay', src: '/logos/razorpay.svg' },
  { name: 'Zapier', src: '/logos/zapier.svg' },
  { name: 'Google', src: '/logos/google.svg' },
  { name: 'Calendly', src: '/logos/calendly.svg' },
  { name: 'PeakCart', src: '/logos/peakcart.svg' },
  { name: 'Pabbly', src: '/logos/pabbly.svg' },
];

export function LogoMarquee() {
  const doubled = [...LOGOS, ...LOGOS];

  return (
    <section style={{ overflow: 'hidden', padding: '56px 0' }}>
      <p className="mkt-label" style={{ textAlign: 'center', marginBottom: 32, letterSpacing: '0.08em' }}>
        Connects to the tools you already use
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <MarqueeRow items={doubled} direction="left" />
        <MarqueeRow items={[...doubled].reverse()} direction="right" />
      </div>
    </section>
  );
}

function MarqueeRow({ items, direction }: { items: typeof LOGOS; direction: 'left' | 'right' }) {
  return (
    <div style={{
      display: 'flex', overflow: 'hidden',
      maskImage: 'linear-gradient(90deg, transparent, black 8%, black 92%, transparent)',
      WebkitMaskImage: 'linear-gradient(90deg, transparent, black 8%, black 92%, transparent)',
    }}>
      <div className="mkt-marquee-track" data-direction={direction}>
        {items.map((logo, i) => (
          <LogoChip key={`${logo.name}-${i}`} logo={logo} />
        ))}
      </div>
    </div>
  );
}

function LogoChip({ logo }: { logo: { name: string; src: string } }) {
  const [broken, setBroken] = useState(false);

  return (
    <div style={{
      flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: 40, minWidth: 100, padding: '0 4px',
    }}>
      {broken ? (
        <span style={{
          fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600,
          fontSize: 14, color: 'rgba(148,163,184,0.5)', letterSpacing: '-0.01em',
        }}>{logo.name}</span>
      ) : (
        <img
          src={logo.src}
          alt={`${logo.name} logo`}
          style={{
            height: 26, maxWidth: 90, objectFit: 'contain',
            filter: 'grayscale(100%) brightness(0.6) invert(0.85)',
            opacity: 0.55,
            transition: 'opacity 0.3s, filter 0.3s',
          }}
          loading="lazy"
          onError={() => setBroken(true)}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.filter = 'none'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '0.55'; e.currentTarget.style.filter = 'grayscale(100%) brightness(0.6) invert(0.85)'; }}
        />
      )}
    </div>
  );
}
