import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { Users, Upload, Send, AlertCircle, Play, CheckCircle, TrendingUp, TrendingDown, Ban, UserCheck, Clock, RefreshCw, CreditCard as Edit2, Save, X, Calendar, CreditCard, Megaphone } from 'lucide-react';

interface DashboardMetrics {
  total_contacts: number;
  unassigned_contacts: number;
  total_numbers_uploaded: number;
  total_messages_sent: number;
  total_messages_failed: number;
  messages_pending_retry: number;
  active_campaigns: number;
  completed_campaigns: number;
  delivery_rate: number;
  failure_rate: number;
  blacklisted_numbers: number;
  active_agents: number;
  last_upload_time: string | null;
}

interface Campaign {
  id: string;
  name: string;
  type: string;
  start_time: string | null;
  end_time: string | null;
  status: string;
  messages_sent: number;
  messages_failed: number;
  total_numbers: number;
  pending_retry: number;
  delivery_percentage: number;
  failure_percentage: number;
  priority: number;
  message_version: string;
  campaign_cost: number;
  estimated_revenue: number;
  roi: number;
  is_locked: boolean;
  daily_limit: number;
  created_at: string;
}

export function Dashboard() {
  const { isAdmin, user } = useAuth();
  const { subscription } = useSubscription();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [allCampaigns, setAllCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCampaign, setEditingCampaign] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ messages_sent: number; messages_failed: number }>({ messages_sent: 0, messages_failed: 0 });
  const [_editingMetrics, _setEditingMetrics] = useState(false);
  const [_metricsEditValues, _setMetricsEditValues] = useState<Partial<DashboardMetrics>>({});
  const [pendingApprovals, setPendingApprovals] = useState(0);

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let metricsQuery = supabase
        .from('dashboard_metrics')
        .select('*')
        .eq('user_id', user!.id);

      if (startDate) {
        metricsQuery = metricsQuery.gte('metric_date', startDate);
      }
      if (endDate) {
        metricsQuery = metricsQuery.lte('metric_date', endDate);
      }

      const { data: metricsData } = await metricsQuery;

      const { count: totalContactsCount } = await supabase
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user!.id);

      const { count: unassignedContactsCount } = await supabase
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .is('campaign_id', null);

      const { count: activeCampaignsCount } = await supabase
        .from('campaigns')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .eq('status', 'Running');

      const { count: completedCampaignsCount } = await supabase
        .from('campaigns')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .eq('status', 'Completed');

      const { count: blacklistedCount } = await supabase
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .eq('is_blacklisted', true);

      const { count: activeAgentsCount } = await supabase
        .from('agents')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .eq('is_active', true);

      const { data: allCampaignsData } = await supabase
        .from('campaigns')
        .select('messages_sent, messages_failed')
        .eq('user_id', user!.id);

      const totalPendingRetry = allCampaignsData?.reduce((sum, campaign) => sum + (campaign.messages_failed || 0), 0) || 0;
      const totalMessagesSent = allCampaignsData?.reduce((sum, campaign) => sum + (campaign.messages_sent || 0), 0) || 0;
      const totalMessagesFailed = allCampaignsData?.reduce((sum, campaign) => sum + (campaign.messages_failed || 0), 0) || 0;

      const totalContactsValue = totalContactsCount || 0;

      const latestMetric = metricsData && metricsData.length > 0
        ? metricsData.sort((a, b) => new Date(b.metric_date).getTime() - new Date(a.metric_date).getTime())[0]
        : null;

      const totalNumbersUploaded = latestMetric?.total_numbers_uploaded || 0;
      const lastUploadTime = latestMetric?.last_upload_time || null;
      const totalSent = totalMessagesSent + totalMessagesFailed;
      const calculatedDeliveryRate = totalSent > 0 ? (totalMessagesSent / totalSent) * 100 : 0;
      const calculatedFailureRate = totalSent > 0 ? (totalMessagesFailed / totalSent) * 100 : 0;

      setMetrics({
        total_contacts: totalContactsValue,
        unassigned_contacts: unassignedContactsCount || 0,
        total_numbers_uploaded: totalNumbersUploaded,
        total_messages_sent: totalMessagesSent,
        total_messages_failed: totalMessagesFailed,
        messages_pending_retry: totalPendingRetry,
        active_campaigns: activeCampaignsCount || 0,
        completed_campaigns: completedCampaignsCount || 0,
        delivery_rate: calculatedDeliveryRate,
        failure_rate: calculatedFailureRate,
        blacklisted_numbers: blacklistedCount || 0,
        active_agents: activeAgentsCount || 0,
        last_upload_time: lastUploadTime,
      });

      // Fetch pending approvals count for admin
      if (isAdmin) {
        const { count: pendingCount } = await supabase
          .from('campaigns')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending_approval');
        setPendingApprovals(pendingCount || 0);
      }

      let campaignsQuery = supabase
        .from('campaigns')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (startDate) {
        campaignsQuery = campaignsQuery.gte('created_at', startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        campaignsQuery = campaignsQuery.lte('created_at', endDateTime.toISOString());
      }

      const { data: campaignsData } = await campaignsQuery;

      setCampaigns(campaignsData || []);
      setAllCampaigns(campaignsData || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const contactsChannel = supabase
      .channel('dashboard-contacts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contacts',
          filter: `user_id=eq.${user!.id}`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    const campaignsChannel = supabase
      .channel('dashboard-campaigns')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'campaigns',
          filter: `user_id=eq.${user!.id}`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    const metricsChannel = supabase
      .channel('dashboard-metrics')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dashboard_metrics',
          filter: `user_id=eq.${user!.id}`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(contactsChannel);
      supabase.removeChannel(campaignsChannel);
      supabase.removeChannel(metricsChannel);
    };
  }, [startDate, endDate]);

  const startEditing = (campaign: Campaign) => {
    setEditingCampaign(campaign.id);
    setEditValues({
      messages_sent: campaign.messages_sent,
      messages_failed: campaign.messages_failed,
    });
  };

  const cancelEditing = () => {
    setEditingCampaign(null);
    setEditValues({ messages_sent: 0, messages_failed: 0 });
  };

  const saveCampaignMetrics = async (campaignId: string) => {
    if (!isAdmin) return;

    try {
      const { error } = await supabase
        .from('campaigns')
        .update({
          messages_sent: editValues.messages_sent,
          messages_failed: editValues.messages_failed,
        })
        .eq('id', campaignId);

      if (error) throw error;

      setEditingCampaign(null);
      fetchData();
    } catch (error: any) {
      alert('Error updating campaign: ' + error.message);
    }
  };

  const clearDateFilters = () => {
    setStartDate('');
    setEndDate(new Date().toISOString().split('T')[0]);
  };

  const MetricCard = ({
    title,
    value,
    icon: Icon,
    color,
    subtitle,
  }: {
    title: string;
    value: string | number;
    icon: any;
    color: string;
    subtitle?: string;
  }) => (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6 hover:border-gray-700 transition">
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div className={`w-10 h-10 sm:w-12 sm:h-12 ${color} rounded-lg flex items-center justify-center`}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
      </div>
      <h3 className="text-gray-400 text-xs sm:text-sm font-medium mb-1">{title}</h3>
      <p className="text-white text-2xl sm:text-3xl font-bold">{value}</p>
      {subtitle && <p className="text-gray-500 text-xs mt-2">{subtitle}</p>}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-400">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {subscription && subscription.status === 'active' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand/20 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-brand" />
            </div>
            <div>
              <p className="text-white text-sm font-medium">
                Current Plan: <span className="capitalize text-brand">{subscription.plan_type}</span>
              </p>
              <p className="text-gray-400 text-xs">
                {subscription.expires_at
                  ? `Expires: ${new Date(subscription.expires_at).toLocaleDateString()}`
                  : 'Active'}
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-full self-start sm:self-auto">Active</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-gray-400 text-sm sm:text-base">Welcome back! Here's your campaign overview</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition w-full sm:w-auto"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-white">Date Range Filter</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={clearDateFilters}
              className="w-full px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition"
            >
              Clear Filters
            </button>
          </div>
        </div>
        <p className="text-gray-400 text-xs mt-3">
          {startDate && endDate
            ? `Showing data from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`
            : endDate
            ? `Showing all data up to ${new Date(endDate).toLocaleDateString()}`
            : 'Showing all lifetime data'}
        </p>
      </div>

      {isAdmin && pendingApprovals > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-white text-sm font-medium">
                {pendingApprovals} campaign{pendingApprovals > 1 ? 's' : ''} pending approval
              </p>
              <p className="text-amber-400/70 text-xs">Check Campaign Approvals in the sidebar</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-amber-500/20 text-amber-400 text-sm font-medium rounded-full">
            {pendingApprovals}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <MetricCard
          title="Total Contacts"
          value={metrics?.total_contacts.toLocaleString() || 0}
          icon={Users}
          color="bg-blue-500"
        />
        <MetricCard
          title="Unassigned Contacts"
          value={metrics?.unassigned_contacts.toLocaleString() || 0}
          icon={Users}
          color="bg-amber-500"
          subtitle="Ready to assign to campaigns"
        />
        <MetricCard
          title="Total Numbers Uploaded"
          value={metrics?.total_numbers_uploaded.toLocaleString() || 0}
          icon={Upload}
          color="bg-emerald-500"
        />
        <MetricCard
          title="Total Messages Sent"
          value={metrics?.total_messages_sent.toLocaleString() || 0}
          icon={Send}
          color="bg-cyan-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <MetricCard
          title="Total Messages Failed"
          value={metrics?.total_messages_failed.toLocaleString() || 0}
          icon={AlertCircle}
          color="bg-red-500"
          subtitle="Due to Meta API limits - Retrying every 30 minutes"
        />
        <MetricCard
          title="Messages Pending Retry"
          value={metrics?.messages_pending_retry.toLocaleString() || 0}
          icon={Clock}
          color="bg-amber-500"
          subtitle="Will be retried automatically"
        />
        <MetricCard
          title="Active Campaigns"
          value={metrics?.active_campaigns || 0}
          icon={Play}
          color="bg-emerald-500"
        />
        <MetricCard
          title="Completed Campaigns"
          value={metrics?.completed_campaigns || 0}
          icon={CheckCircle}
          color="bg-gray-600"
        />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">All Campaigns</h2>
        <p className="text-gray-400 text-xs sm:text-sm mb-4 sm:mb-6">Complete overview of all campaigns with detailed metrics</p>
        {campaigns.length === 0 ? (
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-12 text-center">
            <p className="text-gray-400">No campaigns found for the selected date range.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 sm:p-6 hover:border-gray-600 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      campaign.status === 'Running' ? 'bg-green-500' :
                      campaign.status === 'Paused' ? 'bg-amber-500' :
                      'bg-gray-500'
                    }`}>
                      {campaign.status === 'Running' ? (
                        <Play className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      ) : campaign.status === 'Paused' ? (
                        <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      ) : (
                        <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-white text-base sm:text-lg font-semibold break-words">{campaign.name}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          campaign.status === 'Running' ? 'bg-green-500/20 text-green-400' :
                          campaign.status === 'Paused' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {campaign.status}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400">
                          {campaign.type}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-500/20 text-purple-400">
                          Version {campaign.message_version}
                        </span>
                        {campaign.is_locked && (
                          <span className="text-gray-400 text-xs">🔒 Locked</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4 mb-4">
                  <div className="bg-gray-900/50 rounded-lg p-2 sm:p-3">
                    <p className="text-gray-400 text-xs mb-1">Total Numbers</p>
                    <p className="text-white text-sm sm:text-lg font-bold">
                      {(campaign.total_numbers || (campaign.messages_sent + campaign.messages_failed)).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-2 sm:p-3">
                    <p className="text-gray-400 text-xs mb-1">Messages Sent</p>
                    <p className="text-green-400 text-sm sm:text-lg font-bold">{campaign.messages_sent.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-2 sm:p-3">
                    <p className="text-gray-400 text-xs mb-1">Pending Retry</p>
                    <p className="text-amber-400 text-sm sm:text-lg font-bold">{campaign.messages_failed.toLocaleString()}</p>
                    <p className="text-gray-500 text-xs mt-1 hidden sm:block">Retry every 30 min</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-2 sm:p-3">
                    <p className="text-gray-400 text-xs mb-1">Delivery Rate</p>
                    <p className="text-green-400 text-sm sm:text-lg font-bold">
                      {(() => {
                        const totalAttempted = campaign.messages_sent + campaign.messages_failed;
                        return totalAttempted > 0
                          ? ((campaign.messages_sent / totalAttempted) * 100).toFixed(1)
                          : '0.0';
                      })()}%
                    </p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-2 sm:p-3">
                    <p className="text-gray-400 text-xs mb-1">Failure Rate</p>
                    <p className="text-red-400 text-sm sm:text-lg font-bold">
                      {(() => {
                        const totalAttempted = campaign.messages_sent + campaign.messages_failed;
                        return totalAttempted > 0
                          ? ((campaign.messages_failed / totalAttempted) * 100).toFixed(1)
                          : '0.0';
                      })()}%
                    </p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-2 sm:p-3">
                    <p className="text-gray-400 text-xs mb-1">Daily Limit</p>
                    <p className="text-white text-sm sm:text-lg font-bold">{campaign.daily_limit.toLocaleString()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-4">
                  <div className="bg-gray-900/50 rounded-lg p-2 sm:p-3">
                    <p className="text-gray-400 text-xs mb-1">Priority Level</p>
                    <p className="text-white text-sm">{campaign.priority}</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-2 sm:p-3">
                    <p className="text-gray-400 text-xs mb-1">Message Version</p>
                    <p className="text-white text-sm">Version {campaign.message_version}</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-gray-400 pt-3 border-t border-gray-700">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <div>
                      <span className="font-medium">Started:</span> {campaign.start_time ? new Date(campaign.start_time).toLocaleString() : 'Not started'}
                    </div>
                    {campaign.end_time && (
                      <div>
                        <span className="font-medium">Ended:</span> {new Date(campaign.end_time).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="font-medium">Created:</span> {new Date(campaign.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <MetricCard
          title="Delivery Rate"
          value={`${metrics?.delivery_rate.toFixed(1) || 0}%`}
          icon={TrendingUp}
          color="bg-green-500"
        />
        <MetricCard
          title="Failure Rate"
          value={`${metrics?.failure_rate.toFixed(1) || 0}%`}
          icon={TrendingDown}
          color="bg-red-500"
        />
        <MetricCard
          title="Blacklisted Numbers"
          value={metrics?.blacklisted_numbers.toLocaleString() || 0}
          icon={Ban}
          color="bg-rose-500"
        />
        <MetricCard
          title="Active Agents"
          value={metrics?.active_agents || 0}
          icon={UserCheck}
          color="bg-violet-500"
        />
      </div>

      {isAdmin && allCampaigns.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">Campaign Metrics</h2>
          <p className="text-gray-400 text-xs sm:text-sm mb-4 sm:mb-6">Edit messages sent and failed counts for each campaign</p>
          <div className="space-y-3">
            {allCampaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 sm:p-4 hover:border-gray-600 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium truncate text-sm sm:text-base">{campaign.name}</h3>
                    <p className="text-gray-400 text-xs mt-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        campaign.status === 'Running' ? 'bg-green-500/20 text-green-400' :
                        campaign.status === 'Paused' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {campaign.status}
                      </span>
                      <span className="ml-2">Total: {campaign.total_numbers.toLocaleString()}</span>
                    </p>
                  </div>
                  {editingCampaign === campaign.id ? (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <label className="text-xs text-gray-400 block mb-1">Sent</label>
                          <input
                            type="number"
                            value={editValues.messages_sent}
                            onChange={(e) => setEditValues({ ...editValues, messages_sent: parseInt(e.target.value) || 0 })}
                            min="0"
                            className="w-full sm:w-24 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-gray-400 block mb-1">Failed</label>
                          <input
                            type="number"
                            value={editValues.messages_failed}
                            onChange={(e) => setEditValues({ ...editValues, messages_failed: parseInt(e.target.value) || 0 })}
                            min="0"
                            className="w-full sm:w-24 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveCampaignMetrics(campaign.id)}
                          className="flex-1 sm:flex-none p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition"
                        >
                          <Save className="w-4 h-4 mx-auto" />
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="flex-1 sm:flex-none p-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition"
                        >
                          <X className="w-4 h-4 mx-auto" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <div className="text-left sm:text-right">
                        <p className="text-white text-sm">
                          <span className="text-emerald-400">{campaign.messages_sent.toLocaleString()}</span> sent
                        </p>
                        <p className="text-white text-sm">
                          <span className="text-red-400">{campaign.messages_failed.toLocaleString()}</span> failed
                        </p>
                      </div>
                      <button
                        onClick={() => startEditing(campaign)}
                        className="p-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition flex-shrink-0"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isAdmin && (
        <div className="bg-blue-500/10 border border-blue-500/50 rounded-xl p-4">
          <p className="text-blue-400 text-sm">
            You have view-only access. Contact your administrator to make changes.
          </p>
        </div>
      )}
    </div>
  );
}
