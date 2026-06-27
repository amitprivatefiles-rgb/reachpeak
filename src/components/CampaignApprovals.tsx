import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  CheckCircle, XCircle, Clock, Play, Eye, X, Zap, Shield, AlertTriangle,
  MessageSquare, Image as ImageIcon, Video, Download, Search, Filter, Copy, ExternalLink, Phone
} from 'lucide-react';
import type { Database } from '../lib/database.types';
import { sendNotification, NotificationTemplates } from '../lib/notifications';

type Campaign = Database['public']['Tables']['campaigns']['Row'] & {
  profiles?: { full_name: string; email: string } | null;
};

type FilterTab = 'all' | 'pending_approval' | 'approved' | 'Sending' | 'Completed' | 'rejected' | 'Cancelled';

interface ApprovalConfig {
  daily_limit: number;
  priority: number;
}

const STATUS_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  pending_approval: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Pending' },
  approved: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Approved' },
  Sending: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Sending' },
  Completed: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Completed' },
  Processing: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', label: 'Processing' },
  rejected: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Rejected' },
  Cancelled: { bg: 'bg-rose-500/20', text: 'text-rose-400', label: 'Cancelled' },
};

export function CampaignApprovals() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [reviewCampaign, setReviewCampaign] = useState<Campaign | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [campaignContacts, setCampaignContacts] = useState<{phone_number: string; name: string | null}[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [copiedFeedback, setCopiedFeedback] = useState('');
  const [realMetrics, setRealMetrics] = useState<Record<string, any>>({});

  const [config, setConfig] = useState<ApprovalConfig>({
    daily_limit: 1000,
    priority: 1,
  });

  const fetchCampaigns = async () => {
    setLoading(true);
    // Admin fetches ALL campaigns (RLS admin override policy)
    const { data, error } = await supabase
      .from('campaigns')
      .select('*, profiles!campaigns_user_id_profiles_fkey(full_name, email)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch campaigns:', error.message, error.details, error.hint);
    }

    setCampaigns((data || []) as Campaign[]);

    // Fetch real metrics from campaign_real_metrics view
    const { data: metricsData } = await supabase.from('campaign_real_metrics').select('*');
    const metricsMap: Record<string, any> = {};
    (metricsData || []).forEach((m: any) => { metricsMap[m.campaign_id] = m; });
    setRealMetrics(metricsMap);

    setLoading(false);
  };

  useEffect(() => {
    fetchCampaigns();

    const channel = supabase
      .channel('admin-campaign-approvals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns' }, () => fetchCampaigns())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => fetchCampaigns())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const filteredCampaigns = campaigns.filter((c) => {
    const matchesTab = activeTab === 'all' || c.status === activeTab;
    const matchesSearch = !searchQuery ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.profiles?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.profiles?.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const pendingCount = campaigns.filter((c) => c.status === 'pending_approval').length;

  const openReview = async (campaign: Campaign) => {
    setReviewCampaign(campaign);
    setConfig({
      daily_limit: campaign.daily_limit || 1000,
      priority: campaign.priority || 1,
    });
    // Fetch campaign contacts based on selected_audience
    setCampaignContacts([]);
    setLoadingContacts(true);
    try {
      const audience = campaign.selected_audience as any;
      let contacts: {phone_number: string; name: string | null}[] = [];

      if (audience?.mode === 'manual' && Array.isArray(audience?.numbers)) {
        // Manual mode: show the pasted numbers directly
        contacts = audience.numbers.map((n: string) => ({ phone_number: n, name: null }));
      } else if (audience?.mode === 'tag' && audience?.tag_filter) {
        const { data: ctData } = await supabase.from('contact_tags').select('contact_id').eq('tag_id', audience.tag_filter).eq('user_id', campaign.user_id);
        const ids = (ctData || []).map((ct: any) => ct.contact_id);
        if (ids.length > 0) {
          const { data } = await supabase.from('contacts').select('phone_number, name').eq('user_id', campaign.user_id).in('id', ids).order('created_at', { ascending: false }).limit(5000);
          contacts = data || [];
        }
      } else if (audience?.mode === 'source' && audience?.source_filter) {
        const { data } = await supabase.from('contacts').select('phone_number, name').eq('user_id', campaign.user_id).eq('source', audience.source_filter).order('created_at', { ascending: false }).limit(5000);
        contacts = data || [];
      } else if (audience?.mode === 'campaign' && audience?.campaign_filter) {
        const { data } = await supabase.from('contacts').select('phone_number, name').eq('user_id', campaign.user_id).eq('campaign_id', audience.campaign_filter).order('created_at', { ascending: false }).limit(5000);
        contacts = data || [];
      } else {
        const { data } = await supabase.from('contacts').select('phone_number, name').eq('user_id', campaign.user_id).order('created_at', { ascending: false }).limit(5000);
        contacts = data || [];
      }
      setCampaignContacts(contacts);
    } catch (err) {
      console.error('Failed to fetch contacts:', err);
    } finally {
      setLoadingContacts(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFeedback(label);
    setTimeout(() => setCopiedFeedback(''), 2000);
  };

  const copyAllNumbers = () => {
    const numbers = campaignContacts.map(c => c.phone_number).join('\n');
    copyToClipboard(numbers, 'all');
  };



  const handleApproveAndStart = async () => {
    if (!reviewCampaign || !user) return;
    setProcessing(true);
    try {
      // Set approval fields — do NOT set status='Sending' here.
      // The edge function sets it only when messages are actually inserted.
      const { error } = await supabase
        .from('campaigns')
        .update({
          approved_at: new Date().toISOString(),
          approved_by: user.id,
          start_time: new Date().toISOString(),
          daily_limit: config.daily_limit,
          priority: config.priority,
          messages_sent: 0,
          messages_failed: 0,
          last_auto_increment: null,
        })
        .eq('id', reviewCampaign.id);

      if (error) throw error;

      // Enqueue messages server-side (service-role bypasses RLS)
      const { data: enqueueResult, error: enqueueError } = await supabase.functions.invoke(
        'enqueue-campaign',
        { body: { campaign_id: reviewCampaign.id } },
      );

      if (enqueueError) throw enqueueError;

      const enqueued = enqueueResult?.enqueued ?? 0;
      const failed = enqueueResult?.failed ?? 0;
      const errors = enqueueResult?.errors ?? [];

      if (enqueued === 0 && errors.length > 0) {
        alert(`Campaign enqueue failed: ${errors.join('; ')}`);
      } else if (failed > 0) {
        alert(`Campaign approved: ${enqueued} messages queued, ${failed} recipients failed validation.`);
      }

      // Send in-app + email notification (user sees "Campaign is Live")
      const template = NotificationTemplates.campaignLaunched(reviewCampaign.name, enqueued);
      await sendNotification({
        userId: reviewCampaign.user_id,
        userEmail: reviewCampaign.profiles?.email || '',
        userName: reviewCampaign.profiles?.full_name || '',
        title: template.title,
        message: template.message,
        type: 'campaign_approved',
        campaignId: reviewCampaign.id,
        emailSubject: template.emailSubject,
        emailBody: template.emailBody,
      });

      setReviewCampaign(null);
      fetchCampaigns();
    } catch (err: any) {
      alert('Error approving campaign: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleApproveAndSchedule = async () => {
    if (!reviewCampaign || !user || !reviewCampaign.scheduled_start) return;
    setProcessing(true);
    try {
      // Set approval fields — do NOT set status='Sending' here.
      // The edge function sets it only when messages are actually inserted.
      // NOTE: Messages are enqueued immediately. True scheduled-delay
      // (holding messages until scheduled_start) is not yet enforced.
      const { error } = await supabase
        .from('campaigns')
        .update({
          approved_at: new Date().toISOString(),
          approved_by: user.id,
          start_time: new Date(reviewCampaign.scheduled_start).toISOString(),
          daily_limit: config.daily_limit,
          priority: config.priority,
          messages_sent: 0,
          messages_failed: 0,
          last_auto_increment: null,
        })
        .eq('id', reviewCampaign.id);

      if (error) throw error;

      // Enqueue messages server-side now — worker claims when campaign status is Sending/Running.
      // NOTE: True scheduled-delay is not yet enforced; messages enqueue immediately.
      const { data: enqueueResult, error: enqueueError } = await supabase.functions.invoke(
        'enqueue-campaign',
        { body: { campaign_id: reviewCampaign.id } },
      );

      if (enqueueError) throw enqueueError;

      const enqueued = enqueueResult?.enqueued ?? 0;
      const failed = enqueueResult?.failed ?? 0;
      const errors = enqueueResult?.errors ?? [];

      if (enqueued === 0 && errors.length > 0) {
        alert(`Campaign enqueue failed: ${errors.join('; ')}`);
      } else if (failed > 0) {
        alert(`Campaign scheduled: ${enqueued} messages queued, ${failed} recipients failed validation.`);
      }

      const template = NotificationTemplates.campaignScheduled(
        reviewCampaign.name,
        new Date(reviewCampaign.scheduled_start).toLocaleString()
      );
      await sendNotification({
        userId: reviewCampaign.user_id,
        userEmail: reviewCampaign.profiles?.email || '',
        userName: reviewCampaign.profiles?.full_name || '',
        title: template.title,
        message: template.message,
        type: 'campaign_approved',
        campaignId: reviewCampaign.id,
        emailSubject: template.emailSubject,
        emailBody: template.emailBody,
      });

      setReviewCampaign(null);
      fetchCampaigns();
    } catch (err: any) {
      alert('Error scheduling campaign: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!reviewCampaign || !user) return;
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejection_reason: rejectionReason || 'No reason provided',
        })
        .eq('id', reviewCampaign.id);

      if (error) throw error;

      const template = NotificationTemplates.campaignRejected(
        reviewCampaign.name,
        rejectionReason || 'Please review your campaign content'
      );
      await sendNotification({
        userId: reviewCampaign.user_id,
        userEmail: reviewCampaign.profiles?.email || '',
        userName: reviewCampaign.profiles?.full_name || '',
        title: template.title,
        message: template.message,
        type: 'campaign_rejected',
        campaignId: reviewCampaign.id,
        emailSubject: template.emailSubject,
        emailBody: template.emailBody,
      });

      setReviewCampaign(null);
      setShowRejectModal(false);
      setRejectionReason('');
      fetchCampaigns();
    } catch (err: any) {
      alert('Error rejecting campaign: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const getFileType = (fileName: string): 'image' | 'video' | 'unknown' => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return 'image';
    if (['mp4', 'webm', 'mov', 'avi'].includes(ext || '')) return 'video';
    return 'unknown';
  };

  const handleCancelCampaign = async () => {
    if (!reviewCampaign || !user) return;
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({
          status: 'Cancelled',
          end_time: new Date().toISOString(),
        })
        .eq('id', reviewCampaign.id);

      if (error) throw error;

      const template = NotificationTemplates.campaignCancelled(
        reviewCampaign.name,
        cancelReason || undefined
      );
      await sendNotification({
        userId: reviewCampaign.user_id,
        userEmail: reviewCampaign.profiles?.email || '',
        userName: reviewCampaign.profiles?.full_name || '',
        title: template.title,
        message: template.message,
        type: 'campaign_cancelled',
        campaignId: reviewCampaign.id,
        emailSubject: template.emailSubject,
        emailBody: template.emailBody,
      });

      setReviewCampaign(null);
      setShowCancelModal(false);
      setCancelReason('');
      fetchCampaigns();
    } catch (err: any) {
      alert('Error cancelling campaign: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const tabs: { id: FilterTab; label: string; count?: number }[] = [
    { id: 'all', label: 'All', count: campaigns.length },
    { id: 'pending_approval', label: 'Pending', count: pendingCount },
    { id: 'approved', label: 'Approved' },
    { id: 'Sending', label: 'Sending' },
    { id: 'Completed', label: 'Completed' },
    { id: 'Cancelled', label: 'Cancelled' },
    { id: 'rejected', label: 'Rejected' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-400">Loading campaigns...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Campaign Approvals</h1>
        <p className="text-gray-400">Review, configure, and approve user-submitted campaigns</p>
      </div>

      {/* Pending alert */}
      {pendingCount > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <p className="text-amber-300 text-sm font-medium">
            {pendingCount} campaign{pendingCount > 1 ? 's' : ''} awaiting your approval
          </p>
        </div>
      )}

      {/* Search + Tabs */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search campaigns or users..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition ${
              activeTab === tab.id
                ? 'bg-gray-800 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                tab.id === 'pending_approval' && tab.count > 0
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-gray-700 text-gray-400'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Campaign table */}
      <div className="space-y-3">
        {filteredCampaigns.map((campaign) => {
          const badge = STATUS_BADGES[campaign.status] || STATUS_BADGES.pending_approval;
          return (
            <div
              key={campaign.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-white font-semibold text-lg truncate">{campaign.name}</h3>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                      {badge.label}
                    </span>
                    <span className="px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-400">{campaign.type}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                    <span>
                      By: <span className="text-gray-300">{campaign.profiles?.full_name || campaign.profiles?.email || 'Unknown'}</span>
                    </span>
                    <span>
                      Contacts: <span className="text-white font-medium">{(campaign.total_numbers || 0).toLocaleString()}</span>
                    </span>
                    <span>
                      Submitted: {campaign.submitted_at
                        ? new Date(campaign.submitted_at).toLocaleDateString()
                        : new Date(campaign.created_at).toLocaleDateString()}
                    </span>
                    {campaign.scheduled_start && (
                      <span className="text-purple-400">
                        Scheduled: {new Date(campaign.scheduled_start).toLocaleString()}
                      </span>
                    )}
                  </div>
                  {campaign.message_template && (
                    <p className="mt-2 text-gray-500 text-sm line-clamp-1">{campaign.message_template}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {campaign.status === 'pending_approval' && (
                    <>
                      <button
                        onClick={() => openReview(campaign)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition text-sm font-medium"
                      >
                        <Eye className="w-4 h-4" />
                        Review
                      </button>
                    </>
                  )}
                  {(campaign.status === 'Sending' || campaign.status === 'approved' || campaign.status === 'Completed' || campaign.status === 'Cancelled') && (
                    <button
                      onClick={() => openReview(campaign)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition text-sm font-medium"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                  )}
                  {campaign.status === 'rejected' && (
                    <button
                      onClick={() => openReview(campaign)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition text-sm font-medium"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                  )}
                </div>
              </div>

              {/* Stats row — read from real metrics view */}
              {(campaign.status === 'Sending' || campaign.status === 'Completed' || campaign.status === 'Cancelled') && (() => {
                const m = realMetrics[campaign.id] || { messages_sent: 0, messages_failed: 0, total_messages: 0, delivery_rate: 0, messages_pending: 0 };
                return (
                  <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-800">
                    <div>
                      <p className="text-gray-500 text-xs">Sent</p>
                      <p className="text-emerald-400 font-semibold">{(m.messages_sent || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Failed</p>
                      <p className="text-red-400 font-semibold">{(m.messages_failed || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Delivery Rate</p>
                      <p className="text-green-400 font-semibold">{(m.delivery_rate || 0).toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Progress</p>
                      <p className="text-white font-semibold">
                        {campaign.total_numbers > 0
                          ? Math.min(100, (m.total_messages / campaign.total_numbers * 100)).toFixed(1)
                          : '0.0'}%
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })}

        {filteredCampaigns.length === 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <Filter className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400">No campaigns found</p>
          </div>
        )}
      </div>

      {/* Review / Approval Modal */}
      {reviewCampaign && !showRejectModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-6 flex items-center justify-between z-10">
              <div>
                <h2 className="text-2xl font-bold text-white">{reviewCampaign.name}</h2>
                <p className="text-gray-400 text-sm mt-1">
                  Submitted by {reviewCampaign.profiles?.full_name || reviewCampaign.profiles?.email || 'Unknown'}
                </p>
              </div>
              <button onClick={() => setReviewCampaign(null)} className="p-2 text-gray-400 hover:text-white transition">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Campaign Details (read-only) */}
              <div className="bg-gray-800/50 rounded-xl p-5 space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-emerald-400" />
                  Campaign Details
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Type</p>
                    <p className="text-white font-medium">{reviewCampaign.type}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Version</p>
                    <p className="text-white font-medium">{reviewCampaign.message_version}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Total Contacts</p>
                    <p className="text-white font-medium">{(reviewCampaign.total_numbers || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Daily Limit</p>
                    <p className="text-white font-medium">{(reviewCampaign.daily_limit || 1000).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Priority</p>
                    <p className="text-white font-medium">{reviewCampaign.priority}</p>
                  </div>
                  {reviewCampaign.scheduled_start && (
                    <div>
                      <p className="text-gray-500 text-xs mb-1">Scheduled Start</p>
                      <p className="text-purple-400 font-medium">{new Date(reviewCampaign.scheduled_start).toLocaleString()}</p>
                    </div>
                  )}
                  {reviewCampaign.selected_audience && (
                    <div className="col-span-2">
                      <p className="text-gray-500 text-xs mb-1">Audience Selection</p>
                      <p className="text-white font-medium capitalize">
                        {(reviewCampaign.selected_audience as any).mode || 'All contacts'}
                        {(reviewCampaign.selected_audience as any).source_filter && ` — Source: ${(reviewCampaign.selected_audience as any).source_filter}`}
                        {(reviewCampaign.selected_audience as any).tag_filter && ` — Tag: ${(reviewCampaign.selected_audience as any).tag_filter}`}
                        {(reviewCampaign.selected_audience as any).campaign_filter && ` — Campaign: ${(reviewCampaign.selected_audience as any).campaign_filter}`}
                      </p>
                    </div>
                  )}
                </div>

                {/* Timestamps */}
                <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                  <span>Created: {new Date(reviewCampaign.created_at).toLocaleString()}</span>
                  {reviewCampaign.submitted_at && <span>Submitted: {new Date(reviewCampaign.submitted_at).toLocaleString()}</span>}
                  {reviewCampaign.approved_at && <span>Approved: {new Date(reviewCampaign.approved_at).toLocaleString()}</span>}
                  {reviewCampaign.start_time && <span>Started: {new Date(reviewCampaign.start_time).toLocaleString()}</span>}
                  {reviewCampaign.end_time && <span>Ended: {new Date(reviewCampaign.end_time).toLocaleString()}</span>}
                </div>

                {reviewCampaign.message_template && (
                  <div className="p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-gray-500">Message Template</p>
                      <button onClick={() => copyToClipboard(reviewCampaign.message_template || '', 'template')}
                        className="text-xs text-gray-500 hover:text-white flex items-center gap-1 transition">
                        <Copy className="w-3 h-3" /> {copiedFeedback === 'template' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <p className="text-gray-300 text-sm whitespace-pre-wrap">{reviewCampaign.message_template}</p>
                  </div>
                )}

                {/* Message Buttons */}
                {reviewCampaign.message_buttons && Array.isArray(reviewCampaign.message_buttons) && (reviewCampaign.message_buttons as any[]).length > 0 && (
                  <div className="p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                    <p className="text-xs text-gray-500 mb-2">Message Buttons</p>
                    <div className="space-y-2">
                      {(reviewCampaign.message_buttons as any[]).map((btn: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg">
                          {btn.type === 'quick_reply' && <MessageSquare className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                          {btn.type === 'url' && <ExternalLink className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                          {btn.type === 'phone' && <Phone className="w-4 h-4 text-green-400 flex-shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium">{btn.text}</p>
                            {btn.type === 'url' && btn.url && <p className="text-xs text-blue-400 truncate">{btn.url}</p>}
                            {btn.type === 'phone' && btn.phone_number && <p className="text-xs text-green-400">{btn.phone_number}</p>}
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-400 flex-shrink-0">
                            {btn.type === 'quick_reply' ? 'Quick Reply' : btn.type === 'url' ? 'URL' : 'Call'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {reviewCampaign.file_name && reviewCampaign.file_url && (
                  <div className="bg-gray-900/50 rounded-lg border border-gray-700 overflow-hidden">
                    {getFileType(reviewCampaign.file_name) === 'image' ? (
                      <img src={reviewCampaign.file_url} alt={reviewCampaign.file_name} className="w-full h-40 object-cover" />
                    ) : getFileType(reviewCampaign.file_name) === 'video' ? (
                      <video src={reviewCampaign.file_url} controls className="w-full h-40 object-cover bg-black" />
                    ) : (
                      <div className="flex items-center gap-3 p-3">
                        <Download className="w-5 h-5 text-blue-400" />
                        <p className="text-sm text-white">{reviewCampaign.file_name}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Campaign Contacts — Phone Numbers */}
              <div className="bg-gray-800/50 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Phone className="w-5 h-5 text-blue-400" />
                    Campaign Contacts ({campaignContacts.length.toLocaleString()})
                  </h3>
                  {campaignContacts.length > 0 && (
                    <button onClick={copyAllNumbers}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition text-sm font-medium">
                      <Copy className="w-3.5 h-3.5" />
                      {copiedFeedback === 'all' ? 'Copied!' : 'Copy All Numbers'}
                    </button>
                  )}
                </div>
                {loadingContacts ? (
                  <p className="text-gray-500 text-sm">Loading contacts...</p>
                ) : campaignContacts.length === 0 ? (
                  <p className="text-gray-500 text-sm">No contacts found for this user.</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                    {campaignContacts.map((c, idx) => (
                      <div key={idx} className="flex items-center justify-between px-3 py-1.5 bg-gray-900/50 rounded-lg hover:bg-gray-900 transition group">
                        <div className="flex items-center gap-3">
                          <span className="text-gray-600 text-xs w-8">{idx + 1}.</span>
                          <span className="text-white font-mono text-sm">{c.phone_number}</span>
                          {c.name && <span className="text-gray-500 text-xs">({c.name})</span>}
                        </div>
                        <button onClick={() => copyToClipboard(c.phone_number, `phone-${idx}`)}
                          className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-white transition p-1">
                          {copiedFeedback === `phone-${idx}` ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Approval Configuration */}
              {reviewCampaign.status === 'pending_approval' && (
                <div className="bg-gray-800/50 rounded-xl p-5 space-y-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-400" />
                    Sending Configuration
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Daily Limit</label>
                      <input
                        type="number"
                        value={config.daily_limit}
                        onChange={(e) => setConfig({ ...config, daily_limit: parseInt(e.target.value) || 1000 })}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Priority</label>
                      <input
                        type="number"
                        value={config.priority}
                        onChange={(e) => setConfig({ ...config, priority: parseInt(e.target.value) || 1 })}
                        min="1"
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Real stats for sending/completed/cancelled campaigns */}
              {(reviewCampaign.status === 'Sending' || reviewCampaign.status === 'Completed' || reviewCampaign.status === 'Cancelled') && (() => {
                const m = realMetrics[reviewCampaign.id] || { messages_sent: 0, messages_failed: 0, total_messages: 0, delivery_rate: 0, messages_pending: 0 };
                return (
                  <div className="bg-gray-800/50 rounded-xl p-5">
                    <h3 className="text-lg font-semibold text-white mb-4">Campaign Statistics</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-gray-900/50 rounded-lg p-3">
                        <p className="text-gray-500 text-xs">Sent</p>
                        <p className="text-emerald-400 text-xl font-bold">{(m.messages_sent || 0).toLocaleString()}</p>
                      </div>
                      <div className="bg-gray-900/50 rounded-lg p-3">
                        <p className="text-gray-500 text-xs">Failed</p>
                        <p className="text-red-400 text-xl font-bold">{(m.messages_failed || 0).toLocaleString()}</p>
                      </div>
                      <div className="bg-gray-900/50 rounded-lg p-3">
                        <p className="text-gray-500 text-xs">Delivery Rate</p>
                        <p className="text-green-400 text-xl font-bold">{(m.delivery_rate || 0).toFixed(1)}%</p>
                      </div>
                      <div className="bg-gray-900/50 rounded-lg p-3">
                        <p className="text-gray-500 text-xs">Pending</p>
                        <p className="text-white text-xl font-bold">{(m.messages_pending || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Cancel button for sending/approved campaigns */}
              {(reviewCampaign.status === 'Sending' || reviewCampaign.status === 'approved') && (
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowCancelModal(true)}
                    disabled={processing}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-lg hover:bg-rose-500/20 transition font-medium disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    Cancel Campaign
                  </button>
                </div>
              )}

              {/* Action buttons */}
              {reviewCampaign.status === 'pending_approval' && (
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={handleApproveAndStart}
                    disabled={processing}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Play className="w-4 h-4" />
                    Approve & Start Now
                  </button>
                  {reviewCampaign.scheduled_start && (
                    <button
                      onClick={handleApproveAndSchedule}
                      disabled={processing}
                      className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-medium disabled:opacity-50"
                    >
                      <Clock className="w-4 h-4" />
                      Approve & Schedule
                    </button>
                  )}
                  <button
                    onClick={() => setShowRejectModal(true)}
                    disabled={processing}
                    className="flex items-center justify-center gap-2 px-5 py-3 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/20 transition font-medium disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {showRejectModal && reviewCampaign && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Reject Campaign</h3>
                <p className="text-gray-400 text-sm">"{reviewCampaign.name}"</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-300 mb-2">Rejection Reason *</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                placeholder="Explain why this campaign is being rejected..."
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowRejectModal(false); setRejectionReason(''); }}
                className="flex-1 px-4 py-2.5 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={processing || !rejectionReason.trim()}
                className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-medium disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Reason Modal */}
      {showCancelModal && reviewCampaign && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-rose-500/20 rounded-lg flex items-center justify-center">
                <XCircle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Cancel Campaign</h3>
                <p className="text-gray-400 text-sm">"{reviewCampaign.name}"</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-300 mb-2">Reason (Optional)</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                placeholder="Explain why this campaign is being cancelled..."
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowCancelModal(false); setCancelReason(''); }}
                className="flex-1 px-4 py-2.5 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition font-medium"
              >
                Go Back
              </button>
              <button
                onClick={handleCancelCampaign}
                disabled={processing}
                className="flex-1 px-4 py-2.5 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition font-medium disabled:opacity-50"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
