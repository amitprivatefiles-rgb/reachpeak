import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { WhatsAppSettings } from './WhatsAppSettings';
import { 
  Activity, Database, Shield, User, Key, Bell, CreditCard, 
  Trash2, Download, Save, Eye, EyeOff, AlertTriangle, Check, X 
} from 'lucide-react';

export function Settings() {
  const { profile, isAdmin, user } = useAuth();
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'whatsapp' | 'notifications' | 'account' | 'activity'>('profile');

  // Profile editing
  const [editName, setEditName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Notification prefs
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [inAppNotifications, setInAppNotifications] = useState(true);

  // Subscription
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    if (profile) {
      setEditName(profile.full_name);
      setEmailNotifications((profile as any).notification_email !== false);
      setInAppNotifications((profile as any).notification_in_app !== false);
    }
    fetchActivityLogs();
    fetchSubscription();
  }, [profile]);

  const fetchActivityLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('activity_logs')
      .select('*, profiles(full_name)')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setActivityLogs(data || []);
    setLoading(false);
  };

  const fetchSubscription = async () => {
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setSubscription(data);
  };

  const showMsg = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const saveProfile = async () => {
    if (!editName.trim()) { showMsg('Name cannot be empty', 'error'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({ full_name: editName.trim() }).eq('id', user!.id);
      if (error) throw error;
      showMsg('Profile updated!', 'success');
    } catch (err: any) { showMsg('Error: ' + err.message, 'error'); }
    finally { setSaving(false); }
  };

  const changePassword = async () => {
    if (newPassword !== confirmPassword) { showMsg('Passwords do not match', 'error'); return; }
    if (newPassword.length < 8) { showMsg('Password must be at least 8 characters', 'error'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      showMsg('Password changed successfully!', 'success');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) { showMsg('Error: ' + err.message, 'error'); }
    finally { setSaving(false); }
  };

  const saveNotificationPrefs = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({
        notification_email: emailNotifications,
        notification_in_app: inAppNotifications,
      } as any).eq('id', user!.id);
      if (error) throw error;
      showMsg('Notification preferences saved!', 'success');
    } catch (err: any) { showMsg('Error: ' + err.message, 'error'); }
    finally { setSaving(false); }
  };

  const exportAllData = async () => {
    try {
      const [contacts, campaigns, logs] = await Promise.all([
        supabase.from('contacts').select('*').eq('user_id', user!.id),
        supabase.from('campaigns').select('*').eq('user_id', user!.id),
        supabase.from('activity_logs').select('*').eq('user_id', user!.id),
      ]);

      const data = {
        exported_at: new Date().toISOString(),
        contacts: contacts.data || [],
        campaigns: campaigns.data || [],
        activity_logs: logs.data || [],
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `reachpeak-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      showMsg('Data exported!', 'success');
    } catch (err: any) { showMsg('Error: ' + err.message, 'error'); }
  };

  const clearActivityLogs = async () => {
    if (!confirm('Clear all activity logs? This cannot be undone.')) return;
    try {
      await supabase.from('activity_logs').delete().eq('user_id', user!.id);
      fetchActivityLogs();
      showMsg('Activity logs cleared!', 'success');
    } catch (err: any) { showMsg('Error: ' + err.message, 'error'); }
  };

  const tabs = [
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'whatsapp', label: 'WhatsApp', icon: Key },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'account', label: 'Account', icon: CreditCard },
    { key: 'activity', label: 'Activity', icon: Activity },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-gray-400">Manage your account and preferences</p>
      </div>

      {/* Status message */}
      {message && (
        <div className={`px-4 py-3 rounded-lg flex items-center gap-2 text-sm font-medium ${
          message.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
          {message.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex bg-gray-900 border border-gray-800 rounded-xl p-1 gap-1 overflow-x-auto">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
              activeTab === key ? 'bg-emerald-500 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* ====== PROFILE TAB ====== */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Edit Profile */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-white font-semibold text-lg">Edit Profile</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Full Name</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                <input type="email" value={profile?.email || ''} disabled
                  className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-500 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Role</label>
                <span className={`inline-block px-3 py-1.5 rounded-lg text-sm font-medium ${
                  isAdmin ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                  {profile?.role}
                </span>
              </div>
              <button onClick={saveProfile} disabled={saving}
                className="w-full px-4 py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>

          {/* Change Password */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-violet-500 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-white font-semibold text-lg">Change Password</h3>
            </div>
            <div className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-300 mb-1">New Password</label>
                <input type={showPassword ? 'text' : 'password'} value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 8 characters"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white pr-10 focus:outline-none focus:ring-2 focus:ring-violet-500" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-8 text-gray-400 hover:text-white">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Confirm Password</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <button onClick={changePassword} disabled={saving || !newPassword}
                className="w-full px-4 py-2.5 bg-violet-500 text-white rounded-lg hover:bg-violet-600 transition font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                <Shield className="w-4 h-4" /> {saving ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== WHATSAPP TAB ====== */}
      {activeTab === 'whatsapp' && <WhatsAppSettings />}

      {/* ====== NOTIFICATIONS TAB ====== */}
      {activeTab === 'notifications' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg">Notification Preferences</h3>
              <p className="text-gray-400 text-sm">Control how you receive notifications</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700">
              <div>
                <p className="text-white font-medium">Email Notifications</p>
                <p className="text-gray-400 text-sm">Receive campaign updates, approvals, and alerts via email</p>
              </div>
              <button onClick={() => setEmailNotifications(!emailNotifications)}
                className={`relative w-12 h-6 rounded-full transition ${emailNotifications ? 'bg-emerald-500' : 'bg-gray-600'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${emailNotifications ? 'translate-x-6' : ''}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700">
              <div>
                <p className="text-white font-medium">In-App Notifications</p>
                <p className="text-gray-400 text-sm">Show notification badges and toast messages in the dashboard</p>
              </div>
              <button onClick={() => setInAppNotifications(!inAppNotifications)}
                className={`relative w-12 h-6 rounded-full transition ${inAppNotifications ? 'bg-emerald-500' : 'bg-gray-600'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${inAppNotifications ? 'translate-x-6' : ''}`} />
              </button>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mt-4">
              <p className="text-blue-400 text-sm">
                You'll receive notifications for: Campaign approvals & rejections, Campaign completion, 
                New feature updates, and account-related alerts.
              </p>
            </div>

            <button onClick={saveNotificationPrefs} disabled={saving}
              className="px-6 py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-medium disabled:opacity-50 flex items-center gap-2">
              <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </div>
      )}

      {/* ====== ACCOUNT TAB ====== */}
      {activeTab === 'account' && (
        <div className="space-y-6">
          {/* Subscription info */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-white font-semibold text-lg">Subscription</h3>
            </div>
            {subscription ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <p className="text-gray-400 text-xs mb-1">Plan</p>
                  <p className="text-white font-semibold capitalize">{subscription.plan_type}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <p className="text-gray-400 text-xs mb-1">Status</p>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    subscription.status === 'active' ? 'bg-green-500/20 text-green-400' :
                    subscription.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-red-500/20 text-red-400'}`}>
                    {subscription.status}
                  </span>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <p className="text-gray-400 text-xs mb-1">Business</p>
                  <p className="text-white font-semibold">{subscription.business_name}</p>
                </div>
                {subscription.expires_at && (
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <p className="text-gray-400 text-xs mb-1">Expires</p>
                    <p className="text-white font-semibold">{new Date(subscription.expires_at).toLocaleDateString()}</p>
                  </div>
                )}
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <p className="text-gray-400 text-xs mb-1">Amount</p>
                  <p className="text-white font-semibold">₹{subscription.amount?.toLocaleString()}</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-400">No active subscription found.</p>
            )}
          </div>

          {/* Data Management */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-cyan-500 rounded-lg flex items-center justify-center">
                <Database className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-white font-semibold text-lg">Data Management</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={exportAllData}
                className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition font-medium text-sm border border-cyan-500/30">
                <Download className="w-4 h-4" /> Export All Data
              </button>
              <button onClick={clearActivityLogs}
                className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 transition font-medium text-sm border border-amber-500/30">
                <Trash2 className="w-4 h-4" /> Clear Activity Logs
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-gray-900 border border-red-900/50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-red-400 font-semibold text-lg">Danger Zone</h3>
                <p className="text-gray-500 text-sm">Irreversible actions</p>
              </div>
            </div>
            <button onClick={() => {
              if (confirm('Are you sure you want to delete your account? This action is permanent and cannot be undone.')) {
                alert('Please contact support at admin@reachpeak.in to delete your account.');
              }
            }}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition font-medium text-sm border border-red-500/30">
              <Trash2 className="w-4 h-4" /> Delete Account
            </button>
          </div>
        </div>
      )}

      {/* ====== ACTIVITY TAB ====== */}
      {activeTab === 'activity' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl">
          <div className="p-6 border-b border-gray-800">
            <h2 className="text-xl font-semibold text-white">Recent Activity Logs</h2>
            <p className="text-gray-400 text-sm mt-1">Track all your actions and changes</p>
          </div>
          <div className="divide-y divide-gray-800 max-h-96 overflow-y-auto">
            {activityLogs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-gray-800/50 transition">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{log.action}</p>
                    <p className="text-gray-400 text-xs mt-1">
                      {log.entity_type} {log.entity_id && `· ID: ${log.entity_id.slice(0, 8)}`}
                    </p>
                    {log.details && (
                      <p className="text-gray-500 text-xs mt-1">{JSON.stringify(log.details).slice(0, 100)}</p>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-gray-400 text-xs">{new Date(log.created_at).toLocaleString()}</p>
                    {log.profiles && <p className="text-gray-500 text-xs mt-1">{log.profiles.full_name}</p>}
                  </div>
                </div>
              </div>
            ))}
            {activityLogs.length === 0 && (
              <div className="p-12 text-center"><p className="text-gray-400">No activity logs found</p></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
