import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getHeaderFormat } from '../lib/templatePayloadBuilder';
import { Plus, Upload, Image as ImageIcon, MessageSquare, Download, CheckCircle, XCircle, Send, Eye, X, AlertCircle, ExternalLink, Phone, Edit3, Users, Copy } from 'lucide-react';
import type { Database } from '../lib/database.types';

type Campaign = Database['public']['Tables']['campaigns']['Row'];
type TagType = Database['public']['Tables']['tags']['Row'];

type ContactSelectionMode = 'all' | 'source' | 'campaign' | 'tag' | 'manual';

interface MessageButton {
  type: 'quick_reply' | 'url' | 'phone';
  text: string;
  url?: string;
  phone_number?: string;
}

interface VariantB {
  template_id: string;
  template_language: string;
  variable_mapping: Record<string, string>;
  message_template: string;
  header_override_url: string;
}

interface FormData {
  name: string;
  type: 'Promotion' | 'Follow-up' | 'Offer' | 'Reminder';
  message_version: 'A' | 'B';
  message_mode: 'template' | 'freetext';
  message_template: string;
  template_id: string;
  template_name: string;
  template_language: string;
  variable_mapping: Record<string, string>;
  header_override_url: string;
  contact_selection: ContactSelectionMode;
  contact_source_filter: string;
  contact_campaign_filter: string;
  contact_tag_filter: string;
  manual_numbers_raw: string;
  scheduled_start: string;
  message_buttons: MessageButton[];
  ab_enabled: boolean;
  ab_split: number;
  variant_b: VariantB | null;
  auto_retry_hours: number | null;
}

interface ApprovedTemplate {
  id: string;
  name: string;
  language: string;
  body_text: string | null;
  components: any[] | null;
  variables: any;
  header_sample_url: string | null;
}

const CONTACT_FIELDS = ['name', 'phone_number', 'city', 'state', 'lead_type', 'source', 'notes'] as const;

const STATUS_BADGES: Record<string, { bg: string; text: string; label: string; pulse?: boolean }> = {
  draft: { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'Draft' },
  pending_approval: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Pending Approval' },
  approved: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Approved' },
  Running: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Running', pulse: true },
  Paused: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'Paused' },
  Completed: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Completed' },
  Processing: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', label: 'Processing' },
  rejected: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Rejected' },
};

