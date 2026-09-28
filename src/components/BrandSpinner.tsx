// Professional branded in-page loader. Use anywhere a page/section is loading.
//   <BrandSpinner label="Loading dashboard…" />        // centered in a tall area
//   <BrandSpinner label="Loading…" full />             // fills most of the viewport
export function BrandSpinner({ label = 'Loading…', full = false }: { label?: string; full?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: '100%', minHeight: full ? '70vh' : 360,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ position: 'relative', width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid #f0e2df', borderTopColor: '#E04632', animation: 'rpspin 0.9s linear infinite' }} />
          <img src="/logo-mark.png" alt="" style={{ width: 34, height: 'auto', animation: 'rppulse 1.6s ease-in-out infinite' }} />
        </div>
        <p style={{ margin: 0, fontFamily: "'Inter', -apple-system, sans-serif", fontSize: 13, fontWeight: 500, color: '#94a3b8' }}>{label}</p>
      </div>
      <style>{`@keyframes rpspin{to{transform:rotate(360deg)}}@keyframes rppulse{0%,100%{opacity:.55;transform:scale(.94)}50%{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
}
