import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  Bot, Plus, Play, Pause, BarChart2, CheckCircle2, AlertCircle, Search, 
  MessageSquare, Users, Tag, Smartphone, Filter, Image as ImageIcon,
  ChevronRight, ChevronLeft, Save, X, ShoppingBag, Target, Settings,
  Gift, Link as LinkIcon, RefreshCw, Send, Activity
} from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  goal: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  contacts: number;
  replied: number;
  converted: number;
  revenue: number;
  created_at: string;
}

interface Product {
  product_id: string;
  title: string;
  image_url: string;
}

interface Template {
  id: string;
  name: string;
  body_text: string;
  language: string;
  status: string;
}

interface TagType {
  id: string;
  name: string;
}

export function AIBroadcast() {
  const { user } = useAuth();
  
  const [view, setView] = useState<'list' | 'create'>('list');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);

  // Create Form State
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    goal: 'feedback',
    personality: 'friendly',
    language: 'English',
    selectedProducts: [] as any[],
    offerCode: '',
    offerDiscount: '',
    audienceType: 'all',
    audienceTags: [] as string[],
    audienceSource: '',
    manualNumbers: '',
    templateId: '',
    maxTurns: 15
  });

  // DB Data
  const [products, setProducts] = useState<Product[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);
  const [contactsCount, setContactsCount] = useState(0);

  useEffect(() => {
    if (user) {
      loadCampaigns();
    }
  }, [user]);

  useEffect(() => {
    if (view === 'create' && user) {
      loadCreateData();
    }
  }, [view, user]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getEdgeFunctionUrl = () => {
    return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-broadcast`;
  };

  const loadCampaigns = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const response = await fetch(getEdgeFunctionUrl(), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'list' })
      });
      
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.campaigns || []);
      }
    } catch (err) {
      console.error('Error loading campaigns:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCreateData = async () => {
    if (!user) return;
    
    // Load products
    const { data: productsData } = await supabase
      .from('shopify_product_images')
      .select('product_id, title, image_url')
      .eq('user_id', user.id);
      
    if (productsData) setProducts(productsData);

    // Load templates
    const { data: templatesData } = await supabase
      .from('templates')
      .select('id, name, body_text, language, status')
      .eq('status', 'approved');
      
    if (templatesData) setTemplates(templatesData);

    // Load tags
    const { data: tagsData } = await supabase
      .from('tags')
      .select('id, name')
      .eq('user_id', user.id);
      
    if (tagsData) setTags(tagsData);

    // Load contacts count
    const { count } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_blacklisted', false);
      
    if (count !== null) setContactsCount(count);
  };

  const handleCreateCampaign = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(getEdgeFunctionUrl(), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          action: 'create', 
          campaign: formData 
        })
      });

      if (response.ok) {
        showToast('Campaign created successfully!');
        setView('list');
        loadCampaigns();
      } else {
        throw new Error('Failed to create campaign');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleAction = async (action: 'launch' | 'pause' | 'resume', campaignId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(getEdgeFunctionUrl(), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action, campaign_id: campaignId })
      });

      if (response.ok) {
        showToast(`Campaign ${action}ed successfully!`);
        loadCampaigns();
      } else {
        throw new Error(`Failed to ${action} campaign`);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Running
          </span>
        );
      case 'paused':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
            <Pause className="w-3 h-3" />
            Paused
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            <Settings className="w-3 h-3" />
            Draft
          </span>
        );
    }
  };

  const renderStatsBar = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white rounded-2xl border border-gray-200/70 p-5 shadow-sm">
        <div className="flex items-center gap-3 text-gray-500 mb-2">
          <Activity className="w-5 h-5" />
          <h3 className="font-medium">Total Campaigns</h3>
        </div>
        <p className="text-2xl font-bold text-gray-900">{campaigns.length}</p>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200/70 p-5 shadow-sm">
        <div className="flex items-center gap-3 text-emerald-500 mb-2">
          <Play className="w-5 h-5" />
          <h3 className="font-medium text-gray-500">Active</h3>
        </div>
        <p className="text-2xl font-bold text-gray-900">
          {campaigns.filter(c => c.status === 'running').length}
        </p>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200/70 p-5 shadow-sm">
        <div className="flex items-center gap-3 text-blue-500 mb-2">
          <Users className="w-5 h-5" />
          <h3 className="font-medium text-gray-500">Contacts Reached</h3>
        </div>
        <p className="text-2xl font-bold text-gray-900">
          {campaigns.reduce((acc, c) => acc + c.contacts, 0).toLocaleString()}
        </p>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200/70 p-5 shadow-sm">
        <div className="flex items-center gap-3 text-purple-500 mb-2">
          <MessageSquare className="w-5 h-5" />
          <h3 className="font-medium text-gray-500">Avg Response</h3>
        </div>
        <p className="text-2xl font-bold text-gray-900">
          {campaigns.length ? 
            Math.round(campaigns.reduce((acc, c) => acc + (c.replied / (c.contacts || 1)) * 100, 0) / campaigns.length) : 0}%
        </p>
      </div>
    </div>
  );

  const renderCreateStep1 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Campaign Name</label>
        <input 
          type="text" 
          value={formData.name}
          onChange={e => setFormData({...formData, name: e.target.value})}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none"
          placeholder="e.g. Diwali Sale 2024"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Goal</label>
        <div className="grid grid-cols-3 gap-4">
          {['Feedback & Upsell', 'Promotion', 'Winback'].map(goal => (
            <button
              key={goal}
              onClick={() => setFormData({...formData, goal: goal.toLowerCase()})}
              className={`p-4 rounded-xl border text-left transition-all ${
                formData.goal === goal.toLowerCase() 
                  ? 'border-emerald-500 bg-emerald-50 shadow-sm' 
                  : 'border-gray-200 bg-white hover:border-emerald-300'
              }`}
            >
              <div className="font-medium text-gray-900">{goal}</div>
              <div className="text-xs text-gray-500 mt-1">
                {goal === 'Feedback & Upsell' && 'Ask for review, then sell'}
                {goal === 'Promotion' && 'Directly promote products'}
                {goal === 'Winback' && 'Re-engage old customers'}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">AI Personality</label>
        <div className="grid grid-cols-3 gap-4">
          {['Friendly', 'Professional', 'Casual'].map(personality => (
            <button
              key={personality}
              onClick={() => setFormData({...formData, personality: personality.toLowerCase()})}
              className={`p-4 rounded-xl border text-center transition-all ${
                formData.personality === personality.toLowerCase() 
                  ? 'border-emerald-500 bg-emerald-50 shadow-sm' 
                  : 'border-gray-200 bg-white hover:border-emerald-300'
              }`}
            >
              <div className="font-medium text-gray-900">{personality}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Language</label>
        <select 
          value={formData.language}
          onChange={e => setFormData({...formData, language: e.target.value})}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none"
        >
          <option value="Hinglish">Hinglish</option>
          <option value="Hindi">Hindi</option>
          <option value="English">English</option>
        </select>
      </div>
    </div>
  );

  const renderCreateStep2 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Products</label>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto p-1">
          {products.map(product => (
            <div 
              key={product.product_id}
              className={`border rounded-xl p-3 cursor-pointer transition-all ${
                formData.selectedProducts.find(p => p.id === product.product_id)
                  ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-emerald-300'
              }`}
              onClick={() => {
                const isSelected = formData.selectedProducts.find(p => p.id === product.product_id);
                if (isSelected) {
                  setFormData({
                    ...formData,
                    selectedProducts: formData.selectedProducts.filter(p => p.id !== product.product_id)
                  });
                } else {
                  setFormData({
                    ...formData,
                    selectedProducts: [...formData.selectedProducts, { id: product.product_id, title: product.title, price: '', buyUrl: '', description: '' }]
                  });
                }
              }}
            >
              {product.image_url ? (
                <img src={product.image_url} alt={product.title} className="w-full h-32 object-cover rounded-lg mb-2" />
              ) : (
                <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center mb-2">
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                </div>
              )}
              <div className="text-sm font-medium text-gray-900 truncate">{product.title}</div>
            </div>
          ))}
        </div>
      </div>

      {formData.selectedProducts.map((p, index) => (
        <div key={p.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-3">{p.title} Details</h4>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Price</label>
                <input 
                  type="text" 
                  value={p.price}
                  onChange={e => {
                    const newProducts = [...formData.selectedProducts];
                    newProducts[index].price = e.target.value;
                    setFormData({...formData, selectedProducts: newProducts});
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none"
                  placeholder="e.g. ₹999"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Buy URL</label>
                <input 
                  type="text" 
                  value={p.buyUrl}
                  onChange={e => {
                    const newProducts = [...formData.selectedProducts];
                    newProducts[index].buyUrl = e.target.value;
                    setFormData({...formData, selectedProducts: newProducts});
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none"
                  placeholder="https://..."
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">AI Selling Points (Description)</label>
              <textarea 
                value={p.description}
                onChange={e => {
                  const newProducts = [...formData.selectedProducts];
                  newProducts[index].description = e.target.value;
                  setFormData({...formData, selectedProducts: newProducts});
                }}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none"
                rows={2}
                placeholder="What makes this product special?"
              />
            </div>
          </div>
        </div>
      ))}

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
          <Gift className="w-4 h-4 text-emerald-500" />
          Special Offer (Optional)
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Discount Code</label>
            <input 
              type="text" 
              value={formData.offerCode}
              onChange={e => setFormData({...formData, offerCode: e.target.value})}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none"
              placeholder="e.g. SALE20"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Discount %</label>
            <input 
              type="text" 
              value={formData.offerDiscount}
              onChange={e => setFormData({...formData, offerDiscount: e.target.value})}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none"
              placeholder="e.g. 20%"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderCreateStep3 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Audience Selection</label>
        <div className="grid grid-cols-2 gap-4 mb-4">
          {[
            { id: 'all', label: 'All Contacts', icon: Users },
            { id: 'tag', label: 'By Tag', icon: Tag },
            { id: 'manual', label: 'Manual Input', icon: Smartphone }
          ].map(type => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => setFormData({...formData, audienceType: type.id})}
                className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
                  formData.audienceType === type.id
                    ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-emerald-300'
                }`}
              >
                <Icon className={`w-5 h-5 ${formData.audienceType === type.id ? 'text-emerald-500' : 'text-gray-500'}`} />
                <span className="font-medium text-sm text-gray-900">{type.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {formData.audienceType === 'all' && (
        <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl flex items-start gap-3">
          <Users className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Sending to all contacts</p>
            <p className="text-sm mt-1">Approximately {contactsCount.toLocaleString()} contacts will receive this broadcast.</p>
          </div>
        </div>
      )}

      {formData.audienceType === 'tag' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Tags</label>
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => (
              <button
                key={tag.id}
                onClick={() => {
                  const newTags = formData.audienceTags.includes(tag.name)
                    ? formData.audienceTags.filter(t => t !== tag.name)
                    : [...formData.audienceTags, tag.name];
                  setFormData({...formData, audienceTags: newTags});
                }}
                className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                  formData.audienceTags.includes(tag.name)
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {formData.audienceType === 'manual' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Numbers</label>
          <textarea
            value={formData.manualNumbers}
            onChange={e => setFormData({...formData, manualNumbers: e.target.value})}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none font-mono"
            rows={6}
            placeholder="Enter numbers separated by commas or newlines (e.g. 919876543210, 919876543211)"
          />
          <p className="text-xs text-gray-500 mt-2">Include country code (e.g. 91 for India)</p>
        </div>
      )}
    </div>
  );

  const renderCreateStep4 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Starting Template</label>
        <select 
          value={formData.templateId}
          onChange={e => setFormData({...formData, templateId: e.target.value})}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none"
        >
          <option value="">Select a template...</option>
          {templates.map(t => (
            <option key={t.id} value={t.id}>{t.name} ({t.language})</option>
          ))}
        </select>
        
        {formData.templateId && (
          <div className="mt-3 p-4 bg-gray-50 rounded-xl border border-gray-200 text-sm text-gray-700 italic">
            {templates.find(t => t.id === formData.templateId)?.body_text}
          </div>
        )}
      </div>

      <div>
        <label className="flex justify-between items-center text-sm font-medium text-gray-700 mb-3">
          <span>Max AI Conversation Turns</span>
          <span className="text-emerald-600 font-bold">{formData.maxTurns}</span>
        </label>
        <input 
          type="range" 
          min="5" 
          max="30" 
          value={formData.maxTurns}
          onChange={e => setFormData({...formData, maxTurns: parseInt(e.target.value)})}
          className="w-full accent-emerald-500"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>5 (Shorter)</span>
          <span>30 (Longer)</span>
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl p-5 text-white">
        <h4 className="font-medium flex items-center gap-2 mb-4">
          <Bot className="w-5 h-5 text-emerald-400" />
          Campaign Summary
        </h4>
        <div className="space-y-2 text-sm text-gray-300">
          <p><span className="text-gray-500">Name:</span> {formData.name || 'Unnamed Campaign'}</p>
          <p><span className="text-gray-500">Goal:</span> <span className="capitalize">{formData.goal}</span></p>
          <p><span className="text-gray-500">Personality:</span> <span className="capitalize">{formData.personality}</span></p>
          <p><span className="text-gray-500">Products:</span> {formData.selectedProducts.length} selected</p>
          <p><span className="text-gray-500">Audience:</span> <span className="capitalize">{formData.audienceType}</span></p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${
          toast.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          <p className="font-medium text-sm">{toast.message}</p>
        </div>
      )}

      {view === 'list' ? (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI Conversations</h1>
              <p className="text-sm text-gray-500 mt-1">Deploy AI agents to chat and sell to your audience.</p>
            </div>
            <button
              onClick={() => {
                setView('create');
                setCurrentStep(1);
              }}
              className="px-4 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-sm transition-all flex items-center gap-2"
            >
              <Bot className="w-4 h-4" />
              New Campaign
            </button>
          </div>

          {renderStatsBar()}

          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-500">Loading campaigns...</p>
              </div>
            ) : campaigns.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200/70 p-12 text-center shadow-sm">
                <Bot className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">No AI campaigns yet</h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">Start your first AI campaign to engage your audience, collect feedback, and drive sales automatically.</p>
                <button
                  onClick={() => setView('create')}
                  className="px-4 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-emerald-500 to-green-600 shadow-sm transition-all inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create Campaign
                </button>
              </div>
            ) : (
              campaigns.map(campaign => (
                <div key={campaign.id} className="bg-white rounded-2xl border border-gray-200/70 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900">{campaign.name}</h3>
                        {renderStatusBadge(campaign.status)}
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md font-medium capitalize">
                          {campaign.goal}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">Started: {new Date(campaign.created_at).toLocaleDateString()}</p>
                    </div>
                    
                    <div className="flex gap-6 items-center">
                      <div className="text-center">
                        <div className="text-xs text-gray-500 mb-1">Contacts</div>
                        <div className="font-semibold text-gray-900">{campaign.contacts.toLocaleString()}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-500 mb-1">Replied</div>
                        <div className="font-semibold text-emerald-600">{campaign.replied.toLocaleString()}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-500 mb-1">Converted</div>
                        <div className="font-semibold text-blue-600">{campaign.converted.toLocaleString()}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-500 mb-1">Revenue</div>
                        <div className="font-semibold text-gray-900">₹{campaign.revenue.toLocaleString()}</div>
                      </div>
                      
                      <div className="h-10 w-px bg-gray-200 mx-2 hidden lg:block"></div>
                      
                      <div className="flex gap-2">
                        {campaign.status === 'draft' && (
                          <button onClick={() => handleAction('launch', campaign.id)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Launch">
                            <Send className="w-5 h-5" />
                          </button>
                        )}
                        {campaign.status === 'running' && (
                          <button onClick={() => handleAction('pause', campaign.id)} className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors" title="Pause">
                            <Pause className="w-5 h-5" />
                          </button>
                        )}
                        {campaign.status === 'paused' && (
                          <button onClick={() => handleAction('resume', campaign.id)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Resume">
                            <Play className="w-5 h-5" />
                          </button>
                        )}
                        <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors" title="View Stats">
                          <BarChart2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200/70 flex justify-between items-center bg-gray-50/50">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Bot className="w-5 h-5 text-emerald-500" />
                Create AI Campaign
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">Configure your AI agent to talk to customers.</p>
            </div>
            <button 
              onClick={() => setView('list')}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper */}
          <div className="flex items-center px-6 py-4 border-b border-gray-200/70 bg-white overflow-x-auto">
            {['Basics', 'Products', 'Audience', 'Launch'].map((step, idx) => (
              <React.Fragment key={step}>
                <div className={`flex items-center gap-2 whitespace-nowrap ${currentStep >= idx + 1 ? 'text-emerald-600' : 'text-gray-400'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    currentStep >= idx + 1 ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {idx + 1}
                  </div>
                  <span className="font-medium text-sm">{step}</span>
                </div>
                {idx < 3 && (
                  <div className={`w-8 sm:w-16 h-px mx-2 sm:mx-4 ${currentStep > idx + 1 ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="max-w-2xl mx-auto">
              {currentStep === 1 && renderCreateStep1()}
              {currentStep === 2 && renderCreateStep2()}
              {currentStep === 3 && renderCreateStep3()}
              {currentStep === 4 && renderCreateStep4()}

              <div className="flex justify-between mt-10 pt-6 border-t border-gray-100">
                <button
                  onClick={() => currentStep > 1 ? setCurrentStep(currentStep - 1) : setView('list')}
                  className="px-4 py-2 rounded-xl font-medium text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  {currentStep === 1 ? 'Cancel' : 'Back'}
                </button>
                
                {currentStep < 4 ? (
                  <button
                    onClick={() => setCurrentStep(currentStep + 1)}
                    className="px-4 py-2 rounded-xl font-medium text-sm text-white bg-gray-900 hover:bg-gray-800 transition-colors flex items-center gap-2"
                  >
                    Next Step
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleCreateCampaign}
                    className="px-6 py-2 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-sm transition-all flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Save & Launch
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
