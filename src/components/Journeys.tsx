import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ALL_PRESETS, JourneyPreset, JourneyStep } from '../lib/journeyPresets';
import {
  Zap,
  Plus,
  Play,
  Pause,
  Trash2,
  ChevronDown,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  Star,
  ShoppingCart,
  Package,
  Truck,
  UserPlus,
  DollarSign,
  ArrowRight,
  BarChart3,
  Loader2,
  X,
  AlertTriangle,
  Send,
  MessageSquare,
  RefreshCw,
  Eye,
  Settings,
} from 'lucide-react';

// ─── Types ───

interface Journey {
  id: string;
  user_id: string;
  name: string;
  preset: string;
  trigger_event: string;
  trigger_filters: Record<string, any> | null;
  exit_on_events: string[] | null;
  steps: JourneyStep[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface JourneyExecution {
  id: string;
  journey_id: string;
  user_id: string;
  contact_phone: string;
  event_id: string | null;
  current_step: number;
  status: 'active' | 'waiting_delay' | 'waiting_reply' | 'completed' | 'exited_goal' | 'cancelled' | 'error';
  wake_at: string | null;
  context: Record<string, any> | null;
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
}

interface Template {
  id: string;
  name: string;
  language: string;
  body_text: string | null;
  components: any;
  header_sample_url: string | null;
}

interface JourneyStats {
  active: number;
  waiting_delay: number;
  waiting_reply: number;
  completed: number;
  exited_goal: number;
  cancelled: number;
  error: number;
  total: number;
}

// ─── Preset color / icon maps ───

const PRESET_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  abandoned_cart: { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30' },
  order_notifications: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' },
  cod_confirm: { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30' },
  welcome: { bg: 'bg-green-500/15', text: 'text-green-400', border: 'border-green-500/30' },
  custom: { bg: 'bg-gray-500/15', text: 'text-gray-400', border: 'border-gray-500/30' },
};

const PRESET_ICONS: Record<string, any> = {
  abandoned_cart: ShoppingCart,
  order_notifications: Package,
  cod_confirm: DollarSign,
  welcome: UserPlus,
  custom: Settings,
};

const PRESET_ICON_BG: Record<string, string> = {
  abandoned_cart: 'bg-orange-500',
  order_notifications: 'bg-blue-500',
  cod_confirm: 'bg-purple-500',
  welcome: 'bg-green-500',
  custom: 'bg-gray-500',
};

const STATUS_STYLES: Record<string, { bg: string; text: string; dot?: string }> = {
  active: { bg: 'bg-green-500/15', text: 'text-green-400', dot: 'bg-green-400' },
  waiting_delay: { bg: 'bg-yellow-500/15', text: 'text-yellow-400' },
  waiting_reply: { bg: 'bg-blue-500/15', text: 'text-blue-400' },
  completed: { bg: 'bg-gray-500/15', text: 'text-gray-400' },
  exited_goal: { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  cancelled: { bg: 'bg-red-500/15', text: 'text-red-400' },
  error: { bg: 'bg-red-500/15', text: 'text-red-400' },
};

function getPresetColor(presetKey: string) {
  return PRESET_COLORS[presetKey] || PRESET_COLORS.custom;
}

function getPresetIcon(presetKey: string) {
  return PRESET_ICONS[presetKey] || PRESET_ICONS.custom;
}

function getPresetIconBg(presetKey: string) {
  return PRESET_ICON_BG[presetKey] || PRESET_ICON_BG.custom;
}

function getStatusStyle(status: string) {
  return STATUS_STYLES[status] || STATUS_STYLES.error;
}

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.round(mins / 60)}h`;
  return `${Math.round(mins / 1440)}d`;
}

function formatDateTime(dt: string | null): string {
  if (!dt) return '—';
  return new Date(dt).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Main Component ───

export function Journeys() {
  const { user } = useAuth();

  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [statsMap, setStatsMap] = useState<Record<string, JourneyStats>>({});
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<Template[]>([]);

  // Views
  const [selectedJourneyId, setSelectedJourneyId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // ─── Data Fetching ───

  const fetchJourneys = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: journeysData } = await supabase
        .from('journeys')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const list = (journeysData || []) as Journey[];
      setJourneys(list);

      // Fetch stats for all journeys in one query
      if (list.length > 0) {
        const journeyIds = list.map((j) => j.id);
        const { data: execData } = await supabase
          .from('journey_executions')
          .select('journey_id, status')
          .in('journey_id', journeyIds);

        const map: Record<string, JourneyStats> = {};
        for (const j of list) {
          map[j.id] = { active: 0, waiting_delay: 0, waiting_reply: 0, completed: 0, exited_goal: 0, cancelled: 0, error: 0, total: 0 };
        }
        for (const exec of execData || []) {
          const stats = map[exec.journey_id];
          if (stats) {
            const s = exec.status as keyof Omit<JourneyStats, 'total'>;
            if (s in stats) (stats as any)[s]++;
            stats.total++;
          }
        }
        setStatsMap(map);
      }
    } catch (err) {
      console.error('Error fetching journeys:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchTemplates = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('templates')
      .select('id,name,language,body_text,components,header_sample_url')
      .eq('user_id', user.id)
      .eq('status', 'approved');
    setTemplates((data || []) as Template[]);
  }, [user]);

  useEffect(() => {
    fetchJourneys();
    fetchTemplates();
  }, [fetchJourneys, fetchTemplates]);

  // ─── Toggle Active ───

  const toggleJourneyActive = async (journey: Journey) => {
    const newState = !journey.is_active;
    await supabase
      .from('journeys')
      .update({ is_active: newState, updated_at: new Date().toISOString() })
      .eq('id', journey.id);
    setJourneys((prev) => prev.map((j) => (j.id === journey.id ? { ...j, is_active: newState } : j)));
  };

  // ─── Delete Journey ───

  const deleteJourney = async (journeyId: string) => {
    if (!confirm('Delete this journey and all its executions? This cannot be undone.')) return;
    await supabase.from('journey_executions').delete().eq('journey_id', journeyId);
    await supabase.from('journeys').delete().eq('id', journeyId);
    setJourneys((prev) => prev.filter((j) => j.id !== journeyId));
    if (selectedJourneyId === journeyId) setSelectedJourneyId(null);
  };

  // ─── Views ───

  const selectedJourney = journeys.find((j) => j.id === selectedJourneyId) || null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
          <p className="text-gray-400 text-sm">Loading journeys...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 flex items-center gap-3">
            <Zap className="w-7 h-7 text-emerald-400" />
            Journeys
          </h1>
          <p className="text-gray-400 text-sm sm:text-base">
            Automate WhatsApp messaging with event-triggered workflows
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchJourneys}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition font-medium shadow-lg shadow-emerald-600/20"
          >
            <Plus className="w-5 h-5" />
            Create Journey
          </button>
        </div>
      </div>

      {/* Journey Detail or List */}
      {selectedJourney ? (
        <JourneyDetail
          journey={selectedJourney}
          stats={statsMap[selectedJourney.id]}
          templates={templates}
          onBack={() => setSelectedJourneyId(null)}
          onToggle={() => toggleJourneyActive(selectedJourney)}
          onDelete={() => deleteJourney(selectedJourney.id)}
          onRefresh={fetchJourneys}
        />
      ) : (
        <JourneyList
          journeys={journeys}
          statsMap={statsMap}
          onSelect={(id) => setSelectedJourneyId(id)}
          onToggle={toggleJourneyActive}
        />
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateJourneyModal
          templates={templates}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchJourneys();
          }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Journey List View
// ═══════════════════════════════════════════════════════════

function JourneyList({
  journeys,
  statsMap,
  onSelect,
  onToggle,
}: {
  journeys: Journey[];
  statsMap: Record<string, JourneyStats>;
  onSelect: (id: string) => void;
  onToggle: (journey: Journey) => void;
}) {
  if (journeys.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-16 text-center">
        <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Zap className="w-8 h-8 text-gray-600" />
        </div>
        <h3 className="text-white text-lg font-semibold mb-2">No journeys yet</h3>
        <p className="text-gray-400 text-sm max-w-md mx-auto">
          Create your first automation to send messages automatically when store events happen — like abandoned carts, new orders, or new customers.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {journeys.map((journey) => {
        const stats = statsMap[journey.id] || { active: 0, waiting_delay: 0, waiting_reply: 0, completed: 0, exited_goal: 0, cancelled: 0, error: 0, total: 0 };
        const presetColor = getPresetColor(journey.preset);
        const PresetIcon = getPresetIcon(journey.preset);
        const iconBg = getPresetIconBg(journey.preset);
        const isAbandoned = journey.preset === 'abandoned_cart';

        return (
          <div
            key={journey.id}
            className="bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-700 transition group cursor-pointer"
            onClick={() => onSelect(journey.id)}
          >
            <div className="p-5">
              {/* Header Row */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className={`w-10 h-10 ${iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <PresetIcon className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-white font-semibold text-base truncate group-hover:text-emerald-400 transition">
                      {journey.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${presetColor.bg} ${presetColor.text}`}>
                        {journey.preset.replace(/_/g, ' ')}
                      </span>
                      <span className="text-gray-500 text-xs flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        {journey.trigger_event}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Active Toggle */}
                <button
                  onClick={(e) => { e.stopPropagation(); onToggle(journey); }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                    journey.is_active ? 'bg-emerald-600' : 'bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      journey.is_active ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Status indicator */}
              <div className="flex items-center gap-2 mb-4">
                {journey.is_active ? (
                  <span className="flex items-center gap-1.5 text-xs text-green-400">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
                    </span>
                    Active
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span className="h-2 w-2 rounded-full bg-gray-600" />
                    Paused
                  </span>
                )}
                <span className="text-gray-600 text-xs">•</span>
                <span className="text-gray-500 text-xs">{journey.steps.filter(s => s.type !== 'end').length} steps</span>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-gray-800/60 rounded-lg p-2 text-center">
                  <p className="text-gray-500 text-[10px] font-medium uppercase tracking-wider mb-0.5">Started</p>
                  <p className="text-white text-sm font-bold">{stats.total}</p>
                </div>
                <div className="bg-gray-800/60 rounded-lg p-2 text-center">
                  <p className="text-gray-500 text-[10px] font-medium uppercase tracking-wider mb-0.5">Active</p>
                  <p className="text-green-400 text-sm font-bold">{stats.active + stats.waiting_delay + stats.waiting_reply}</p>
                </div>
                <div className="bg-gray-800/60 rounded-lg p-2 text-center">
                  <p className="text-gray-500 text-[10px] font-medium uppercase tracking-wider mb-0.5">
                    {isAbandoned ? 'Recovered' : 'Goal'}
                  </p>
                  <p className="text-emerald-400 text-sm font-bold">{stats.exited_goal}</p>
                </div>
                <div className="bg-gray-800/60 rounded-lg p-2 text-center">
                  <p className="text-gray-500 text-[10px] font-medium uppercase tracking-wider mb-0.5">Errors</p>
                  <p className="text-red-400 text-sm font-bold">{stats.error}</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-800 px-5 py-3 flex items-center justify-between">
              <span className="text-gray-500 text-xs">
                Created {new Date(journey.created_at).toLocaleDateString()}
              </span>
              <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-emerald-400 transition" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Journey Detail View
// ═══════════════════════════════════════════════════════════

function JourneyDetail({
  journey,
  stats,
  templates,
  onBack,
  onToggle,
  onDelete,
  onRefresh,
}: {
  journey: Journey;
  stats: JourneyStats | undefined;
  templates: Template[];
  onBack: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onRefresh: () => void;
}) {
  const { user } = useAuth();
  const [executions, setExecutions] = useState<JourneyExecution[]>([]);
  const [loadingExecs, setLoadingExecs] = useState(true);
  const [messageSentCount, setMessageSentCount] = useState(0);
  const [expandedExecId, setExpandedExecId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const presetColor = getPresetColor(journey.preset);
  const PresetIcon = getPresetIcon(journey.preset);
  const iconBg = getPresetIconBg(journey.preset);
  const isAbandoned = journey.preset === 'abandoned_cart';
  const s = stats || { active: 0, waiting_delay: 0, waiting_reply: 0, completed: 0, exited_goal: 0, cancelled: 0, error: 0, total: 0 };

  useEffect(() => {
    const fetchExecutions = async () => {
      setLoadingExecs(true);
      const { data } = await supabase
        .from('journey_executions')
        .select('*')
        .eq('journey_id', journey.id)
        .order('started_at', { ascending: false })
        .limit(100);
      setExecutions((data || []) as JourneyExecution[]);

      // Count messages sent for this journey's executions
      const execIds = (data || []).map((e: any) => e.id);
      if (execIds.length > 0) {
        const { count } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user!.id)
          .in('journey_execution_id', execIds);
        setMessageSentCount(count || 0);
      } else {
        setMessageSentCount(0);
      }

      setLoadingExecs(false);
    };
    fetchExecutions();
  }, [journey.id, user]);

  // Resolve template name by id
  const getTemplateName = (templateId: string | undefined) => {
    if (!templateId) return 'No template';
    const t = templates.find((tpl) => tpl.id === templateId);
    return t ? t.name : templateId.substring(0, 8) + '…';
  };

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <div className={`w-10 h-10 ${iconBg} rounded-lg flex items-center justify-center`}>
            <PresetIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{journey.name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${presetColor.bg} ${presetColor.text}`}>
                {journey.preset.replace(/_/g, ' ')}
              </span>
              <span className="text-gray-500 text-xs">
                Trigger: <span className="text-gray-300">{journey.trigger_event}</span>
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Active toggle */}
          <button
            onClick={onToggle}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition ${
              journey.is_active
                ? 'bg-yellow-500/15 text-yellow-400 hover:bg-yellow-500/25'
                : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
            }`}
          >
            {journey.is_active ? (
              <>
                <Pause className="w-4 h-4" /> Pause
              </>
            ) : (
              <>
                <Play className="w-4 h-4" /> Activate
              </>
            )}
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition text-sm font-medium"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <p className="text-red-300 text-sm">
              This will permanently delete the journey and all {s.total} executions.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowDeleteConfirm(false)} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition">
              Cancel
            </button>
            <button
              onClick={() => { setShowDeleteConfirm(false); onDelete(); }}
              className="px-4 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-500 transition font-medium"
            >
              Delete Forever
            </button>
          </div>
        </div>
      )}

      {/* Analytics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <AnalyticsCard label="Started" value={s.total} icon={Play} color="text-blue-400" bgColor="bg-blue-500" />
        <AnalyticsCard label="Completed" value={s.completed} icon={CheckCircle} color="text-gray-400" bgColor="bg-gray-500" />
        <AnalyticsCard
          label={isAbandoned ? 'Recovered Carts' : 'Goal Reached'}
          value={s.exited_goal}
          icon={Star}
          color="text-emerald-400"
          bgColor="bg-emerald-500"
        />
        <AnalyticsCard label="Errors" value={s.error} icon={XCircle} color="text-red-400" bgColor="bg-red-500" />
        <AnalyticsCard label="Messages Sent" value={messageSentCount} icon={Send} color="text-cyan-400" bgColor="bg-cyan-500" />
      </div>

      {/* Journey Steps Visualization */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Settings className="w-4 h-4 text-gray-400" />
          Journey Steps
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          {journey.steps
            .filter((step) => step.type !== 'end')
            .map((step, idx, arr) => (
              <div key={idx} className="flex items-center gap-2">
                <StepBadge step={step} getTemplateName={getTemplateName} />
                {idx < arr.length - 1 && <ArrowRight className="w-4 h-4 text-gray-600 flex-shrink-0" />}
              </div>
            ))}
        </div>
        {journey.exit_on_events && journey.exit_on_events.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-800">
            <p className="text-xs text-gray-500 flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-emerald-500" />
              <span>Exits on:</span>
              {journey.exit_on_events.map((evt) => (
                <span key={evt} className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium">
                  {evt}
                </span>
              ))}
            </p>
          </div>
        )}
      </div>

      {/* Executions Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-gray-400" />
            Recent Executions
            <span className="text-gray-500 text-sm font-normal">({executions.length})</span>
          </h3>
        </div>
        {loadingExecs ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
          </div>
        ) : executions.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-500 text-sm">No executions yet. Activate the journey and wait for trigger events.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {executions.map((exec) => {
              const statusStyle = getStatusStyle(exec.status);
              const isExpanded = expandedExecId === exec.id;

              return (
                <div key={exec.id}>
                  <div
                    className="px-5 py-3 flex items-center gap-4 hover:bg-gray-800/40 transition cursor-pointer"
                    onClick={() => setExpandedExecId(isExpanded ? null : exec.id)}
                  >
                    <button className="flex-shrink-0 text-gray-500 hover:text-gray-300 transition">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-5 gap-2 sm:gap-4 items-center">
                      {/* Phone */}
                      <div className="sm:col-span-1">
                        <p className="text-white text-sm font-medium truncate">{exec.contact_phone}</p>
                      </div>
                      {/* Status */}
                      <div className="sm:col-span-1">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                          {exec.status === 'active' && statusStyle.dot && (
                            <span className="relative flex h-1.5 w-1.5">
                              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${statusStyle.dot} opacity-75`} />
                              <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${statusStyle.dot}`} />
                            </span>
                          )}
                          {exec.status === 'exited_goal' && <Star className="w-3 h-3" />}
                          {exec.status === 'error' && <XCircle className="w-3 h-3" />}
                          {exec.status === 'waiting_delay' && <Clock className="w-3 h-3" />}
                          {exec.status === 'waiting_reply' && <MessageSquare className="w-3 h-3" />}
                          {exec.status === 'completed' && <CheckCircle className="w-3 h-3" />}
                          {exec.status === 'cancelled' && <XCircle className="w-3 h-3" />}
                          {isAbandoned && exec.status === 'exited_goal' ? 'Recovered' : exec.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      {/* Step */}
                      <div className="sm:col-span-1">
                        <p className="text-gray-400 text-xs">
                          Step {exec.current_step + 1}/{journey.steps.length}
                        </p>
                      </div>
                      {/* Started */}
                      <div className="sm:col-span-1">
                        <p className="text-gray-500 text-xs">{formatDateTime(exec.started_at)}</p>
                      </div>
                      {/* Finished */}
                      <div className="sm:col-span-1">
                        <p className="text-gray-500 text-xs">{exec.finished_at ? formatDateTime(exec.finished_at) : '—'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Expanded execution details */}
                  {isExpanded && (
                    <div className="px-5 pb-4 pl-14 space-y-3">
                      {/* Step-by-step progress */}
                      <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Step Progress</p>
                        <div className="flex flex-wrap gap-1.5">
                          {journey.steps
                            .filter((st) => st.type !== 'end')
                            .map((step, idx) => {
                              const isCurrent = idx === exec.current_step;
                              const isPast = idx < exec.current_step;
                              const isFuture = idx > exec.current_step;
                              return (
                                <div
                                  key={idx}
                                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium ${
                                    isCurrent
                                      ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40'
                                      : isPast
                                      ? 'bg-gray-700 text-gray-300'
                                      : 'bg-gray-800 text-gray-600'
                                  }`}
                                >
                                  {isPast && <CheckCircle className="w-3 h-3 text-green-400" />}
                                  {isCurrent && (
                                    <span className="relative flex h-1.5 w-1.5">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                                    </span>
                                  )}
                                  {isFuture && <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />}
                                  {step.label || step.type}
                                </div>
                              );
                            })}
                        </div>
                      </div>

                      {/* Error message */}
                      {exec.error_message && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-2">
                          <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                          <p className="text-red-300 text-xs">{exec.error_message}</p>
                        </div>
                      )}

                      {/* Wake at (if waiting) */}
                      {exec.wake_at && (exec.status === 'waiting_delay' || exec.status === 'waiting_reply') && (
                        <div className="flex items-center gap-2 text-xs text-yellow-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Scheduled to wake at {formatDateTime(exec.wake_at)}</span>
                        </div>
                      )}

                      {/* Link to inbox */}
                      <div className="flex items-center gap-2">
                        <a
                          href={`#inbox?phone=${encodeURIComponent(exec.contact_phone)}`}
                          className="text-xs text-emerald-400 hover:text-emerald-300 transition flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View in Inbox
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function AnalyticsCard({
  label,
  value,
  icon: Icon,
  color,
  bgColor,
}: {
  label: string;
  value: number;
  icon: any;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-8 h-8 ${bgColor} rounded-lg flex items-center justify-center`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
      <p className="text-gray-400 text-xs font-medium mb-0.5">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value.toLocaleString()}</p>
    </div>
  );
}

function StepBadge({
  step,
  getTemplateName,
}: {
  step: JourneyStep;
  getTemplateName: (id: string | undefined) => string;
}) {
  if (step.type === 'wait') {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 text-xs font-medium">
        <Clock className="w-3.5 h-3.5" />
        Wait {formatMinutes(step.minutes || 0)}
      </div>
    );
  }
  if (step.type === 'send_template') {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs font-medium">
        <Send className="w-3.5 h-3.5" />
        {step.label || getTemplateName(step.template_id)}
      </div>
    );
  }
  if (step.type === 'send_buttons') {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 text-xs font-medium">
        <MessageSquare className="w-3.5 h-3.5" />
        {step.label || 'Button message'}
      </div>
    );
  }
  if (step.type === 'callback') {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-400 text-xs font-medium">
        <ArrowRight className="w-3.5 h-3.5" />
        Callback: {step.decision}
      </div>
    );
  }
  if (step.type === 'set_tag') {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-cyan-400 text-xs font-medium">
        Tag: {step.tag}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-500/10 border border-gray-500/20 rounded-lg text-gray-400 text-xs font-medium">
      {step.type}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Create Journey Modal
// ═══════════════════════════════════════════════════════════

function CreateJourneyModal({
  templates,
  onClose,
  onCreated,
}: {
  templates: Template[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const { user } = useAuth();
  const [step, setStep] = useState<'pick_preset' | 'configure'>('pick_preset');
  const [selectedPreset, setSelectedPreset] = useState<JourneyPreset | null>(null);
  const [saving, setSaving] = useState(false);

  // Config state
  const [journeyName, setJourneyName] = useState('');
  const [stepConfigs, setStepConfigs] = useState<StepConfig[]>([]);
  const [minCartTotal, setMinCartTotal] = useState<string>('');
  const [autoActivate, setAutoActivate] = useState(true);

  interface StepConfig {
    type: string;
    template_id: string;
    variable_bindings: Record<string, string>;
    minutes: number;
    label: string;
    // For send_buttons on_timeout send_template
    timeout_template_id: string;
    timeout_variable_bindings: Record<string, string>;
  }

  const selectPreset = (preset: JourneyPreset) => {
    setSelectedPreset(preset);
    setJourneyName(preset.name);

    // Build step configs from preset steps
    const configs: StepConfig[] = [];
    const buildConfigs = (steps: JourneyStep[]) => {
      for (const s of steps) {
        if (s.type === 'end') continue;

        const cfg: StepConfig = {
          type: s.type,
          template_id: s.template_id || '',
          variable_bindings: { ...(s.variable_bindings || {}) },
          minutes: s.minutes || 0,
          label: s.label || '',
          timeout_template_id: '',
          timeout_variable_bindings: {},
        };

        // Check for on_timeout send_template
        if (s.type === 'send_buttons' && s.on_timeout) {
          const timeoutSend = s.on_timeout.find((t) => t.type === 'send_template');
          if (timeoutSend) {
            cfg.timeout_template_id = timeoutSend.template_id || '';
            cfg.timeout_variable_bindings = { ...(timeoutSend.variable_bindings || {}) };
          }
        }

        configs.push(cfg);
      }
    };
    buildConfigs(preset.steps);
    setStepConfigs(configs);
    setStep('configure');
  };

  const updateStepConfig = (index: number, updates: Partial<StepConfig>) => {
    setStepConfigs((prev) => prev.map((c, i) => (i === index ? { ...c, ...updates } : c)));
  };

  const handleSubmit = async () => {
    if (!user || !selectedPreset) return;
    setSaving(true);

    try {
      // Rebuild steps from configs, merge back into preset structure
      const buildSteps = (): JourneyStep[] => {
        const presetSteps = [...selectedPreset.steps];
        let configIdx = 0;

        const mapStep = (original: JourneyStep): JourneyStep => {
          if (original.type === 'end') return { type: 'end' };

          const cfg = stepConfigs[configIdx];
          configIdx++;

          if (!cfg) return original;

          const rebuilt: JourneyStep = { ...original };

          if (cfg.type === 'wait') {
            rebuilt.minutes = cfg.minutes;
          }
          if (cfg.type === 'send_template' || cfg.type === 'send_buttons') {
            rebuilt.template_id = cfg.template_id;
            rebuilt.variable_bindings = { ...cfg.variable_bindings };
          }
          if (cfg.type === 'send_buttons' && original.on_timeout) {
            rebuilt.on_timeout = original.on_timeout.map((t) => {
              if (t.type === 'send_template') {
                return {
                  ...t,
                  template_id: cfg.timeout_template_id,
                  variable_bindings: { ...cfg.timeout_variable_bindings },
                };
              }
              return t;
            });
          }

          return rebuilt;
        };

        return presetSteps.map(mapStep);
      };

      const triggerFilters: Record<string, any> = {};
      if (selectedPreset.key === 'abandoned_cart' && minCartTotal) {
        triggerFilters.min_cart_total = parseFloat(minCartTotal);
      }

      const { error } = await supabase.from('journeys').insert({
        user_id: user.id,
        name: journeyName,
        preset: selectedPreset.key,
        trigger_event: selectedPreset.trigger_event,
        trigger_filters: Object.keys(triggerFilters).length > 0 ? triggerFilters : null,
        exit_on_events: selectedPreset.exit_on_events,
        steps: buildSteps(),
        is_active: autoActivate,
      });

      if (error) {
        console.error('Error creating journey:', error);
        alert('Failed to create journey: ' + error.message);
      } else {
        onCreated();
      }
    } catch (err) {
      console.error('Error creating journey:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Plus className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">Create Journey</h2>
              <p className="text-gray-400 text-xs">
                {step === 'pick_preset' ? 'Step 1: Choose a preset' : 'Step 2: Configure your journey'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'pick_preset' ? (
            <PresetPicker onSelect={selectPreset} />
          ) : selectedPreset ? (
            <ConfigureJourney
              preset={selectedPreset}
              journeyName={journeyName}
              setJourneyName={setJourneyName}
              stepConfigs={stepConfigs}
              updateStepConfig={updateStepConfig}
              templates={templates}
              minCartTotal={minCartTotal}
              setMinCartTotal={setMinCartTotal}
              autoActivate={autoActivate}
              setAutoActivate={setAutoActivate}
              onBack={() => setStep('pick_preset')}
            />
          ) : null}
        </div>

        {/* Modal Footer */}
        {step === 'configure' && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800 bg-gray-900/50 flex-shrink-0">
            <button
              onClick={() => setStep('pick_preset')}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition"
            >
              ← Back to presets
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !journeyName.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-600/20"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Creating…
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" /> Create Journey
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Preset Picker Grid ───

function PresetPicker({ onSelect }: { onSelect: (preset: JourneyPreset) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {ALL_PRESETS.map((preset) => {
        const colors = getPresetColor(preset.key);
        const Icon = getPresetIcon(preset.key);
        const iconBg = getPresetIconBg(preset.key);

        return (
          <button
            key={preset.key + preset.trigger_event}
            onClick={() => onSelect(preset)}
            className={`text-left bg-gray-800/60 border ${colors.border} rounded-xl p-5 hover:bg-gray-800 hover:border-gray-600 transition group`}
          >
            <div className="flex items-start gap-3 mb-3">
              <div className={`w-10 h-10 ${iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm group-hover:text-emerald-400 transition">
                  {preset.name}
                </h3>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-medium ${colors.bg} ${colors.text}`}>
                  {preset.trigger_event}
                </span>
              </div>
            </div>
            <p className="text-gray-400 text-xs leading-relaxed">{preset.description}</p>
            <div className="mt-3 flex items-center gap-1 text-emerald-500 text-xs font-medium opacity-0 group-hover:opacity-100 transition">
              Select preset <ArrowRight className="w-3 h-3" />
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Configure Journey Form ───

interface StepConfig {
  type: string;
  template_id: string;
  variable_bindings: Record<string, string>;
  minutes: number;
  label: string;
  timeout_template_id: string;
  timeout_variable_bindings: Record<string, string>;
}

function ConfigureJourney({
  preset,
  journeyName,
  setJourneyName,
  stepConfigs,
  updateStepConfig,
  templates,
  minCartTotal,
  setMinCartTotal,
  autoActivate,
  setAutoActivate,
  onBack,
}: {
  preset: JourneyPreset;
  journeyName: string;
  setJourneyName: (v: string) => void;
  stepConfigs: StepConfig[];
  updateStepConfig: (index: number, updates: Partial<StepConfig>) => void;
  templates: Template[];
  minCartTotal: string;
  setMinCartTotal: (v: string) => void;
  autoActivate: boolean;
  setAutoActivate: (v: boolean) => void;
  onBack: () => void;
}) {
  const colors = getPresetColor(preset.key);
  const allBindingOptions = [...preset.contact_fields, ...preset.payload_fields];

  return (
    <div className="space-y-6">
      {/* Preset context */}
      <div className={`${colors.bg} border ${colors.border} rounded-xl p-4 flex items-center gap-3`}>
        <Zap className={`w-5 h-5 ${colors.text}`} />
        <div>
          <p className={`text-sm font-medium ${colors.text}`}>{preset.name}</p>
          <p className="text-gray-400 text-xs">{preset.description}</p>
        </div>
      </div>

      {/* Journey Name */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Journey Name</label>
        <input
          type="text"
          value={journeyName}
          onChange={(e) => setJourneyName(e.target.value)}
          className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          placeholder="Enter a name for this journey"
        />
      </div>

      {/* Step Configs */}
      <div className="space-y-4">
        <p className="text-sm font-medium text-gray-300">Configure Steps</p>

        {stepConfigs.map((cfg, idx) => (
          <div key={idx} className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 space-y-3">
            {/* Step header */}
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs text-gray-300 font-bold">
                {idx + 1}
              </span>
              <span className="text-white text-sm font-medium">{cfg.label || cfg.type}</span>
              {cfg.type === 'wait' && <Clock className="w-4 h-4 text-yellow-400" />}
              {(cfg.type === 'send_template' || cfg.type === 'send_buttons') && <Send className="w-4 h-4 text-emerald-400" />}
            </div>

            {/* Wait step */}
            {cfg.type === 'wait' && (
              <div>
                <label className="block text-xs text-gray-400 mb-1">Wait duration (minutes)</label>
                <input
                  type="number"
                  min={1}
                  value={cfg.minutes}
                  onChange={(e) => updateStepConfig(idx, { minutes: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-gray-500 text-xs mt-1">
                  = {cfg.minutes >= 1440
                    ? `${(cfg.minutes / 1440).toFixed(1)} day(s)`
                    : cfg.minutes >= 60
                    ? `${(cfg.minutes / 60).toFixed(1)} hour(s)`
                    : `${cfg.minutes} minute(s)`}
                </p>
              </div>
            )}

            {/* Send template / buttons step */}
            {(cfg.type === 'send_template' || cfg.type === 'send_buttons') && (
              <>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Template {cfg.type === 'send_buttons' ? '(must have quick-reply buttons)' : ''}
                  </label>
                  <select
                    value={cfg.template_id}
                    onChange={(e) => updateStepConfig(idx, { template_id: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
                  >
                    <option value="">Select a template…</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.language})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Variable bindings */}
                {Object.keys(cfg.variable_bindings).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-400">Variable Bindings</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {Object.entries(cfg.variable_bindings).map(([key, val]) => (
                        <div key={key} className="flex items-center gap-2">
                          <span className="w-8 h-7 rounded bg-gray-700 flex items-center justify-center text-xs text-gray-300 font-mono flex-shrink-0">
                            {`{{${key}}}`}
                          </span>
                          <select
                            value={val}
                            onChange={(e) => {
                              const newBindings = { ...cfg.variable_bindings, [key]: e.target.value };
                              updateStepConfig(idx, { variable_bindings: newBindings });
                            }}
                            className="flex-1 px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
                          >
                            <option value="">Select field…</option>
                            {allBindingOptions.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* send_buttons on_timeout template */}
            {cfg.type === 'send_buttons' && cfg.timeout_template_id !== undefined && (
              <div className="mt-3 pt-3 border-t border-gray-700 space-y-3">
                <p className="text-xs text-yellow-400 font-medium flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  On Timeout — Follow-up Template
                </p>
                <select
                  value={cfg.timeout_template_id}
                  onChange={(e) => updateStepConfig(idx, { timeout_template_id: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
                >
                  <option value="">Select timeout template…</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.language})
                    </option>
                  ))}
                </select>

                {/* Timeout variable bindings */}
                {Object.keys(cfg.timeout_variable_bindings).length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.entries(cfg.timeout_variable_bindings).map(([key, val]) => (
                      <div key={key} className="flex items-center gap-2">
                        <span className="w-8 h-7 rounded bg-gray-700 flex items-center justify-center text-xs text-gray-300 font-mono flex-shrink-0">
                          {`{{${key}}}`}
                        </span>
                        <select
                          value={val}
                          onChange={(e) => {
                            const newBindings = { ...cfg.timeout_variable_bindings, [key]: e.target.value };
                            updateStepConfig(idx, { timeout_variable_bindings: newBindings });
                          }}
                          className="flex-1 px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
                        >
                          <option value="">Select field…</option>
                          {allBindingOptions.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Trigger Filters (abandoned_cart) */}
      {preset.key === 'abandoned_cart' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Minimum Cart Total
            <span className="text-gray-500 text-xs ml-2">(optional — only trigger for carts above this value)</span>
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="number"
              min={0}
              step="0.01"
              value={minCartTotal}
              onChange={(e) => setMinCartTotal(e.target.value)}
              placeholder="0.00"
              className="w-full pl-9 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      )}

      {/* Auto-activate toggle */}
      <div className="flex items-center justify-between bg-gray-800/50 border border-gray-700 rounded-xl p-4">
        <div>
          <p className="text-white text-sm font-medium">Auto-activate</p>
          <p className="text-gray-400 text-xs">Start processing events immediately after creation</p>
        </div>
        <button
          onClick={() => setAutoActivate(!autoActivate)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            autoActivate ? 'bg-emerald-600' : 'bg-gray-700'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              autoActivate ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </div>
  );
}
