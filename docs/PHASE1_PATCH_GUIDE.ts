// =====================================================================
// PHASE 1 PATCH GUIDE — Apply these changes to your existing source files
// =====================================================================
// Since the full source files couldn't be fetched completely from GitHub,
// this file provides the EXACT diffs to apply to each file.
//
// New files already created (just copy into your repo):
//   - supabase/migrations/20260619000001_phase1_realtime_sending.sql
//   - supabase/migrations/20260619000002_campaign_real_metrics_view.sql
//   - supabase/functions/save-whatsapp-account/index.ts
//   - worker/  (entire directory)
//   - src/components/WhatsAppSettings.tsx
//
// Files to DELETE:
//   - api/auto-increment.js
//   - src/hooks/useAutoIncrement.ts
//
// Files to MODIFY (diffs below):
//   - src/components/Layout.tsx
//   - src/components/Settings.tsx
//   - src/components/Dashboard.tsx
//   - src/components/Campaigns.tsx
//   - vercel.json (remove cron if present)
// =====================================================================

// ─────────────────────────────────────────────────────
// 1. src/components/Layout.tsx — TWO LINES TO REMOVE
// ─────────────────────────────────────────────────────
//
// REMOVE this import line:
//   import { useAutoIncrement } from '../hooks/useAutoIncrement';
//
// REMOVE this call inside the Layout component:
//   useAutoIncrement(!!isAdmin);
//
// That's it. Everything else stays.

// ─────────────────────────────────────────────────────
// 2. src/components/Settings.tsx — REPLACE API TAB WITH WHATSAPP
// ─────────────────────────────────────────────────────
//
// ADD this import at the top:
//   import { WhatsAppSettings } from './WhatsAppSettings';
//
// CHANGE the tab type:
//   FROM: const [activeTab, setActiveTab] = useState<'profile' | 'api' | 'notifications' | 'account' | 'activity'>('profile');
//   TO:   const [activeTab, setActiveTab] = useState<'profile' | 'whatsapp' | 'notifications' | 'account' | 'activity'>('profile');
//
// DELETE these state variables (no longer needed):
//   const [apiKey, setApiKey] = useState('');
//   const [apiUrl, setApiUrl] = useState('');
//   const [webhookUrl, setWebhookUrl] = useState('');
//   const [showApiKey, setShowApiKey] = useState(false);
//
// DELETE these lines from the useEffect that loads profile:
//   setApiKey((profile as any).whatsapp_api_key || '');
//   setApiUrl((profile as any).whatsapp_api_url || '');
//   setWebhookUrl((profile as any).webhook_url || '');
//
// DELETE the entire saveApiConfig function (lines ~111-123).
//
// In the tab bar JSX, change the 'api' tab:
//   FROM: { id: 'api', label: 'API Config', icon: Key }
//   TO:   { id: 'whatsapp', label: 'WhatsApp', icon: Phone }
//   (Add Phone to the lucide-react import if not present)
//
// In the tab content rendering, replace the API tab panel:
//   FROM: {activeTab === 'api' && ( ... old API key/webhook form ... )}
//   TO:   {activeTab === 'whatsapp' && <WhatsAppSettings />}

// ─────────────────────────────────────────────────────
// 3. src/components/Dashboard.tsx — READ FROM messages TABLE
// ─────────────────────────────────────────────────────
//
// DELETE the editingCampaign / editValues state:
//   const [editingCampaign, setEditingCampaign] = useState<string | null>(null);
//   const [editValues, setEditValues] = useState<{ messages_sent: number; messages_failed: number }>({ messages_sent: 0, messages_failed: 0 });
//
// In fetchData(), REPLACE the campaigns-based message counting block:
//
// REMOVE (lines ~120-128):
//   const { data: allCampaignsData } = await supabase
//     .from('campaigns')
//     .select('messages_sent, messages_failed')
//     .eq('user_id', user!.id);
//   const totalPendingRetry = allCampaignsData?.reduce(...)
//   const totalMessagesSent = allCampaignsData?.reduce(...)
//   const totalMessagesFailed = allCampaignsData?.reduce(...)
//
// REPLACE WITH:
//   // Real message counts from the messages table
//   const { count: totalMessagesSent } = await supabase
//     .from('messages')
//     .select('id', { count: 'exact', head: true })
//     .eq('user_id', user!.id)
//     .eq('direction', 'outbound')
//     .in('status', ['sent', 'delivered', 'read']);
//
//   const { count: totalMessagesFailed } = await supabase
//     .from('messages')
//     .select('id', { count: 'exact', head: true })
//     .eq('user_id', user!.id)
//     .eq('direction', 'outbound')
//     .eq('status', 'failed');
//
//   const { count: totalPendingRetry } = await supabase
//     .from('messages')
//     .select('id', { count: 'exact', head: true })
//     .eq('user_id', user!.id)
//     .in('status', ['queued', 'sending']);
//
// Then update the setMetrics call to use these values:
//   total_messages_sent: totalMessagesSent || 0,
//   total_messages_failed: totalMessagesFailed || 0,
//   messages_pending_retry: totalPendingRetry || 0,
//
// DELETE any inline edit UI that lets admin manually change messages_sent/messages_failed
// (the edit button, save button, input fields for manual simulation tweaks).

// ─────────────────────────────────────────────────────
// 4. src/components/Campaigns.tsx — FULL CHANGES
// ─────────────────────────────────────────────────────
//
// See the companion file: Campaigns.tsx (already created with all changes)
// Key changes summarized:
//   - Remove auto_increment_* from formData
//   - Add whatsapp_account_id, template_name, template_language
//   - Add startCampaign() function for batch-insert + status change
//   - Remove auto_increment UI from the form modal
//   - Add WhatsApp account dropdown + template name field
//   - Show real metrics from campaign_real_metrics view
//   - Add 'Sending' status with blue indicator

// ─────────────────────────────────────────────────────
// 5. vercel.json — REMOVE CRON
// ─────────────────────────────────────────────────────
//
// If vercel.json contains a "crons" key, delete it entirely.
// The auto-increment.js serverless function is being deleted.
//
// REMOVE:
//   "crons": [{ "path": "/api/auto-increment", "schedule": "* * * * *" }]
//
// Keep any existing "rewrites" or other config.
