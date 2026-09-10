import { useEffect, useState } from 'react';

// Floating "Install app" banner. Shows a real Install button on Chrome/Edge/Android
// (via beforeinstallprompt), and a Share → Add to Home Screen hint on iOS Safari.
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
    if (standalone) return;
    try { if (localStorage.getItem('rp_install_dismissed') === '1') return; } catch { /* ignore */ }

    const ua = navigator.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);

    const onBIP = (e: any) => { e.preventDefault(); setDeferred(e); setShow(true); };
    window.addEventListener('beforeinstallprompt', onBIP);
    const onInstalled = () => { setShow(false); };
    window.addEventListener('appinstalled', onInstalled);

    // iOS Safari never fires beforeinstallprompt → show manual instructions
    if (isIOS && isSafari) { setIosHint(true); setShow(true); }

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
    setDeferred(null);
    setShow(false);
  };

  return (
    <div style={{ position: 'fixed', left: 16, right: 16, bottom: 16, zIndex: 9999, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
      <div style={{ pointerEvents: 'auto', maxWidth: 440, width: '100%', background: '#0f172a', border: '1px solid #24304a', borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 10px 40px rgba(0,0,0,0.45)' }}>
        <img src="/icon-192.png" alt="" style={{ width: 42, height: 42, borderRadius: 10, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 700 }}>Install ReachPeak</div>
          <div style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.4 }}>
            {iosHint
              ? <>Tap <b style={{ color: '#cbd5e1' }}>Share</b> ⎋ then <b style={{ color: '#cbd5e1' }}>Add to Home Screen</b></>
              : 'Add it to your home screen for one-tap access'}
          </div>
        </div>
        {!iosHint && (
          <button onClick={install} style={{ background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>Install</button>
        )}
        <button onClick={dismiss} aria-label="Dismiss" style={{ background: 'transparent', color: '#64748b', border: 'none', fontSize: 20, lineHeight: 1, cursor: 'pointer', padding: '0 4px' }}>×</button>
      </div>
    </div>
  );
}
