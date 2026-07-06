import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getHeaderFormat } from '../lib/templatePayloadBuilder';
import { Plus, CreditCard as Edit2, Play, Pause, CheckCircle, XCircle, Lock, Upload, Download, Image as ImageIcon, Video, MessageSquare, ExternalLink, Phone, Loader2, Rocket, StopCircle, RotateCcw, Ban, Eye, Clock } from 'lucide-react';

// Contact fields available for variable mapping (matches contacts table schema)
const CONTACT_FIELDS = ['name', 'phone_number', 'city', 'state', 'lead_type', 'source', 'notes'] as const;

interface ApprovedTemplate {
  id: string;
  name: string;
  language: string;
  body_text: string | null;
  components: any[] | null;
  variables: any;
  header_sample_url: string | null;
}

interface Campaign {
  id: string;
  name: string;
  type: string;
  priority: number;
  message_version: string;
  daily_limit: number;
  message_template: string;
  status: string;
  start_time: string | null;
  end_time: string | null;
  messages_sent: number;
  messages_failed: number;
  total_numbers: number;
  pending_retry: number;
  delivery_percentage: number;
  failure_percentage: number;
  campaign_cost: number;
  estimated_revenue: number;
  roi: number;
  is_locked: boolean;
  file_url: string | null;
  file_name: string | null;
  created_by: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  whatsapp_account_id: string | null;
  template_language: string | null;
  scheduled_start: string | null;
  ab_enabled: boolean;
  profiles?: { full_name: string; email: string } | null;
}

interface VariantMetric {
  campaign_id: string;
  variant: string;
  sent: number;
  delivered: number;
  read: number;
}

interface CampaignMetrics {
  campaign_id: string;
  messages_sent: number;
  messages_delivered: number;
  messages_read: number;
  messages_failed: number;
  messages_pending: number;
  total_messages: number;
  delivery_rate: number;
  failure_rate: number;
}

interface WhatsAppAccount {
  id: string;
  display_phone_number: string;
}

