import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown } from 'lucide-react';

const SOLUTIONS = [
  { path: '/solutions/ecommerce', label: 'D2C & E-commerce', hook: 'Recover carts. Kill RTO.' },
  { path: '/solutions/clinics', label: 'Clinics & Healthcare', hook: 'Fewer no-shows. Fuller schedules.' },
  { path: '/solutions/salons', label: 'Salons & Spas', hook: 'Keep every chair booked.' },
  { path: '/solutions/education', label: 'Coaching & Education', hook: 'Enquiry to enrolment on WhatsApp.' },
  { path: '/solutions/real-estate', label: 'Real Estate', hook: 'Every lead answered in seconds.' },
  { path: '/solutions/services', label: 'Agencies & Services', hook: 'Quotes, bookings, payments — one chat.' },
];

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [solOpen, setSolOpen] = useState(false);
  const [prodOpen, setProdOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); setSolOpen(false); setProdOpen(false); }, [location.pathname]);

  return (
    <>
      <nav
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          background: scrolled ? 'rgba(7,11,20,0.85)' : 'transparent',
          backdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
          transition: 'all 0.3s ease',
        }}
      >
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', height: 72 }}>
          {/* Logo — left */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
            <img src="/logo.png" alt="ReachPeak" style={{ width: 42, height: 42, borderRadius: 8 }} />
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 22, color: 'white', letterSpacing: '-0.02em' }}>
              ReachPeak
            </span>
          </Link>

          {/* Desktop nav — centered */}
          <div className="hidden lg:flex" style={{ alignItems: 'center', gap: 32, flex: 1, justifyContent: 'center' }}>
            {/* Product dropdown */}
            <div style={{ position: 'relative' }}
              onMouseEnter={() => setProdOpen(true)}
              onMouseLeave={() => setProdOpen(false)}
            >
              <button style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#94a3b8', fontSize: 14, fontWeight: 500, fontFamily: "'Inter', sans-serif",
                display: 'flex', alignItems: 'center', gap: 4, padding: 0,
                transition: 'color 0.2s',
              }}
                onMouseEnter={e => (e.currentTarget.style.color = '#e2e8f0')}
                onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
              >
                Product <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: prodOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
              </button>
              
              {prodOpen && (
                <div style={{
                  position: 'absolute', top: '100%', left: -16, paddingTop: 12,
                }}>
                  <div style={{
                    background: 'rgba(13,20,36,0.98)', backdropFilter: 'blur(24px)',
                    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16,
                    padding: 8, minWidth: 280, boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
                  }}>
                    <Link to="/#pillars" style={{
                      display: 'block', padding: '12px 16px', borderRadius: 10, textDecoration: 'none',
                      transition: 'background 0.15s',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', marginBottom: 2 }}>WhatsApp Automation</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>Campaigns, Journeys & OrderGuard</div>
                    </Link>
                    <Link to="/ai-calling" style={{
                      display: 'block', padding: '12px 16px', borderRadius: 10, textDecoration: 'none',
                      transition: 'background 0.15s',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>AI Calling Agents</div>
                        <span style={{
                          padding: '2px 6px', borderRadius: 12, fontSize: 10, fontWeight: 600,
                          background: 'rgba(224,70,50,0.1)', color: '#E04632', border: '1px solid rgba(224,70,50,0.2)',
                        }}>Early access</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>Call, qualify & convert in seconds</div>
                    </Link>
                  </div>
                </div>
              )}
            </div>
            
            {/* Solutions dropdown */}
            <div style={{ position: 'relative' }}
              onMouseEnter={() => setSolOpen(true)}
              onMouseLeave={() => setSolOpen(false)}
            >
              <button style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#94a3b8', fontSize: 14, fontWeight: 500, fontFamily: "'Inter', sans-serif",
                display: 'flex', alignItems: 'center', gap: 4, padding: 0,
                transition: 'color 0.2s',
              }}
                onMouseEnter={e => (e.currentTarget.style.color = '#e2e8f0')}
                onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
              >
                Solutions <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: solOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
              </button>
              
              {solOpen && (
                <div style={{
                  position: 'absolute', top: '100%', left: -16, paddingTop: 12,
                }}>
                  <div style={{
                    background: 'rgba(13,20,36,0.98)', backdropFilter: 'blur(24px)',
                    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16,
                    padding: 8, minWidth: 320, boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
                  }}>
                    {SOLUTIONS.map(s => (
                      <Link key={s.path} to={s.path} style={{
                        display: 'block', padding: '12px 16px', borderRadius: 10, textDecoration: 'none',
                        transition: 'background 0.15s',
                      }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', marginBottom: 2 }}>{s.label}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{s.hook}</div>
                      </Link>
                    ))}
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '4px 0' }} />
                    <Link to="/use-cases" style={{
                      display: 'block', padding: '10px 16px', borderRadius: 10, textDecoration: 'none',
                      fontSize: 13, fontWeight: 500, color: '#E04632',
                      transition: 'background 0.15s',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(224,70,50,0.06)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      View all solutions →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <NavLink to="/pricing" label="Pricing" />
            <NavLink to="/about" label="About" />
            <NavLink to="/contact" label="Contact" />
          </div>

          {/* Desktop CTAs — right */}
          <div className="hidden lg:flex" style={{ alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <Link to="/login" style={{
              padding: '8px 20px', borderRadius: 10, fontSize: 14, fontWeight: 500,
              color: '#94a3b8', textDecoration: 'none', transition: 'color 0.2s',
              fontFamily: "'Inter', sans-serif",
            }}>Sign in</Link>
            <Link to="/signup" style={{
              padding: '10px 24px', borderRadius: 10, fontSize: 14, fontWeight: 600,
              background: 'linear-gradient(135deg, #E04632, #C83A28)',
              color: 'white', textDecoration: 'none', fontFamily: "'Inter', sans-serif",
              boxShadow: '0 0 24px rgba(224,70,50,0.3)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 0 32px rgba(224,70,50,0.5)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 24px rgba(224,70,50,0.3)'; }}
            >Start free</Link>
          </div>

          {/* Mobile hamburger */}
          <button className="lg:hidden" onClick={() => setMobileOpen(!mobileOpen)} style={{
            marginLeft: 'auto', background: 'none', border: 'none', color: '#e2e8f0', cursor: 'pointer', padding: 8,
          }}>
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden" style={{
          position: 'fixed', inset: 0, zIndex: 99,
          background: 'rgba(7,11,20,0.98)', backdropFilter: 'blur(24px)',
          paddingTop: 80, paddingLeft: 24, paddingRight: 24,
          overflowY: 'auto',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <MobileLink to="/#pillars" label="Product" />
            <div style={{ padding: '12px 0 4px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Solutions</div>
            {SOLUTIONS.map(s => (
              <Link key={s.path} to={s.path} onClick={() => setMobileOpen(false)} style={{
                display: 'block', padding: '10px 16px', borderRadius: 10, textDecoration: 'none',
                fontSize: 15, color: '#e2e8f0', fontWeight: 500,
              }}>{s.label}</Link>
            ))}
            <MobileLink to="/pricing" label="Pricing" />
            <MobileLink to="/about" label="About" />
            <MobileLink to="/contact" label="Contact" />
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '16px 0' }} />
            <Link to="/login" onClick={() => setMobileOpen(false)} style={{
              display: 'block', padding: '14px', borderRadius: 12, textAlign: 'center',
              fontSize: 15, fontWeight: 500, color: '#94a3b8', textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>Sign in</Link>
            <Link to="/signup" onClick={() => setMobileOpen(false)} style={{
              display: 'block', padding: '14px', borderRadius: 12, textAlign: 'center',
              fontSize: 15, fontWeight: 600, color: 'white', textDecoration: 'none',
              background: 'linear-gradient(135deg, #E04632, #C83A28)',
            }}>Start free</Link>
          </div>
        </div>
      )}
    </>
  );
}

function NavLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} style={{
      color: '#94a3b8', fontSize: 14, fontWeight: 500, textDecoration: 'none',
      fontFamily: "'Inter', sans-serif", transition: 'color 0.2s',
    }}
      onMouseEnter={e => (e.currentTarget.style.color = '#e2e8f0')}
      onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
    >{label}</Link>
  );
}

function MobileLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} style={{
      display: 'block', padding: '14px 0', fontSize: 18, fontWeight: 600,
      color: '#e2e8f0', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)',
      fontFamily: "'Space Grotesk', sans-serif",
    }}>{label}</Link>
  );
}
