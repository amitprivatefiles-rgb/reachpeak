import { useState, useEffect, useRef, ReactNode } from 'react';

interface LegalPageShellProps {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}

/** Premium legal page shell: dark theme, wide readable measure, sticky ToC sidebar (desktop),
 *  reading progress bar, anchor links. Content is frozen — only the shell is new. */
export function LegalPageShell({ title, lastUpdated, children }: LegalPageShellProps) {
  const [progress, setProgress] = useState(0);
  const [headings, setHeadings] = useState<Array<{ id: string; text: string; level: number }>>([]);
  const [activeId, setActiveId] = useState('');
  const [tocOpen, setTocOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Scan headings after mount
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const hh = el.querySelectorAll('h2, h3');
    const items: typeof headings = [];
    hh.forEach((h, i) => {
      const id = `section-${i}`;
      h.id = id;
      items.push({ id, text: h.textContent || '', level: h.tagName === 'H2' ? 2 : 3 });
    });
    setHeadings(items);
  }, [children]);

  // Reading progress + scroll spy
  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0);

      // Scroll spy
      const el = contentRef.current;
      if (!el) return;
      const hh = el.querySelectorAll('h2, h3');
      let current = '';
      hh.forEach(h => {
        const rect = h.getBoundingClientRect();
        if (rect.top < 120) current = h.id;
      });
      if (current) setActiveId(current);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      {/* Reading progress bar */}
      <div style={{
        position: 'fixed', top: 72, left: 0, right: 0, height: 2, zIndex: 90,
        background: 'rgba(255,255,255,0.04)',
      }}>
        <div style={{
          height: '100%', width: `${progress * 100}%`,
          background: 'linear-gradient(90deg, #E04632, #F06850)',
          transition: 'width 0.1s linear',
        }} />
      </div>

      <div style={{ paddingTop: 120, paddingBottom: 80, maxWidth: 1200, margin: '0 auto', padding: '120px 24px 80px' }}>
        {/* Title block */}
        <div style={{ marginBottom: 48, maxWidth: 700 }}>
          <h1 style={{
            fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700,
            fontSize: 'clamp(2rem, 4vw, 3rem)', color: '#f1f5f9',
            letterSpacing: '-0.02em', margin: 0, lineHeight: 1.2,
          }}>{title}</h1>
          <div style={{
            display: 'inline-block', marginTop: 12, padding: '4px 12px', borderRadius: 6,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
            fontSize: 12, color: '#64748b', fontFamily: "'Inter', sans-serif",
          }}>Last updated: {lastUpdated}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 48 }} className="lg-legal-grid">
          {/* Content */}
          <div ref={contentRef} className="legal-content" style={{
            maxWidth: '70ch',
            fontFamily: "'Inter', sans-serif",
            color: '#94a3b8',
            lineHeight: 1.8,
            fontSize: 15,
          }}>
            {children}
          </div>

          {/* Desktop ToC sidebar */}
          <div className="hidden lg:block">
            <nav style={{
              position: 'sticky', top: 96,
              padding: 20, borderRadius: 16,
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
              maxHeight: 'calc(100vh - 120px)', overflowY: 'auto',
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Contents</div>
              {headings.map(h => (
                <a key={h.id} href={`#${h.id}`} style={{
                  display: 'block', padding: '6px 0',
                  paddingLeft: h.level === 3 ? 16 : 0,
                  fontSize: 13, fontWeight: activeId === h.id ? 600 : 400,
                  color: activeId === h.id ? '#E04632' : '#64748b',
                  textDecoration: 'none', transition: 'color 0.2s',
                  fontFamily: "'Inter', sans-serif",
                  borderLeft: activeId === h.id ? '2px solid #E04632' : '2px solid transparent',
                  marginLeft: -2,
                }}>{h.text}</a>
              ))}
            </nav>
          </div>
        </div>

        {/* Mobile ToC dropdown */}
        <div className="lg:hidden" style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 80,
        }}>
          <button onClick={() => setTocOpen(!tocOpen)} style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'rgba(224,70,50,0.15)', border: '1px solid rgba(224,70,50,0.3)',
            color: '#E04632', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: 18, backdropFilter: 'blur(12px)',
          }}>☰</button>
          {tocOpen && (
            <div style={{
              position: 'absolute', bottom: 56, right: 0,
              width: 260, maxHeight: 300, overflowY: 'auto',
              padding: 16, borderRadius: 16,
              background: 'rgba(13,20,36,0.98)', backdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Contents</div>
              {headings.map(h => (
                <a key={h.id} href={`#${h.id}`} onClick={() => setTocOpen(false)} style={{
                  display: 'block', padding: '6px 0',
                  fontSize: 13, color: activeId === h.id ? '#E04632' : '#94a3b8',
                  textDecoration: 'none',
                }}>{h.text}</a>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (min-width: 1024px) {
          .lg-legal-grid { grid-template-columns: 1fr 220px !important; }
        }
        .legal-content h2 {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700; font-size: 22px; color: #f1f5f9;
          margin: 48px 0 16px; letter-spacing: -0.01em;
          padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.04);
        }
        .legal-content h3 {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 600; font-size: 17px; color: #e2e8f0;
          margin: 32px 0 12px;
        }
        .legal-content p { margin: 0 0 16px; }
        .legal-content ul, .legal-content ol {
          margin: 0 0 16px; padding-left: 24px;
        }
        .legal-content li { margin-bottom: 8px; }
        .legal-content a { color: #E04632; text-decoration: underline; text-underline-offset: 2px; }
        .legal-content strong { color: #e2e8f0; }
      `}</style>
    </>
  );
}
