import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CircleUser as UserCircle, Plus, BarChart2, CreditCard as Edit2 } from 'lucide-react';
import type { Database } from '../lib/database.types';

type Agent = Database['public']['Tables']['agents']['Row'];

export function Agents() {
  const { isAdmin, user } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    campaigns_handled: 0,
    numbers_processed: 0,
    failures: 0,
    conversions: 0,
    follow_ups: 0,
  });

  const fetchAgents = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('agents')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
    setAgents(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    if (editingAgent) {
      const { error } = await supabase
        .from('agents')
        .update(formData)
        .eq('id', editingAgent.id);

      if (!error) {
        setShowModal(false);
        setEditingAgent(null);
        setFormData({ name: '', email: '', campaigns_handled: 0, numbers_processed: 0, failures: 0, conversions: 0, follow_ups: 0 });
        fetchAgents();
      }
    } else {
      const { error } = await supabase.from('agents').insert({
        name: formData.name,
        email: formData.email,
        user_id: user!.id,
      });

      if (!error) {
        setShowModal(false);
        setFormData({ name: '', email: '', campaigns_handled: 0, numbers_processed: 0, failures: 0, conversions: 0, follow_ups: 0 });
        fetchAgents();
      }
    }
  };

  const handleEditAgent = (agent: Agent) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.name,
      email: agent.email,
      campaigns_handled: agent.campaigns_handled,
      numbers_processed: agent.numbers_processed,
      failures: agent.failures,
      conversions: agent.conversions,
      follow_ups: agent.follow_ups,
    });
    setShowModal(true);
  };

  const toggleStatus = async (agentId: string, currentStatus: boolean) => {
    if (!isAdmin) return;

    await supabase
      .from('agents')
      .update({ is_active: !currentStatus })
      .eq('id', agentId);

    fetchAgents();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-400">Loading agents...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Agents</h1>
          <p className="text-gray-400">Manage campaign agents and their performance</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              setEditingAgent(null);
              setFormData({ name: '', email: '', campaigns_handled: 0, numbers_processed: 0, failures: 0, conversions: 0, follow_ups: 0 });
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition"
          >
            <Plus className="w-4 h-4" />
            Add Agent
          </button>
        )}
      </div>

      <div className="grid gap-4">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-violet-500 rounded-full flex items-center justify-center">
                  <UserCircle className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">{agent.name}</h3>
                  <p className="text-gray-400 text-sm">{agent.email}</p>
                  <button
                    onClick={() => toggleStatus(agent.id, agent.is_active)}
                    disabled={!isAdmin}
                    className={`mt-2 px-2 py-1 rounded text-xs font-medium ${
                      agent.is_active
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {agent.is_active ? 'Active' : 'Inactive'}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {isAdmin && (
                  <button
                    onClick={() => handleEditAgent(agent)}
                    className="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition"
                    title="Edit agent"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
                <div className="flex items-center gap-2 text-gray-400">
                  <BarChart2 className="w-5 h-5" />
                  <span className="text-sm">Performance</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-gray-400 text-xs mb-1">Campaigns Handled</p>
                <p className="text-white text-2xl font-semibold">{agent.campaigns_handled}</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-gray-400 text-xs mb-1">Numbers Processed</p>
                <p className="text-white text-2xl font-semibold">{agent.numbers_processed.toLocaleString()}</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-gray-400 text-xs mb-1">Failures</p>
                <p className="text-red-400 text-2xl font-semibold">{agent.failures}</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-gray-400 text-xs mb-1">Conversions</p>
                <p className="text-green-400 text-2xl font-semibold">{agent.conversions}</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-gray-400 text-xs mb-1">Follow Ups</p>
                <p className="text-blue-400 text-2xl font-semibold">{agent.follow_ups}</p>
              </div>
            </div>
          </div>
        ))}

        {agents.length === 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <p className="text-gray-400">No agents added yet</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingAgent ? 'Edit Agent' : 'Add New Agent'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {editingAgent && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Campaigns Handled</label>
                      <input
                        type="number"
                        value={formData.campaigns_handled}
                        onChange={(e) => setFormData({ ...formData, campaigns_handled: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Numbers Processed</label>
                      <input
                        type="number"
                        value={formData.numbers_processed}
                        onChange={(e) => setFormData({ ...formData, numbers_processed: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Failures</label>
                      <input
                        type="number"
                        value={formData.failures}
                        onChange={(e) => setFormData({ ...formData, failures: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Conversions</label>
                      <input
                        type="number"
                        value={formData.conversions}
                        onChange={(e) => setFormData({ ...formData, conversions: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Follow Ups</label>
                      <input
                        type="number"
                        value={formData.follow_ups}
                        onChange={(e) => setFormData({ ...formData, follow_ups: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingAgent(null);
                    setFormData({ name: '', email: '', campaigns_handled: 0, numbers_processed: 0, failures: 0, conversions: 0, follow_ups: 0 });
                  }}
                  className="flex-1 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                >
                  {editingAgent ? 'Save Changes' : 'Add Agent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