export function Campaigns() {
  const { isAdmin, user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [startingCampaign, setStartingCampaign] = useState<string | null>(null);
  const [cancellingCampaign, setCancellingCampaign] = useState<string | null>(null);
  const [retryingCampaign, setRetryingCampaign] = useState<string | null>(null);
  const [metricsMap, setMetricsMap] = useState<Record<string, CampaignMetrics>>({});
  const [waAccounts, setWaAccounts] = useState<WhatsAppAccount[]>([]);
  const [approvedTemplates, setApprovedTemplates] = useState<ApprovedTemplate[]>([]);
  const [variableMapping, setVariableMapping] = useState<Record<string, string>>({});
  const [variantMetrics, setVariantMetrics] = useState<Record<string, VariantMetric[]>>({});
  const [expandedAbCampaign, setExpandedAbCampaign] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'Promotion' as 'Promotion' | 'Follow-up' | 'Offer' | 'Reminder',
    priority: 1,
    message_version: 'A' as 'A' | 'B',
    daily_limit: 1000,
    message_template: '',
    status: 'pending_approval' as string,
    start_time: '',
    end_time: '',
    whatsapp_account_id: '',
    template_language: 'en_US',
    template_id: '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'Promotion',
      priority: 1,
      message_version: 'A',
      daily_limit: 1000,
      message_template: '',
      status: 'pending_approval',
      start_time: '',
      end_time: '',
      whatsapp_account_id: '',
      template_language: 'en_US',
      template_id: '',
    });
    setVariableMapping({});
    clearFile();
  };

  // Detect variables in the selected template
  const selectedTemplate = useMemo(() => {
    return approvedTemplates.find(t => t.id === formData.template_id) || null;
  }, [formData.template_id, approvedTemplates]);

  const templateVariables = useMemo(() => {
    if (!selectedTemplate?.body_text) return [];
    const matches = selectedTemplate.body_text.match(/\{\{(\d+)\}\}/g) || [];
    return [...new Set(matches)].sort();
  }, [selectedTemplate]);

  const fetchCampaigns = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('campaigns')
      .select('*, profiles!campaigns_created_by_fkey(full_name, email)')
      .order('created_at', { ascending: false });
    setCampaigns((data || []) as Campaign[]);
    setLoading(false);
  };

  const fetchMetrics = async () => {
    const { data } = await supabase
      .from('campaign_real_metrics')
      .select('*');
    if (data) {
      const map: Record<string, CampaignMetrics> = {};
      for (const m of data) {
        map[m.campaign_id] = m as CampaignMetrics;
      }
      setMetricsMap(map);
    }
  };

  const fetchApprovedTemplates = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('templates')
      .select('id, name, language, body_text, components, variables, header_sample_url')
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .order('name');
    setApprovedTemplates((data || []) as ApprovedTemplate[]);
  };

  const fetchWaAccounts = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('whatsapp_accounts')
      .select('id, display_phone_number')
      .eq('user_id', user.id)
      .eq('is_active', true);
    setWaAccounts(data || []);
  };

  useEffect(() => {
    fetchCampaigns();
    fetchMetrics();
    fetchWaAccounts();
    fetchApprovedTemplates();

    const channel = supabase
      .channel('campaigns-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns' }, () => {
        fetchCampaigns();
        fetchMetrics();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // ─── Start Campaign: batch-insert queued messages ───
  const startCampaign = async (campaignId: string) => {
    setStartingCampaign(campaignId);
    try {
      // Check if messages are already enqueued (from approval flow)
      const { count: existingQueued } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', campaignId)
        .in('status', ['queued', 'sending', 'sent']);

      if (existingQueued && existingQueued > 0) {
        // Messages already enqueued at approval — just ensure campaign is in Sending status
        await supabase
          .from('campaigns')
          .update({ status: 'Sending' })
          .eq('id', campaignId);
        alert(`Campaign already has ${existingQueued} messages enqueued. Status set to Sending.`);
        fetchCampaigns();
        fetchMetrics();
        return;
      }

      // Fallback: legacy campaigns without approval enqueue — route through edge function
      const { data: enqueueResult, error: enqueueError } = await supabase.functions.invoke(
        'enqueue-campaign',
        { body: { campaign_id: campaignId, mode: 'start' } },
      );

      if (enqueueError) {
        alert('Error enqueuing campaign: ' + enqueueError.message);
        return;
      }

      const enqueued = enqueueResult?.enqueued ?? 0;
      const failed = enqueueResult?.failed ?? 0;
      const errors = enqueueResult?.errors ?? [];

      if (enqueued === 0 && errors.length > 0) {
        alert(`Campaign enqueue failed: ${errors.join('; ')}`);
      } else if (failed > 0) {
        alert(`Campaign started: ${enqueued} messages queued, ${failed} contacts skipped (validation errors).`);
      }

      fetchCampaigns();
      fetchMetrics();
    } catch (err: any) {
      alert('Error starting campaign: ' + err.message);
    } finally {
      setStartingCampaign(null);
    }
  };

  // ─── Update campaign status (rewired to real queue) ───
  const updateCampaignStatus = async (campaignId: string, newStatus: string) => {
    try {
      // Cancel: route through campaign-action edge function (handles both campaign + messages server-side)
      if (newStatus === 'Cancelled') {
        if (!confirm('Cancel this campaign? All unsent messages will be permanently cancelled.')) return;
        setCancellingCampaign(campaignId);
        const { data, error: cancelErr } = await supabase.functions.invoke('campaign-action', {
          body: { campaign_id: campaignId, action: 'cancel' },
        });
        setCancellingCampaign(null);
        if (cancelErr) {
          alert('Error cancelling campaign: ' + cancelErr.message);
          return;
        }
        fetchCampaigns();
        fetchMetrics();
        return;
      }

      const { error } = await supabase
        .from('campaigns')
        .update({ status: newStatus })
        .eq('id', campaignId);

      if (error) throw error;
      fetchCampaigns();
      fetchMetrics();
    } catch (err: any) {
      setCancellingCampaign(null);
      alert('Error updating campaign: ' + err.message);
    }
  };

  // ─── Campaign actions via edge function ───
  const campaignAction = async (campaignId: string, action: string) => {
    try {
      if (action === 'cancel') {
        if (!confirm('Cancel this scheduled campaign? All unsent messages will be permanently cancelled.')) return;
        setCancellingCampaign(campaignId);
      }
      if (action === 'start_now') {
        setStartingCampaign(campaignId);
      }
      if (action === 'retry') {
        setRetryingCampaign(campaignId);
      }

      const { data, error } = await supabase.functions.invoke('campaign-action', {
        body: { campaign_id: campaignId, action },
      });

      if (error) {
        alert(`Error (${action}): ${error.message}`);
        return;
      }

      if (action === 'retry' && data) {
        alert(`Retry: ${data.requeued} messages requeued, ${data.skipped} skipped`);
      }

      fetchCampaigns();
      fetchMetrics();
    } catch (err: any) {
      alert(`Error (${action}): ${err.message}`);
    } finally {
      setCancellingCampaign(null);
      setStartingCampaign(null);
      setRetryingCampaign(null);
    }
  };

  // ─── Fetch A/B variant metrics ───
  const fetchVariantMetrics = async (campaignId: string) => {
    const { data: variantData } = await supabase
      .from('campaign_variant_metrics')
      .select('*')
      .eq('campaign_id', campaignId);
    if (variantData) {
      setVariantMetrics(prev => ({ ...prev, [campaignId]: variantData as VariantMetric[] }));
    }
  };

  // ─── File handling (kept from original) ───
  const handleFileUpload = async (campaignId: string): Promise<{ fileUrl: string; fileName: string } | null> => {
    if (!selectedFile) return null;
    try {
      setUploadingFile(true);
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${campaignId}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('campaign-files')
        .upload(fileName, selectedFile, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('campaign-files').getPublicUrl(fileName);
      return { fileUrl: publicUrl, fileName: selectedFile.name };
    } catch (error: any) {
      alert('Error uploading file: ' + error.message);
      return null;
    } finally {
      setUploadingFile(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
  };

  const downloadFile = async (fileUrl: string, fileName: string) => {
    const response = await fetch(fileUrl);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = fileName;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // ─── Submit campaign (create/update) ───
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    try {
      const campaignData: any = {
        name: formData.name,
        type: formData.type,
        priority: formData.priority,
        message_version: formData.message_version,
        daily_limit: formData.daily_limit,
        message_template: formData.message_template,
        status: formData.status,
        start_time: formData.start_time ? new Date(formData.start_time).toISOString() : null,
        end_time: formData.end_time ? new Date(formData.end_time).toISOString() : null,
        whatsapp_account_id: formData.whatsapp_account_id || null,
        template_language: formData.template_language || 'en_US',
        template_id: formData.template_id || null,
        variable_mapping: Object.keys(variableMapping).length > 0 ? variableMapping : null,
      };

      if (editingCampaign) {
        if (selectedFile) {
          const fileData = await handleFileUpload(editingCampaign.id);
          if (fileData) {
            campaignData.file_url = fileData.fileUrl;
            campaignData.file_name = fileData.fileName;
          }
        }
        const { error } = await supabase.from('campaigns').update(campaignData).eq('id', editingCampaign.id);
        if (error) throw error;
      } else {
        const { data: newCampaign, error: insertError } = await supabase
          .from('campaigns')
          .insert({ ...campaignData, user_id: user!.id, created_by: user?.id })
          .select()
          .single();
        if (insertError) throw insertError;
        if (selectedFile && newCampaign) {
          const fileData = await handleFileUpload(newCampaign.id);
          if (fileData) {
            await supabase.from('campaigns').update({ file_url: fileData.fileUrl, file_name: fileData.fileName }).eq('id', newCampaign.id);
          }
        }
      }

      setShowModal(false);
      setEditingCampaign(null);
      resetForm();
      fetchCampaigns();
    } catch (error: any) {
      alert('Error saving campaign: ' + error.message);
    }
  };

  const openEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setFormData({
      name: campaign.name,
      type: campaign.type as any,
      priority: campaign.priority,
      message_version: campaign.message_version as any,
      daily_limit: campaign.daily_limit,
      message_template: campaign.message_template || '',
      status: campaign.status,
      start_time: campaign.start_time ? new Date(campaign.start_time).toISOString().slice(0, 16) : '',
      end_time: campaign.end_time ? new Date(campaign.end_time).toISOString().slice(0, 16) : '',
      whatsapp_account_id: campaign.whatsapp_account_id || '',
      template_language: campaign.template_language || 'en_US',
      template_id: (campaign as any).template_id || '',
    });
    setVariableMapping((campaign as any).variable_mapping || {});
    setShowModal(true);
  };

  // ─── Status helpers ───
  const statusColor = (status: string, campaign?: Campaign) => {
    if (status === 'approved' && campaign?.scheduled_start) {
      return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
    }
    switch (status) {
      case 'Sending': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'Paused': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'Completed': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'Cancelled': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'pending_approval': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'approved': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'rejected': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const formatScheduledTime = (iso: string) => {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const getMetrics = (campaignId: string) => metricsMap[campaignId] || null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-green-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Campaigns</h1>
          <p className="text-gray-400 text-sm mt-1">{campaigns.length} total campaigns</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { resetForm(); setEditingCampaign(null); setShowModal(true); }}
            className="flex items-center space-x-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>New Campaign</span>
          </button>
        )}
      </div>

      {/* Campaign Cards */}
      <div className="grid grid-cols-1 gap-4">
        {campaigns.map((campaign) => {
          const m = getMetrics(campaign.id);
          return (
            <div key={campaign.id} className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-1">
                    <h3 className="text-white font-semibold text-lg">{campaign.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${statusColor(campaign.status, campaign)}`}>
                      {campaign.status === 'Sending' && <Loader2 className="inline h-3 w-3 animate-spin mr-1" />}
                      {campaign.status === 'approved' && campaign.scheduled_start && <Clock className="inline h-3 w-3 mr-1" />}
                      {campaign.status === 'approved' && campaign.scheduled_start
                        ? `Scheduled — starts ${formatScheduledTime(campaign.scheduled_start)}`
                        : campaign.status}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm">
                    {campaign.type} • Priority {campaign.priority} • Version {campaign.message_version}
                    {campaign.profiles && <span> • by {campaign.profiles.full_name}</span>}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex items-center space-x-2 ml-4">
                  {isAdmin && (campaign.status === 'Running' || campaign.status === 'approved' || campaign.status === 'Sending') && (
                    <button
                      onClick={() => startCampaign(campaign.id)}
                      disabled={startingCampaign === campaign.id}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                      title="Start sending messages"
                    >
                      {startingCampaign === campaign.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Rocket className="h-4 w-4" />
                      )}
                      <span>Send</span>
                    </button>
                  )}
                  {isAdmin && !campaign.is_locked && (
                    <button
                      onClick={() => openEdit(campaign)}
                      className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  )}

                  {/* Status action buttons */}
                  {isAdmin && campaign.status === 'Sending' && (
                    <button
                      onClick={() => updateCampaignStatus(campaign.id, 'Paused')}
                      className="flex items-center space-x-1 px-2.5 py-1.5 bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-400 rounded-lg text-xs font-medium transition-colors border border-yellow-600/30"
                      title="Pause campaign"
                    >
                      <Pause className="h-3.5 w-3.5" />
                      <span>Pause</span>
                    </button>
                  )}
                  {isAdmin && campaign.status === 'Paused' && (
                    <button
                      onClick={() => updateCampaignStatus(campaign.id, 'Sending')}
                      className="flex items-center space-x-1 px-2.5 py-1.5 bg-green-600/20 hover:bg-green-600/40 text-green-400 rounded-lg text-xs font-medium transition-colors border border-green-600/30"
                      title="Resume campaign"
                    >
                      <Play className="h-3.5 w-3.5" />
                      <span>Resume</span>
                    </button>
                  )}
                  {isAdmin && campaign.status === 'Completed' && (
                    <button
                      onClick={() => campaignAction(campaign.id, 'retry')}
                      disabled={retryingCampaign === campaign.id}
                      className="flex items-center space-x-1 px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 disabled:opacity-50 text-blue-400 rounded-lg text-xs font-medium transition-colors border border-blue-600/30"
                      title="Retry failed messages"
                    >
                      {retryingCampaign === campaign.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                      <span>Retry Failed</span>
                    </button>
                  )}
                  {/* Scheduled campaign actions */}
                  {isAdmin && campaign.status === 'approved' && campaign.scheduled_start && (
                    <>
                      <button
                        onClick={() => campaignAction(campaign.id, 'start_now')}
                        disabled={startingCampaign === campaign.id}
                        className="flex items-center space-x-1 px-2.5 py-1.5 bg-green-600/20 hover:bg-green-600/40 disabled:opacity-50 text-green-400 rounded-lg text-xs font-medium transition-colors border border-green-600/30"
                        title="Start campaign now"
                      >
                        {startingCampaign === campaign.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
                        <span>Start Now</span>
                      </button>
                      <button
                        onClick={() => campaignAction(campaign.id, 'cancel')}
                        disabled={cancellingCampaign === campaign.id}
                        className="flex items-center space-x-1 px-2.5 py-1.5 bg-red-600/20 hover:bg-red-600/40 disabled:opacity-50 text-red-400 rounded-lg text-xs font-medium transition-colors border border-red-600/30"
                        title="Cancel scheduled campaign"
                      >
                        {cancellingCampaign === campaign.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                        <span>Cancel</span>
                      </button>
                    </>
                  )}
                  {isAdmin && !['Completed', 'Cancelled'].includes(campaign.status) && (
                    <button
                      onClick={() => updateCampaignStatus(campaign.id, 'Completed')}
                      className="flex items-center space-x-1 px-2.5 py-1.5 bg-gray-600/20 hover:bg-gray-600/40 text-gray-300 rounded-lg text-xs font-medium transition-colors border border-gray-600/30"
                      title="Mark as completed"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span>Complete</span>
                    </button>
                  )}
                  {isAdmin && ['Sending', 'Paused'].includes(campaign.status) && (
                    <button
                      onClick={() => updateCampaignStatus(campaign.id, 'Cancelled')}
                      disabled={cancellingCampaign === campaign.id}
                      className="flex items-center space-x-1 px-2.5 py-1.5 bg-red-600/20 hover:bg-red-600/40 disabled:opacity-50 text-red-400 rounded-lg text-xs font-medium transition-colors border border-red-600/30"
                      title="Cancel campaign"
                    >
                      {cancellingCampaign === campaign.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                      <span>Cancel</span>
                    </button>
                  )}

                  {campaign.file_url && campaign.file_name && (
                    <button
                      onClick={() => downloadFile(campaign.file_url!, campaign.file_name!)}
                      className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                      title="Download file"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Real Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs">Contacts</p>
                  <p className="text-white font-semibold">{campaign.total_numbers || 0}</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs">Sent</p>
                  <p className="text-green-400 font-semibold">{m?.messages_sent || 0}</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs">Delivered</p>
                  <p className="text-blue-400 font-semibold">{m?.messages_delivered || 0}</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs">Failed</p>
                  <p className="text-red-400 font-semibold">{m?.messages_failed || 0}</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs">Pending</p>
                  <p className="text-yellow-400 font-semibold">{m?.messages_pending || 0}</p>
                </div>
              </div>

              {/* Delivery rate bar */}
              {m && m.total_messages > 0 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                    <span>Delivery: {m.delivery_rate || 0}%</span>
                    <span>Failure: {m.failure_rate || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-1.5">
                    <div
                      className="bg-green-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(m.delivery_rate || 0, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* A/B Results Card */}
              {(campaign as any).ab_enabled && (
                <div className="mt-3">
                  <button
                    onClick={() => {
                      const isExpanding = expandedAbCampaign !== campaign.id;
                      setExpandedAbCampaign(isExpanding ? campaign.id : null);
                      if (isExpanding && !variantMetrics[campaign.id]) {
                        fetchVariantMetrics(campaign.id);
                      }
                    }}
                    className="flex items-center space-x-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>{expandedAbCampaign === campaign.id ? 'Hide' : 'Show'} A/B Results</span>
                  </button>
                  {expandedAbCampaign === campaign.id && (
                    <div className="mt-2 bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                      <p className="text-gray-300 text-sm font-medium mb-3">A/B Variant Comparison</p>
                      {(() => {
                        const variants = variantMetrics[campaign.id];
                        if (!variants || variants.length === 0) {
                          return <p className="text-gray-500 text-xs">No variant metrics available yet.</p>;
                        }
                        const varA = variants.find(v => v.variant === 'A');
                        const varB = variants.find(v => v.variant === 'B');
                        const rateA = varA && varA.sent > 0 ? (varA.read / varA.sent) * 100 : 0;
                        const rateB = varB && varB.sent > 0 ? (varB.read / varB.sent) * 100 : 0;
                        const leader = rateA > rateB ? 'A' : rateB > rateA ? 'B' : null;
                        return (
                          <div className="grid grid-cols-2 gap-3">
                            {[{ label: 'A', v: varA, rate: rateA }, { label: 'B', v: varB, rate: rateB }].map(({ label, v, rate }) => (
                              <div key={label} className="bg-gray-800 rounded-lg p-3 border border-gray-600">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-white text-sm font-semibold">Variant {label}</span>
                                  {leader === label && (
                                    <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded text-[10px] font-medium">Leader</span>
                                  )}
                                </div>
                                <div className="space-y-1 text-xs">
                                  <div className="flex justify-between"><span className="text-gray-400">Sent</span><span className="text-white">{v?.sent || 0}</span></div>
                                  <div className="flex justify-between"><span className="text-gray-400">Delivered</span><span className="text-blue-400">{v?.delivered || 0}</span></div>
                                  <div className="flex justify-between"><span className="text-gray-400">Read</span><span className="text-green-400">{v?.read || 0}</span></div>
                                  <div className="flex justify-between pt-1 border-t border-gray-700"><span className="text-gray-400">Read Rate</span><span className="text-indigo-400">{rate.toFixed(1)}%</span></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {campaigns.length === 0 && (
          <div className="text-center py-12 bg-gray-800 rounded-xl border border-gray-700">
            <MessageSquare className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-lg">No campaigns yet</p>
            <p className="text-gray-500 text-sm mt-1">Create your first campaign to get started</p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">
                  {editingCampaign ? 'Edit Campaign' : 'New Campaign'}
                </h2>
                <button onClick={() => { setShowModal(false); setEditingCampaign(null); resetForm(); }} className="text-gray-400 hover:text-white">
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1">Campaign Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-2.5 border border-gray-600 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
                  required
                />
              </div>

              {/* Type + Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-2.5 border border-gray-600 focus:border-green-500 outline-none"
                  >
                    <option value="Promotion">Promotion</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Offer">Offer</option>
                    <option value="Reminder">Reminder</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-2.5 border border-gray-600 focus:border-green-500 outline-none"
                  >
                    {[1, 2, 3, 4, 5].map((p) => <option key={p} value={p}>Priority {p}</option>)}
                  </select>
                </div>
              </div>

              {/* WhatsApp Account */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1">
                  WhatsApp Account <span className="text-red-400">*</span>
                </label>
                <select
                  value={formData.whatsapp_account_id}
                  onChange={(e) => setFormData({ ...formData, whatsapp_account_id: e.target.value })}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-2.5 border border-gray-600 focus:border-green-500 outline-none"
                  required
                >
                  <option value="">Select WhatsApp account...</option>
                  {waAccounts.map((wa) => (
                    <option key={wa.id} value={wa.id}>{wa.display_phone_number}</option>
                  ))}
                </select>
                {waAccounts.length === 0 && (
                  <p className="text-yellow-400 text-xs mt-1">No WhatsApp accounts connected. Go to Settings → WhatsApp to add one.</p>
                )}
              </div>

              {/* Template (approved-only picker) */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1">
                  Template <span className="text-red-400">*</span>
                </label>
                <select
                  value={formData.template_id}
                  onChange={(e) => {
                    const tpl = approvedTemplates.find(t => t.id === e.target.value);
                    setFormData({
                      ...formData,
                      template_id: e.target.value,
                      message_template: tpl?.name || '',
                      template_language: tpl?.language || 'en_US',
                    });
                    setVariableMapping({});
                  }}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-2.5 border border-gray-600 focus:border-green-500 outline-none"
                  required
                >
                  <option value="">Select an approved template...</option>
                  {approvedTemplates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.language})</option>
                  ))}
                </select>
                {approvedTemplates.length === 0 && (
                  <p className="text-yellow-400 text-xs mt-1">No approved templates. Go to Templates to create and submit one for Meta approval.</p>
                )}
              </div>

              {/* Template Preview */}
              {selectedTemplate && (
                <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                  <div className="flex items-center space-x-2 mb-3">
                    <Eye className="h-4 w-4 text-gray-400" />
                    <p className="text-gray-300 text-sm font-medium">Template Preview</p>
                  </div>

                  {/* Header preview */}
                  {(() => {
                    const hdrFmt = getHeaderFormat(selectedTemplate.components ?? undefined);
                    if (hdrFmt === 'IMAGE' || hdrFmt === 'VIDEO' || hdrFmt === 'DOCUMENT') {
                      const sampleUrl = selectedTemplate.header_sample_url;
                      return (
                        <div className="mb-3">
                          {sampleUrl && hdrFmt === 'IMAGE' ? (
                            <img src={sampleUrl} alt="Header sample" className="rounded-lg max-h-32 w-auto border border-gray-600" />
                          ) : (
                            <div className="flex items-center space-x-2 text-gray-400 text-xs">
                              {hdrFmt === 'IMAGE' && <ImageIcon className="h-4 w-4" />}
                              {hdrFmt === 'VIDEO' && <Video className="h-4 w-4" />}
                              <span>{hdrFmt} header — {sampleUrl ? 'sample available' : 'no sample (will use approved media)'}</span>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Body text preview */}
                  {selectedTemplate.body_text && (
                    <p className="text-gray-300 text-sm whitespace-pre-wrap mb-2">{selectedTemplate.body_text}</p>
                  )}

                  {/* Footer preview */}
                  {(() => {
                    const fc = (selectedTemplate.components ?? []).find((c: any) => String(c.type).toUpperCase() === 'FOOTER');
                    return fc?.text ? <p className="text-gray-500 text-xs italic">{fc.text}</p> : null;
                  })()}

                  {/* Buttons preview */}
                  {(() => {
                    const bc = (selectedTemplate.components ?? []).find((c: any) => String(c.type).toUpperCase() === 'BUTTONS');
                    if (!bc?.buttons?.length) return null;
                    return (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {bc.buttons.map((b: any, i: number) => (
                          <span key={i} className="px-3 py-1 bg-gray-600 text-gray-300 rounded-full text-xs border border-gray-500">
                            {b.text || b.type}
                          </span>
                        ))}
                      </div>
                    );
                  })()}

                  {/* Variable count */}
                  <div className="mt-2 pt-2 border-t border-gray-600">
                    <p className="text-gray-500 text-xs">
                      {templateVariables.length === 0
                        ? '✅ No variables — ready to send'
                        : `${templateVariables.length} variable${templateVariables.length > 1 ? 's' : ''} to map`}
                    </p>
                  </div>
                </div>
              )}

              {/* Variable Mapping */}
              {templateVariables.length > 0 && (
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-gray-300 text-sm font-medium mb-2">Variable Mapping</p>
                  <p className="text-gray-500 text-xs mb-3">Map each template variable to a contact field</p>
                  <div className="grid grid-cols-2 gap-3">
                    {templateVariables.map((v) => {
                      const num = v.replace(/[{}]/g, '');
                      return (
                        <div key={v} className="flex items-center space-x-2">
                          <span className="text-gray-400 text-sm font-mono w-12">{v}</span>
                          <span className="text-gray-500">→</span>
                          <select
                            value={variableMapping[num] || ''}
                            onChange={(e) => setVariableMapping({ ...variableMapping, [num]: e.target.value })}
                            className="flex-1 bg-gray-600 text-white rounded-lg px-3 py-1.5 border border-gray-500 text-sm"
                          >
                            <option value="">Select field...</option>
                            {CONTACT_FIELDS.map((f) => (
                              <option key={f} value={f}>{f}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Message Version + Daily Limit */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1">Message Version</label>
                  <select
                    value={formData.message_version}
                    onChange={(e) => setFormData({ ...formData, message_version: e.target.value as any })}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-2.5 border border-gray-600 focus:border-green-500 outline-none"
                  >
                    <option value="A">Version A</option>
                    <option value="B">Version B</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1">Daily Limit</label>
                  <input
                    type="number"
                    value={formData.daily_limit}
                    onChange={(e) => setFormData({ ...formData, daily_limit: parseInt(e.target.value) || 1000 })}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-2.5 border border-gray-600 focus:border-green-500 outline-none"
                  />
                </div>
              </div>

              {/* Start/End Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-2.5 border border-gray-600 focus:border-green-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1">End Time</label>
                  <input
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-2.5 border border-gray-600 focus:border-green-500 outline-none"
                  />
                </div>
              </div>

              {/* Status (for editing) */}
              {editingCampaign && (
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-2.5 border border-gray-600 focus:border-green-500 outline-none"
                  >
                    <option value="Sending">Sending</option>
                    <option value="Paused">Paused</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              )}

              {/* File Upload */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1">Attachment</label>
                <div className="flex items-center space-x-3">
                  <label className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg cursor-pointer transition-colors border border-gray-600">
                    <Upload className="h-4 w-4" />
                    <span className="text-sm">Choose File</span>
                    <input type="file" onChange={handleFileSelect} className="hidden" accept="image/*,video/*,.pdf,.doc,.docx" />
                  </label>
                  {selectedFile && (
                    <div className="flex items-center space-x-2 text-sm text-gray-300">
                      <span>{selectedFile.name}</span>
                      <button type="button" onClick={clearFile} className="text-red-400 hover:text-red-300">
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingCampaign(null); resetForm(); }}
                  className="px-4 py-2.5 text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingFile}
                  className="flex items-center space-x-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                >
                  {uploadingFile ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  <span>{editingCampaign ? 'Update' : 'Create'} Campaign</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
