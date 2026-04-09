import { ReactNode, useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useAutoIncrement } from '../hooks/useAutoIncrement';
import { LayoutDashboard, Megaphone, Users, AlertCircle, BarChart3, CircleUser as UserCircle, Settings, LogOut, Shield, Activity, Menu, X, CheckSquare } from 'lucide-react';

const LOGO_URL = 'https://i.ibb.co/K3M8zPq/Avatar.png';

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { profile, isAdmin, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Auto-increment engine: processes running campaigns in the background
  useAutoIncrement();

  // Fetch pending approval count for admin badge
  useEffect(() => {
    if (!isAdmin) return;
    const fetchPending = async () => {
      const { count } = await supabase
        .from('campaigns')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending_approval');
      setPendingCount(count || 0);
    };
    fetchPending();
    const channel = supabase
      .channel('pending-approvals-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns' }, () => fetchPending())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAdmin]);

  const adminNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'approvals', label: 'Campaign Approvals', icon: CheckSquare, badge: pendingCount > 0 ? pendingCount : undefined },
    { id: 'campaigns', label: 'All Campaigns', icon: Megaphone },
    { id: 'contacts', label: 'All Contacts', icon: Users },
    { id: 'failed', label: 'Failed & Retry', icon: AlertCircle },
    { id: 'sources', label: 'Lead Sources', icon: BarChart3 },
    { id: 'agents', label: 'Agents', icon: UserCircle },
    { id: 'reports', label: 'Reports', icon: Activity },
    { id: 'users', label: 'User Management', icon: Shield },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const userNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'campaigns', label: 'My Campaigns', icon: Megaphone },
    { id: 'contacts', label: 'My Contacts', icon: Users },
    { id: 'reports', label: 'Reports', icon: Activity },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const navItems = isAdmin ? adminNavItems : userNavItems;

  const handleSignOut = async () => {
    try { await signOut(); } catch {}
  };

  const handleNavigate = (page: string) => {
    onNavigate(page);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-gray-900 border-r border-gray-800 flex flex-col transform transition-transform duration-300 ease-in-out ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img src={LOGO_URL} alt="ReachPeak API" className="w-10 h-10 rounded-lg" />
              <h1 className="text-white font-bold text-lg">ReachPeak API</h1>
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden text-gray-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition ${
                  isActive ? 'bg-brand text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="flex-1 text-left">{item.label}</span>
                {'badge' in item && item.badge && (
                  <span className="px-1.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="bg-gray-800 rounded-lg p-4 mb-3">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                <UserCircle className="w-6 h-6 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{profile?.full_name}</p>
                <p className="text-gray-400 text-xs truncate">{profile?.email}</p>
              </div>
            </div>
            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
              isAdmin ? 'bg-brand/20 text-brand-light' : 'bg-blue-500/20 text-blue-400'
            }`}>
              {isAdmin ? 'Admin' : 'User'}
            </span>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition text-sm font-medium"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="lg:hidden sticky top-0 z-30 bg-gray-900 border-b border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <button onClick={() => setIsMobileMenuOpen(true)} className="text-gray-400 hover:text-white">
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <img src={LOGO_URL} alt="ReachPeak API" className="w-8 h-8 rounded-lg" />
              <h1 className="text-white font-bold text-base">ReachPeak API</h1>
            </div>
            <div className="w-6" />
          </div>
        </div>
        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
