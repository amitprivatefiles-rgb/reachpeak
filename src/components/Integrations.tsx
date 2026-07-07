import { Fragment, useEffect, useState, useCallback, useRef } from 'react';
import {
  Key,
  Plus,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw,
  ChevronDown,
  Check,
  ExternalLink,
  Zap,
  ChevronLeft,
  ChevronRight,
  X,
  Shield,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// ─── Types ───────────────────────────────────────────────────────────────────

interface IntegrationKey {
  id: string;
  user_id: string;
  name: string;
  source: string;
  key_prefix: string;
  key_hash: string;
  callback_url: string | null;
  callback_secret: string | null;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
}

interface EventRow {
  id: string;
  user_id: string;
  source: string;
  event_type: string;
  contact_phone: string;
  contact_name: string | null;
  dedupe_key: string | null;
  payload: Record<string, unknown>;
  status: string;
  error_message: string | null;
  created_at: string;
}

type Source = 'peakcart' | 'shopify' | 'woocommerce' | 'api';

const SOURCES: Source[] = ['peakcart', 'shopify', 'woocommerce', 'api'];

const INGEST_URL =
  'https://mxupzmwznkekdjylaztl.supabase.co/functions/v1/ingest-event';

const PAGE_SIZE = 20;

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function sha256(plain: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

const sourceBadgeClasses: Record<string, string> = {
  peakcart: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  shopify: 'bg-green-500/15 text-green-400 border-green-500/30',
  woocommerce: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  api: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
};

const statusBadgeClasses: Record<string, string> = {
  received: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  processed: 'bg-green-500/15 text-green-400 border-green-500/30',
  ignored: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  error: 'bg-red-500/15 text-red-400 border-red-500/30',
};

const eventTypeBadgeClasses: Record<string, string> = {
  cart_abandoned: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  order_created: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  order_fulfilled: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
  payment_failed: 'bg-red-500/15 text-red-400 border-red-500/30',
  customer_created: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
};

const DEFAULT_EVENT_BADGE = 'bg-gray-500/15 text-gray-400 border-gray-500/30';

// ─── Small reusable bits ─────────────────────────────────────────────────────

function Badge({ label, classes }: { label: string; classes: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${classes}`}
    >
      {label}
    </span>
  );
}

function CopyButton({ text, className = '' }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1 text-gray-400 hover:text-white transition-colors ${className}`}
      title="Copy to clipboard"
    >
      {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

// ─── Create Key Modal ────────────────────────────────────────────────────────

function CreateKeyModal({
  userId,
  onClose,
  onCreated,
}: {
  userId: string;
  onClose: () => void;
  onCreated: (fullKey: string) => void;
}) {
  const [name, setName] = useState('');
  const [source, setSource] = useState<Source>('peakcart');
  const [callbackUrl, setCallbackUrl] = useState('');
  const [callbackSecret, setCallbackSecret] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const generateSecret = () => {
    setCallbackSecret(crypto.randomUUID().replace(/-/g, ''));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    setError('');

    try {
      const rawKey = `rpk_live_${crypto.randomUUID().replace(/-/g, '')}`;
      const keyHash = await sha256(rawKey);
      const keyPrefix = rawKey.slice(0, 17); // "rpk_live_" + first 8 hex chars

      const row: Record<string, unknown> = {
        user_id: userId,
        name: name.trim(),
        source,
        key_prefix: keyPrefix,
        key_hash: keyHash,
        is_active: true,
      };
      if (callbackUrl.trim()) row.callback_url = callbackUrl.trim();
      if (callbackSecret.trim()) row.callback_secret = callbackSecret.trim();

      const { error: insertErr } = await supabase
        .from('integration_keys')
        .insert(row);

      if (insertErr) throw insertErr;
      onCreated(rawKey);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create key');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Create API Key</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. PeakCart Production"
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Source */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">Source</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as Source)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Callback URL */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">
              Callback URL <span className="text-gray-500 text-xs">(optional)</span>
            </label>
            <input
              type="url"
              value={callbackUrl}
              onChange={(e) => setCallbackUrl(e.target.value)}
              placeholder="https://your-store.com/webhooks/reachpeak"
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Callback Secret */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">
              Callback Secret <span className="text-gray-500 text-xs">(optional)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={callbackSecret}
                onChange={(e) => setCallbackSecret(e.target.value)}
                placeholder="Auto-generate or enter manually"
                className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={generateSecret}
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs font-medium text-gray-300 hover:border-emerald-500 hover:text-emerald-400 transition-colors"
              >
                Generate
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Key className="h-4 w-4" />
              )}
              Create Key
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Reveal Key Modal ────────────────────────────────────────────────────────

function RevealKeyModal({
  fullKey,
  onClose,
}: {
  fullKey: string;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15">
            <Shield className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">API Key Created</h3>
            <p className="text-sm text-gray-400">
              Copy this key now — it won't be shown again.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all text-sm font-mono text-emerald-400">
              {visible ? fullKey : '•'.repeat(fullKey.length)}
            </code>
            <button
              onClick={() => setVisible((v) => !v)}
              className="text-gray-400 hover:text-white transition-colors"
              title={visible ? 'Hide' : 'Reveal'}
            >
              {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <CopyButton text={fullKey} />
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function Integrations() {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  // ── API keys state ──
  const [keys, setKeys] = useState<IntegrationKey[]>([]);
  const [keysLoading, setKeysLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [showShopifyGuide, setShowShopifyGuide] = useState(false);
  const [showLifecycleDocs, setShowLifecycleDocs] = useState(false);

  // ── Events state ──
  const [events, setEvents] = useState<EventRow[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsPage, setEventsPage] = useState(0);
  const [eventsTotal, setEventsTotal] = useState(0);
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [distinctEventTypes, setDistinctEventTypes] = useState<string[]>([]);

  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Fetch integration keys ──
  const fetchKeys = useCallback(async () => {
    if (!userId) return;
    setKeysLoading(true);
    const { data, error } = await supabase
      .from('integration_keys')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (!error && data) setKeys(data as IntegrationKey[]);
    setKeysLoading(false);
  }, [userId]);

  // ── Fetch events ──
  const fetchEvents = useCallback(async () => {
    if (!userId) return;
    setEventsLoading(true);

    let query = supabase
      .from('events')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(eventsPage * PAGE_SIZE, (eventsPage + 1) * PAGE_SIZE - 1);

    if (eventTypeFilter) {
      query = query.eq('event_type', eventTypeFilter);
    }

    const { data, count, error } = await query;
    if (!error && data) {
      setEvents(data as EventRow[]);
      setEventsTotal(count ?? 0);
    }
    setEventsLoading(false);
  }, [userId, eventsPage, eventTypeFilter]);

  // ── Fetch distinct event types for filter dropdown ──
  const fetchDistinctEventTypes = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('events')
      .select('event_type')
      .eq('user_id', userId);
    if (data) {
      const unique = [...new Set(data.map((r: { event_type: string }) => r.event_type))];
      setDistinctEventTypes(unique.sort());
    }
  }, [userId]);

  // ── Initial load ──
  useEffect(() => {
    fetchKeys();
    fetchEvents();
    fetchDistinctEventTypes();
  }, [fetchKeys, fetchEvents, fetchDistinctEventTypes]);

  // ── Realtime subscription ──
  useEffect(() => {
    if (!autoRefresh || !userId) return;

    const channel = supabase
      .channel('events-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'events',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchEvents();
        },
      )
      .subscribe();

    realtimeChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      realtimeChannelRef.current = null;
    };
  }, [autoRefresh, userId, fetchEvents]);

  // ── Key actions ──
  const toggleKeyActive = async (keyId: string, currentActive: boolean) => {
    const { error } = await supabase
      .from('integration_keys')
      .update({ is_active: !currentActive })
      .eq('id', keyId);
    if (!error) {
      setKeys((prev) =>
        prev.map((k) => (k.id === keyId ? { ...k, is_active: !currentActive } : k)),
      );
    }
  };

  const revokeKey = async (keyId: string) => {
    const { error } = await supabase
      .from('integration_keys')
      .update({ is_active: false })
      .eq('id', keyId);
    if (!error) {
      setKeys((prev) =>
        prev.map((k) => (k.id === keyId ? { ...k, is_active: false } : k)),
      );
    }
  };

  const handleKeyCreated = (fullKey: string) => {
    setShowCreateModal(false);
    setRevealedKey(fullKey);
    fetchKeys();
  };

  // ── Pagination ──
  const totalPages = Math.ceil(eventsTotal / PAGE_SIZE);
  const canPrevPage = eventsPage > 0;
  const canNextPage = eventsPage < totalPages - 1;

  // ── Curl example ──
  const curlExample = `curl -X POST '${INGEST_URL}' \\
  -H 'Authorization: Bearer rpk_live_YOUR_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '{"event_type":"cart_abandoned","dedupe_key":"cart_abc123","contact":{"phone":"+91 98765 43210","name":"Priya"},"payload":{"cart_total":1499,"checkout_url":"https://store.example/checkout/abc"}}'`;

  // ── Render ──
  return (
    <div className="min-h-screen bg-gray-950 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* ─── Header ─────────────────────────────────────────────────── */}
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-white">
            <Zap className="h-7 w-7 text-emerald-400" />
            Integrations
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Manage API keys and monitor incoming events from your connected stores.
          </p>
        </div>

        {/* ─── Section 1 — API Key Management ─────────────────────────── */}
        <section className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Key className="h-5 w-5 text-emerald-400" />
              API Keys
            </h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create Key
            </button>
          </div>

          {keysLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-5 w-5 animate-spin text-gray-500" />
            </div>
          ) : keys.length === 0 ? (
            <div className="py-12 text-center">
              <Key className="mx-auto h-10 w-10 text-gray-700" />
              <p className="mt-3 text-sm text-gray-500">
                No API keys yet. Create one to start sending events.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-xs uppercase tracking-wider text-gray-500">
                    <th className="pb-3 pr-4">Name</th>
                    <th className="pb-3 pr-4">Source</th>
                    <th className="pb-3 pr-4">Key Prefix</th>
                    <th className="pb-3 pr-4">Last Used</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {keys.map((k) => (
                    <tr key={k.id} className="group">
                      <td className="py-3 pr-4 font-medium text-white">{k.name}</td>
                      <td className="py-3 pr-4">
                        <Badge
                          label={k.source}
                          classes={sourceBadgeClasses[k.source] ?? sourceBadgeClasses.api}
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <code className="rounded bg-gray-800 px-2 py-0.5 text-xs font-mono text-gray-300">
                          {k.key_prefix}…
                        </code>
                      </td>
                      <td className="py-3 pr-4 text-gray-400">
                        {k.last_used_at ? relativeTime(k.last_used_at) : '—'}
                      </td>
                      <td className="py-3 pr-4">
                        <button
                          onClick={() => toggleKeyActive(k.id, k.is_active)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            k.is_active ? 'bg-emerald-600' : 'bg-gray-700'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              k.is_active ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => revokeKey(k.id)}
                          disabled={!k.is_active}
                          title="Revoke key"
                          className="rounded-lg p-1.5 text-gray-500 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-500 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ─── Section 2 — Integration Endpoint Info ──────────────────── */}
        <section className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
            <ExternalLink className="h-5 w-5 text-emerald-400" />
            Ingest Endpoint
          </h2>

          <div className="mb-4 rounded-lg border border-gray-700 bg-gray-800 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <code className="break-all text-sm font-mono text-emerald-400">{INGEST_URL}</code>
              <CopyButton text={INGEST_URL} />
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-gray-300">Example Request</p>
            <div className="relative rounded-lg border border-gray-700 bg-gray-800 p-4">
              <CopyButton text={curlExample} className="absolute right-3 top-3" />
              <pre className="overflow-x-auto text-xs leading-relaxed text-gray-300">
                <code>{curlExample}</code>
              </pre>
            </div>
          </div>
        </section>

        {/* ─── Section 3 — Event Log ──────────────────────────────────── */}
        <section className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Zap className="h-5 w-5 text-emerald-400" />
              Event Log
              {eventsTotal > 0 && (
                <span className="ml-1 rounded-full bg-gray-800 px-2.5 py-0.5 text-xs font-normal text-gray-400">
                  {eventsTotal}
                </span>
              )}
            </h2>

            <div className="flex items-center gap-3">
              {/* Event type filter */}
              <select
                value={eventTypeFilter}
                onChange={(e) => {
                  setEventTypeFilter(e.target.value);
                  setEventsPage(0);
                }}
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-gray-300 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">All event types</option>
                {distinctEventTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              {/* Auto-refresh toggle */}
              <button
                onClick={() => setAutoRefresh((v) => !v)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  autoRefresh
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                    : 'border-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
                Auto-refresh
              </button>

              {/* Manual refresh */}
              <button
                onClick={fetchEvents}
                className="rounded-lg border border-gray-700 p-1.5 text-gray-400 hover:text-white transition-colors"
                title="Refresh"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          {eventsLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-5 w-5 animate-spin text-gray-500" />
            </div>
          ) : events.length === 0 ? (
            <div className="py-12 text-center">
              <Zap className="mx-auto h-10 w-10 text-gray-700" />
              <p className="mt-3 text-sm text-gray-500">
                No events recorded yet. Send your first event to see it here.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-xs uppercase tracking-wider text-gray-500">
                      <th className="pb-3 pr-4 w-8"></th>
                      <th className="pb-3 pr-4">Event Type</th>
                      <th className="pb-3 pr-4">Contact</th>
                      <th className="pb-3 pr-4">Status</th>
                      <th className="pb-3 pr-4">Source</th>
                      <th className="pb-3">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {events.map((ev) => {
                      const isExpanded = expandedEventId === ev.id;
                      return (
                        <Fragment key={ev.id}>
                          <tr
                            className="cursor-pointer hover:bg-gray-800/40 transition-colors"
                            onClick={() =>
                              setExpandedEventId(isExpanded ? null : ev.id)
                            }
                          >
                            <td className="py-3 pr-2">
                              <ChevronDown
                                className={`h-4 w-4 text-gray-500 transition-transform ${
                                  isExpanded ? 'rotate-180' : ''
                                }`}
                              />
                            </td>
                            <td className="py-3 pr-4">
                              <Badge
                                label={ev.event_type.replace(/_/g, ' ')}
                                classes={
                                  eventTypeBadgeClasses[ev.event_type] ?? DEFAULT_EVENT_BADGE
                                }
                              />
                            </td>
                            <td className="py-3 pr-4">
                              <span className="text-white">{ev.contact_phone}</span>
                              {ev.contact_name && (
                                <span className="ml-2 text-gray-500">{ev.contact_name}</span>
                              )}
                            </td>
                            <td className="py-3 pr-4">
                              <Badge
                                label={ev.status}
                                classes={statusBadgeClasses[ev.status] ?? DEFAULT_EVENT_BADGE}
                              />
                            </td>
                            <td className="py-3 pr-4">
                              <Badge
                                label={ev.source}
                                classes={
                                  sourceBadgeClasses[ev.source] ?? sourceBadgeClasses.api
                                }
                              />
                            </td>
                            <td className="py-3 text-gray-400 whitespace-nowrap">
                              {relativeTime(ev.created_at)}
                            </td>
                          </tr>

                          {/* Expanded payload row */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={6} className="px-4 pb-4 pt-0">
                                <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
                                  <div className="mb-2 flex items-center justify-between">
                                    <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
                                      Payload
                                    </span>
                                    <CopyButton
                                      text={JSON.stringify(ev.payload, null, 2)}
                                    />
                                  </div>
                                  <pre className="overflow-x-auto text-xs leading-relaxed text-gray-300">
                                    <code>{JSON.stringify(ev.payload, null, 2)}</code>
                                  </pre>
                                  {ev.error_message && (
                                    <div className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                                      <strong>Error:</strong> {ev.error_message}
                                    </div>
                                  )}
                                  {ev.dedupe_key && (
                                    <p className="mt-2 text-xs text-gray-500">
                                      Dedupe key:{' '}
                                      <code className="rounded bg-gray-900 px-1.5 py-0.5 font-mono text-gray-400">
                                        {ev.dedupe_key}
                                      </code>
                                    </p>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t border-gray-800 pt-4">
                  <p className="text-xs text-gray-500">
                    Showing {eventsPage * PAGE_SIZE + 1}–
                    {Math.min((eventsPage + 1) * PAGE_SIZE, eventsTotal)} of {eventsTotal}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEventsPage((p) => p - 1)}
                      disabled={!canPrevPage}
                      className="rounded-lg border border-gray-700 p-1.5 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="px-3 text-xs text-gray-400">
                      {eventsPage + 1} / {totalPages}
                    </span>
                    <button
                      onClick={() => setEventsPage((p) => p + 1)}
                      disabled={!canNextPage}
                      className="rounded-lg border border-gray-700 p-1.5 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* ─── Shopify Setup Guide ───────────────────────────────────── */}
        <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
          <button
            onClick={() => setShowShopifyGuide(!showShopifyGuide)}
            className="flex w-full items-center justify-between text-left"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/10">
                <ExternalLink className="h-4 w-4 text-green-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Shopify Integration</h3>
                <p className="text-xs text-gray-500">Connect your Shopify store for automatic order tracking</p>
              </div>
            </div>
            <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${showShopifyGuide ? 'rotate-180' : ''}`} />
          </button>
          {showShopifyGuide && (
            <div className="mt-4 space-y-3 border-t border-gray-800 pt-4 text-sm text-gray-300">
              <div className="space-y-2">
                <p className="font-semibold text-white">Setup Steps:</p>
                <ol className="list-decimal pl-5 space-y-1.5 text-gray-400">
                  <li>In your Shopify Admin, go to <strong className="text-gray-300">Settings → Notifications → Webhooks</strong></li>
                  <li>Create webhooks for these topics, all pointing to:<br/>
                    <code className="mt-1 block rounded bg-gray-800 px-2 py-1 text-xs text-green-400 font-mono">
                      https://mxupzmwznkekdjylaztl.supabase.co/functions/v1/shopify-webhook
                    </code>
                  </li>
                  <li className="text-xs text-gray-500">
                    Topics: <code>orders/create</code>, <code>orders/paid</code>, <code>orders/cancelled</code>,
                    <code>orders/fulfilled</code>, <code>fulfillments/create</code>, <code>fulfillments/update</code>,
                    <code>refunds/create</code>, <code>checkouts/create</code>, <code>checkouts/update</code>
                  </li>
                  <li>Copy the <strong className="text-gray-300">Webhook signing secret</strong> from Shopify</li>
                  <li>Create an integration key above with source <strong className="text-gray-300">"shopify"</strong></li>
                  <li>Set the <strong className="text-gray-300">provider_secret</strong> to the Shopify webhook signing secret and <strong className="text-gray-300">shop_domain</strong> to your Shopify domain (e.g. <code>mystore.myshopify.com</code>)</li>
                </ol>
                <p className="text-xs text-gray-500 mt-2">
                  Once connected, Shopify orders flow automatically into OrderGuard for risk scoring and lifecycle tracking.
                  Abandoned checkouts are scanned every 15 minutes.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* ─── Lifecycle Events Reference ─────────────────────────────── */}
        <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
          <button
            onClick={() => setShowLifecycleDocs(!showLifecycleDocs)}
            className="flex w-full items-center justify-between text-left"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10">
                <Zap className="h-4 w-4 text-purple-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Lifecycle Events Reference</h3>
                <p className="text-xs text-gray-500">All event types and their payload contracts</p>
              </div>
            </div>
            <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${showLifecycleDocs ? 'rotate-180' : ''}`} />
          </button>
          {showLifecycleDocs && (
            <div className="mt-4 space-y-3 border-t border-gray-800 pt-4 text-xs font-mono">
              {[
                { type: 'order_created', required: 'order_id', fields: 'total, currency, payment_method, cod(bool), items[], address{line,city,state,pincode}, risk_score(optional), pay_url(optional)' },
                { type: 'order_confirmed', required: 'order_id', fields: 'reason(optional)' },
                { type: 'order_paid', required: 'order_id', fields: 'payment_method' },
                { type: 'order_shipped', required: 'order_id', fields: 'tracking_url, carrier' },
                { type: 'order_delivered', required: 'order_id', fields: '—' },
                { type: 'order_cancelled', required: 'order_id', fields: 'reason(optional)' },
                { type: 'order_rto', required: 'order_id', fields: 'reason(optional)' },
                { type: 'order_returned', required: 'order_id', fields: 'amount(optional)' },
                { type: 'order_refunded', required: 'order_id', fields: 'amount(optional)' },
                { type: 'cod_pending', required: 'order_id', fields: 'total, address_city, address_pincode' },
                { type: 'prepay_nudge', required: 'order_id', fields: 'total, pay_url, discount(optional)' },
                { type: 'cart_abandoned', required: 'checkout_url', fields: 'cart_total, currency, items[]' },
                { type: 'checkout_started', required: 'checkout_token', fields: 'cart_total, currency, checkout_url' },
                { type: 'customer_created', required: '—', fields: 'email(optional)' },
              ].map(e => (
                <div key={e.type} className="flex items-start gap-3 rounded-lg bg-gray-800/50 p-3">
                  <code className="text-green-400 whitespace-nowrap min-w-[140px]">{e.type}</code>
                  <div className="text-gray-400">
                    <span className="text-yellow-400">required:</span> {e.required} · <span className="text-gray-500">{e.fields}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ─── Modals ──────────────────────────────────────────────────── */}
      {showCreateModal && (
        <CreateKeyModal
          userId={userId}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleKeyCreated}
        />
      )}

      {revealedKey && (
        <RevealKeyModal
          fullKey={revealedKey}
          onClose={() => setRevealedKey(null)}
        />
      )}
    </div>
  );
}
