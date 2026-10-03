import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SubscriptionProvider, useSubscription } from './contexts/SubscriptionContext';
import { InstallPrompt } from './components/InstallPrompt';

/* ─── MARKETING PAGES (lazy-loaded — keeps app bundle lean) ─── */
const MarketingLayout = lazy(() => import('./components/marketing/MarketingLayout').then(m => ({ default: m.MarketingLayout })));
/* New marketing site (2026-10): light editorial design, every-business positioning, AI calling live */
const SiteLayout = lazy(() => import('./components/site/SiteLayout').then(m => ({ default: m.SiteLayout })));
const SiteHome = lazy(() => import('./components/site/pages/Home'));
const SiteAICalling = lazy(() => import('./components/site/pages/AICalling'));
const SiteWhatsApp = lazy(() => import('./components/site/pages/WhatsApp'));
const SiteIndustry = lazy(() => import('./components/site/pages/Industry'));
const SiteUseCases = lazy(() => import('./components/site/pages/UseCases'));
const SitePricing = lazy(() => import('./components/site/pages/Pricing'));
const SiteAbout = lazy(() => import('./components/site/pages/About'));
const SiteContact = lazy(() => import('./components/site/pages/Contact'));
const MktPrivacyPolicy = lazy(() => import('./components/marketing/PrivacyPolicyPage').then(m => ({ default: m.PrivacyPolicyPage })));
const MktTermsPage = lazy(() => import('./components/marketing/LegalPages').then(m => ({ default: m.TermsPage })));
const MktRefundPolicy = lazy(() => import('./components/marketing/LegalPages').then(m => ({ default: m.RefundPolicyPage })));
const MktDataDeletion = lazy(() => import('./components/marketing/LegalPages').then(m => ({ default: m.DataDeletionPage })));
const HostingPage = lazy(() => import('./components/marketing/HostingPage').then(m => ({ default: m.HostingPage })));

/* Solution pages */
// (old /solutions pages replaced by components/site/pages/Industry)

/* ─── APP PAGES (eagerly loaded — behind auth) ─── */
import { Login } from './components/Login';
import { Signup } from './components/Signup';
import { PlanSelection } from './components/onboarding/PlanSelection';
import { PaymentDetails } from './components/onboarding/PaymentDetails';
import { PendingReview } from './components/onboarding/PendingReview';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Campaigns } from './components/Campaigns';
import { UserCampaigns } from './components/UserCampaigns';
import { Templates } from './components/Templates';
import { Contacts } from './components/Contacts';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';
import { Disputes } from './components/Disputes';
const Leads = lazy(() => import('./components/Leads').then(m => ({ default: m.Leads })));
const VoiceAdmin = lazy(() => import('./components/VoiceAdmin').then(m => ({ default: m.VoiceAdmin })));
const VoiceAgents = lazy(() => import('./components/VoiceAgents').then(m => ({ default: m.VoiceAgents })));
import { UserManagement } from './components/UserManagement';
import { Inbox } from './components/Inbox';
import { Integrations } from './components/Integrations';
import { Journeys } from './components/Journeys';
import { OrderGuard } from './components/OrderGuard';
import { Wallet } from './components/Wallet';
import { AdminBilling } from './components/AdminBilling';
import { OnboardingChoice } from './components/onboarding/OnboardingChoice';
import { Support } from './components/Support';
import { AdminSupport } from './components/AdminSupport';
import { AdminProvisionStore } from './components/AdminProvisionStore';
import { AIBroadcast } from './components/AIBroadcast';
import { supabase } from './lib/supabase';
import { BrandSplash, BrandSpinner } from './components/BrandSpinner';
import { BusinessTypePrompt } from './components/onboarding/BusinessTypePrompt';
import { FEATURES, hasFeature } from './lib/businessTypes';

/* ─── LOADING FALLBACK ─── */
function MarketingLoading() {
  return <BrandSplash />;
}

