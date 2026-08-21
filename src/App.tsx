import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';

/* ─── MARKETING PAGES (lazy-loaded — keeps app bundle lean) ─── */
const MarketingLayout = lazy(() => import('./components/marketing/MarketingLayout').then(m => ({ default: m.MarketingLayout })));
const Landing = lazy(() => import('./components/marketing/Landing').then(m => ({ default: m.Landing })));
const AICallingPage = lazy(() => import('./components/marketing/AICallingPage').then(m => ({ default: m.AICallingPage })));
const MktAboutPage = lazy(() => import('./components/marketing/AboutPage').then(m => ({ default: m.AboutPage })));
const MktPricingPage = lazy(() => import('./components/marketing/PricingPage').then(m => ({ default: m.PricingPage })));
const MktContactPage = lazy(() => import('./components/marketing/ContactPage').then(m => ({ default: m.ContactPage })));
const MktUseCasesPage = lazy(() => import('./components/marketing/UseCasesPage').then(m => ({ default: m.UseCasesPage })));
const MktPrivacyPolicy = lazy(() => import('./components/marketing/PrivacyPolicyPage').then(m => ({ default: m.PrivacyPolicyPage })));
const MktTermsPage = lazy(() => import('./components/marketing/LegalPages').then(m => ({ default: m.TermsPage })));
const MktRefundPolicy = lazy(() => import('./components/marketing/LegalPages').then(m => ({ default: m.RefundPolicyPage })));
const MktDataDeletion = lazy(() => import('./components/marketing/LegalPages').then(m => ({ default: m.DataDeletionPage })));

/* Solution pages */
const EcommerceSolution = lazy(() => import('./components/marketing/solutions/index').then(m => ({ default: m.EcommerceSolution })));
const ClinicsSolution = lazy(() => import('./components/marketing/solutions/index').then(m => ({ default: m.ClinicsSolution })));
const SalonsSolution = lazy(() => import('./components/marketing/solutions/index').then(m => ({ default: m.SalonsSolution })));
const EducationSolution = lazy(() => import('./components/marketing/solutions/index').then(m => ({ default: m.EducationSolution })));
const RealEstateSolution = lazy(() => import('./components/marketing/solutions/index').then(m => ({ default: m.RealEstateSolution })));
const ServicesSolution = lazy(() => import('./components/marketing/solutions/index').then(m => ({ default: m.ServicesSolution })));

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
import { CampaignApprovals } from './components/CampaignApprovals';
import { Contacts } from './components/Contacts';
import { FailedRetry } from './components/FailedRetry';
import { LeadSources } from './components/LeadSources';
import { Agents } from './components/Agents';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';
import { UserManagement } from './components/UserManagement';
import { Inbox } from './components/Inbox';
import { Integrations } from './components/Integrations';
import { Journeys } from './components/Journeys';
import { OrderGuard } from './components/OrderGuard';
import { Wallet } from './components/Wallet';
import { AdminBilling } from './components/AdminBilling';
import { ConnectWhatsApp } from './components/ConnectWhatsApp';
import { OnboardingChoice } from './components/onboarding/OnboardingChoice';
import { Support } from './components/Support';
import { AdminSupport } from './components/AdminSupport';
import { supabase } from './lib/supabase';

