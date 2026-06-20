import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, CheckCircle, AlertTriangle, Smartphone } from 'lucide-react';

const APP_ID = import.meta.env.VITE_META_APP_ID as string;
const CONFIG_ID = import.meta.env.VITE_META_CONFIG_ID as string;
const GRAPH_VERSION = (import.meta.env.VITE_META_GRAPH_VERSION as string) || 'v23.0';

declare global {
  interface Window {
    FB?: any;
    fbAsyncInit?: () => void;
  }
}

function loadFbSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.FB) return resolve();

    // Set the callback for when SDK loads
    window.fbAsyncInit = () => {
      window.FB.init({ appId: APP_ID, cookie: true, xfbml: false, version: GRAPH_VERSION });
      console.log('[ConnectWhatsApp] FB SDK initialized, appId:', APP_ID);
      resolve();
    };

    // If script tag already exists, just wait for fbAsyncInit (don't add another)
    if (document.getElementById('facebook-jssdk')) {
      // SDK script is loading — fbAsyncInit will fire when ready
      // Add a timeout in case it's stuck
      setTimeout(() => {
        if (window.FB) resolve();
        else reject(new Error('Facebook SDK failed to load (timeout). Check if an ad blocker is active.'));
      }, 10000);
      return;
    }

    const js = document.createElement('script');
    js.id = 'facebook-jssdk';
    js.src = 'https://connect.facebook.net/en_US/sdk.js';
    js.async = true;
    js.defer = true;
    js.onerror = () => reject(new Error('Failed to load Facebook SDK. Check if an ad blocker is blocking connect.facebook.net'));
    document.body.appendChild(js);

    // Timeout fallback
    setTimeout(() => {
      if (!window.FB) reject(new Error('Facebook SDK timed out. Disable ad blockers and try again.'));
    }, 15000);
  });
}

export function ConnectWhatsApp({ onConnected }: { onConnected?: () => void }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'working' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');
  const sessionInfo = useRef<{
    waba_id?: string;
    phone_number_id?: string;
    business_id?: string;
  }>({});

  // Load the Facebook JS SDK on mount
  useEffect(() => {
    loadFbSdk();
  }, []);

  // Capture session info from the Embedded Signup popup via postMessage
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      // Origin check: only accept from facebook.com
      try {
        if (!/facebook\.com$/.test(new URL(event.origin).hostname)) return;
      } catch {
        return;
      }

      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data?.type !== 'WA_EMBEDDED_SIGNUP') return;

        if (data.event === 'FINISH') {
          sessionInfo.current = {
            waba_id: data.data?.waba_id,
            phone_number_id: data.data?.phone_number_id,
            business_id: data.data?.business_id,
          };
        } else if (data.event === 'CANCEL' || data.event === 'ERROR') {
          setStatus('error');
          setMsg(data.data?.error_message || 'Signup was cancelled.');
        }
      } catch {
        // Non-JSON postMessage — ignore
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const launch = async () => {
    console.log('[ConnectWhatsApp] ENV check — APP_ID:', APP_ID, 'CONFIG_ID:', CONFIG_ID);
    if (!APP_ID || !CONFIG_ID) {
      setStatus('error');
      setMsg('Missing Meta configuration. Please set VITE_META_APP_ID and VITE_META_CONFIG_ID in Vercel env vars.');
      return;
    }

    setStatus('loading');
    setMsg('Loading Facebook SDK…');

    try {
      await loadFbSdk();
    } catch (err: any) {
      setStatus('error');
      setMsg(err.message || 'Failed to load Facebook SDK.');
      return;
    }
    setStatus('idle');

    window.FB.login(
      (response: any) => {
        // Handle the response in a separate async function
        // (FB.login doesn't accept async callbacks)
        handleLoginResponse(response);
      },
      {
        config_id: CONFIG_ID,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: '',
          sessionInfoVersion: '3',
        },
      },
    );
  };

  const handleLoginResponse = async (response: any) => {
    const code = response?.authResponse?.code;
    if (!code) {
      setStatus('error');
      setMsg('No authorization code returned. The popup may have been closed.');
      return;
    }

    // session_info should have arrived via postMessage by now
    const { waba_id, phone_number_id, business_id } = sessionInfo.current;
    if (!waba_id || !phone_number_id) {
      setStatus('error');
      setMsg(
        'Did not receive WABA/phone IDs from Meta. Check that your domain is in "Allowed Domains" in the Meta dashboard.',
      );
      return;
    }

    setStatus('working');
    setMsg('Connecting your WhatsApp number…');

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/embedded-signup-exchange`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ code, waba_id, phone_number_id, business_id }),
        },
      );

      const out = await res.json();
      if (!res.ok || !out.ok) {
        setStatus('error');
        setMsg(out.error || out.detail || 'Connection failed. Please try again.');
        return;
      }

      setStatus('done');
      setMsg(
        `✅ Connected ${out.account?.display_phone_number ?? phone_number_id}${out.account?.verified_name ? ` (${out.account.verified_name})` : ''}`,
      );
      onConnected?.();
    } catch (err: any) {
      setStatus('error');
      setMsg(err.message || 'An unexpected error occurred.');
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="flex items-center space-x-3 mb-4">
        <div className="p-2 bg-green-500/20 rounded-lg">
          <Smartphone className="h-5 w-5 text-green-400" />
        </div>
        <div>
          <h3 className="text-white font-semibold">WhatsApp Embedded Signup</h3>
          <p className="text-gray-400 text-sm">
            Connect your WhatsApp Business number with one click. This grants messaging permissions automatically.
          </p>
        </div>
      </div>

      <button
        onClick={launch}
        disabled={status === 'loading' || status === 'working'}
        className="flex items-center space-x-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
      >
        {status === 'loading' || status === 'working' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Smartphone className="h-4 w-4" />
        )}
        <span>
          {status === 'loading'
            ? 'Loading SDK…'
            : status === 'working'
              ? 'Connecting…'
              : 'Connect WhatsApp Number'}
        </span>
      </button>

      {msg && (
        <div
          className={`mt-4 flex items-start space-x-2 p-4 rounded-lg border ${
            status === 'error'
              ? 'bg-red-500/10 border-red-500/30 text-red-400'
              : status === 'done'
                ? 'bg-green-500/10 border-green-500/30 text-green-400'
                : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
          }`}
        >
          {status === 'error' ? (
            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          ) : status === 'done' ? (
            <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          ) : (
            <Loader2 className="h-5 w-5 flex-shrink-0 mt-0.5 animate-spin" />
          )}
          <p className="text-sm">{msg}</p>
        </div>
      )}
    </div>
  );
}
