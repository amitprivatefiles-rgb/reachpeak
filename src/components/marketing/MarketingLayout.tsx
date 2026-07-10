import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Lenis from 'lenis';
import { MarketingNav } from './MarketingNav';
import { MarketingFooter } from './MarketingFooter';
import './marketing.css';

export function MarketingLayout() {
  const lenisRef = useRef<Lenis | null>(null);
  const location = useLocation();

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const lenis = new Lenis({ lerp: 0.1, duration: 1.2 });
    lenisRef.current = lenis;

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // Scroll to top on route change
  useEffect(() => {
    const timeout = setTimeout(() => {
      window.scrollTo(0, 0);
      lenisRef.current?.scrollTo(0, { immediate: true });
    }, 50);
    return () => clearTimeout(timeout);
  }, [location.pathname]);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: '#070B14',
        color: '#e2e8f0',
        fontFamily: "'Inter', sans-serif",
        overflowX: 'clip',
        position: 'relative',
        width: '100%',
      }}
    >
      <MarketingNav />
      <main className="flex-1">
        <Outlet />
      </main>
      <MarketingFooter />
    </div>
  );
}
