import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { UserPlus, Trash2, Shield, User, CheckCircle, XCircle, CreditCard, Eye, X, Image } from 'lucide-react';
import type { Database } from '../lib/database.types';
import type { Subscription } from '../contexts/SubscriptionContext';

type Profile = Database['public']['Tables']['profiles']['Row'];

export function UserManagement() {
  const { isAdmin, user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'subscriptions'>('users');
  const [users, setUsers] = useState<Profile[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState<Subscription | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<Subscription | null>(null);
  const [subFilter, setSubFilter] = useState<'all' | 'pending' | 'active' | 'expired' | 'rejected'>('all');
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '', password: '', full_name: '', role: 'user' as 'admin' | 'user',
  });

  const fetchUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setUsers(data || []);
  };

  const fetchSubs = async () => {
    const { data } = await supabase.from('subscriptions').select('*').order('created_at', { ascending: false });
    const allSubs = (data || []) as Subscription[];
    setSubs(allSubs);
    setPendingCount(allSubs.filter(s => s.status === 'pending').length);
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchUsers(), fetchSubs()]).finally(() => setLoading(false));
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setCreateError(null);
    setCreateSuccess(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to create user');
      setCreateSuccess(`User "${formData.full_name}" created successfully!`);
      setFormData({ email: '', password: '', full_name: '', role: 'user' });
      fetchUsers();
      setTimeout(() => {
        setShowCreateModal(false);
        setCreateSuccess(null);
      }, 1500);
    } catch (err: any) {
      setCreateError(err.message);
    }
  };

  const toggleUserStatus = async (userId: string, current: boolean) => {
    if (!isAdmin) return;
    const { error } = await supabase.from('profiles').update({ is_active: !current }).eq('id', userId);
    if (!error) fetchUsers();
  };

  const deleteUser = async (userId: string) => {
    if (!isAdmin || !confirm('Are you sure you want to delete this user?')) return;
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (!error) fetchUsers();
  };

  const approveSub = async (sub: Subscription) => {
    if (!isAdmin || !currentUser) return;
    const now = new Date();
    const expiresAt = new Date(now);
    if (sub.plan_type === 'yearly') expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    else expiresAt.setMonth(expiresAt.getMonth() + 1);

    const { error } = await supabase.from('subscriptions').update({
      status: 'active',
      approved_by: currentUser.id,
      approved_at: now.toISOString(),
      starts_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    } as any).eq('id', sub.id);

    if (!error) {
      setShowDetailModal(null);
      fetchSubs();
    }
  };

  const rejectSub = async () => {
    if (!isAdmin || !showRejectModal) return;
    const { error } = await supabase.from('subscriptions').update({
      status: 'rejected',
      rejection_reason: rejectReason,
    } as any).eq('id', showRejectModal.id);

    if (!error) {
      setShowRejectModal(null);
      setShowDetailModal(null);
      setRejectReason('');
      fetchSubs();
    }
  };

  const filteredSubs = subFilter === 'all' ? subs : subs.filter(s => s.status === subFilter);

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <Shield className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Access Denied</h2>
        <p className="text-gray-400">You need admin privileges to access this page.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center h-96"><div className="text-gray-400">Loading...</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">User Management</h1>
          <p className="text-gray-400">Manage users and subscription requests</p>
        </div>
        {activeTab === 'users' && (
          <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand-dark transition">
            <UserPlus className="w-4 h-4" /> Create User
          </button>
        )}
      </div>

      <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'users' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
        >
          <User className="w-4 h-4 inline mr-2" />Users
        </button>
        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition relative ${activeTab === 'subscriptions' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
        >
          <CreditCard className="w-4 h-4 inline mr-2" />Subscriptions
          {pendingCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-brand text-white text-xs rounded-full flex items-center justify-center">{pendingCount}</span>
          )}
        </button>
      </div>

      {activeTab === 'users' ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-800 border-b border-gray-700">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-300">User</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-300">Role</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-300">Status</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-300">Created</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-800/50 transition">
                  <td className="px-6 py-4">
                    <p className="text-white font-medium">{u.full_name}</p>
                    <p className="text-gray-400 text-sm">{u.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${u.role === 'admin' ? 'bg-brand/20 text-brand-light' : 'bg-blue-500/20 text-blue-400'}`}>
                      {u.role === 'admin' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}{u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => toggleUserStatus(u.id, u.is_active)} className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${u.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {u.is_active ? <><CheckCircle className="w-3 h-3" />Active</> : <><XCircle className="w-3 h-3" />Inactive</>}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-sm">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => deleteUser(u.id)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20 transition text-sm">
                      <Trash2 className="w-3 h-3" />Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div>
          <div className="flex gap-2 mb-4 flex-wrap">
            {(['all', 'pending', 'active', 'expired', 'rejected'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setSubFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition capitalize ${subFilter === f ? 'bg-brand text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
              >
                {f} {f === 'pending' && pendingCount > 0 && `(${pendingCount})`}
              </button>
            ))}
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-800 border-b border-gray-700">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-300">Business</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-300">Plan</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-300">Amount</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-300">Payment Ref</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-300">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-300">Date</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredSubs.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-800/50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {sub.logo_url ? (
                          <img src={sub.logo_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
                        ) : (
                          <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center"><Image className="w-4 h-4 text-gray-500" /></div>
                        )}
                        <div>
                          <p className="text-white font-medium text-sm">{sub.business_name}</p>
                          <p className="text-gray-400 text-xs">{sub.whatsapp_number}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><span className="text-gray-300 text-sm capitalize">{sub.plan_type}</span></td>
                    <td className="px-6 py-4"><span className="text-gray-300 text-sm">&#8377;{sub.amount.toLocaleString()}</span></td>
                    <td className="px-6 py-4"><span className="text-gray-400 text-xs font-mono">{sub.payment_reference.substring(0, 15)}</span></td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        sub.status === 'active' ? 'bg-green-500/20 text-green-400' :
                        sub.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                        sub.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>{sub.status}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-sm">{new Date(sub.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => setShowDetailModal(sub)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition text-sm">
                        <Eye className="w-3 h-3" />View
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredSubs.length === 0 && (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">No subscriptions found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-white mb-6">Create New User</h2>
            {createError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-red-400 text-sm">{createError}</p>
              </div>
            )}
            {createSuccess && (
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                <p className="text-green-400 text-sm">{createSuccess}</p>
              </div>
            )}
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                <input type="text" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} required className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required minLength={6} className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
                <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as any })} className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand">
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setShowCreateModal(false); setCreateError(null); setCreateSuccess(null); }} className="flex-1 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand-dark transition">Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Subscription Details</h2>
              <button onClick={() => setShowDetailModal(null)} className="p-2 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              {showDetailModal.logo_url && (
                <div className="flex justify-center">
                  <img src={showDetailModal.logo_url} alt="Business Logo" className="w-20 h-20 rounded-xl object-cover border border-gray-700" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                {[
                  ['Business Name', showDetailModal.business_name],
                  ['Business Type', showDetailModal.business_type],
                  ['WhatsApp', showDetailModal.whatsapp_number],
                  ['Plan', `${showDetailModal.plan_type} - Rs.${showDetailModal.amount.toLocaleString()}`],
                  ['Payment Ref', showDetailModal.payment_reference],
                  ['Contact Person', showDetailModal.contact_person],
                  ['Website', showDetailModal.website_url || 'N/A'],
                  ['Status', showDetailModal.status],
                  ['Submitted', new Date(showDetailModal.created_at).toLocaleString()],
                  ...(showDetailModal.starts_at ? [['Active Since', new Date(showDetailModal.starts_at).toLocaleString()]] : []),
                  ...(showDetailModal.expires_at ? [['Expires', new Date(showDetailModal.expires_at).toLocaleString()]] : []),
                ].map(([label, val]) => (
                  <div key={label as string}>
                    <p className="text-gray-400 text-xs mb-1">{label}</p>
                    <p className="text-white text-sm font-medium capitalize">{val}</p>
                  </div>
                ))}
              </div>
              {showDetailModal.business_address && (
                <div>
                  <p className="text-gray-400 text-xs mb-1">Address</p>
                  <p className="text-white text-sm">{showDetailModal.business_address}</p>
                </div>
              )}
              {showDetailModal.rejection_reason && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <p className="text-red-400 text-xs mb-1">Rejection Reason</p>
                  <p className="text-red-300 text-sm">{showDetailModal.rejection_reason}</p>
                </div>
              )}
              {showDetailModal.status === 'pending' && (
                <div className="flex gap-3 pt-4 border-t border-gray-800">
                  <button onClick={() => approveSub(showDetailModal)} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium">
                    <CheckCircle className="w-4 h-4 inline mr-1" />Approve
                  </button>
                  <button onClick={() => { setShowRejectModal(showDetailModal); }} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium">
                    <XCircle className="w-4 h-4 inline mr-1" />Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Rejection Reason</h2>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Enter a reason for rejection..."
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand resize-none mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => { setShowRejectModal(null); setRejectReason(''); }} className="flex-1 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition">Cancel</button>
              <button onClick={rejectSub} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
