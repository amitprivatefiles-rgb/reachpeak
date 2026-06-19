import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Phone, Shield, CheckCircle, AlertTriangle, Send, Loader2, Eye, EyeOff, Wifi, WifiOff } from 'lucide-react';

interface WhatsAppAccount {
  id: string;
  display_phone_number: string;
  verified_name: string | null;
  quality_rating: string | null;
  status: string;
  is_active: boolean;
}

export function WhatsAppSettings() {
  const { user } = useAuth();
  const [account, setAccount] = useState<WhatsAppAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testResult, setTestResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [formData, setFormData] = useState({
    waba_id: '',
    phone_number_id: '',
    access_token: '',
    display_phone_number: '',
    verified_name: '',
  });

  useEffect(() => {
    fetchAccount();
  }, [user]);

  const fetchAccount = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('whatsapp_accounts')
        .select('id, display_phone_number, verified_name, quality_rating, status, is_active')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        setAccount(data);
      }
    } catch (err) {
      console.error('Error fetching WhatsApp account:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.waba_id || !formData.phone_number_id || !formData.access_token || !formData.display_phone_number) {
      alert('Please fill all required fields');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('save-whatsapp-account', {
        body: {
          waba_id: formData.waba_id.trim(),
          phone_number_id: formData.phone_number_id.trim(),
          access_token: formData.access_token.trim(),
          display_phone_number: formData.display_phone_number.trim(),
          verified_name: formData.verified_name.trim() || null,
        },
      });

      if (error) throw error;
      setAccount(data);
      setFormData({ waba_id: '', phone_number_id: '', access_token: '', display_phone_number: '', verified_name: '' });
      setTestResult({ type: 'success', message: 'WhatsApp account connected successfully!' });
    } catch (err: any) {
      setTestResult({ type: 'error', message: err.message || 'Failed to save account' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestSend = async () => {
    if (!testPhone.trim()) {
      setTestResult({ type: 'error', message: 'Enter a phone number to test' });
      return;
    }

    setTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('send-message', {
        body: {
          to: testPhone.replace(/[^0-9]/g, ''),
          type: 'template',
          template: {
            name: 'hello_world',
            language: 'en_US',
            components: [],
          },
        },
      });

      if (error) throw error;
      setTestResult({ type: 'success', message: `Test message sent! WAMID: ${data?.wamid || data?.messageId || 'sent'}` });
    } catch (err: any) {
      setTestResult({ type: 'error', message: err.message || 'Failed to send test message' });
    } finally {
      setTesting(false);
    }
  };

  const qualityColor = (rating: string | null) => {
    switch (rating?.toUpperCase()) {
      case 'GREEN': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'YELLOW': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'RED': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-green-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connected Account Display */}
      {account && (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Phone className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Connected Account</h3>
                <p className="text-gray-400 text-sm">WhatsApp Business API</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {account.is_active ? (
                <span className="flex items-center space-x-1 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm border border-green-500/30">
                  <Wifi className="h-3 w-3" />
                  <span>Active</span>
                </span>
              ) : (
                <span className="flex items-center space-x-1 px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm border border-red-500/30">
                  <WifiOff className="h-3 w-3" />
                  <span>Inactive</span>
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-700/50 rounded-lg p-4">
              <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Phone Number</p>
              <p className="text-white font-medium">{account.display_phone_number}</p>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4">
              <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Verified Name</p>
              <p className="text-white font-medium">{account.verified_name || '—'}</p>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4">
              <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Quality Rating</p>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${qualityColor(account.quality_rating)}`}>
                {account.quality_rating || 'Unknown'}
              </span>
            </div>
          </div>

          {/* Test Send */}
          <div className="mt-4 pt-4 border-t border-gray-700">
            <p className="text-gray-400 text-sm mb-2">Send a test message (hello_world template)</p>
            <div className="flex space-x-2">
              <input
                type="text"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="Phone number (e.g. 919876543210)"
                className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none text-sm"
              />
              <button
                onClick={handleTestSend}
                disabled={testing}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                <span>{testing ? 'Sending...' : 'Test'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result Message */}
      {testResult && (
        <div className={`flex items-center space-x-2 p-4 rounded-lg border ${
          testResult.type === 'success'
            ? 'bg-green-500/10 border-green-500/30 text-green-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {testResult.type === 'success' ? <CheckCircle className="h-5 w-5 flex-shrink-0" /> : <AlertTriangle className="h-5 w-5 flex-shrink-0" />}
          <p className="text-sm">{testResult.message}</p>
        </div>
      )}

      {/* Manual Entry Form */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Shield className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold">{account ? 'Update' : 'Connect'} WhatsApp Account</h3>
            <p className="text-gray-400 text-sm">Enter your WhatsApp Business API credentials. The access token is stored server-side only.</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1">
                WABA ID <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.waba_id}
                onChange={(e) => setFormData({ ...formData, waba_id: e.target.value })}
                placeholder="e.g. 102345678901234"
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-2.5 border border-gray-600 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1">
                Phone Number ID <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.phone_number_id}
                onChange={(e) => setFormData({ ...formData, phone_number_id: e.target.value })}
                placeholder="e.g. 109876543210987"
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-2.5 border border-gray-600 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1">
              Access Token <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={formData.access_token}
                onChange={(e) => setFormData({ ...formData, access_token: e.target.value })}
                placeholder="Paste your permanent access token"
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-2.5 pr-12 border border-gray-600 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none text-sm"
                required
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-gray-500 text-xs mt-1">This token is sent directly to the server and never stored in the browser.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1">
                Display Phone Number <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.display_phone_number}
                onChange={(e) => setFormData({ ...formData, display_phone_number: e.target.value })}
                placeholder="e.g. +91 98765 43210"
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-2.5 border border-gray-600 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1">Verified Name</label>
              <input
                type="text"
                value={formData.verified_name}
                onChange={(e) => setFormData({ ...formData, verified_name: e.target.value })}
                placeholder="e.g. My Business"
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-2.5 border border-gray-600 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none text-sm"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              <span>{saving ? 'Saving...' : (account ? 'Update Account' : 'Connect Account')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
