// @ts-nocheck
import { useEffect, useState } from 'react';
import {
  CreditCard,
  Eye,
  EyeOff,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Shield,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ProviderPublic {
  id: string;
  provider: string;
  key_id: string;
  mode: string;
  is_active: boolean;
}

export function PaymentSettings() {
  const { user } = useAuth();
  const [provider, setProvider] = useState<ProviderPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // Form state
  const [keyId, setKeyId] = useState('');
  const [keySecret, setKeySecret] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [mode, setMode] = useState<'live' | 'test'>('test');
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);

  const webhookUrl = user ? `https://mxupzmwznkekdjylaztl.supabase.co/functions/v1/razorpay-webhook?u=${user.id}` : '';

  useEffect(() => {
    if (!user) return;
    loadProvider();
  }, [user]);

  const loadProvider = async () => {
    setLoading(true);
    const { data } = await supabase.from('payment_providers_public')
      .select('*').eq('user_id', user!.id).eq('provider', 'razorpay').maybeSingle();
    if (data) {
      setProvider(data);
      setKeyId(data.key_id);
      setMode(data.mode as 'live' | 'test');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!keyId) return;
    setSaving(true);
    try {
      const payload: Record<string, any> = { key_id: keyId, mode };
      if (keySecret) payload.key_secret = keySecret;
      if (webhookSecret) payload.webhook_secret = webhookSecret;

      // Must provide key_secret on first save
      if (!provider && !keySecret) {
        alert('Key Secret is required for first-time setup');
        setSaving(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('save-payment-provider', {
        body: payload,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setKeySecret('');
      setWebhookSecret('');
      await loadProvider();
      alert('Saved successfully!');
    } catch (err: any) {
      alert('Save failed: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('create-payment-link', {
        body: {
          contact_phone: '919999999999',
          amount: 1,
          description: 'ReachPeak test — ₹1 link',
          source: 'test',
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setTestResult(data.pay_url || 'Link created successfully');
    } catch (err: any) {
      setTestResult(`Error: ${err.message}`);
    } finally {
      setTesting(false);
    }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: '#8b5cf6' }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '720px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '10px',
          background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <CreditCard size={20} color="white" />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#f1f5f9' }}>Razorpay</h3>
          <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
            {provider ? (
              <span style={{ color: '#10b981' }}>✓ Connected ({provider.mode} mode)</span>
            ) : (
              'Not connected'
            )}
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '16px' }}>
        {/* Key ID */}
        <div>
          <label style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
            Key ID
          </label>
          <input
            type="text"
            value={keyId}
            onChange={e => setKeyId(e.target.value)}
            placeholder="rzp_test_... or rzp_live_..."
            style={{
              width: '100%', padding: '10px 14px', borderRadius: '8px',
              border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0',
              fontSize: '14px', fontFamily: 'monospace',
            }}
          />
        </div>

        {/* Key Secret */}
        <div>
          <label style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
            Key Secret {provider && <span style={{ color: '#475569' }}>(leave blank to keep current)</span>}
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showSecret ? 'text' : 'password'}
              value={keySecret}
              onChange={e => setKeySecret(e.target.value)}
              placeholder={provider ? '•••• configured' : 'Enter your Razorpay Key Secret'}
              style={{
                width: '100%', padding: '10px 14px', paddingRight: '40px', borderRadius: '8px',
                border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0',
                fontSize: '14px', fontFamily: 'monospace',
              }}
            />
            <button onClick={() => setShowSecret(!showSecret)} style={{
              position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: '#64748b',
            }}>
              {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Webhook Secret */}
        <div>
          <label style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
            Webhook Secret {provider && <span style={{ color: '#475569' }}>(leave blank to keep current)</span>}
          </label>
          <input
            type="password"
            value={webhookSecret}
            onChange={e => setWebhookSecret(e.target.value)}
            placeholder={provider?.is_active ? '•••• configured' : 'From Razorpay webhook settings'}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: '8px',
              border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0',
              fontSize: '14px', fontFamily: 'monospace',
            }}
          />
        </div>

        {/* Mode */}
        <div>
          <label style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500, display: 'block', marginBottom: '6px' }}>Mode</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['test', 'live'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                flex: 1, padding: '10px', borderRadius: '8px',
                border: `1px solid ${mode === m ? (m === 'live' ? '#10b981' : '#3b82f6') : '#334155'}`,
                background: mode === m ? (m === 'live' ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)') : '#0f172a',
                color: mode === m ? (m === 'live' ? '#10b981' : '#3b82f6') : '#64748b',
                cursor: 'pointer', fontWeight: mode === m ? 600 : 400, fontSize: '14px',
                textTransform: 'capitalize',
              }}>
                {m === 'live' && <Shield size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />}
                {m === 'test' && <Zap size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />}
                {m}
              </button>
            ))}
          </div>
          <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#64748b' }}>
            {mode === 'test' ? 'Test keys (rzp_test_*) create test-mode links only — no real charges' :
              '⚠ Live keys create real payment links'}
          </p>
        </div>

        {/* Save */}
        <button onClick={handleSave} disabled={saving || !keyId} style={{
          padding: '12px', borderRadius: '8px', border: 'none',
          background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
          color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: '14px',
          opacity: (saving || !keyId) ? 0.6 : 1,
        }}>
          {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', verticalAlign: 'middle' }} /> : 'Save Configuration'}
        </button>

        {/* Webhook URL */}
        {provider && (
          <div style={{ borderTop: '1px solid #1e293b', paddingTop: '16px' }}>
            <label style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
              Webhook URL <span style={{ color: '#64748b' }}>(paste into Razorpay dashboard)</span>
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <code style={{
                flex: 1, padding: '10px 14px', borderRadius: '8px',
                border: '1px solid #334155', background: '#0f172a',
                color: '#10b981', fontSize: '12px', fontFamily: 'monospace',
                wordBreak: 'break-all',
              }}>
                {webhookUrl}
              </code>
              <button onClick={copyWebhookUrl} style={{
                padding: '10px', borderRadius: '8px', border: '1px solid #334155',
                background: '#0f172a', color: copied ? '#10b981' : '#94a3b8', cursor: 'pointer',
              }}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#64748b' }}>
              <strong>Events to enable:</strong> <code>payment_link.paid</code>, <code>payment.captured</code>
            </div>
          </div>
        )}

        {/* Test Connection */}
        {provider && (
          <div style={{ borderTop: '1px solid #1e293b', paddingTop: '16px' }}>
            <button onClick={handleTestConnection} disabled={testing} style={{
              padding: '10px 20px', borderRadius: '8px',
              border: '1px solid #334155', background: '#0f172a',
              color: '#f59e0b', cursor: 'pointer', fontWeight: 500, fontSize: '13px',
              display: 'flex', alignItems: 'center', gap: '8px',
              opacity: testing ? 0.6 : 1,
            }}>
              {testing ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={14} />}
              Test Connection (creates ₹1 link)
            </button>
            {testResult && (
              <div style={{
                marginTop: '8px', padding: '10px', borderRadius: '8px',
                background: testResult.startsWith('Error') ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                border: `1px solid ${testResult.startsWith('Error') ? '#ef444440' : '#10b98140'}`,
                fontSize: '12px', fontFamily: 'monospace',
                color: testResult.startsWith('Error') ? '#ef4444' : '#10b981',
              }}>
                {testResult.startsWith('http') ? (
                  <a href={testResult} target="_blank" rel="noopener noreferrer" style={{ color: '#10b981', textDecoration: 'underline' }}>
                    {testResult} <ExternalLink size={12} style={{ verticalAlign: 'middle' }} />
                  </a>
                ) : testResult}
              </div>
            )}
          </div>
        )}

        {/* Setup Guide */}
        {!provider && (
          <div style={{
            padding: '16px', borderRadius: '8px', background: 'rgba(59,130,246,0.05)',
            border: '1px solid rgba(59,130,246,0.2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <AlertTriangle size={16} color="#3b82f6" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#93c5fd' }}>Setup Guide</span>
            </div>
            <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#94a3b8', lineHeight: '1.8' }}>
              <li>Go to <strong style={{ color: '#e2e8f0' }}>Razorpay Dashboard → Settings → API Keys</strong></li>
              <li>Generate a key pair (use test mode first)</li>
              <li>Paste Key ID and Key Secret above</li>
              <li>Save, then copy the Webhook URL shown below</li>
              <li>In Razorpay, go to <strong style={{ color: '#e2e8f0' }}>Settings → Webhooks → Add New</strong></li>
              <li>Paste the webhook URL, enable events: <code>payment_link.paid</code>, <code>payment.captured</code></li>
              <li>Copy the webhook secret back here and save again</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