export function UserCampaigns() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState<Campaign | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [contactCount, setContactCount] = useState(0);
  const [availableSources, setAvailableSources] = useState<string[]>([]);
  const [existingCampaigns, setExistingCampaigns] = useState<{ id: string; name: string }[]>([]);
  const [availableTags, setAvailableTags] = useState<TagType[]>([]);
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' }[]>([]);
  const [detailContacts, setDetailContacts] = useState<{phone_number: string; name: string | null}[]>([]);
  const [loadingDetailContacts, setLoadingDetailContacts] = useState(false);
  const [copiedFeedback, setCopiedFeedback] = useState('');
  const [approvedTemplates, setApprovedTemplates] = useState<ApprovedTemplate[]>([]);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    type: 'Promotion',
    message_version: 'A',
    message_mode: 'template',
    message_template: '',
    template_id: '',
    template_name: '',
    template_language: 'en_US',
    variable_mapping: {},
    header_override_url: '',
    contact_selection: 'all',
    contact_source_filter: '',
    contact_campaign_filter: '',
    contact_tag_filter: '',
    manual_numbers_raw: '',
    scheduled_start: '',
    message_buttons: [],
    ab_enabled: false,
    ab_split: 50,
    variant_b: null,
    auto_retry_hours: null,
  });

  const selectedTemplate = useMemo(() => {
    return approvedTemplates.find(t => t.id === formData.template_id) || null;
  }, [formData.template_id, approvedTemplates]);

  const templateVariables = useMemo(() => {
    if (!selectedTemplate?.body_text) return [];
    const matches = selectedTemplate.body_text.match(/\{\{(\d+)\}\}/g) || [];
    return [...new Set(matches)].sort();
  }, [selectedTemplate]);

  const selectedTemplateB = useMemo(() => {
    if (!formData.variant_b) return null;
    return approvedTemplates.find(t => t.id === formData.variant_b!.template_id) || null;
  }, [formData.variant_b?.template_id, approvedTemplates]);

  const templateVariablesB = useMemo(() => {
    if (!selectedTemplateB?.body_text) return [];
    const matches = selectedTemplateB.body_text.match(/\{\{(\d+)\}\}/g) || [];
    return [...new Set(matches)].sort();
  }, [selectedTemplateB]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  };

  const fetchCampaigns = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
    setCampaigns(data || []);
    setLoading(false);
  };

  const fetchContactMeta = async () => {
    const { data: sources } = await supabase.from('contacts').select('source').eq('user_id', user!.id);
    setAvailableSources([...new Set((sources || []).map((s: any) => s.source))]);

    const { data: camps } = await supabase.from('campaigns').select('id, name').eq('user_id', user!.id).order('created_at', { ascending: false });
    setExistingCampaigns(camps || []);

    const { data: tagsData } = await supabase.from('tags').select('*').eq('user_id', user!.id).order('name');
    setAvailableTags(tagsData || []);
  };

  const fetchApprovedTemplates = async () => {
    if (!user) return;
    const { data: waAccount } = await (supabase as any)
      .from('whatsapp_accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();
    if (!waAccount) return;
    const { data } = await (supabase as any)
      .from('templates')
      .select('id, name, language, body_text, components, variables, header_sample_url')
      .eq('whatsapp_account_id', waAccount.id)
      .eq('status', 'approved')
      .order('name');
    setApprovedTemplates((data || []) as ApprovedTemplate[]);
  };

  useEffect(() => {
    fetchCampaigns();
    fetchContactMeta();

    // Check for recently approved/rejected campaigns for toast notifications
    const checkNotifications = async () => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: approved } = await supabase
        .from('campaigns')
        .select('name')
        .eq('user_id', user!.id)
        .in('status', ['Running', 'approved'])
        .gte('approved_at', oneDayAgo);
      if (approved && approved.length > 0) {
        approved.forEach((c: any) => addToast(`Campaign "${c.name}" has been approved! 🎉`, 'success'));
      }
      const { data: rejected } = await supabase
        .from('campaigns')
        .select('name, rejection_reason')
        .eq('user_id', user!.id)
        .eq('status', 'rejected')
        .gte('rejected_at', oneDayAgo);
      if (rejected && rejected.length > 0) {
        rejected.forEach((c: any) => addToast(`Campaign "${c.name}" was rejected: ${c.rejection_reason || 'No reason given'}`, 'error'));
      }
    };
    checkNotifications();

    // Realtime subscription
    const channel = supabase
      .channel('user-campaigns-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'campaigns', filter: `user_id=eq.${user!.id}` },
        () => fetchCampaigns()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Fetch contacts when detail modal opens
  useEffect(() => {
    if (!showDetail || !user) {
      setDetailContacts([]);
      return;
    }
    const fetchDetailContacts = async () => {
      setLoadingDetailContacts(true);
      try {
        const audience = showDetail.selected_audience as any;
        let contacts: {phone_number: string; name: string | null}[] = [];

        if (audience?.mode === 'tag' && audience?.tag_filter) {
          // Tag-based audience: fetch contact IDs from contact_tags, then fetch contacts
          const { data: ctData } = await supabase.from('contact_tags').select('contact_id').eq('tag_id', audience.tag_filter).eq('user_id', user.id);
          const ids = (ctData || []).map((ct: any) => ct.contact_id);
          if (ids.length > 0) {
            const { data } = await supabase.from('contacts').select('phone_number, name').eq('user_id', user.id).in('id', ids).order('created_at', { ascending: false }).limit(5000);
            contacts = data || [];
          }
        } else if (audience?.mode === 'source' && audience?.source_filter) {
          const { data } = await supabase.from('contacts').select('phone_number, name').eq('user_id', user.id).eq('source', audience.source_filter).order('created_at', { ascending: false }).limit(5000);
          contacts = data || [];
        } else if (audience?.mode === 'campaign' && audience?.campaign_filter) {
          const { data } = await supabase.from('contacts').select('phone_number, name').eq('user_id', user.id).eq('campaign_id', audience.campaign_filter).order('created_at', { ascending: false }).limit(5000);
          contacts = data || [];
        } else {
          // 'all' or fallback: try campaign_id first, then all contacts
          const { data: byCampaign } = await supabase.from('contacts').select('phone_number, name').eq('campaign_id', showDetail.id).order('created_at', { ascending: false }).limit(5000);
          if (byCampaign && byCampaign.length > 0) {
            contacts = byCampaign;
          } else {
            const { data: allContacts } = await supabase.from('contacts').select('phone_number, name').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5000);
            contacts = allContacts || [];
          }
        }
        setDetailContacts(contacts);
      } catch (err) {
        console.error('Failed to fetch campaign contacts:', err);
      } finally {
        setLoadingDetailContacts(false);
      }
    };
    fetchDetailContacts();
  }, [showDetail, user]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFeedback(label);
    setTimeout(() => setCopiedFeedback(''), 2000);
  };

  // Normalize manual phone numbers: strip non-digits, prepend 91 for 10-digit Indian numbers, deduplicate
  const normalizeNumbers = (raw: string): { valid: string[]; skipped: number } => {
    const tokens = raw.split(/[\n,;\s]+/).filter(Boolean);
    const seen = new Set<string>();
    let skipped = 0;
    for (const tok of tokens) {
      const digits = tok.replace(/[^0-9]/g, '');
      if (!digits || digits.length < 10) { skipped++; continue; }
      const normalized = digits.length === 10 ? '91' + digits : digits;
      if (normalized.length < 10 || normalized.length > 15) { skipped++; continue; }
      seen.add(normalized);
    }
    return { valid: [...seen], skipped };
  };

  const manualParsed = useMemo(() => normalizeNumbers(formData.manual_numbers_raw), [formData.manual_numbers_raw]);

  useEffect(() => {
    const updateCount = async () => {
      if (formData.contact_selection === 'manual') {
        setContactCount(manualParsed.valid.length);
        return;
      }
      if (formData.contact_selection === 'tag' && formData.contact_tag_filter) {
        const { data: ctData } = await supabase.from('contact_tags').select('contact_id').eq('tag_id', formData.contact_tag_filter).eq('user_id', user!.id);
        setContactCount((ctData || []).length);
        return;
      }
      let query = supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('user_id', user!.id);
      if (formData.contact_selection === 'source' && formData.contact_source_filter) {
        query = query.eq('source', formData.contact_source_filter as any);
      } else if (formData.contact_selection === 'campaign' && formData.contact_campaign_filter) {
        query = query.eq('campaign_id', formData.contact_campaign_filter);
      }
      const { count } = await query;
      setContactCount(count || 0);
    };
    if (showModal) updateCount();
  }, [formData.contact_selection, formData.contact_source_filter, formData.contact_campaign_filter, formData.contact_tag_filter, formData.manual_numbers_raw, showModal]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent, asDraft = false) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    try {
      const selectedAudience: any = {
        mode: formData.contact_selection,
        source_filter: formData.contact_source_filter || null,
        campaign_filter: formData.contact_campaign_filter || null,
        tag_filter: formData.contact_tag_filter || null,
        message_mode: formData.message_mode,
        header_override_url: formData.header_override_url || null,
        ...(formData.contact_selection === 'manual' ? { numbers: manualParsed.valid } : {}),
      };

      const campaignData: any = {
        name: formData.name,
        type: formData.type,
        message_version: formData.message_version,
        message_template: formData.message_mode === 'template' ? formData.template_name : (formData.message_template || null),
        template_id: formData.message_mode === 'template' ? formData.template_id : null,
        template_language: formData.message_mode === 'template' ? formData.template_language : null,
        variable_mapping: formData.message_mode === 'template' && Object.keys(formData.variable_mapping).length > 0 ? formData.variable_mapping : null,
        message_buttons: formData.message_buttons.length > 0 ? formData.message_buttons : null,
        status: asDraft ? 'draft' : 'pending_approval',
        submitted_at: asDraft ? null : new Date().toISOString(),
        total_numbers: formData.contact_selection === 'manual' ? manualParsed.valid.length : contactCount,
        selected_audience: selectedAudience,
        scheduled_start: formData.scheduled_start ? new Date(formData.scheduled_start).toISOString() : null,
        user_id: user.id,
        created_by: user.id,
        messages_sent: 0,
        messages_failed: 0,
        priority: 1,
        daily_limit: 1000,
        ab_enabled: formData.ab_enabled,
        ab_split: formData.ab_split,
        variant_b: formData.variant_b,
        auto_retry_hours: formData.auto_retry_hours,
      };

      let campaignId: string;

      if (editingDraftId) {
        // Update existing draft
        const { error: updateError } = await supabase
          .from('campaigns')
          .update(campaignData)
          .eq('id', editingDraftId);
        if (updateError) throw updateError;
        campaignId = editingDraftId;
      } else {
        // Insert new campaign
        const { data: newCampaign, error: insertError } = await supabase
          .from('campaigns')
          .insert(campaignData)
          .select()
          .single();
        if (insertError) throw insertError;
        campaignId = newCampaign.id;
      }

      // Upload media file if selected
      if (selectedFile && campaignId) {
        setUploadingFile(true);
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${campaignId}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('campaign-files')
          .upload(fileName, selectedFile, { cacheControl: '3600', upsert: false });

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('campaign-files').getPublicUrl(fileName);
          await supabase
            .from('campaigns')
            .update({ file_url: publicUrl, file_name: selectedFile.name })
            .eq('id', campaignId);
        }
        setUploadingFile(false);
      }

      // Reset form
      setShowModal(false);
      setEditingDraftId(null);
      clearFile();
      setFormData({
        name: '', type: 'Promotion', message_version: 'A', message_mode: 'template',
        message_template: '', template_id: '', template_name: '', template_language: 'en_US',
        variable_mapping: {}, header_override_url: '',
        contact_selection: 'all', contact_source_filter: '', contact_campaign_filter: '',
        contact_tag_filter: '', manual_numbers_raw: '', scheduled_start: '', message_buttons: [],
        ab_enabled: false, ab_split: 50, variant_b: null, auto_retry_hours: null,
      });
      fetchCampaigns();
      addToast(asDraft ? 'Campaign saved as draft! 📝' : (editingDraftId ? 'Draft submitted for approval! ✅' : 'Campaign submitted for approval! ✅'), 'success');
    } catch (err: any) {
      addToast('Error saving campaign: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const loadDraft = (campaign: Campaign) => {
    setEditingDraftId(campaign.id);
    setFormData({
      name: campaign.name,
      type: campaign.type,
      message_version: campaign.message_version,
      message_mode: (campaign.selected_audience as any)?.message_mode || 'freetext',
      message_template: campaign.message_template || '',
      template_id: (campaign as any).template_id || '',
      template_name: campaign.message_template || '',
      template_language: (campaign as any).template_language || 'en_US',
      variable_mapping: (campaign as any).variable_mapping || {},
      header_override_url: (campaign.selected_audience as any)?.header_override_url || '',
      contact_selection: (campaign.selected_audience as any)?.mode || 'all',
      contact_source_filter: (campaign.selected_audience as any)?.source_filter || '',
      contact_campaign_filter: (campaign.selected_audience as any)?.campaign_filter || '',
      contact_tag_filter: (campaign.selected_audience as any)?.tag_filter || '',
      manual_numbers_raw: ((campaign.selected_audience as any)?.numbers || []).join('\n'),
      scheduled_start: campaign.scheduled_start ? new Date(campaign.scheduled_start).toISOString().slice(0, 16) : '',
      message_buttons: Array.isArray(campaign.message_buttons) ? campaign.message_buttons as unknown as MessageButton[] : [],
      ab_enabled: (campaign as any).ab_enabled || false,
      ab_split: (campaign as any).ab_split ?? 50,
      variant_b: (campaign as any).variant_b || null,
      auto_retry_hours: (campaign as any).auto_retry_hours ?? null,
    });
    clearFile();
    setShowModal(true);
    fetchApprovedTemplates();
  };

  const getStatusBadge = (status: string) => {
    const badge = STATUS_BADGES[status] || { bg: 'bg-gray-500/20', text: 'text-gray-400', label: status };
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.pulse && <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />}
        {badge.label}
      </span>
    );
  };

  const getFileType = (fileName: string): 'image' | 'video' | 'unknown' => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return 'image';
    if (['mp4', 'webm', 'mov', 'avi'].includes(ext || '')) return 'video';
    return 'unknown';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-400">Loading campaigns...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-[60] space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 animate-slide-in ${
              t.type === 'success' ? 'bg-green-500/90 text-white' :
              t.type === 'error' ? 'bg-red-500/90 text-white' :
              'bg-blue-500/90 text-white'
            }`}
          >
            {t.type === 'success' ? <CheckCircle className="w-4 h-4" /> :
             t.type === 'error' ? <XCircle className="w-4 h-4" /> :
             <AlertCircle className="w-4 h-4" />}
            {t.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">My Campaigns</h1>
          <p className="text-gray-400">Create and track your WhatsApp campaigns</p>
        </div>
        <button
          onClick={() => { setShowModal(true); fetchContactMeta(); fetchApprovedTemplates(); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-medium"
        >
          <Plus className="w-4 h-4" />
          New Campaign
        </button>
      </div>

      {/* Campaign list */}
      <div className="grid gap-4">
        {campaigns.map((campaign) => (
          <div
            key={campaign.id}
            onClick={() => setShowDetail(campaign)}
            className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition cursor-pointer group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-semibold text-white group-hover:text-emerald-400 transition">{campaign.name}</h3>
                  {getStatusBadge(campaign.status)}
                  <span className="px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-400">{campaign.type}</span>
                </div>

                {campaign.message_template && (
                  <div className="mb-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-xs font-medium text-gray-300">Message</span>
                    </div>
                    <p className="text-sm text-gray-400 line-clamp-2">{campaign.message_template}</p>
                  </div>
                )}

                {/* Rejection reason */}
                {campaign.status === 'rejected' && campaign.rejection_reason && (
                  <div className="mb-3 p-3 bg-red-500/10 rounded-lg border border-red-500/30">
                    <div className="flex items-center gap-2 mb-1">
                      <XCircle className="w-3.5 h-3.5 text-red-400" />
                      <span className="text-xs font-medium text-red-400">Rejection Reason</span>
                    </div>
                    <p className="text-sm text-red-300">{campaign.rejection_reason}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Total Contacts</p>
                    <p className="text-white text-lg font-semibold">{(campaign.total_numbers || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Sent</p>
                    <p className="text-emerald-400 text-lg font-semibold">{campaign.messages_sent.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Failed</p>
                    <p className="text-red-400 text-lg font-semibold">{campaign.messages_failed.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Delivery Rate</p>
                    <p className="text-green-400 text-lg font-semibold">
                      {(() => {
                        const total = campaign.messages_sent + campaign.messages_failed;
                        return total > 0 ? ((campaign.messages_sent / total) * 100).toFixed(1) : '0.0';
                      })()}%
                    </p>
                  </div>
                </div>

                {/* Progress bar for running campaigns */}
                {(campaign.status === 'Running' || campaign.status === 'Completed') && campaign.total_numbers > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Progress</span>
                      <span>{Math.min(100, ((campaign.messages_sent + campaign.messages_failed) / campaign.total_numbers * 100)).toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${campaign.status === 'Completed' ? 'bg-gray-400' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(100, (campaign.messages_sent + campaign.messages_failed) / campaign.total_numbers * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 ml-4">
                {campaign.status === 'draft' && (
                  <button onClick={(e) => { e.stopPropagation(); loadDraft(campaign); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition text-sm font-medium">
                    <Edit3 className="w-3.5 h-3.5" /> Edit & Submit
                  </button>
                )}
                <button className="p-2 text-gray-500 hover:text-white transition">
                  <Eye className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500 pt-3 border-t border-gray-800">
              <span>{campaign.status === 'draft' ? 'Created' : 'Submitted'}: {campaign.submitted_at ? new Date(campaign.submitted_at).toLocaleDateString() : new Date(campaign.created_at).toLocaleDateString()}</span>
              {campaign.approved_at && <span>Approved: {new Date(campaign.approved_at).toLocaleDateString()}</span>}
              <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">Version {campaign.message_version}</span>
            </div>
          </div>
        ))}

        {campaigns.length === 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <Send className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-400 text-lg font-medium mb-2">No campaigns yet</p>
            <p className="text-gray-500 text-sm mb-6">Create your first campaign to get started</p>
            <button
              onClick={() => setShowModal(true)}
              className="px-5 py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-medium"
            >
              Create Campaign
            </button>
          </div>
        )}
      </div>

      {/* Campaign detail modal */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">{showDetail.name}</h2>
                <div className="flex items-center gap-2 mt-2">
                  {getStatusBadge(showDetail.status)}
                  <span className="px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-400">{showDetail.type}</span>
                </div>
              </div>
              <button onClick={() => setShowDetail(null)} className="p-2 text-gray-400 hover:text-white transition">
                <X className="w-6 h-6" />
              </button>
            </div>

            {showDetail.message_template && (
              <div className="mb-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-medium text-gray-300">Message Template</span>
                </div>
                <p className="text-gray-400 text-sm whitespace-pre-wrap">{showDetail.message_template}</p>
              </div>
            )}

            {showDetail.file_name && showDetail.file_url && (
              <div className="mb-4 bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
                {getFileType(showDetail.file_name) === 'image' ? (
                  <img src={showDetail.file_url} alt={showDetail.file_name} className="w-full h-48 object-cover" />
                ) : getFileType(showDetail.file_name) === 'video' ? (
                  <video src={showDetail.file_url} controls className="w-full h-48 object-cover bg-black" />
                ) : (
                  <div className="flex items-center gap-3 p-3">
                    <Download className="w-5 h-5 text-blue-400" />
                    <p className="text-sm text-white">{showDetail.file_name}</p>
                  </div>
                )}
              </div>
            )}

            {/* Message Buttons */}
            {showDetail.message_buttons && Array.isArray(showDetail.message_buttons) && (showDetail.message_buttons as any[]).length > 0 && (
              <div className="mb-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                <p className="text-xs text-gray-500 mb-2">Message Buttons</p>
                <div className="flex flex-wrap gap-2">
                  {(showDetail.message_buttons as any[]).map((btn: any, idx: number) => (
                    <span key={idx} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                      btn.type === 'quick_reply' ? 'bg-emerald-500/20 text-emerald-400' :
                      btn.type === 'url' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {btn.type === 'url' ? <ExternalLink className="w-3 h-3" /> : btn.type === 'phone' ? <Phone className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
                      {btn.text}
                      {btn.type === 'url' && btn.url && <span className="text-gray-500 ml-1">({btn.url})</span>}
                      {btn.type === 'phone' && btn.phone_number && <span className="text-gray-500 ml-1">({btn.phone_number})</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Audience Selection Info */}
            {showDetail.selected_audience && (
              <div className="mb-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium text-gray-300">Audience Selection</span>
                </div>
                <p className="text-sm text-gray-400 capitalize">
                  {(showDetail.selected_audience as any).mode === 'all' ? 'All contacts' :
                   (showDetail.selected_audience as any).mode === 'source' ? `Source: ${(showDetail.selected_audience as any).source_filter}` :
                   (showDetail.selected_audience as any).mode === 'campaign' ? `Campaign filter` :
                   (showDetail.selected_audience as any).mode === 'tag' ? `Tag filter` :
                   (showDetail.selected_audience as any).mode || 'All contacts'}
                </p>
              </div>
            )}

            {showDetail.status === 'rejected' && showDetail.rejection_reason && (
              <div className="mb-4 p-4 bg-red-500/10 rounded-lg border border-red-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-4 h-4 text-red-400" />
                  <span className="text-sm font-medium text-red-400">Rejection Reason</span>
                </div>
                <p className="text-red-300 text-sm">{showDetail.rejection_reason}</p>
              </div>
            )}

            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-gray-400 text-xs mb-1">Total Contacts</p>
                <p className="text-white text-xl font-bold">{(showDetail.total_numbers || 0).toLocaleString()}</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-gray-400 text-xs mb-1">Sent</p>
                <p className="text-emerald-400 text-xl font-bold">{showDetail.messages_sent.toLocaleString()}</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-gray-400 text-xs mb-1">Failed</p>
                <p className="text-red-400 text-xl font-bold">{showDetail.messages_failed.toLocaleString()}</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-gray-400 text-xs mb-1">Delivery Rate</p>
                <p className="text-green-400 text-xl font-bold">
                  {(() => {
                    const total = showDetail.messages_sent + showDetail.messages_failed;
                    return total > 0 ? ((showDetail.messages_sent / total) * 100).toFixed(1) : '0.0';
                  })()}%
                </p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-gray-400 text-xs mb-1">Failure Rate</p>
                <p className="text-red-400 text-xl font-bold">
                  {(() => {
                    const total = showDetail.messages_sent + showDetail.messages_failed;
                    return total > 0 ? ((showDetail.messages_failed / total) * 100).toFixed(1) : '0.0';
                  })()}%
                </p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-gray-400 text-xs mb-1">Version</p>
                <p className="text-white text-xl font-bold">{showDetail.message_version}</p>
              </div>
            </div>

            {/* Progress bar */}
            {showDetail.total_numbers > 0 && (
              <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Campaign Progress</span>
                  <span>{Math.min(100, ((showDetail.messages_sent + showDetail.messages_failed) / showDetail.total_numbers * 100)).toFixed(1)}%</span>
                </div>
                <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (showDetail.messages_sent + showDetail.messages_failed) / showDetail.total_numbers * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Campaign Contacts */}
            <div className="mb-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium text-gray-300">Campaign Contacts ({detailContacts.length.toLocaleString()})</span>
                </div>
                {detailContacts.length > 0 && (
                  <button onClick={() => { const nums = detailContacts.map(c => c.phone_number).join('\n'); copyToClipboard(nums, 'all-nums'); }}
                    className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-xs hover:bg-blue-500/20 transition">
                    <Copy className="w-3 h-3" />
                    {copiedFeedback === 'all-nums' ? 'Copied!' : 'Copy All'}
                  </button>
                )}
              </div>
              {loadingDetailContacts ? (
                <p className="text-gray-500 text-sm">Loading contacts...</p>
              ) : detailContacts.length === 0 ? (
                <p className="text-gray-500 text-sm">No contacts found</p>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                  {detailContacts.map((c, idx) => (
                    <div key={idx} className="flex items-center justify-between px-3 py-1.5 bg-gray-900/50 rounded-lg hover:bg-gray-900 transition group">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-600 text-xs w-8">{idx + 1}.</span>
                        <span className="text-white font-mono text-sm">{c.phone_number}</span>
                        {c.name && <span className="text-gray-500 text-xs">({c.name})</span>}
                      </div>
                      <button onClick={() => copyToClipboard(c.phone_number, `p-${idx}`)}
                        className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-white transition p-1">
                        {copiedFeedback === `p-${idx}` ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs text-gray-500 pt-3 border-t border-gray-800">
              <span>Submitted: {showDetail.submitted_at ? new Date(showDetail.submitted_at).toLocaleString() : new Date(showDetail.created_at).toLocaleString()}</span>
              {showDetail.approved_at && <span>Approved: {new Date(showDetail.approved_at).toLocaleString()}</span>}
              {showDetail.start_time && <span>Started: {new Date(showDetail.start_time).toLocaleString()}</span>}
              {showDetail.end_time && <span>Ended: {new Date(showDetail.end_time).toLocaleString()}</span>}
            </div>
          </div>
        </div>
      )}

      {/* Create campaign modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Submit New Campaign</h2>
              <button onClick={() => { setShowModal(false); clearFile(); }} className="p-2 text-gray-400 hover:text-white transition">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Campaign Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Campaign Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g. Diwali Offer 2026"
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Type + Version row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Campaign Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Promotion">Promotion</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Offer">Offer</option>
                    <option value="Reminder">Reminder</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">A/B Testing</label>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !formData.ab_enabled;
                      setFormData({
                        ...formData,
                        ab_enabled: next,
                        variant_b: next ? { template_id: '', template_language: 'en_US', variable_mapping: {}, message_template: '', header_override_url: '' } : null,
                        ab_split: 50,
                      });
                    }}
                    className={`w-full py-2.5 rounded-lg font-medium text-sm transition ${
                      formData.ab_enabled
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-800 border border-gray-700 text-gray-400 hover:text-white'
                    }`}
                  >
                    {formData.ab_enabled ? '✅ A/B Test Enabled' : 'Enable A/B Test'}
                  </button>
                </div>
              </div>

              {/* Message Mode Toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Message Mode</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setFormData({ ...formData, message_mode: 'template' })}
                    className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition ${formData.message_mode === 'template' ? 'bg-emerald-500 text-white' : 'bg-gray-800 border border-gray-700 text-gray-400 hover:text-white'}`}>
                    📋 Approved Template
                  </button>
                  <button type="button" onClick={() => setFormData({ ...formData, message_mode: 'freetext' })}
                    className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition ${formData.message_mode === 'freetext' ? 'bg-emerald-500 text-white' : 'bg-gray-800 border border-gray-700 text-gray-400 hover:text-white'}`}>
                    ✍️ Free Text
                  </button>
                </div>
              </div>

              {/* Template Mode */}
              {formData.message_mode === 'template' && (
                <>
                  {/* Variant A Label */}
                  {formData.ab_enabled && (
                    <div className="flex items-center gap-2 pt-1">
                      <div className="h-px flex-1 bg-emerald-500/30" />
                      <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Variant A</span>
                      <div className="h-px flex-1 bg-emerald-500/30" />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Select Template *</label>
                    <select
                      value={formData.template_id}
                      onChange={(e) => {
                        const tpl = approvedTemplates.find(t => t.id === e.target.value);
                        setFormData({
                          ...formData,
                          template_id: e.target.value,
                          template_name: tpl?.name || '',
                          template_language: tpl?.language || 'en_US',
                          message_template: tpl?.name || '',
                          variable_mapping: {},
                        });
                      }}
                      className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    >
                      <option value="">Select an approved template...</option>
                      {approvedTemplates.map((t) => (
                        <option key={t.id} value={t.id}>{t.name} ({t.language})</option>
                      ))}
                    </select>
                    {approvedTemplates.length === 0 && (
                      <p className="text-yellow-400 text-xs mt-1">No approved templates found. Ask your admin to sync templates.</p>
                    )}
                  </div>

                  {selectedTemplate && (
                    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                      <div className="flex items-center gap-2 mb-3">
                        <Eye className="w-4 h-4 text-gray-400" />
                        <p className="text-gray-300 text-sm font-medium">Template Preview</p>
                      </div>
                      {(() => {
                        const hdrFmt = getHeaderFormat(selectedTemplate.components ?? undefined);
                        if (hdrFmt === 'IMAGE' || hdrFmt === 'VIDEO' || hdrFmt === 'DOCUMENT') {
                          const sampleUrl = formData.header_override_url || selectedTemplate.header_sample_url;
                          return (
                            <div className="mb-3">
                              {sampleUrl && hdrFmt === 'IMAGE' ? (
                                <img src={sampleUrl} alt="Header" className="rounded-lg max-h-32 w-auto border border-gray-600" />
                              ) : (
                                <div className="flex items-center gap-2 text-gray-400 text-xs">
                                  <ImageIcon className="w-4 h-4" />
                                  <span>{hdrFmt} header — {sampleUrl ? 'sample available' : 'no sample'}</span>
                                </div>
                              )}
                              <p className="text-gray-500 text-xs mt-1">{formData.header_override_url ? 'Using custom image' : 'Using approved sample'}</p>
                            </div>
                          );
                        }
                        return null;
                      })()}
                      {selectedTemplate.body_text && (
                        <p className="text-gray-300 text-sm whitespace-pre-wrap mb-2">{selectedTemplate.body_text}</p>
                      )}
                      {(() => {
                        const fc = (selectedTemplate.components ?? []).find((c: any) => String(c.type).toUpperCase() === 'FOOTER');
                        return fc?.text ? <p className="text-gray-500 text-xs italic">{fc.text}</p> : null;
                      })()}
                      {(() => {
                        const bc = (selectedTemplate.components ?? []).find((c: any) => String(c.type).toUpperCase() === 'BUTTONS');
                        if (!bc?.buttons?.length) return null;
                        return (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {bc.buttons.map((b: any, i: number) => (
                              <span key={i} className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-xs border border-gray-600">{b.text || b.type}</span>
                            ))}
                          </div>
                        );
                      })()}
                      <div className="mt-2 pt-2 border-t border-gray-700">
                        <p className="text-gray-500 text-xs">
                          {templateVariables.length === 0 ? '✅ No variables — ready to send' : `${templateVariables.length} variable${templateVariables.length > 1 ? 's' : ''} to map`}
                        </p>
                      </div>
                    </div>
                  )}

                  {templateVariables.length > 0 && (
                    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                      <p className="text-gray-300 text-sm font-medium mb-2">Variable Mapping</p>
                      <p className="text-gray-500 text-xs mb-3">Map each template variable to a contact field</p>
                      <div className="grid grid-cols-2 gap-3">
                        {templateVariables.map((v) => {
                          const num = v.replace(/[{}]/g, '');
                          return (
                            <div key={v} className="flex items-center gap-2">
                              <span className="text-gray-400 text-sm font-mono w-12">{v}</span>
                              <span className="text-gray-500">→</span>
                              <select
                                value={formData.variable_mapping[num] || ''}
                                onChange={(e) => setFormData({ ...formData, variable_mapping: { ...formData.variable_mapping, [num]: e.target.value } })}
                                className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-1.5 border border-gray-600 text-sm"
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

                  {selectedTemplate && (() => {
                    const hdrFmt = getHeaderFormat(selectedTemplate.components ?? undefined);
                    if (hdrFmt === 'IMAGE' || hdrFmt === 'VIDEO' || hdrFmt === 'DOCUMENT') {
                      return (
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Header Media Override (Optional)</label>
                          <input
                            type="url"
                            value={formData.header_override_url}
                            onChange={(e) => setFormData({ ...formData, header_override_url: e.target.value })}
                            placeholder="https://... (leave empty to use approved sample)"
                            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Variant B Section */}
                  {formData.ab_enabled && formData.variant_b && (
                    <>
                      <div className="flex items-center gap-2 pt-1">
                        <div className="h-px flex-1 bg-purple-500/30" />
                        <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Variant B</span>
                        <div className="h-px flex-1 bg-purple-500/30" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Select Template (B) *</label>
                        <select
                          value={formData.variant_b.template_id}
                          onChange={(e) => {
                            const tpl = approvedTemplates.find(t => t.id === e.target.value);
                            setFormData({
                              ...formData,
                              variant_b: {
                                ...formData.variant_b!,
                                template_id: e.target.value,
                                template_language: tpl?.language || 'en_US',
                                message_template: tpl?.name || '',
                                variable_mapping: {},
                              },
                            });
                          }}
                          className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          required
                        >
                          <option value="">Select an approved template...</option>
                          {approvedTemplates.map((t) => (
                            <option key={t.id} value={t.id}>{t.name} ({t.language})</option>
                          ))}
                        </select>
                      </div>

                      {selectedTemplateB && (
                        <div className="bg-gray-800/50 rounded-lg p-4 border border-purple-500/30">
                          <div className="flex items-center gap-2 mb-3">
                            <Eye className="w-4 h-4 text-purple-400" />
                            <p className="text-gray-300 text-sm font-medium">Variant B Preview</p>
                          </div>
                          {(() => {
                            const hdrFmt = getHeaderFormat(selectedTemplateB.components ?? undefined);
                            if (hdrFmt === 'IMAGE' || hdrFmt === 'VIDEO' || hdrFmt === 'DOCUMENT') {
                              const sampleUrl = formData.variant_b!.header_override_url || selectedTemplateB.header_sample_url;
                              return (
                                <div className="mb-3">
                                  {sampleUrl && hdrFmt === 'IMAGE' ? (
                                    <img src={sampleUrl} alt="Header B" className="rounded-lg max-h-32 w-auto border border-purple-600" />
                                  ) : (
                                    <div className="flex items-center gap-2 text-gray-400 text-xs">
                                      <ImageIcon className="w-4 h-4" />
                                      <span>{hdrFmt} header — {sampleUrl ? 'sample available' : 'no sample'}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            return null;
                          })()}
                          {selectedTemplateB.body_text && (
                            <p className="text-gray-300 text-sm whitespace-pre-wrap mb-2">{selectedTemplateB.body_text}</p>
                          )}
                          {(() => {
                            const fc = (selectedTemplateB.components ?? []).find((c: any) => String(c.type).toUpperCase() === 'FOOTER');
                            return fc?.text ? <p className="text-gray-500 text-xs italic">{fc.text}</p> : null;
                          })()}
                          <div className="mt-2 pt-2 border-t border-gray-700">
                            <p className="text-gray-500 text-xs">
                              {templateVariablesB.length === 0 ? '✅ No variables — ready to send' : `${templateVariablesB.length} variable${templateVariablesB.length > 1 ? 's' : ''} to map`}
                            </p>
                          </div>
                        </div>
                      )}

                      {templateVariablesB.length > 0 && (
                        <div className="bg-gray-800/50 rounded-lg p-4 border border-purple-500/30">
                          <p className="text-gray-300 text-sm font-medium mb-2">Variable Mapping (B)</p>
                          <p className="text-gray-500 text-xs mb-3">Map each template variable to a contact field</p>
                          <div className="grid grid-cols-2 gap-3">
                            {templateVariablesB.map((v) => {
                              const num = v.replace(/[{}]/g, '');
                              return (
                                <div key={v} className="flex items-center gap-2">
                                  <span className="text-gray-400 text-sm font-mono w-12">{v}</span>
                                  <span className="text-gray-500">→</span>
                                  <select
                                    value={formData.variant_b!.variable_mapping[num] || ''}
                                    onChange={(e) => setFormData({
                                      ...formData,
                                      variant_b: {
                                        ...formData.variant_b!,
                                        variable_mapping: { ...formData.variant_b!.variable_mapping, [num]: e.target.value },
                                      },
                                    })}
                                    className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-1.5 border border-gray-600 text-sm"
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

                      {selectedTemplateB && (() => {
                        const hdrFmt = getHeaderFormat(selectedTemplateB.components ?? undefined);
                        if (hdrFmt === 'IMAGE' || hdrFmt === 'VIDEO' || hdrFmt === 'DOCUMENT') {
                          return (
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">Header Media Override B (Optional)</label>
                              <input
                                type="url"
                                value={formData.variant_b!.header_override_url}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  variant_b: { ...formData.variant_b!, header_override_url: e.target.value },
                                })}
                                placeholder="https://... (leave empty to use approved sample)"
                                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                              />
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {/* A/B Split Slider */}
                      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                        <label className="block text-sm font-medium text-gray-300 mb-3">Traffic Split</label>
                        <div className="flex items-center gap-4">
                          <span className="text-emerald-400 text-sm font-semibold w-16 text-right">A: {formData.ab_split}%</span>
                          <div className="flex-1 relative">
                            <div className="absolute inset-0 flex items-center pointer-events-none">
                              <div className="w-full h-2 rounded-full overflow-hidden flex">
                                <div className="bg-emerald-500 transition-all" style={{ width: `${formData.ab_split}%` }} />
                                <div className="bg-purple-500 transition-all" style={{ width: `${100 - formData.ab_split}%` }} />
                              </div>
                            </div>
                            <input
                              type="range"
                              min={10}
                              max={90}
                              step={5}
                              value={formData.ab_split}
                              onChange={(e) => setFormData({ ...formData, ab_split: parseInt(e.target.value) })}
                              className="relative w-full h-2 appearance-none bg-transparent cursor-pointer z-10 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-gray-400 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-gray-400 [&::-moz-range-thumb]:cursor-pointer"
                            />
                          </div>
                          <span className="text-purple-400 text-sm font-semibold w-16">B: {100 - formData.ab_split}%</span>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Free Text Mode */}
              {formData.message_mode === 'freetext' && (
                <>
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                    <p className="text-amber-400 text-xs">⚠️ Free-text messages only deliver to contacts who messaged you in the last 24h. Use an approved template for broadcasts.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Message Template</label>
                    <textarea
                      value={formData.message_template}
                      onChange={(e) => setFormData({ ...formData, message_template: e.target.value })}
                      rows={4}
                      placeholder="Enter the message template for this campaign..."
                      className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Template Media (Optional)</label>
                    {previewUrl ? (
                      <div className="relative bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                        {selectedFile?.type.startsWith('image/') ? (
                          <img src={previewUrl} alt="Preview" className="w-full h-40 object-cover" />
                        ) : (
                          <video src={previewUrl} controls className="w-full h-40 object-cover bg-black" />
                        )}
                        <button type="button" onClick={clearFile} className="absolute top-2 right-2 px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-xs">Remove</button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-32 px-4 bg-gray-800 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-gray-600 transition">
                        <Upload className="w-6 h-6 text-gray-500 mb-2" />
                        <span className="text-gray-400 text-sm">Click to upload image or video</span>
                        <span className="text-gray-600 text-xs mt-1">PNG, JPG, GIF, MP4, WEBM</span>
                        <input type="file" accept="image/*,video/*" onChange={handleFileSelect} className="hidden" />
                      </label>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Message Buttons (Optional)</label>
                    <p className="text-xs text-gray-500 mb-3">Add interactive buttons like WhatsApp Business. Up to 3 quick reply + 2 action buttons.</p>
                    <div className="space-y-2 mb-3">
                      {formData.message_buttons.map((btn, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2.5 bg-gray-800 rounded-lg border border-gray-700">
                          {btn.type === 'quick_reply' && <MessageSquare className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                          {btn.type === 'url' && <ExternalLink className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                          {btn.type === 'phone' && <Phone className="w-4 h-4 text-green-400 flex-shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm truncate">{btn.text}</p>
                            {btn.type === 'url' && <p className="text-xs text-gray-500 truncate">{btn.url}</p>}
                            {btn.type === 'phone' && <p className="text-xs text-gray-500">{btn.phone_number}</p>}
                          </div>
                          <button type="button" onClick={() => {
                            const next = [...formData.message_buttons];
                            next.splice(idx, 1);
                            setFormData({ ...formData, message_buttons: next });
                          }} className="text-red-400 hover:text-red-300 flex-shrink-0"><X className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                    {formData.message_buttons.length < 5 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.message_buttons.filter(b => b.type === 'quick_reply').length < 3 && (
                          <button type="button" onClick={() => {
                            const text = prompt('Quick Reply button text (e.g. "Interested", "Not Now")');
                            if (text?.trim()) setFormData({ ...formData, message_buttons: [...formData.message_buttons, { type: 'quick_reply', text: text.trim() }] });
                          }} className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition text-xs font-medium flex items-center gap-1">
                            <Plus className="w-3 h-3" /> Quick Reply
                          </button>
                        )}
                        {formData.message_buttons.filter(b => b.type === 'url').length < 1 && (
                          <button type="button" onClick={() => {
                            const text = prompt('Button label (e.g. "Visit Website")');
                            if (text?.trim()) {
                              const url = prompt('Button URL (e.g. https://example.com)');
                              if (url?.trim()) setFormData({ ...formData, message_buttons: [...formData.message_buttons, { type: 'url', text: text.trim(), url: url.trim() }] });
                            }
                          }} className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition text-xs font-medium flex items-center gap-1">
                            <Plus className="w-3 h-3" /> URL Button
                          </button>
                        )}
                        {formData.message_buttons.filter(b => b.type === 'phone').length < 1 && (
                          <button type="button" onClick={() => {
                            const text = prompt('Button label (e.g. "Call Us")');
                            if (text?.trim()) {
                              const phone = prompt('Phone number (e.g. +919876543210)');
                              if (phone?.trim()) setFormData({ ...formData, message_buttons: [...formData.message_buttons, { type: 'phone', text: text.trim(), phone_number: phone.trim() }] });
                            }
                          }} className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition text-xs font-medium flex items-center gap-1">
                            <Plus className="w-3 h-3" /> Call Button
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  {(formData.message_template || formData.message_buttons.length > 0) && (
                    <div className="p-4 bg-[#0b141a] rounded-xl border border-gray-700">
                      <p className="text-xs text-gray-500 mb-2 font-medium">📱 WhatsApp Preview</p>
                      <div className="bg-[#005c4b] rounded-lg p-3 max-w-[280px]">
                        {previewUrl && selectedFile?.type.startsWith('image/') && (
                          <img src={previewUrl} alt="" className="w-full h-32 object-cover rounded-md mb-2" />
                        )}
                        <p className="text-white text-sm whitespace-pre-wrap">{formData.message_template || 'Your message here...'}</p>
                        <p className="text-right text-[10px] text-gray-300 mt-1">12:00 PM ✓✓</p>
                      </div>
                      {formData.message_buttons.length > 0 && (
                        <div className="mt-1 max-w-[280px] space-y-1">
                          {formData.message_buttons.filter(b => b.type === 'quick_reply').map((btn, i) => (
                            <div key={i} className="bg-[#1f2c34] rounded-lg py-2 text-center text-[#53bdeb] text-sm font-medium">{btn.text}</div>
                          ))}
                          {formData.message_buttons.filter(b => b.type !== 'quick_reply').map((btn, i) => (
                            <div key={i} className="bg-[#1f2c34] rounded-lg py-2 text-center text-[#53bdeb] text-sm font-medium flex items-center justify-center gap-1">
                              {btn.type === 'url' ? <ExternalLink className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
                              {btn.text}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Contact Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Select Contacts *</label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[
                    { value: 'all', label: 'All Contacts' },
                    { value: 'source', label: 'By Source' },
                    { value: 'campaign', label: 'By Campaign' },
                    { value: 'tag', label: 'By Tag' },
                    { value: 'manual', label: '📋 Paste Numbers' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, contact_selection: opt.value as ContactSelectionMode })}
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition ${
                        formData.contact_selection === opt.value
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-gray-800 border border-gray-700 text-gray-400 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {formData.contact_selection === 'source' && (
                  <select
                    value={formData.contact_source_filter}
                    onChange={(e) => setFormData({ ...formData, contact_source_filter: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select source...</option>
                    {availableSources.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                )}

                {formData.contact_selection === 'campaign' && (
                  <select
                    value={formData.contact_campaign_filter}
                    onChange={(e) => setFormData({ ...formData, contact_campaign_filter: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select campaign...</option>
                    {existingCampaigns.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}

                {formData.contact_selection === 'tag' && (
                  <select
                    value={formData.contact_tag_filter}
                    onChange={(e) => setFormData({ ...formData, contact_tag_filter: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select tag...</option>
                    {availableTags.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                )}

                {formData.contact_selection === 'manual' && (
                  <div>
                    <textarea
                      value={formData.manual_numbers_raw}
                      onChange={(e) => setFormData({ ...formData, manual_numbers_raw: e.target.value })}
                      rows={5}
                      placeholder="Paste phone numbers here — one per line, or comma/space separated.\n\nExamples:\n9876543210\n+91 98765 43210\n919876543210"
                      className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none font-mono text-sm"
                    />
                    <div className="flex gap-4 mt-1">
                      <p className="text-emerald-400 text-xs">{manualParsed.valid.length} valid number{manualParsed.valid.length !== 1 ? 's' : ''}</p>
                      {manualParsed.skipped > 0 && (
                        <p className="text-amber-400 text-xs">{manualParsed.skipped} skipped (invalid)</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-2 px-3 py-2 bg-gray-800/50 rounded-lg">
                  <p className="text-sm text-gray-400">
                    Selected contacts: <span className="text-white font-semibold">{contactCount.toLocaleString()}</span>
                  </p>
                </div>
              </div>

              {/* Schedule (optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Schedule (Optional)</label>
                <input
                  type="datetime-local"
                  value={formData.scheduled_start}
                  onChange={(e) => setFormData({ ...formData, scheduled_start: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty to start as soon as approved</p>
              </div>

              {/* Auto-Retry Toggle */}
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-300">Auto-retry failed messages</p>
                    <p className="text-xs text-gray-500 mt-0.5">Automatically retry messages that failed to deliver</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      auto_retry_hours: formData.auto_retry_hours !== null ? null : 4,
                    })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      formData.auto_retry_hours !== null ? 'bg-emerald-500' : 'bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.auto_retry_hours !== null ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
                {formData.auto_retry_hours !== null && (
                  <div className="mt-3 flex items-center gap-3">
                    <label className="text-sm text-gray-400">Retry after</label>
                    <input
                      type="number"
                      min={1}
                      max={72}
                      value={formData.auto_retry_hours}
                      onChange={(e) => setFormData({ ...formData, auto_retry_hours: parseInt(e.target.value) || 4 })}
                      className="w-20 px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-gray-400">hours</span>
                  </div>
                )}
              </div>

              {/* Info box */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <p className="text-blue-400 text-sm">
                  Your campaign will be reviewed by an admin before it starts running. You'll be notified once it's approved or if changes are needed.
                </p>
              </div>

              {/* Submit buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingDraftId(null); clearFile(); }}
                  className="px-5 py-2.5 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e as any, true)}
                  disabled={submitting || uploadingFile || !formData.name.trim()}
                  className="px-5 py-2.5 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  Save Draft
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploadingFile || contactCount === 0}
                  className="px-5 py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {submitting || uploadingFile ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Submit for Approval
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
