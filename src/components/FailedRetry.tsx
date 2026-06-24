import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, RefreshCw, Ban, CheckCircle } from 'lucide-react';

interface FailedMessage {
  id: string;
  wa_to: string;
  error_message: string | null;
  status: string;
  failed_at: string | null;
  created_at: string;
  contact_id: string | null;
  campaign_id: string | null;
}

export function FailedRetry() {
  const { isAdmin, user } = useAuth();
  const [failedMessages, setFailedMessages] = useState<FailedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    retryPending: 0,
    retried: 0,
    blacklisted: 0,
    successRate: 0,
  });

  const fetchData = async () => {
    setLoading(true);

    // Fetch failed outbound messages
    const { data } = await supabase
      .from('messages')
      .select('id, wa_to, error_message, status, failed_at, created_at, contact_id, campaign_id')
      .eq('user_id', user!.id)
      .eq('direction', 'outbound')
      .in('status', ['failed', 'queued'])
      .order('created_at', { ascending: false });

    // Also check which contacts are blacklisted
    const { data: blacklistedContacts } = await supabase
      .from('contacts')
      .select('id')
      .eq('user_id', user!.id)
      .eq('is_blacklisted', true);

    const blacklistedIds = new Set((blacklistedContacts || []).map((c: any) => c.id));

    const allMessages = (data || []) as FailedMessage[];
    setFailedMessages(allMessages);

    const failed = allMessages.filter((m) => m.status === 'failed' && !blacklistedIds.has(m.contact_id || '')).length;
    const retried = allMessages.filter((m) => m.status === 'queued').length;
    const blacklisted = allMessages.filter((m) => blacklistedIds.has(m.contact_id || '')).length;
    const total = allMessages.length || 1;

    setStats({
      retryPending: failed,
      retried,
      blacklisted,
      successRate: (retried / total) * 100,
    });

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const retryMessage = async (messageId: string) => {
    if (!isAdmin) return;

    // Set the message status back to 'queued' so the worker retries it
    await supabase
      .from('messages')
      .update({ status: 'queued', error_message: null, error_code: null, failed_at: null })
      .eq('id', messageId);

    alert('Message re-queued for retry');
    fetchData();
  };

  const blacklistContact = async (message: FailedMessage) => {
    if (!isAdmin) return;

    if (message.contact_id) {
      await supabase
        .from('contacts')
        .update({ is_blacklisted: true })
        .eq('id', message.contact_id);

      alert('Contact has been blacklisted.');
    } else {
      alert('No contact linked to this message.');
    }

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
            <h3 className="text-gray-400 text-sm font-medium">Failed</h3>
          </div>
          <p className="text-white text-3xl font-bold">{stats.retryPending}</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-gray-400 text-sm font-medium">Retried (Re-queued)</h3>
          </div>
          <p className="text-white text-3xl font-bold">{stats.retried}</p>
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
            <h3 className="text-gray-400 text-sm font-medium">Retry Rate</h3>
          </div>
          <p className="text-white text-3xl font-bold">{stats.successRate.toFixed(1)}%</p>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-800 border-b border-gray-700">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-300">Phone Number</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-300">Error Message</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-300">Failed At</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-300">Status</th>
              {isAdmin && (
                <th className="text-right px-6 py-4 text-sm font-medium text-gray-300">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {failedMessages.map((message) => (
              <tr key={message.id} className="hover:bg-gray-800/50 transition">
                <td className="px-6 py-4 text-white font-mono">{message.wa_to}</td>
                <td className="px-6 py-4 text-gray-300">{message.error_message || 'Unknown'}</td>
                <td className="px-6 py-4 text-gray-400 text-sm">
                  {message.failed_at ? new Date(message.failed_at).toLocaleString() : 'N/A'}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      message.status === 'failed'
                        ? 'bg-red-500/20 text-red-400'
                        : message.status === 'queued'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}
                  >
                    {message.status === 'queued' ? 'Retrying' : message.status}
                  </span>
                </td>
                {isAdmin && (
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {message.status === 'failed' && (
                        <>
                          <button
                            onClick={() => retryMessage(message.id)}
                            className="px-3 py-1.5 bg-amber-500/10 text-amber-400 rounded hover:bg-amber-500/20 transition text-sm"
                          >
                            Retry
                          </button>
                          <button
                            onClick={() => blacklistContact(message)}
                            className="px-3 py-1.5 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20 transition text-sm"
                          >
                            Blacklist
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
