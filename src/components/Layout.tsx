import { ReactNode, useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { supabase } from '../lib/supabase';
import { LayoutDashboard, Megaphone, Users, AlertCircle, BarChart3, CircleUser as UserCircle, Settings, LogOut, Shield, ShieldAlert, Activity, X, CheckSquare, FileText, MessageSquare, Zap, Key, Wallet, CreditCard, LifeBuoy, Smartphone, Bell, BellOff, Home, LayoutGrid } from 'lucide-react';
import { enablePush, disablePush, isPushEnabled, pushSupported } from '../lib/push';

const LOGO_URL = 'https://i.ibb.co/K3M8zPq/Avatar.png';
const ACCENT = '#E04632';

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { profile, isAdmin, signOut } = useAuth();
  const { subscription } = useSubscription();
  const [showMore, setShowMore] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [inboxUnread, setInboxUnread] = useState(0);
  const [waConnected, setWaConnected] = useState(false);
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => { isPushEnabled().then(setPushOn).catch(() => {}); }, []);

  const togglePush = async () => {
    setPushBusy(true);
    try {
      if (pushOn) { await disablePush(); setPushOn(false); }
      else {
        const r = await enablePush();
        if (r.ok) setPushOn(true);
        else alert(r.error || 'Could not enable alerts.');
      }
    } finally { setPushBusy(false); }
  };

  useEffect(() => {
    if (isAdmin) return;
    supabase.from('whatsapp_accounts').select('id').eq('is_active', true).limit(1).maybeSingle()
      .then(({ data }) => setWaConnected(!!data));
    const ch = supabase.channel('wa-connected')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_accounts' }, () => {
        supabase.from('whatsapp_accounts').select('id').eq('is_active', true).limit(1).maybeSingle()
          .then(({ data }) => setWaConnected(!!data));
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [isAdmin]);

  const logoUrl = subscription?.logo_url || LOGO_URL;

  useEffect(() => {
    if (!isAdmin) return;
    const fetchPending = async () => {
      const { count } = await supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('status', 'pending_approval');
      setPendingCount(count || 0);
    };
    fetchPending();
    const channel = supabase.channel('pending-approvals-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns' }, () => fetchPending()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAdmin]);

  useEffect(() => {
    const fetchUnread = async () => {
      const { data } = await supabase.from('conversations').select('unread_count');
      const total = (data || []).reduce((sum: number, c: any) => sum + (c.unread_count || 0), 0);
      setInboxUnread(total);
    };
    fetchUnread();
    const channel = supabase.channel('inbox-unread-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => fetchUnread()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const adminNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inbox', label: 'Inbox', icon: MessageSquare, badge: inboxUnread > 0 ? inboxUnread : undefined },
    { id: 'approvals', label: 'Campaign Approvals', icon: CheckSquare, badge: pendingCount > 0 ? pendingCount : undefined },
    { id: 'campaigns', label: 'All Campaigns', icon: Megaphone },
    { id: 'templates', label: 'Templates', icon: FileText },
    { id: 'contacts', label: 'All Contacts', icon: Users },
    { id: 'failed', label: 'Failed & Retry', icon: AlertCircle },
    { id: 'sources', label: 'Lead Sources', icon: BarChart3 },
    { id: 'agents', label: 'Agents', icon: UserCircle },
    { id: 'reports', label: 'Reports', icon: Activity },
    { id: 'journeys', label: 'Journeys', icon: Zap },
    { id: 'orderguard', label: 'OrderGuard', icon: ShieldAlert },
    { id: 'integrations', label: 'Integrations', icon: Key },
    { id: 'users', label: 'User Management', icon: Shield },
    { id: 'provision', label: 'Provision Store', icon: Smartphone },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'support', label: 'Support', icon: LifeBuoy },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const userNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'setup', label: 'Connect WhatsApp', icon: Smartphone },
    { id: 'inbox', label: 'Inbox', icon: MessageSquare, badge: inboxUnread > 0 ? inboxUnread : undefined },
    { id: 'campaigns', label: 'My Campaigns', icon: Megaphone },
    { id: 'templates', label: 'Templates', icon: FileText },
    { id: 'contacts', label: 'My Contacts', icon: Users },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'reports', label: 'Reports', icon: Activity },
    { id: 'journeys', label: 'Journeys', icon: Zap },
    { id: 'orderguard', label: 'OrderGuard', icon: ShieldAlert },
    { id: 'integrations', label: 'Integrations', icon: Key },
    { id: 'support', label: 'Support', icon: LifeBuoy },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const navItems = isAdmin ? adminNavItems : userNavItems.filter(i => !(i.id === 'setup' && waConnected));

  const handleSignOut = async () => { try { await signOut(); } catch { /* ignore */ } };
  const handleNavigate = (page: string) => { onNavigate(page); setShowMore(false); };

  // Bottom tab bar (mobile): Home · Inbox · Campaigns · Guard · More
  const BOTTOM = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'inbox', label: 'Inbox', icon: MessageSquare },
    { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
    { id: 'orderguard', label: 'Guard', icon: ShieldAlert },
  ].filter(b => navItems.some(n => n.id === b.id));
  const bottomIds = BOTTOM.map(b => b.id);
  const moreItems = navItems.filter(i => !bottomIds.includes(i.id));

  return (
    <div className="rp-light-bg h-[100dvh] flex overflow-hidden" style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      {/* ── Desktop sidebar (light glass) ── */}
      <aside className="hidden lg:flex w-72 flex-col rp-glass-nav border-r border-gray-200/70 h-full">
        <div className="p-5 border-b border-gray-200/70">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="ReachPeak" className="w-10 h-10 rounded-xl object-cover shadow-sm" />
            <h1 className="text-gray-900 font-bold text-lg tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>ReachPeak</h1>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentPage === item.id;
            return (
              <button key={item.id} onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${active ? 'text-white shadow-sm' : 'text-gray-600 hover:bg-gray-900/5'}`}
                style={active ? { background: ACCENT } : undefined}>
                <Icon className="w-5 h-5" />
                <span className="flex-1 text-left">{item.label}</span>
                {'badge' in item && item.badge && (
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${active ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-700'}`}>{item.badge}</span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-gray-200/70">
          <div className="rp-card rounded-xl p-3 mb-2 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0"><UserCircle className="w-5 h-5 text-gray-400" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-gray-900 text-sm font-semibold truncate">{profile?.full_name}</p>
              <p className="text-gray-500 text-xs truncate">{profile?.email}</p>
            </div>
          </div>
          {pushSupported() && (
            <button onClick={togglePush} disabled={pushBusy}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl transition text-sm font-medium mb-2 ${pushOn ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-gray-900/5 text-gray-700 hover:bg-gray-900/10'}`}>
              {pushOn ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              {pushBusy ? 'Please wait…' : pushOn ? 'Alerts on' : 'Enable alerts'}
            </button>
          )}
          <button onClick={handleSignOut} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-900/5 text-gray-700 rounded-xl hover:bg-gray-900/10 transition text-sm font-medium">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 min-w-0 flex flex-col min-h-0">
        {/* Mobile top bar (glass) */}
        <div className="lg:hidden sticky top-0 z-30 rp-glass-nav border-b border-gray-200/70 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logoUrl} alt="" className="w-8 h-8 rounded-lg object-cover" />
            <h1 className="text-gray-900 font-bold text-base tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>ReachPeak</h1>
          </div>
          {pushSupported() && (
            <button onClick={togglePush} disabled={pushBusy} className={pushOn ? 'text-emerald-500' : 'text-gray-400'} title={pushOn ? 'Alerts on' : 'Enable alerts'}>
              {pushOn ? <Bell className="w-6 h-6" /> : <BellOff className="w-6 h-6" />}
            </button>
          )}
        </div>

        <div className={currentPage === 'inbox' ? 'flex-1 min-h-0 overflow-hidden' : 'flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8'}>
          {children}
        </div>

        {/* ── Mobile bottom tab bar (in-flow, pins above content) ── */}
        <nav className="lg:hidden flex-shrink-0 rp-glass-nav border-t border-gray-200/70" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex items-stretch justify-around">
          {BOTTOM.map((b) => {
            const Icon = b.icon;
            const active = currentPage === b.id;
            const badge = b.id === 'inbox' && inboxUnread > 0 ? inboxUnread : undefined;
            return (
              <button key={b.id} onClick={() => handleNavigate(b.id)} className="flex-1 flex flex-col items-center gap-0.5 py-2 relative" style={{ color: active ? ACCENT : '#94a3b8' }}>
                <div className="relative">
                  <Icon className="w-6 h-6" style={{ strokeWidth: active ? 2.4 : 2 }} />
                  {badge && <span className="absolute -top-1 -right-2 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{badge > 9 ? '9+' : badge}</span>}
                </div>
                <span className="text-[11px] font-semibold">{b.label}</span>
              </button>
            );
          })}
          <button onClick={() => setShowMore(true)} className="flex-1 flex flex-col items-center gap-0.5 py-2" style={{ color: showMore ? ACCENT : '#94a3b8' }}>
            <LayoutGrid className="w-6 h-6" />
            <span className="text-[11px] font-semibold">More</span>
          </button>
        </div>
      </nav>
      </main>

      {/* ── "More" sheet (mobile) ── */}
      {showMore && (
        <div className="lg:hidden fixed inset-0 z-50" onClick={() => setShowMore(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute bottom-0 inset-x-0 rp-glass-nav rounded-t-3xl border-t border-gray-200/70 max-h-[80vh] overflow-y-auto" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <h3 className="text-gray-900 font-bold text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>More</h3>
              <button onClick={() => setShowMore(false)} className="text-gray-400 hover:text-gray-700"><X className="w-6 h-6" /></button>
            </div>
            <div className="grid grid-cols-3 gap-2 px-4 pb-3">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const active = currentPage === item.id;
                return (
                  <button key={item.id} onClick={() => handleNavigate(item.id)}
                    className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl rp-card"
                    style={active ? { outline: `2px solid ${ACCENT}` } : undefined}>
                    <Icon className="w-6 h-6" style={{ color: active ? ACCENT : '#475569' }} />
                    <span className="text-[11px] font-medium text-gray-700 text-center leading-tight px-1">{item.label}</span>
                    {'badge' in item && item.badge ? <span className="text-[10px] font-bold text-amber-600">{item.badge}</span> : null}
                  </button>
                );
              })}
            </div>
            <div className="px-4 pb-4 flex gap-2">
              {pushSupported() && (
                <button onClick={togglePush} disabled={pushBusy} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium ${pushOn ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-900/5 text-gray-700'}`}>
                  {pushOn ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />} {pushOn ? 'Alerts on' : 'Enable alerts'}
                </button>
              )}
              <button onClick={handleSignOut} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-900/5 text-gray-700 text-sm font-medium">
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