/* ─── LOADING FALLBACK ─── */
function MarketingLoading() {
  return (
    <div style={{
      minHeight: '100vh', background: '#070B14',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: 'linear-gradient(135deg, #10B981, #059669)',
        animation: 'spin 1s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function AuthRedirect({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  // No approval flow: any logged-in user goes straight to the app.
  if (user) return <Navigate to="/app" replace />;
  return <>{children}</>;
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  // NO SIGNUP APPROVAL: any authenticated user reaches the dashboard immediately.
  // Sending is gated at the wallet level ("recharge to send"), not here.
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
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
    <div style={{ minHeight: '100vh', background: '#070B14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 560, width: '100%', background: '#fff', borderRadius: 20, padding: 36, boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Connect your WhatsApp</h1>
        <p style={{ color: '#64748b', fontSize: 15, marginBottom: 24, lineHeight: 1.6 }}>
          Link your WhatsApp Business number to start sending automated order updates. You'll be guided through Meta's secure signup.
        </p>
        <ConnectWhatsApp />
        <hr style={{ margin: '28px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Own your account (optional)</h2>
        <p style={{ color: '#64748b', fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}>
          Set a password so you can log into <strong>reachpeakapi.in</strong> anytime to manage campaigns, chat &amp; templates.
          {user.email ? <> Your login email: <strong>{user.email}</strong></> : null}
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Create a password (min 8 chars)"
            style={{ flex: 1, padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14 }} />
          <button onClick={savePassword} disabled={saving}
            style={{ padding: '10px 16px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {saving ? 'Saving…' : 'Set password'}
          </button>
        </div>
        {pwMsg && <p style={{ marginTop: 8, fontSize: 13, color: pwMsg.startsWith('✓') ? '#059669' : '#dc2626' }}>{pwMsg}</p>}
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
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-brand border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    </div>
  );
}

function AppDashboard() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const { user, isAdmin } = useAuth();

  // Onboarding gate: send a non-admin who hasn't picked a WhatsApp model to Setup first.
  useEffect(() => {
    if (!user || isAdmin) return;
    supabase.from('profiles').select('onboarding_choice').eq('id', user.id).maybeSingle()
      .then(({ data }) => { if (!data?.onboarding_choice) setCurrentPage('setup'); });
  }, [user, isAdmin]);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'setup': return <OnboardingChoice onComplete={() => setCurrentPage('dashboard')} />;
      case 'support': return isAdmin ? <AdminSupport /> : <Support />;
      case 'inbox': return <Inbox />;
      case 'campaigns': return isAdmin ? <Campaigns /> : <UserCampaigns />;
      case 'templates': return <Templates />;
      case 'approvals': return <CampaignApprovals />;
      case 'contacts': return <Contacts />;
      case 'failed': return <FailedRetry />;
      case 'sources': return <LeadSources />;
      case 'agents': return <Agents />;
      case 'reports': return <Reports />;
      case 'users': return <UserManagement />;
      case 'integrations': return <Integrations />;
      case 'journeys': return <Journeys />;
      case 'orderguard': return <OrderGuard />;
      case 'wallet': return <Wallet />;
      case 'billing': return isAdmin ? <AdminBilling /> : <Wallet />;
      case 'settings': return <Settings />;
      default: return <Dashboard />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* ─── MARKETING (dark premium, lazy-loaded) ─── */}
      <Route element={<Suspense fallback={<MarketingLoading />}><MarketingLayout /></Suspense>}>
        <Route path="/" element={<Suspense fallback={null}><Landing /></Suspense>} />
        <Route path="/ai-calling" element={<Suspense fallback={null}><AICallingPage /></Suspense>} />
        <Route path="/about" element={<Suspense fallback={null}><MktAboutPage /></Suspense>} />
        <Route path="/pricing" element={<Suspense fallback={null}><MktPricingPage /></Suspense>} />
        <Route path="/contact" element={<Suspense fallback={null}><MktContactPage /></Suspense>} />
        <Route path="/use-cases" element={<Suspense fallback={null}><MktUseCasesPage /></Suspense>} />
        <Route path="/privacy-policy" element={<Suspense fallback={null}><MktPrivacyPolicy /></Suspense>} />
        <Route path="/terms" element={<Suspense fallback={null}><MktTermsPage /></Suspense>} />
        <Route path="/refund-policy" element={<Suspense fallback={null}><MktRefundPolicy /></Suspense>} />
        <Route path="/data-deletion" element={<Suspense fallback={null}><MktDataDeletion /></Suspense>} />
        {/* Solution verticals */}
        <Route path="/solutions/ecommerce" element={<Suspense fallback={null}><EcommerceSolution /></Suspense>} />
        <Route path="/solutions/clinics" element={<Suspense fallback={null}><ClinicsSolution /></Suspense>} />
        <Route path="/solutions/salons" element={<Suspense fallback={null}><SalonsSolution /></Suspense>} />
        <Route path="/solutions/education" element={<Suspense fallback={null}><EducationSolution /></Suspense>} />
        <Route path="/solutions/real-estate" element={<Suspense fallback={null}><RealEstateSolution /></Suspense>} />
        <Route path="/solutions/services" element={<Suspense fallback={null}><ServicesSolution /></Suspense>} />
      </Route>

      {/* ─── AUTH ─── */}
      <Route path="/login" element={<AuthRedirect><Login /></AuthRedirect>} />
      <Route path="/signup" element={<AuthRedirect><Signup /></AuthRedirect>} />

      {/* ─── ONBOARDING ─── */}
      <Route path="/select-plan" element={<OnboardingGuard><PlanSelection /></OnboardingGuard>} />
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
        </SubscriptionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
