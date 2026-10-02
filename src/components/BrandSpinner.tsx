// ReachPeak branded loaders (2026-10 brand refresh). One look across the marketing site and the app.
//   <BrandSpinner label="Loading dashboard…" />   // in-page / section loader
//   <BrandSpinner label="Loading…" full />        // fills most of the viewport
//   <BrandSplash />                               // full-screen start-up / route loader

const KEYFRAMES = `
@keyframes rpl-rot{to{transform:rotate(360deg)}}
@keyframes rpl-dash{0%{stroke-dasharray:1 150;stroke-dashoffset:0}50%{stroke-dasharray:90 150;stroke-dashoffset:-35}100%{stroke-dasharray:90 150;stroke-dashoffset:-124}}
@keyframes rpl-breath{0%,100%{transform:scale(.94);opacity:.85}50%{transform:scale(1);opacity:1}}
@keyframes rpl-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion: reduce){.rpl-arc,.rpl-svg,.rpl-logo{animation-duration:2.4s!important}}
`;

function Mark({ size = 64 }: { size?: number }) {
  const logo = Math.round(size * 0.46);
  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'grid', placeItems: 'center' }}>
      <svg className="rpl-svg" viewBox="0 0 50 50" width={size} height={size} style={{ position: 'absolute', inset: 0, animation: 'rpl-rot 1.6s linear infinite' }} aria-hidden="true">
        <circle cx="25" cy="25" r="22" fill="none" stroke="rgba(224,70,50,0.14)" strokeWidth="2.6" />
        <circle className="rpl-arc" cx="25" cy="25" r="22" fill="none" stroke="#E04632" strokeWidth="2.6" strokeLinecap="round" style={{ animation: 'rpl-dash 1.4s ease-in-out infinite' }} />
      </svg>
      <img className="rpl-logo" src="/logo-mark.png" alt="" width={logo} height={logo} style={{ width: logo, height: logo, objectFit: 'contain', animation: 'rpl-breath 1.8s ease-in-out infinite' }} />
    </div>
  );
}

export function BrandSpinner({ label = 'Loading…', full = false }: { label?: string; full?: boolean }) {
  return (
    <div role="status" aria-live="polite" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: full ? '70vh' : 360 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, animation: 'rpl-in .3s ease both' }}>
        <Mark />
        <p style={{ margin: 0, fontFamily: "'Inter Tight', 'Inter', -apple-system, sans-serif", fontSize: 13.5, fontWeight: 500, color: '#8C8E96', letterSpacing: '.01em' }}>{label}</p>
      </div>
      <style>{KEYFRAMES}</style>
    </div>
  );
}

export function BrandSplash({ label }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" style={{ minHeight: '100vh', background: '#FAFAF7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, animation: 'rpl-in .3s ease both' }}>
        <Mark size={76} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: "'Inter Tight', 'Inter', -apple-system, sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em', color: '#0E0E10' }}>ReachPeak</div>
          <div style={{ marginTop: 6, fontFamily: "'IBM Plex Mono', ui-monospace, monospace", fontSize: 10.5, fontWeight: 600, letterSpacing: '.16em', color: '#8C8E96', textTransform: 'uppercase' }}>{label || 'AI calling · WhatsApp'}</div>
        </div>
      </div>
      <style>{KEYFRAMES}</style>
    </div>
  );
}
