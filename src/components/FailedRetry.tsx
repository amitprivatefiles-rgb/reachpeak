import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, RefreshCw, Ban, CheckCircle } from 'lucide-react';
import type { Database } from '../lib/database.types';

type FailedMessage = Database['public']['Tables']['failed_messages']['Row'];

export function FailedRetry() {
  const { isAdmin, user } = useAuth();
  const [failedMessages, setFailedMessages] = useState<FailedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    retryPending: 0,
    completed: 0,
    blacklisted: 0,
    successRate: 0,
  });

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('failed_messages')
      .select('*')
      .eq('user_id', user!.id)
      .order('last_attempt_date', { ascending: false });

    setFailedMessages(data || []);

    const pending = data?.filter((m) => m.status === 'Retry Pending').length || 0;
    const completed = data?.filter((m) => m.status === 'Completed').length || 0;
    const blacklisted = data?.filter((m) => m.status === 'Blacklisted').length || 0;
    const total = data?.length || 1;

    setStats({
      retryPending: pending,
      completed,
      blacklisted,
      successRate: (completed / total) * 100,
    });

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const retryMessage = async (messageId: string) => {
    if (!isAdmin) return;

    const message = failedMessages.find((m) => m.id === messageId);
    if (!message) return;

    if (message.attempt_count >= 3) {
      await supabase
        .from('failed_messages')
        .update({ status: 'Blacklisted' })
        .eq('id', messageId);

      if (message.contact_id) {
        await supabase
          .from('contacts')
          .update({ is_blacklisted: true })
          .eq('id', message.contact_id);
      }

      alert('Maximum retry attempts reached. Number has been blacklisted.');
    } else {
      await supabase
        .from('failed_messages')
        .update({
          attempt_count: message.attempt_count + 1,
          last_attempt_date: new Date().toISOString(),
        })
        .eq('id', messageId);

      alert('Retry scheduled');
    }

    fetchData();
  };

  const markCompleted = async (messageId: string) => {
    if (!isAdmin) return;

    await supabase.from('failed_messages').update({ status: 'Completed' }).eq('id', messageId);

    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-400">Loading failed messages...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Failed & Retry Management</h1>
        <p className="text-gray-400">Track and retry failed messages</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-gray-400 text-sm font-medium">Retry Pending</h3>
          </div>
          <p className="text-white text-3xl font-bold">{stats.retryPending}</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-gray-400 text-sm font-medium">Completed</h3>
          </div>
          <p className="text-white text-3xl font-bold">{stats.completed}</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
              <Ban className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-gray-400 text-sm font-medium">Blacklisted</h3>
          </div>
          <p className="text-white text-3xl font-bold">{stats.blacklisted}</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-gray-400 text-sm font-medium">Success Rate</h3>
          </div>
          <p className="text-white text-3xl font-bold">{stats.successRate.toFixed(1)}%</p>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-800 border-b border-gray-700">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-300">Phone Number</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-300">Failure Reason</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-300">Attempts</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-300">Last Attempt</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-300">Status</th>
              {isAdmin && (
                <th className="text-right px-6 py-4 text-sm font-medium text-gray-300">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {failedMessages.map((message) => (
              <tr key={message.id} className="hover:bg-gray-800/50 transition">
                <td className="px-6 py-4 text-white font-mono">{message.phone_number}</td>
                <td className="px-6 py-4 text-gray-300">{message.failure_reason || 'Unknown'}</td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      message.attempt_count >= 3
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    {message.attempt_count} / 3
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-400 text-sm">
                  {new Date(message.last_attempt_date).toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      message.status === 'Retry Pending'
                        ? 'bg-amber-500/20 text-amber-400'
                        : message.status === 'Completed'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {message.status}
                  </span>
                </td>
                {isAdmin && (
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {message.status === 'Retry Pending' && (
                        <>
                          <button
                            onClick={() => retryMessage(message.id)}
                            className="px-3 py-1.5 bg-amber-500/10 text-amber-400 rounded hover:bg-amber-500/20 transition text-sm"
                          >
                            Retry
                          </button>
                          <button
                            onClick={() => markCompleted(message.id)}
                            className="px-3 py-1.5 bg-green-500/10 text-green-400 rounded hover:bg-green-500/20 transition text-sm"
                          >
                            Mark Complete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {failedMessages.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-gray-400">No failed messages</p>
          </div>
        )}
      </div>
    </div>
  );
}
