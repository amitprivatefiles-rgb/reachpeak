import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import type { Database } from '../lib/database.types';
import { useAuth } from '../contexts/AuthContext';

type LeadSource = Database['public']['Tables']['lead_sources']['Row'];

export function LeadSources() {
  const { user } = useAuth();
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSources = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('lead_sources')
      .select('*')
      .eq('user_id', user!.id)
      .order('total_numbers', { ascending: false });
    setSources(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchSources();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-400">Loading lead sources...</div>
      </div>
    );
  }

  const totalNumbers = sources.reduce((sum, s) => sum + s.total_numbers, 0);
  const totalSent = sources.reduce((sum, s) => sum + s.messages_sent, 0);
  const totalFailed = sources.reduce((sum, s) => sum + s.messages_failed, 0);
  const totalConverted = sources.reduce((sum, s) => sum + s.converted_leads, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Lead Sources</h1>
        <p className="text-gray-400">Track performance by lead source</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-gray-400 text-sm font-medium mb-2">Total Numbers</h3>
          <p className="text-white text-3xl font-bold">{totalNumbers.toLocaleString()}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-gray-400 text-sm font-medium mb-2">Messages Sent</h3>
          <p className="text-white text-3xl font-bold">{totalSent.toLocaleString()}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-gray-400 text-sm font-medium mb-2">Messages Failed</h3>
          <p className="text-white text-3xl font-bold">{totalFailed.toLocaleString()}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-gray-400 text-sm font-medium mb-2">Converted Leads</h3>
          <p className="text-white text-3xl font-bold">{totalConverted.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid gap-4">
        {sources.map((source) => {
          const conversionRate =
            source.total_numbers > 0 ? (source.converted_leads / source.total_numbers) * 100 : 0;
          const failureRate =
            source.messages_sent > 0 ? (source.messages_failed / source.messages_sent) * 100 : 0;

          return (
            <div
              key={source.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">{source.source_name}</h3>
                    <p className="text-gray-400 text-sm">{source.total_numbers.toLocaleString()} contacts</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="text-right">
                    <p className="text-gray-400 text-xs mb-1">Conversion Rate</p>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-4 h-4 text-green-400" />
                      <span className="text-green-400 font-semibold">{conversionRate.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400 text-xs mb-1">Failure Rate</p>
                    <div className="flex items-center gap-1">
                      <TrendingDown className="w-4 h-4 text-red-400" />
                      <span className="text-red-400 font-semibold">{failureRate.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-gray-400 text-xs mb-1">Messages Sent</p>
                  <p className="text-white text-lg font-semibold">{source.messages_sent.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs mb-1">Failed</p>
                  <p className="text-white text-lg font-semibold">{source.messages_failed.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs mb-1">Converted</p>
                  <p className="text-white text-lg font-semibold">{source.converted_leads.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs mb-1">Remaining</p>
                  <p className="text-white text-lg font-semibold">
                    {(source.total_numbers - source.messages_sent).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
