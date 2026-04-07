import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, CreditCard as Edit2, Play, Pause, CheckCircle, XCircle, Lock, Upload, Download, Image as ImageIcon, Video, MessageSquare } from 'lucide-react';
import type { Database } from '../lib/database.types';

type Campaign = Database['public']['Tables']['campaigns']['Row'] & {
  profiles?: { full_name: string; email: string } | null;
};

export function Campaigns() {
  const { isAdmin, user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'Promotion' as 'Promotion' | 'Follow-up' | 'Offer' | 'Reminder',
    priority: 1,
    message_version: 'A' as 'A' | 'B',
    daily_limit: 1000,
    message_template: '',
    status: 'Running' as 'Running' | 'Paused' | 'Completed' | 'Processing' | 'pending_approval' | 'approved' | 'rejected' | 'Cancelled',
    start_time: '',
    end_time: '',
    messages_sent: 0,
    messages_failed: 0,
    auto_increment_enabled: false,
    auto_increment_total: 0,
    auto_increment_sent_ratio: 70,
    auto_increment_failed_ratio: 30,
    auto_increment_interval: 5,
    auto_increment_complete_at: '',
  });

  const fetchCampaigns = async () => {
    setLoading(true);
    // Admin sees ALL users' campaigns (RLS admin override policy)
    const { data } = await supabase
      .from('campaigns')
      .select('*, profiles!campaigns_created_by_fkey(full_name, email)')
      .order('created_at', { ascending: false });
    setCampaigns((data || []) as Campaign[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchCampaigns();

    const channel = supabase
      .channel('campaigns-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'campaigns',
        },
        () => {
          fetchCampaigns();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);




  const handleFileUpload = async (campaignId: string): Promise<{ fileUrl: string; fileName: string } | null> => {
    if (!selectedFile) return null;

    try {
      setUploadingFile(true);
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${campaignId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('campaign-files')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('campaign-files')
        .getPublicUrl(filePath);

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
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    try {
      let campaignData = {
        ...formData,
        start_time: formData.start_time ? new Date(formData.start_time).toISOString() : null,
        end_time: formData.end_time ? new Date(formData.end_time).toISOString() : null,
        auto_increment_complete_at: formData.auto_increment_complete_at ? new Date(formData.auto_increment_complete_at).toISOString() : null,
      };

      if (editingCampaign) {
        if (selectedFile) {
          const fileData = await handleFileUpload(editingCampaign.id);
          if (fileData) {
            campaignData = {
              ...campaignData,
              file_url: fileData.fileUrl,
              file_name: fileData.fileName,
            } as any;
          }
        }

        const { error } = await supabase
          .from('campaigns')
          .update(campaignData)
          .eq('id', editingCampaign.id);
        if (error) throw error;
      } else {
        const { data: newCampaign, error: insertError } = await supabase
          .from('campaigns')
          .insert({
            ...campaignData,
            user_id: user!.id,
            created_by: user?.id,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        if (selectedFile && newCampaign) {
          const fileData = await handleFileUpload(newCampaign.id);
          if (fileData) {
            await supabase
              .from('campaigns')
              .update({
                file_url: fileData.fileUrl,
                file_name: fileData.fileName,
              })
              .eq('id', newCampaign.id);
          }
        }
      }

      setShowModal(false);
      setEditingCampaign(null);
      clearFile();
      setFormData({
        name: '',
        type: 'Promotion',
        priority: 1,
        message_version: 'A',
        daily_limit: 1000,
        message_template: '',
        status: 'Running',
        start_time: '',
        end_time: '',
        messages_sent: 0,
        messages_failed: 0,
        auto_increment_enabled: false,
        auto_increment_total: 0,
        auto_increment_sent_ratio: 70,
        auto_increment_failed_ratio: 30,
        auto_increment_interval: 5,
        auto_increment_complete_at: '',
      });
      fetchCampaigns();
    } catch (error: any) {
      alert('Error saving campaign: ' + error.message);
    }
  };

  const downloadFile = async (fileUrl: string, fileName: string) => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      alert('Error downloading file: ' + error.message);
    }
  };

  const updateCampaignStatus = async (
    campaignId: string,
    status: 'Running' | 'Paused' | 'Completed' | 'Cancelled'
  ) => {
    if (!isAdmin) return;

    const campaign = campaigns.find((c) => c.id === campaignId);
    const updates: any = { status };

    if (status === 'Running' && !campaign?.start_time) {
      updates.start_time = new Date().toISOString();
      updates.auto_increment_enabled = true;
      updates.auto_increment_total = campaign?.total_numbers || 1000;
      updates.auto_increment_sent_ratio = 70;
      updates.auto_increment_failed_ratio = 30;
    }
    if (status === 'Paused') {
      updates.auto_increment_enabled = false;
    }
    if (status === 'Completed') {
      updates.end_time = new Date().toISOString();
      updates.auto_increment_enabled = false;
    }
    if (status === 'Cancelled') {
      updates.end_time = new Date().toISOString();
      updates.auto_increment_enabled = false;
    }

    const { error } = await supabase.from('campaigns').update(updates).eq('id', campaignId);

    if (!error) {
      fetchCampaigns();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Running':
        return 'bg-green-500/20 text-green-400';
      case 'Paused':
        return 'bg-amber-500/20 text-amber-400';
      case 'Completed':
        return 'bg-gray-500/20 text-gray-400';
      case 'Cancelled':
        return 'bg-rose-500/20 text-rose-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const openEditModal = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setFormData({
      name: campaign.name,
      type: campaign.type,
      priority: campaign.priority,
      message_version: campaign.message_version,
      daily_limit: campaign.daily_limit,
      message_template: campaign.message_template || '',
      status: campaign.status,
      start_time: campaign.start_time ? new Date(campaign.start_time).toISOString().slice(0, 16) : '',
      end_time: campaign.end_time ? new Date(campaign.end_time).toISOString().slice(0, 16) : '',
      messages_sent: campaign.messages_sent,
      messages_failed: campaign.messages_failed,
      auto_increment_enabled: campaign.auto_increment_enabled || false,
      auto_increment_total: campaign.auto_increment_total || 0,
      auto_increment_sent_ratio: campaign.auto_increment_sent_ratio || 70,
      auto_increment_failed_ratio: campaign.auto_increment_failed_ratio || 30,
      auto_increment_interval: campaign.auto_increment_interval || 5,
      auto_increment_complete_at: campaign.auto_increment_complete_at ? new Date(campaign.auto_increment_complete_at).toISOString().slice(0, 16) : '',
    });
    clearFile();
    setShowModal(true);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">All Campaigns</h1>
          <p className="text-gray-400">Manage all users' WhatsApp marketing campaigns</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              setEditingCampaign(null);
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition"
          >
            <Plus className="w-4 h-4" />
            New Campaign
          </button>
        )}
      </div>

      <div className="grid gap-4">
        {campaigns.map((campaign) => (
          <div
            key={campaign.id}
            className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-semibold text-white">{campaign.name}</h3>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(campaign.status)}`}>
                    {campaign.status}
                  </span>
                  <span className="px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-400">
                    {campaign.type}
                  </span>
                  {campaign.is_locked && (
                    <Lock className="w-4 h-4 text-gray-500" />
                  )}
                </div>
                {campaign.profiles && (
                  <p className="text-gray-400 text-sm mb-1">
                    Submitted by: <span className="text-gray-300">{campaign.profiles.full_name || campaign.profiles.email}</span>
                  </p>
                )}

                {campaign.message_template && (
                  <div className="mb-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm font-medium text-gray-300">Message Template</span>
                    </div>
                    <p className="text-sm text-gray-400 whitespace-pre-wrap">{campaign.message_template}</p>
                  </div>
                )}

                {campaign.file_name && campaign.file_url && (
                  <div className="mb-3 bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
                    {getFileType(campaign.file_name) === 'image' ? (
                      <div className="relative">
                        <img
                          src={campaign.file_url}
                          alt={campaign.file_name}
                          className="w-full h-64 object-cover"
                        />
                        <div className="absolute top-3 right-3">
                          <button
                            onClick={() => downloadFile(campaign.file_url!, campaign.file_name!)}
                            className="flex items-center gap-2 px-3 py-2 bg-black/60 backdrop-blur-sm text-white rounded-lg hover:bg-black/80 transition text-sm"
                          >
                            <Download className="w-4 h-4" />
                            Download
                          </button>
                        </div>
                        <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-lg">
                          <ImageIcon className="w-4 h-4 text-blue-400" />
                          <span className="text-xs text-white">{campaign.file_name}</span>
                        </div>
                      </div>
                    ) : getFileType(campaign.file_name) === 'video' ? (
                      <div className="relative">
                        <video
                          src={campaign.file_url}
                          controls
                          className="w-full h-64 object-cover bg-black"
                        />
                        <div className="absolute top-3 right-3">
                          <button
                            onClick={() => downloadFile(campaign.file_url!, campaign.file_name!)}
                            className="flex items-center gap-2 px-3 py-2 bg-black/60 backdrop-blur-sm text-white rounded-lg hover:bg-black/80 transition text-sm"
                          >
                            <Download className="w-4 h-4" />
                            Download
                          </button>
                        </div>
                        <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-lg">
                          <Video className="w-4 h-4 text-purple-400" />
                          <span className="text-xs text-white">{campaign.file_name}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-3">
                        <Download className="w-5 h-5 text-blue-400" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{campaign.file_name}</p>
                          <p className="text-xs text-gray-400">Campaign file</p>
                        </div>
                        <button
                          onClick={() => downloadFile(campaign.file_url!, campaign.file_name!)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition text-sm"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Total Numbers</p>
                    <p className="text-white text-lg font-semibold">
                      {(campaign.total_numbers || (campaign.messages_sent + campaign.messages_failed)).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Messages Sent</p>
                    <p className="text-white text-lg font-semibold">{campaign.messages_sent.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Failed</p>
                    <p className="text-white text-lg font-semibold">{campaign.messages_failed.toLocaleString()}</p>
                    <p className="text-gray-500 text-xs mt-1">Meta API limits</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Pending Retry</p>
                    <p className="text-white text-lg font-semibold">{campaign.messages_failed.toLocaleString()}</p>
                    <p className="text-gray-500 text-xs mt-1">Retry every 30 min</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Delivery Rate</p>
                    <p className="text-green-400 text-lg font-semibold">
                      {(() => {
                        const totalAttempted = campaign.messages_sent + campaign.messages_failed;
                        return totalAttempted > 0
                          ? ((campaign.messages_sent / totalAttempted) * 100).toFixed(1)
                          : '0.0';
                      })()}%
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Failure Rate</p>
                    <p className="text-red-400 text-lg font-semibold">
                      {(() => {
                        const totalAttempted = campaign.messages_sent + campaign.messages_failed;
                        return totalAttempted > 0
                          ? ((campaign.messages_failed / totalAttempted) * 100).toFixed(1)
                          : '0.0';
                      })()}%
                    </p>
                  </div>
                </div>
              </div>
              {isAdmin && (
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => openEditModal(campaign)}
                    className="p-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition"
                    title="Edit Campaign"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {campaign.status === 'Running' ? (
                    <button
                      onClick={() => updateCampaignStatus(campaign.id, 'Paused')}
                      className="p-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition"
                      title="Pause Campaign"
                    >
                      <Pause className="w-4 h-4" />
                    </button>
                  ) : campaign.status === 'Paused' ? (
                    <button
                      onClick={() => updateCampaignStatus(campaign.id, 'Running')}
                      className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                      title="Resume Campaign"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                  ) : campaign.status === 'Completed' ? (
                    <button
                      onClick={() => updateCampaignStatus(campaign.id, 'Running')}
                      className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                      title="Restart Campaign"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                  ) : null}
                  {campaign.status !== 'Completed' && campaign.status !== 'Cancelled' && (
                    <button
                      onClick={() => updateCampaignStatus(campaign.id, 'Completed')}
                      className="p-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition"
                      title="Mark as Completed"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  )}
                  {(campaign.status === 'Running' || campaign.status === 'Paused') && (
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to cancel campaign "${campaign.name}"?`)) {
                          updateCampaignStatus(campaign.id, 'Cancelled');
                        }
                      }}
                      className="p-2 bg-rose-500/10 text-rose-400 rounded-lg hover:bg-rose-500/20 transition"
                      title="Cancel Campaign"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {campaigns.length === 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <p className="text-gray-400">No campaigns created yet</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingCampaign ? 'Edit Campaign' : 'Create New Campaign'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Campaign Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Message Template</label>
                  <textarea
                    value={formData.message_template}
                    onChange={(e) => setFormData({ ...formData, message_template: e.target.value })}
                    rows={4}
                    placeholder="Enter the message template for this campaign..."
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Upload Template Media (Image/Video)</label>
                  {previewUrl || (editingCampaign?.file_url && !selectedFile) ? (
                    <div className="relative bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                      {previewUrl ? (
                        selectedFile?.type.startsWith('image/') ? (
                          <img src={previewUrl} alt="Preview" className="w-full h-48 object-cover" />
                        ) : (
                          <video src={previewUrl} controls className="w-full h-48 object-cover bg-black" />
                        )
                      ) : editingCampaign?.file_url && (
                        getFileType(editingCampaign.file_name || '') === 'image' ? (
                          <img src={editingCampaign.file_url} alt="Current" className="w-full h-48 object-cover" />
                        ) : (
                          <video src={editingCampaign.file_url} controls className="w-full h-48 object-cover bg-black" />
                        )
                      )}
                      <button
                        type="button"
                        onClick={clearFile}
                        className="absolute top-3 right-3 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-48 px-4 py-3 bg-gray-800 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:bg-gray-750 transition">
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-gray-400 text-sm text-center">
                        Click to upload image or video
                      </span>
                      <span className="text-gray-500 text-xs mt-1">
                        PNG, JPG, GIF, MP4, WEBM
                      </span>
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Messages Sent</label>
                  <input
                    type="number"
                    value={formData.messages_sent}
                    onChange={(e) => setFormData({ ...formData, messages_sent: parseInt(e.target.value) || 0 })}
                    min="0"
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Messages Failed</label>
                  <input
                    type="number"
                    value={formData.messages_failed}
                    onChange={(e) => setFormData({ ...formData, messages_failed: parseInt(e.target.value) || 0 })}
                    min="0"
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Promotion">Promotion</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Offer">Offer</option>
                    <option value="Reminder">Reminder</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
                  <input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                    min="1"
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Message Version</label>
                  <select
                    value={formData.message_version}
                    onChange={(e) => setFormData({ ...formData, message_version: e.target.value as 'A' | 'B' })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="A">Version A</option>
                    <option value="B">Version B</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Daily Limit</label>
                  <input
                    type="number"
                    value={formData.daily_limit}
                    onChange={(e) => setFormData({ ...formData, daily_limit: parseInt(e.target.value) })}
                    min="1"
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Running">Running</option>
                    <option value="Paused">Paused</option>
                    <option value="Processing">Processing</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Start Time</label>
                  <input
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">End Time</label>
                  <input
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="col-span-2 pt-4 border-t border-gray-700">
                  <div className="flex items-center gap-3 mb-4">
                    <input
                      type="checkbox"
                      id="auto-increment"
                      checked={formData.auto_increment_enabled}
                      onChange={(e) => setFormData({ ...formData, auto_increment_enabled: e.target.checked })}
                      className="w-4 h-4 bg-gray-800 border-gray-700 rounded text-emerald-500 focus:ring-emerald-500"
                    />
                    <label htmlFor="auto-increment" className="text-sm font-medium text-gray-300">
                      Enable Auto-Increment for Sent/Failed Messages
                    </label>
                  </div>
                  {formData.auto_increment_enabled && (
                    <div className="grid grid-cols-2 gap-4 pl-7">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Total Contacts (Target)
                        </label>
                        <input
                          type="number"
                          value={formData.auto_increment_total}
                          onChange={(e) => setFormData({ ...formData, auto_increment_total: parseInt(e.target.value) || 0 })}
                          min="0"
                          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          placeholder="e.g., 10000"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Sent Ratio (%)
                        </label>
                        <input
                          type="number"
                          value={formData.auto_increment_sent_ratio}
                          onChange={(e) => {
                            const sent = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                            const failed = Math.max(0, 100 - sent);
                            setFormData({
                              ...formData,
                              auto_increment_sent_ratio: sent,
                              auto_increment_failed_ratio: failed
                            });
                          }}
                          min="0"
                          max="100"
                          step="0.01"
                          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Failed Ratio (%)
                        </label>
                        <input
                          type="number"
                          value={formData.auto_increment_failed_ratio}
                          onChange={(e) => {
                            const failed = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                            const sent = Math.max(0, 100 - failed);
                            setFormData({
                              ...formData,
                              auto_increment_sent_ratio: sent,
                              auto_increment_failed_ratio: failed
                            });
                          }}
                          min="0"
                          max="100"
                          step="0.01"
                          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Target Completion Time (Optional)
                        </label>
                        <input
                          type="datetime-local"
                          value={formData.auto_increment_complete_at}
                          onChange={(e) => setFormData({ ...formData, auto_increment_complete_at: e.target.value })}
                          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <p className="text-xs text-gray-400 mt-2">
                          Set when the campaign should automatically complete. Leave empty to complete only when target is reached.
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-gray-400">
                          The system will automatically increment sent ({formData.auto_increment_sent_ratio}%) and failed ({formData.auto_increment_failed_ratio}%) messages in real-time when the campaign is Running. The campaign will automatically complete when the target total is reached or when the completion time arrives.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingCampaign(null);
                    clearFile();
                  }}
                  disabled={uploadingFile}
                  className="flex-1 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingFile}
                  className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadingFile ? 'Uploading...' : editingCampaign ? 'Update Campaign' : 'Create Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
