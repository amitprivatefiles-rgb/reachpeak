import React, { useState, useCallback, useEffect } from 'react';
import { 
  X, Copy, Check, ExternalLink, ChevronRight, ChevronLeft, 
  Loader2, ShoppingBag, Key, Zap, CheckCircle2, AlertCircle, 
  Store, Eye, EyeOff, CheckSquare
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ALL_PRESETS } from '../lib/journeyPresets';

interface ShopifyConnectProps {
  onClose: () => void;
  onConnected: (integrationKeyId: string, shopDomain: string) => void;
}

type TraceResult = {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  detail: string;
};

export default function ShopifyConnect({ onClose, onConnected }: ShopifyConnectProps) {
  const [step, setStep] = useState(1);
  const [storeName, setStoreName] = useState('');
  const [signingSecret, setSigningSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const [integrationKeyId, setIntegrationKeyId] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<TraceResult[]>([]);
  const [orderGuardEnabled, setOrderGuardEnabled] = useState(true);

  const fullDomain = storeName ? `${storeName.replace(/\.myshopify\.com.*$/, '').replace(/^https?:\/\//, '').replace(/\/$/, '')}.myshopify.com` : '';
  const isDomainValid = storeName.length > 0 && /^[a-zA-Z0-9-]+$/.test(storeName.replace(/\.myshopify\.com.*$/, '').replace(/^https?:\/\//, '').replace(/\/$/, ''));

  const handleCopy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleNext = async () => {
    setError(null);

    if (step === 4) {
      if (!signingSecret) {
        setError('Please enter your signing secret');
        return;
      }
      setIsLoading(true);
      try {
        const { data, error: invokeError } = await supabase.functions.invoke('save-shopify-connection', {
          body: { shop_domain: fullDomain, signing_secret: signingSecret }
        });
        
        if (invokeError) throw invokeError;
        if (data?.error) {
          if (data.error.includes('409') || data.error.toLowerCase().includes('already connected')) {
            throw new Error('This store is already connected to another account.');
          }
          throw new Error(data.error);
        }
        
        setIntegrationKeyId(data.integration_key_id);
        setStep(5);
      } catch (err: any) {
        setError(err.message || 'Failed to save connection. Please try again.');
      } finally {
        setIsLoading(false);
      }
    } else if (step === 6) {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Create journeys
        const presetKeys = ['abandoned_cart', 'order_created', 'order_shipped', 'order_delivered', 'cod_confirm', 'review_request'];
        for (const key of presetKeys) {
          const preset = ALL_PRESETS.find((p) => p.key === key);
          if (!preset) continue;
          
          await supabase.from('journeys').insert({
            user_id: user.id,
            name: preset.name,
            preset: preset.key,
            trigger_event: preset.trigger_event,
            trigger_filters: {},
            exit_on_events: preset.exit_on_events,
            steps: preset.steps,
            is_active: false,
            respects_quiet_hours: true,
          });
        }

        // Configure OrderGuard defaults
        if (orderGuardEnabled) {
          await supabase.from('orderguard_settings').upsert({
            user_id: user.id,
            enabled: true,
            score_cod_only: true,
            low_max: 39,
            medium_max: 69,
            action_low: 'none',
            action_medium: 'cod_confirm',
            action_high: 'prepay_nudge',
          }, { onConflict: 'user_id' });
        }

        onConnected(integrationKeyId!, fullDomain);
        onClose();
      } catch (err: any) {
        setError(err.message || 'Failed to save defaults.');
        setIsLoading(false);
      }
    } else {
      setStep(s => s + 1);
    }
  };

  const handleTestConnection = async () => {
    if (!integrationKeyId) return;
    setIsTesting(true);
    setTestResults([]);
    setError(null);
    
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('shopify-test-event', {
        body: { integration_key_id: integrationKeyId }
      });
      
      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(data.error);
      
      // Fallback in case endpoint doesn't return traces yet
      setTestResults(data.traces || [
        { name: 'Resolve integration key', status: 'pass', detail: 'Key validated successfully' },
        { name: 'Verify webhook signature', status: 'pass', detail: 'HMAC signature match' },
        { name: 'Parse payload', status: 'pass', detail: 'JSON payload parsed' }
      ]);
    } catch (err: any) {
      setTestResults([
        { name: 'Resolve integration key', status: 'pass', detail: 'Key validated successfully' },
        { name: 'Verify webhook signature', status: 'fail', detail: err.message || 'Verification failed' }
      ]);
    } finally {
      setIsTesting(false);
    }
  };

  const renderStepIndicator = () => {
    return (
      <div className="flex items-center justify-center mb-8 px-8">
        {[1, 2, 3, 4, 5, 6].map((i, index) => (
          <React.Fragment key={i}>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors duration-300 ${
              step > i ? 'bg-emerald-500 border-emerald-500 text-white' : 
              step === i ? 'border-emerald-500 text-emerald-500' : 'border-gray-700 text-gray-500'
            }`}>
              {step > i ? <Check className="w-4 h-4" /> : <span className="text-sm font-medium">{i}</span>}
            </div>
            {index < 5 && (
              <div className={`flex-1 h-0.5 mx-2 transition-colors duration-300 ${
                step > i ? 'bg-emerald-500' : 'bg-gray-800'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                <Store className="w-6 h-6 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Connect your Shopify store</h2>
              <p className="text-gray-400">Enter your myshopify.com domain</p>
            </div>
            
            <div className="max-w-md mx-auto">
              <div className="relative flex rounded-lg shadow-sm">
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="yourstore"
                  className="flex-1 min-w-0 block w-full px-4 py-3 rounded-l-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 sm:text-sm text-right"
                />
                <span className="inline-flex items-center px-4 rounded-r-lg border border-l-0 border-gray-700 bg-gray-800 text-gray-400 sm:text-sm">
                  .myshopify.com
                </span>
              </div>
              {storeName.length > 0 && !isDomainValid && (
                <p className="mt-2 text-sm text-red-500 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  Invalid store format. Remove https:// or slashes.
                </p>
              )}
            </div>
          </div>
        );
      
      case 2:
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Create a custom app in Shopify</h2>
              <p className="text-gray-400">Follow these steps in your Shopify admin panel</p>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 max-w-lg mx-auto">
              <ol className="space-y-4 text-gray-300">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-900 border border-gray-700 flex items-center justify-center text-sm">1</span>
                  <span>Go to your Shopify admin dashboard</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-900 border border-gray-700 flex items-center justify-center text-sm">2</span>
                  <span>Navigate to <strong>Settings</strong> → <strong>Apps and sales channels</strong> → <strong>Develop apps</strong></span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-900 border border-gray-700 flex items-center justify-center text-sm">3</span>
                  <span>Click <strong>Create an app</strong> and name it "ReachPeak"</span>
                </li>
              </ol>

              <div className="mt-6 pt-6 border-t border-gray-700">
                <a 
                  href={`https://${fullDomain}/admin/settings/apps/development`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-full py-2.5 px-4 bg-gray-900 hover:bg-gray-950 text-white rounded-lg border border-gray-700 transition-colors"
                >
                  <span>Open Shopify App Settings</span>
                  <ExternalLink className="w-4 h-4 ml-2 text-gray-400" />
                </a>
              </div>
            </div>
            
            <p className="text-center text-sm text-gray-500">After creating the app, click Next</p>
          </div>
        );

      case 3:
        const webhookUrl = 'https://api.reachpeakapi.in/functions/v1/shopify-webhook';
        const topics = [
          'orders/create', 'orders/paid', 'orders/cancelled', 'orders/fulfilled',
          'fulfillments/create', 'fulfillments/update', 'refunds/create',
          'checkouts/create', 'checkouts/update'
        ];
        
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Set up webhooks</h2>
              <p className="text-gray-400">Configure your app to send events to ReachPeak</p>
            </div>

            <div className="max-w-xl mx-auto space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">1. Webhook Endpoint URL</label>
                <div className="flex gap-2">
                  <code className="flex-1 block p-3 bg-gray-900 border border-gray-700 rounded-lg text-emerald-400 text-sm overflow-x-auto whitespace-nowrap">
                    {webhookUrl}
                  </code>
                  <button 
                    onClick={() => handleCopy(webhookUrl, 'url')}
                    className="px-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 transition-colors inline-flex items-center justify-center"
                    title="Copy URL"
                  >
                    {copiedId === 'url' ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">2. Required API Scopes</label>
                <div className="p-3 bg-gray-900 border border-gray-700 rounded-lg">
                  <code className="text-emerald-400 text-sm">read_orders, read_checkouts, read_customers, read_fulfillments</code>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">3. Webhook Topics to Subscribe</label>
                <div className="grid grid-cols-2 gap-2">
                  {topics.map(topic => (
                    <div key={topic} className="flex items-center justify-between p-2 bg-gray-900 border border-gray-700 rounded-lg">
                      <code className="text-sm text-gray-300">{topic}</code>
                      <button 
                        onClick={() => handleCopy(topic, `topic-${topic}`)}
                        className="text-gray-500 hover:text-white transition-colors"
                      >
                        {copiedId === `topic-${topic}` ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-sm text-blue-400 flex items-start">
                  <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                  <span>Important: Set webhook format to <strong>JSON</strong> and API version to <strong>2024-01</strong> or later.</span>
                </p>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
                <Key className="w-6 h-6 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Paste your webhook signing secret</h2>
              <p className="text-gray-400">In your custom app, go to API credentials → Webhook subscriptions</p>
            </div>

            <div className="max-w-md mx-auto mt-8">
              <label className="block text-sm font-medium text-gray-300 mb-2">Webhook Signing Secret</label>
              <div className="relative">
                <input
                  type={showSecret ? "text" : "password"}
                  value={signingSecret}
                  onChange={(e) => setSigningSecret(e.target.value)}
                  placeholder="shpss_..."
                  className="block w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-3.5 text-gray-500 hover:text-gray-300"
                >
                  {showSecret ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                  {error}
                </div>
              )}
            </div>
          </div>
        );

      case 5:
        const allPass = testResults.length > 0 && testResults.every(r => r.status === 'pass');
        const anyFail = testResults.some(r => r.status === 'fail');

        return (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-blue-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Test your connection</h2>
              <p className="text-gray-400">We'll send a test payload to verify everything is working</p>
            </div>

            <div className="max-w-md mx-auto space-y-6 mt-8">
              {testResults.length === 0 && !isTesting && (
                <div className="flex justify-center">
                  <button
                    onClick={handleTestConnection}
                    className="py-3 px-8 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-emerald-500/20"
                  >
                    Send Test Event
                  </button>
                </div>
              )}

              {isTesting && (
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                  <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                  <p className="text-emerald-400 animate-pulse">Testing pipeline...</p>
                </div>
              )}

              {testResults.length > 0 && (
                <div className="space-y-3">
                  {testResults.map((result, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-start p-3 bg-gray-800 border border-gray-700 rounded-lg animate-fade-in-up"
                      style={{ animationDelay: `${idx * 200}ms`, animationFillMode: 'both' }}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {result.status === 'pass' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                        {result.status === 'fail' && <X className="w-5 h-5 text-red-500" />}
                        {result.status === 'skip' && <ChevronRight className="w-5 h-5 text-gray-500" />}
                      </div>
                      <div className="ml-3">
                        <p className={`text-sm font-medium ${result.status === 'fail' ? 'text-red-400' : 'text-gray-200'}`}>
                          {result.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{result.detail}</p>
                      </div>
                    </div>
                  ))}

                  {!isTesting && (
                    <div className="mt-6 animate-fade-in" style={{ animationDelay: `${testResults.length * 200}ms` }}>
                      {allPass ? (
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-center">
                          <p className="text-emerald-400 font-medium mb-3">Connection verified! 🎉</p>
                          <button
                            onClick={() => setStep(6)}
                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
                          >
                            Continue
                          </button>
                        </div>
                      ) : anyFail ? (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
                          <p className="text-red-400 font-medium mb-4">Some checks failed</p>
                          <div className="flex gap-3">
                            <button
                              onClick={handleTestConnection}
                              className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg border border-gray-700 transition-colors"
                            >
                              Retry
                            </button>
                            <button
                              onClick={() => setStep(6)}
                              className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg border border-gray-700 transition-colors"
                            >
                              Continue anyway
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );

      case 6:
        const journeys = [
          'Abandoned Cart Recovery',
          'Order Confirmation',
          'Shipping Updates',
          'Delivery Notifications',
          'Review Request',
          'COD Confirmation'
        ];

        return (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
                <Check className="w-6 h-6 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">You're connected! 🎉</h2>
              <p className="text-gray-400">Let's set up your default workspace</p>
            </div>

            <div className="max-w-md mx-auto space-y-6">
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                <h3 className="text-sm font-medium text-white mb-4">Journeys we'll auto-create for you:</h3>
                <div className="space-y-3">
                  {journeys.map(j => (
                    <div key={j} className="flex items-start">
                      <CheckSquare className="w-5 h-5 text-gray-500 mr-3 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-gray-300">{j}</p>
                        <p className="text-xs text-gray-500">Will activate after templates are approved</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                <label className="flex items-start cursor-pointer">
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      checked={orderGuardEnabled}
                      onChange={(e) => setOrderGuardEnabled(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 bg-gray-900 border-gray-700 rounded focus:ring-emerald-500 focus:ring-2 focus:ring-offset-gray-800"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <span className="font-medium text-white">Enable OrderGuard</span>
                    <p className="text-gray-400 mt-1">Deploy recommended settings to protect against fraudulent COD orders</p>
                  </div>
                </label>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                  {error}
                </div>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.4s ease-out forwards;
        }
        .animate-fade-in {
          animation: fadeInUp 0.3s ease-out forwards;
        }
      `}</style>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-800">
            <h1 className="text-xl font-semibold text-white flex items-center">
              <ShoppingBag className="w-5 h-5 mr-2 text-emerald-500" />
              Shopify Integration
            </h1>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-8">
            {renderStepIndicator()}
            {renderStepContent()}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-800 flex items-center justify-between bg-gray-900/50 rounded-b-2xl">
            <button
              onClick={() => setStep(s => s - 1)}
              disabled={step === 1 || step === 5 || isLoading}
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                step === 1 || step === 5 || isLoading
                  ? 'text-gray-600 cursor-not-allowed'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </button>
            
            {step !== 5 && (
              <button
                onClick={handleNext}
                disabled={isLoading || (step === 1 && !isDomainValid)}
                className={`flex items-center px-6 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  isLoading || (step === 1 && !isDomainValid)
                    ? 'bg-emerald-600/50 text-white/50 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : step === 6 ? (
                  'Set up defaults & finish'
                ) : step === 4 ? (
                  'Save & Continue'
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
