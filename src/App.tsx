import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SubscriptionProvider, useSubscription } from './contexts/SubscriptionContext';
import { PublicLayout } from './components/public/PublicLayout';
import { HomePage } from './components/public/HomePage';
import { AboutPage } from './components/public/AboutPage';
import { PricingPage } from './components/public/PricingPage';
import { PrivacyPolicyPage } from './components/public/PrivacyPolicyPage';
import { TermsPage } from './components/public/TermsPage';
import { RefundPolicyPage } from './components/public/RefundPolicyPage';
import { ContactPage } from './components/public/ContactPage';
import { Login } from './components/Login';
import { Signup } from './components/Signup';
import { PlanSelection } from './components/onboarding/PlanSelection';
import { PaymentDetails } from './components/onboarding/PaymentDetails';
import { PendingReview } from './components/onboarding/PendingReview';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Campaigns } from './components/Campaigns';
import { UserCampaigns } from './components/UserCampaigns';
import { CampaignApprovals } from './components/CampaignApprovals';
import { Contacts } from './components/Contacts';
import { FailedRetry } from './components/FailedRetry';
import { LeadSources } from './components/LeadSources';
import { Agents } from './components/Agents';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';
import { UserManagement } from './components/UserManagement';

function AuthRedirect({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/app" replace />;
  return <>{children}</>;
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  const { subscription, loading: subLoading } = useSubscription();

  if (loading || subLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (isAdmin) return <>{children}</>;
  if (!subscription) return <Navigate to="/select-plan" replace />;
  if (subscription.status === 'pending') return <Navigate to="/pending-review" replace />;
  if (subscription.status === 'rejected') return <Navigate to="/select-plan" replace />;
  if (subscription.status === 'expired') return <Navigate to="/select-plan" replace />;
  return <>{children}</>;
}

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  const { subscription, loading: subLoading } = useSubscription();

  if (loading || subLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (isAdmin) return <Navigate to="/app" replace />;
  if (subscription?.status === 'active') return <Navigate to="/app" replace />;
  return <>{children}</>;
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
  const { isAdmin } = useAuth();

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'campaigns': return isAdmin ? <Campaigns /> : <UserCampaigns />;
      case 'approvals': return <CampaignApprovals />;
      case 'contacts': return <Contacts />;
      case 'failed': return <FailedRetry />;
      case 'sources': return <LeadSources />;
      case 'agents': return <Agents />;
      case 'reports': return <Reports />;
      case 'users': return <UserManagement />;
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
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/refund-policy" element={<RefundPolicyPage />} />
        <Route path="/contact" element={<ContactPage />} />
      </Route>

      <Route path="/login" element={<AuthRedirect><Login /></AuthRedirect>} />
      <Route path="/signup" element={<AuthRedirect><Signup /></AuthRedirect>} />

      <Route path="/select-plan" element={<OnboardingGuard><PlanSelection /></OnboardingGuard>} />
      <Route path="/payment-details" element={<OnboardingGuard><PaymentDetails /></OnboardingGuard>} />
      <Route path="/pending-review" element={<OnboardingGuard><PendingReview /></OnboardingGuard>} />

      <Route path="/app" element={<RequireAuth><AppDashboard /></RequireAuth>} />

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