function AuthRedirect({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  // No approval flow: any logged-in user goes straight to the app.
  if (user) return <Navigate to="/app" replace />;
  return <>{children}</>;
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  const { subscription, loading: subLoading } = useSubscription();
  if (loading || subLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (isAdmin) return <>{children}</>;   // admins are never subscription-gated
  // Direct signups must have an ACTIVE subscription. PeakCart/managed accounts get
  // an active ₹0 subscription at provision time, so they pass automatically.
  if (subscription?.status !== 'active') return <Navigate to="/select-plan" replace />;
  return <>{children}</>;
}

// /select-plan: logged-in users without an active subscription pay here.
// Already-active users (incl. PeakCart/managed) + admins skip straight to the app.
function SelectPlanGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  const { subscription, loading: subLoading } = useSubscription();
  if (loading || subLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (isAdmin || subscription?.status === 'active') return <Navigate to="/app" replace />;
  return <>{children}</>;
}

// Standalone WhatsApp connect page — reached via the magic link from PeakCart.
// User-only guard (a PeakCart merchant has no ReachPeak subscription, so we must NOT
// send them through the subscription checks that /app uses).
function ConnectWhatsAppPage() {
  const { user, loading } = useAuth();
  const [pw, setPw] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [saving, setSaving] = useState(false);
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  const savePassword = async () => {
    if (pw.length < 8) { setPwMsg('⚠ Password must be at least 8 characters.'); return; }
    setSaving(true); setPwMsg('');
    const { error } = await supabase.auth.updateUser({ password: pw });
    setSaving(false);
    if (error) { setPwMsg('⚠ ' + error.message); }
    else { setPwMsg('✓ Password set! You can now log in at reachpeakapi.in with your email and this password.'); setPw(''); }
  };
  return (
    <div style={{ minHeight: '100vh', background: '#070B14', padding: '40px 24px' }}>
      <OnboardingChoice />
      {/* Own-your-account: set a password (for PeakCart merchants arriving via magic link) */}
      <div style={{ maxWidth: 620, margin: '24px auto 0', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 16, padding: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>Own your account (optional)</h2>
        <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}>
          Set a password so you can log into <strong>reachpeakapi.in</strong> anytime to manage campaigns, chat &amp; templates.
          {user.email ? <> Your login email: <strong style={{ color: '#e2e8f0' }}>{user.email}</strong></> : null}
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Create a password (min 8 chars)"
            style={{ flex: 1, padding: '10px 12px', border: '1px solid #334155', background: '#0b1220', color: '#e2e8f0', borderRadius: 8, fontSize: 14 }} />
          <button onClick={savePassword} disabled={saving}
            style={{ padding: '10px 16px', background: 'linear-gradient(135deg,#E04632,#c83b27)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {saving ? 'Saving…' : 'Set password'}
          </button>
        </div>
        {pwMsg && <p style={{ marginTop: 8, fontSize: 13, color: pwMsg.startsWith('✓') ? '#10b981' : '#ef4444' }}>{pwMsg}</p>}
      </div>
    </div>
  );
}

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  // Legacy onboarding routes (plan/payment/pending) are deprecated — approval was removed.
  // Logged-in users go to the app; everyone else to login. `children` retained for route shape.
  const { user, loading } = useAuth();
  void children;
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to="/app" replace />;
}

function LoadingScreen() {
  return <BrandSplash label="Loading your workspace" />;
}

function AppDashboard() {
  // Remember the open page: phones and browsers often reload a background tab, which used to land on home.
  const [currentPage, setCurrentPage] = useState(() => {
    try { return localStorage.getItem('rp_page') || 'dashboard'; } catch { return 'dashboard'; }
  });
  const { user, isAdmin, profile } = useAuth();
  const userId = user?.id;

  useEffect(() => {
    try { localStorage.setItem('rp_page', currentPage); } catch { /* storage blocked */ }
  }, [currentPage]);

  // Onboarding gate: send a non-admin who hasn't picked a WhatsApp model to Setup first.
  useEffect(() => {
    if (!userId || isAdmin) return;
    supabase.from('profiles').select('onboarding_choice').eq('id', userId).maybeSingle()
      .then(({ data }) => { if (!data?.onboarding_choice) setCurrentPage('setup'); });
  }, [userId, isAdmin]);

  const renderPage = () => {
    // Pages that depend on the business type: wait for the profile, then show only if enabled for this account.
    if (FEATURES[currentPage]) {
      if (!profile) return <BrandSpinner label="Loading…" />;
      if (!hasFeature(profile, currentPage)) return <Dashboard />;
    }
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'setup': return <OnboardingChoice onComplete={() => setCurrentPage('dashboard')} />;
      case 'support': return isAdmin ? <AdminSupport /> : <Support />;
      case 'provision': return isAdmin ? <AdminProvisionStore /> : <Dashboard />;
      case 'inbox': return <Inbox onNavigate={setCurrentPage} />;
      case 'campaigns': return isAdmin ? <Campaigns /> : <UserCampaigns />;
      case 'templates': return <Templates />;
      case 'contacts': return <Contacts />;
      case 'reports': return <Reports />;
      case 'users': return <UserManagement />;
      case 'integrations': return <Integrations />;
      case 'journeys': return <Journeys />;
      case 'orderguard': return <OrderGuard />;
      case 'disputes': return <Disputes onNavigate={setCurrentPage} />;
      case 'leads': return <Suspense fallback={<BrandSpinner label="Loading leads…" />}><Leads onNavigate={setCurrentPage} /></Suspense>;
      case 'voice-admin': return isAdmin ? <Suspense fallback={<BrandSpinner label="Loading AI Calling setup…" />}><VoiceAdmin /></Suspense> : <Dashboard />;
      case 'ai-calling': return <Suspense fallback={<BrandSpinner label="Loading AI Calling…" />}><VoiceAgents /></Suspense>;
      case 'wallet': return <Wallet />;
      case 'ai-broadcast': return <AIBroadcast />;
      case 'billing': return isAdmin ? <AdminBilling /> : <Wallet />;
      case 'settings': return <Settings />;
      default: return <Dashboard />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
      {profile && !isAdmin && !profile.business_type && <BusinessTypePrompt />}
    </Layout>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* ─── MARKETING SITE (light, lazy-loaded) ─── */}
      <Route element={<Suspense fallback={<MarketingLoading />}><SiteLayout /></Suspense>}>
        <Route path="/" element={<Suspense fallback={null}><SiteHome /></Suspense>} />
        <Route path="/ai-calling" element={<Suspense fallback={null}><SiteAICalling /></Suspense>} />
        <Route path="/whatsapp" element={<Suspense fallback={null}><SiteWhatsApp /></Suspense>} />
        <Route path="/solutions/:slug" element={<Suspense fallback={null}><SiteIndustry /></Suspense>} />
        <Route path="/use-cases" element={<Suspense fallback={null}><SiteUseCases /></Suspense>} />
        <Route path="/pricing" element={<Suspense fallback={null}><SitePricing /></Suspense>} />
        <Route path="/about" element={<Suspense fallback={null}><SiteAbout /></Suspense>} />
        <Route path="/contact" element={<Suspense fallback={null}><SiteContact /></Suspense>} />
        {/* Legal content is frozen (Meta review) — shown on its original dark panel inside the new nav/footer */}
        <Route path="/privacy-policy" element={<Suspense fallback={null}><div style={{ background: '#070B14', color: '#e2e8f0', fontFamily: "'Inter', sans-serif" }}><MktPrivacyPolicy /></div></Suspense>} />
        <Route path="/terms" element={<Suspense fallback={null}><div style={{ background: '#070B14', color: '#e2e8f0', fontFamily: "'Inter', sans-serif" }}><MktTermsPage /></div></Suspense>} />
        <Route path="/refund-policy" element={<Suspense fallback={null}><div style={{ background: '#070B14', color: '#e2e8f0', fontFamily: "'Inter', sans-serif" }}><MktRefundPolicy /></div></Suspense>} />
        <Route path="/data-deletion" element={<Suspense fallback={null}><div style={{ background: '#070B14', color: '#e2e8f0', fontFamily: "'Inter', sans-serif" }}><MktDataDeletion /></div></Suspense>} />
      </Route>
      {/* ─── HOSTING (separate unlinked funnel, unchanged, old layout) ─── */}
      <Route element={<Suspense fallback={<MarketingLoading />}><MarketingLayout /></Suspense>}>
        <Route path="/hosting" element={<Suspense fallback={null}><HostingPage /></Suspense>} />
      </Route>

      {/* ─── AUTH ─── */}
      <Route path="/login" element={<AuthRedirect><Login /></AuthRedirect>} />
      <Route path="/signup" element={<AuthRedirect><Signup /></AuthRedirect>} />

      {/* ─── ONBOARDING ─── */}
      <Route path="/select-plan" element={<SelectPlanGuard><PlanSelection /></SelectPlanGuard>} />
      <Route path="/payment-details" element={<OnboardingGuard><PaymentDetails /></OnboardingGuard>} />
      <Route path="/pending-review" element={<OnboardingGuard><PendingReview /></OnboardingGuard>} />

      {/* ─── APP (behind auth) ─── */}
      <Route path="/app" element={<RequireAuth><AppDashboard /></RequireAuth>} />

      <Route path="/connect-whatsapp" element={<ConnectWhatsAppPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SubscriptionProvider>
          <AppRoutes />
          <InstallPrompt />
        </SubscriptionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
