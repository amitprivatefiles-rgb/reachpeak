import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Download, Filter, Calendar } from 'lucide-react';

export function Reports() {
  const [reportType, setReportType] = useState<'campaign' | 'contact' | 'failed' | 'agent'>('campaign');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const generateReport = async () => {
    setLoading(true);
    let data: any[] = [];
    let headers: string[] = [];
    let filename = '';

    try {
      switch (reportType) {
        case 'campaign':
          const { data: campaigns } = await supabase
            .from('campaigns')
            .select('*')
            .eq('user_id', user!.id)
            .order('created_at', { ascending: false });
          data = campaigns || [];
          headers = [
            'Name',
            'Type',
            'Status',
            'Total Numbers',
            'Messages Sent',
            'Messages Failed',
            'Delivery %',
            'Failure %',
            'Cost',
            'Revenue',
            'ROI',
            'Created',
          ];
          filename = 'campaign-report';
          break;

        case 'contact':
          const { data: contacts } = await supabase
            .from('contacts')
            .select('*')
            .eq('user_id', user!.id)
            .order('created_at', { ascending: false })
            .limit(10000);
          data = contacts || [];
          headers = [
            'Phone Number',
            'Name',
            'Source',
            'City',
            'State',
            'Lead Type',
            'Status',
            'Delivery Status',
            'Attempts',
            'Blacklisted',
            'Created',
          ];
          filename = 'contact-report';
          break;

        case 'failed':
          const { data: failed } = await supabase
            .from('failed_messages')
            .select('*')
            .eq('user_id', user!.id)
            .order('last_attempt_date', { ascending: false });
          data = failed || [];
          headers = [
            'Phone Number',
            'Failure Reason',
            'Attempt Count',
            'Last Attempt',
            'Status',
            'Created',
          ];
          filename = 'failed-messages-report';
          break;

        case 'agent':
          const { data: agents } = await supabase.from('agents').select('*').eq('user_id', user!.id).order('name');
          data = agents || [];
          headers = [
            'Name',
            'Email',
            'Active',
            'Campaigns Handled',
            'Numbers Processed',
            'Failures',
            'Conversions',
            'Follow Ups',
          ];
          filename = 'agent-performance-report';
          break;
      }

      const csvRows = [headers];

      data.forEach((item) => {
        const row: any[] = [];
        switch (reportType) {
          case 'campaign':
            row.push(
              item.name,
              item.type,
              item.status,
              item.total_numbers,
              item.messages_sent,
              item.messages_failed,
              item.delivery_percentage,
              item.failure_percentage,
              item.campaign_cost,
              item.estimated_revenue,
              item.roi,
              new Date(item.created_at).toLocaleDateString()
            );
            break;
          case 'contact':
            row.push(
              item.phone_number,
              item.name || '',
              item.source,
              item.city || '',
              item.state || '',
              item.lead_type,
              item.message_status,
              item.delivery_status,
              item.attempt_count,
              item.is_blacklisted ? 'Yes' : 'No',
              new Date(item.created_at).toLocaleDateString()
            );
            break;
          case 'failed':
            row.push(
              item.phone_number,
              item.failure_reason || '',
              item.attempt_count,
              new Date(item.last_attempt_date).toLocaleString(),
              item.status,
              new Date(item.created_at).toLocaleDateString()
            );
            break;
          case 'agent':
            row.push(
              item.name,
              item.email,
              item.is_active ? 'Yes' : 'No',
              item.campaigns_handled,
              item.numbers_processed,
              item.failures,
              item.conversions,
              item.follow_ups
            );
            break;
        }
        csvRows.push(row);
      });

      const csv = csvRows.map((row) => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error generating report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Reports</h1>
        <p className="text-gray-400">Generate and download detailed reports</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as any)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="campaign">Campaign Report</option>
              <option value="contact">Contact Report</option>
              <option value="failed">Failed Messages Report</option>
              <option value="agent">Agent Performance Report</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={generateReport}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {loading ? 'Generating...' : 'Download Report'}
            </button>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-white font-semibold mb-4">Report Details</h3>
          <div className="space-y-3">
            {reportType === 'campaign' && (
              <p className="text-gray-300 text-sm">
                Campaign report includes all campaign details, metrics, delivery rates, costs, revenue, and ROI.
              </p>
            )}
            {reportType === 'contact' && (
              <p className="text-gray-300 text-sm">
                Contact report includes all contact information, source, location, lead type, message status, and
                blacklist status. Limited to 10,000 most recent contacts.
              </p>
            )}
            {reportType === 'failed' && (
              <p className="text-gray-300 text-sm">
                Failed messages report includes all failed numbers, failure reasons, attempt counts, and retry
                status.
              </p>
            )}
            {reportType === 'agent' && (
              <p className="text-gray-300 text-sm">
                Agent performance report includes all agent metrics: campaigns handled, numbers processed,
                failures, conversions, and follow-ups.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mb-4">
            <Filter className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-white font-semibold mb-2">Filtered Data</h3>
          <p className="text-gray-400 text-sm">
            Use date filters to generate reports for specific time periods
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="w-12 h-12 bg-emerald-500 rounded-lg flex items-center justify-center mb-4">
            <Download className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-white font-semibold mb-2">CSV Export</h3>
          <p className="text-gray-400 text-sm">All reports are exported in CSV format for easy analysis</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="w-12 h-12 bg-violet-500 rounded-lg flex items-center justify-center mb-4">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-white font-semibold mb-2">Real-time Data</h3>
          <p className="text-gray-400 text-sm">Reports are generated from live database data</p>
        </div>
      </div>
    </div>
  );
}
