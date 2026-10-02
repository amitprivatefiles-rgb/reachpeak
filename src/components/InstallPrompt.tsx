import { useEffect, useState, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

// The marketing site (light design) has its own CTAs: only offer the app install on app pages.
const MARKETING = /^\/($|ai-calling|whatsapp|solutions|use-cases|pricing|about|contact|privacy-policy|terms|refund-policy|data-deletion|hosting)/;

// Floating "Install app" banner.
//  • Desktop/Android Chrome: shows a real Install button when the browser fires
//    beforeinstallprompt.
//  • Mobile without that event (iOS Safari, Android Chrome that hasn't fired it yet,
//    in-app browsers): always shows with the correct manual instructions.
export function InstallPrompt() {
  const { pathname } = useLocation();
  const [deferred, setDeferred] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [env, setEnv] = useState({ ios: false, android: false, safari: false, inApp: false });

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
    if (standalone) return;
    try { if (localStorage.getItem('rp_install_dismissed') === '1') return; } catch { /* ignore */ }

    const ua = navigator.userAgent || '';
    const ios = /iphone|ipad|ipod/i.test(ua);
    const android = /android/i.test(ua);
    const safari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
    const inApp = /(fban|fbav|instagram|line\/|micromessenger|whatsapp|; wv\))/i.test(ua);
    setEnv({ ios, android, safari, inApp });

    const onBIP = (e: any) => { e.preventDefault(); setDeferred(e); setShow(true); };
    window.addEventListener('beforeinstallprompt', onBIP);
    const onInstalled = () => setShow(false);
    window.addEventListener('appinstalled', onInstalled);

    // Always surface on mobile, even if the native prompt never fires.
    if (ios || android) setShow(true);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!show || MARKETING.test(pathname)) return null;

  const dismiss = () => { setShow(false); try { localStorage.setItem('rp_install_dismissed', '1'); } catch { /* ignore */ } };
  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    try { await deferred.userChoice; } catch { /* ignore */ }
    setDeferred(null); setShow(false);
  };

  let msg: ReactNode = 'Add it to your home screen for one-tap access';
  const b = (t: string) => <b style={{ color: '#0E0E10' }}>{t}</b>;
  if (!deferred) {
    if (env.inApp) msg = <>Open {b('www.reachpeakapi.in')} in Chrome or Safari to install</>;
    else if (env.ios && env.safari) msg = <>Tap {b('Share')} ⎋ then {b('Add to Home Screen')}</>;
    else if (env.ios) msg = <>Open this page in {b('Safari')}, then Share → Add to Home Screen</>;
    else if (env.android) msg = <>Tap the {b('⋮ menu')} (top-right) → {b('Install app')}</>;
  }

  return (
    <div style={{ position: 'fixed', left: 12, right: 12, bottom: 12, zIndex: 9999, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
      <div style={{ pointerEvents: 'auto', maxWidth: 460, width: '100%', background: '#FFFFFF', border: '1px solid rgba(14,14,16,0.12)', borderRadius: 16, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 18px 40px -18px rgba(14,14,16,0.35)', fontFamily: "'Inter Tight', 'Inter', -apple-system, sans-serif" }}>
        <img src="/logo-mark.png" alt="" style={{ width: 42, height: 42, borderRadius: 10, flexShrink: 0, objectFit: 'contain', background: '#FAFAF7', padding: 6, border: '1px solid rgba(14,14,16,0.08)' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#0E0E10', fontSize: 14, fontWeight: 700 }}>Install ReachPeak</div>
          <div style={{ color: '#5F6168', fontSize: 12.5, lineHeight: 1.4 }}>{msg}</div>
        </div>
        {deferred && (
          <button onClick={install} style={{ background: '#E04632', color: '#fff', border: 'none', borderRadius: 999, padding: '9px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>Install</button>
        )}
        <button onClick={dismiss} aria-label="Dismiss" style={{ background: 'transparent', color: '#8C8E96', border: 'none', fontSize: 22, lineHeight: 1, cursor: 'pointer', padding: '0 4px' }}>×</button>
      </div>
    </div>
  );
}
