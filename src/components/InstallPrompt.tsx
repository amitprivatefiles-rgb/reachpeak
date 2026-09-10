import { useEffect, useState, ReactNode } from 'react';

// Floating "Install app" banner.
//  • Desktop/Android Chrome: shows a real Install button when the browser fires
//    beforeinstallprompt.
//  • Mobile without that event (iOS Safari, Android Chrome that hasn't fired it yet,
//    in-app browsers): always shows with the correct manual instructions.
export function InstallPrompt() {
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

  if (!show) return null;

  const dismiss = () => { setShow(false); try { localStorage.setItem('rp_install_dismissed', '1'); } catch { /* ignore */ } };
  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    try { await deferred.userChoice; } catch { /* ignore */ }
    setDeferred(null); setShow(false);
  };

  let msg: ReactNode = 'Add it to your home screen for one-tap access';
  const b = (t: string) => <b style={{ color: '#cbd5e1' }}>{t}</b>;
  if (!deferred) {
    if (env.inApp) msg = <>Open {b('www.reachpeakapi.in')} in Chrome or Safari to install</>;
    else if (env.ios && env.safari) msg = <>Tap {b('Share')} ⎋ then {b('Add to Home Screen')}</>;
    else if (env.ios) msg = <>Open this page in {b('Safari')}, then Share → Add to Home Screen</>;
    else if (env.android) msg = <>Tap the {b('⋮ menu')} (top-right) → {b('Install app')}</>;
  }

  return (
    <div style={{ position: 'fixed', left: 12, right: 12, bottom: 12, zIndex: 9999, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
      <div style={{ pointerEvents: 'auto', maxWidth: 460, width: '100%', background: '#0f172a', border: '1px solid #24304a', borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 10px 40px rgba(0,0,0,0.45)' }}>
        <img src="/icon-192.png" alt="" style={{ width: 42, height: 42, borderRadius: 10, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 700 }}>Install ReachPeak</div>
          <div style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.4 }}>{msg}</div>
        </div>
        {deferred && (
          <button onClick={install} style={{ background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>Install</button>
        )}
        <button onClick={dismiss} aria-label="Dismiss" style={{ background: 'transparent', color: '#64748b', border: 'none', fontSize: 20, lineHeight: 1, cursor: 'pointer', padding: '0 4px' }}>×</button>
      </div>
    </div>
  );
}
