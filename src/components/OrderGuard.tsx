import { useEffect, useState, useCallback } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Settings,
  Package,
  TrendingUp,
  MapPin,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Save,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  BarChart3,
  CreditCard,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// ─── Types ───

interface OGSettings {
  user_id: string;
  enabled: boolean;
  score_cod_only: boolean;
  low_max: number;
  medium_max: number;
  action_low: string;
  action_medium: string;
  action_high: string;
  cod_confirm_journey_id: string | null;
  prepay_journey_id: string | null;
  hold_callback: boolean;
  prepay_discount_pct: number;
  updated_at: string;
}

interface OrderRow {
  id: string;
  external_order_id: string;
  contact_phone: string | null;
  total: number | null;
  currency: string;
  is_cod: boolean;
  status: string;
  risk_score: number | null;
  risk_band: string | null;
  risk_factors: Array<{ factor: string; points: number; detail: string }> | null;
  routed_action: string | null;
  confirm_status: string | null;
  source: string;
  address_pincode: string | null;
  created_at: string;
  confirmed_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  closed_at: string | null;
  converted_to_prepaid: boolean;
  payment_link_id: string | null;
}

interface Journey {
  id: string;
  name: string;
  preset: string | null;
}

interface PincodeStat {
  pincode: string;
  orders: number;
  delivered: number;
  rto: number;
}

interface Stats {
  totalScored: number;
  lowCount: number;
  mediumCount: number;
  highCount: number;
  rtoPrevented: number;
  realizedRtoRate: number;
  closedOrders: number;
  rtoOrders: number;
  prepaidConversionRate: number;
  prepayRouted: number;
  prepaidConverted: number;
}

const DEFAULT_SETTINGS: OGSettings = {
  user_id: '',
  enabled: false,
  score_cod_only: true,
  low_max: 39,
  medium_max: 69,
  action_low: 'none',
  action_medium: 'cod_confirm',
  action_high: 'prepay_nudge',
  cod_confirm_journey_id: null,
  prepay_journey_id: null,
  hold_callback: false,
  prepay_discount_pct: 0,
  updated_at: '',
};

const ACTION_LABELS: Record<string, string> = {
  none: 'No action',
  cod_confirm: 'COD Confirm',
  prepay_nudge: 'Prepay Nudge',
  hold: 'Hold Order',
};

const STATUS_COLORS: Record<string, string> = {
  created: '#6b7280',
  confirmed: '#3b82f6',
  cancelled_by_customer: '#ef4444',
  cancelled: '#ef4444',
  shipped: '#8b5cf6',
  delivered: '#10b981',
  rto: '#f59e0b',
  returned: '#f97316',
  refunded: '#6366f1',
};

const BAND_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  low: { bg: 'rgba(16,185,129,0.15)', text: '#10b981', border: '#10b981' },
  medium: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b', border: '#f59e0b' },
  high: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444', border: '#ef4444' },
};

export function OrderGuard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'orders' | 'settings'>('orders');
  const [settings, setSettings] = useState<OGSettings>(DEFAULT_SETTINGS);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [pincodeStats, setPincodeStats] = useState<PincodeStat[]>([]);
  const [stats, setStats] = useState<Stats>({ totalScored: 0, lowCount: 0, mediumCount: 0, highCount: 0, rtoPrevented: 0, realizedRtoRate: 0, closedOrders: 0, rtoOrders: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Load settings
      const { data: s } = await supabase.from('orderguard_settings')
        .select('*').eq('user_id', user.id).maybeSingle();
      if (s) setSettings(s);
      else setSettings({ ...DEFAULT_SETTINGS, user_id: user.id });

      // Load journeys for pickers
      const { data: j } = await supabase.from('journeys')
        .select('id, name, preset').eq('user_id', user.id);
      setJourneys(j ?? []);

      // Load recent orders (scored)
      const { data: o } = await supabase.from('orders')
        .select('*')
        .eq('user_id', user.id)
        .not('risk_score', 'is', null)
        .order('created_at', { ascending: false })
        .limit(100);
      setOrders(o ?? []);

      // Compute stats from orders
      const allOrders = o ?? [];
      const scored = allOrders.length;
      const low = allOrders.filter(x => x.risk_band === 'low').length;
      const medium = allOrders.filter(x => x.risk_band === 'medium').length;
      const high = allOrders.filter(x => x.risk_band === 'high').length;
      const prevented = allOrders.filter(x =>
        x.routed_action && ['cod_confirm', 'prepay_nudge', 'hold'].includes(x.routed_action) &&
        (x.confirm_status === 'declined' || x.status === 'cancelled_by_customer')
      ).length;
      const closed = allOrders.filter(x => x.closed_at).length;
      const rto = allOrders.filter(x => x.status === 'rto').length;
      setStats({
        totalScored: scored, lowCount: low, mediumCount: medium, highCount: high,
        rtoPrevented: prevented,
        realizedRtoRate: closed > 0 ? rto / closed : 0,
        closedOrders: closed, rtoOrders: rto,
        prepayRouted: allOrders.filter(x => x.routed_action === 'prepay_nudge').length,
        prepaidConverted: allOrders.filter(x => x.converted_to_prepaid).length,
        prepaidConversionRate: (() => {
          const routed = allOrders.filter(x => x.routed_action === 'prepay_nudge').length;
          const converted = allOrders.filter(x => x.converted_to_prepaid).length;
          return routed > 0 ? converted / routed : 0;
        })(),
      });

      // Load pincode stats
      const { data: ps } = await supabase.from('pincode_stats')
        .select('*').eq('user_id', user.id)
        .order('rto', { ascending: false })
        .limit(20);
      setPincodeStats((ps ?? []).filter(p => p.orders >= 5));
    } catch (err) {
      console.error('OrderGuard load error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const saveSettings = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const payload = {
        ...settings,
        user_id: user.id,
        updated_at: new Date().toISOString(),
      };
      await supabase.from('orderguard_settings')
        .upsert(payload, { onConflict: 'user_id' });
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#8b5cf6' }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ShieldAlert size={24} color="white" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#f1f5f9' }}>OrderGuard</h1>
            <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>Order tracking · Risk scoring · COD protection</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={loadData} style={{
            padding: '8px 16px', borderRadius: '8px', border: '1px solid #334155',
            background: 'transparent', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <StatCard icon={<BarChart3 size={18} />} label="Scored" value={stats.totalScored} color="#8b5cf6" />
        <StatCard icon={<ShieldCheck size={18} />} label="Low Risk" value={stats.lowCount} color="#10b981" />
        <StatCard icon={<AlertTriangle size={18} />} label="Medium Risk" value={stats.mediumCount} color="#f59e0b" />
        <StatCard icon={<ShieldAlert size={18} />} label="High Risk" value={stats.highCount} color="#ef4444" />
        <StatCard icon={<XCircle size={18} />} label="RTO Prevented" value={stats.rtoPrevented} color="#3b82f6" />
        <StatCard icon={<TrendingUp size={18} />} label="RTO Rate" value={`${(stats.realizedRtoRate * 100).toFixed(1)}%`} color="#f97316" subtitle={`${stats.rtoOrders}/${stats.closedOrders} closed`} />
        <StatCard icon={<CreditCard size={18} />} label="Prepaid Conv." value={`${(stats.prepaidConversionRate * 100).toFixed(0)}%`} color="#8b5cf6" subtitle={`${stats.prepaidConverted}/${stats.prepayRouted} nudged`} />
      </div>

      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '1px solid #1e293b', paddingBottom: '0' }}>
        {(['orders', 'settings'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '10px 20px', borderRadius: '8px 8px 0 0', border: 'none',
            background: activeTab === tab ? '#1e293b' : 'transparent',
            color: activeTab === tab ? '#f1f5f9' : '#64748b',
            fontWeight: activeTab === tab ? 600 : 400, cursor: 'pointer',
            fontSize: '14px', textTransform: 'capitalize',
            borderBottom: activeTab === tab ? '2px solid #8b5cf6' : '2px solid transparent',
          }}>
            {tab === 'settings' && <Settings size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />}
            {tab === 'orders' && <Package size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />}
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'orders' && (
        <>
          {/* Orders Table */}
          <div style={{ background: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', overflow: 'hidden', marginBottom: '24px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1e293b' }}>
                  {['Order ID', 'Contact', 'Value', 'COD', 'Score', 'Action', 'Confirm', 'Payment', 'Status', 'Time'].map(h => (
                    <th key={h} style={{ padding: '12px 14px', textAlign: 'left', color: '#64748b', fontWeight: 500, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#475569' }}>
                      No scored orders yet. Orders will appear once OrderGuard is enabled and events are received.
                    </td>
                  </tr>
                )}
                {orders.map(o => (
                  <OrderTableRow
                    key={o.id}
                    order={o}
                    expanded={expandedOrder === o.id}
                    onToggle={() => setExpandedOrder(expandedOrder === o.id ? null : o.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pincode Heat List */}
          {pincodeStats.length > 0 && (
            <div style={{ background: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <MapPin size={18} color="#f59e0b" />
                <h3 style={{ margin: 0, fontSize: '16px', color: '#f1f5f9', fontWeight: 600 }}>High-RTO Pincodes</h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>(min 5 orders)</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1e293b' }}>
                    {['Pincode', 'Orders', 'Delivered', 'RTO', 'RTO %'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontWeight: 500, fontSize: '12px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pincodeStats.map(p => {
                    const rtoRate = p.orders > 0 ? (p.rto / p.orders * 100) : 0;
                    return (
                      <tr key={p.pincode} style={{ borderBottom: '1px solid #1e293b22' }}>
                        <td style={{ padding: '10px 14px', color: '#e2e8f0', fontFamily: 'monospace' }}>{p.pincode}</td>
                        <td style={{ padding: '10px 14px', color: '#94a3b8' }}>{p.orders}</td>
                        <td style={{ padding: '10px 14px', color: '#10b981' }}>{p.delivered}</td>
                        <td style={{ padding: '10px 14px', color: '#ef4444' }}>{p.rto}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600,
                            background: rtoRate >= 40 ? 'rgba(239,68,68,0.15)' : rtoRate >= 20 ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                            color: rtoRate >= 40 ? '#ef4444' : rtoRate >= 20 ? '#f59e0b' : '#10b981',
                          }}>
                            {rtoRate.toFixed(0)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {activeTab === 'settings' && (
        <div style={{ background: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#f1f5f9', fontWeight: 600 }}>OrderGuard Settings</h3>
            <button onClick={saveSettings} disabled={saving} style={{
              padding: '8px 20px', borderRadius: '8px', border: 'none',
              background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
              color: 'white', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
              opacity: saving ? 0.7 : 1,
            }}>
              {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
              Save
            </button>
          </div>

          <div style={{ display: 'grid', gap: '20px' }}>
            {/* Enable toggle */}
            <SettingRow label="Enable OrderGuard" description="Score incoming COD orders and route by risk band">
              <ToggleSwitch checked={settings.enabled} onChange={v => setSettings(s => ({ ...s, enabled: v }))} />
            </SettingRow>

            <SettingRow label="Score COD orders only" description="When off, prepaid orders are also scored (but not routed)">
              <ToggleSwitch checked={settings.score_cod_only} onChange={v => setSettings(s => ({ ...s, score_cod_only: v }))} />
            </SettingRow>

            {/* Band thresholds */}
            <div style={{ borderTop: '1px solid #1e293b', paddingTop: '20px' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#e2e8f0', fontWeight: 600 }}>Risk Band Thresholds</h4>
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                    Low max (0–{settings.low_max} = Low)
                  </label>
                  <input type="range" min={10} max={settings.medium_max - 1} value={settings.low_max}
                    onChange={e => setSettings(s => ({ ...s, low_max: parseInt(e.target.value) }))}
                    style={{ width: '100%', accentColor: '#10b981' }} />
                  <span style={{ fontSize: '20px', fontWeight: 700, color: '#10b981' }}>{settings.low_max}</span>
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                    Medium max ({settings.low_max + 1}–{settings.medium_max} = Medium)
                  </label>
                  <input type="range" min={settings.low_max + 1} max={95} value={settings.medium_max}
                    onChange={e => setSettings(s => ({ ...s, medium_max: parseInt(e.target.value) }))}
                    style={{ width: '100%', accentColor: '#f59e0b' }} />
                  <span style={{ fontSize: '20px', fontWeight: 700, color: '#f59e0b' }}>{settings.medium_max}</span>
                </div>
              </div>
              <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#64748b' }}>
                Score {settings.medium_max + 1}–100 = <span style={{ color: '#ef4444', fontWeight: 600 }}>High</span>
              </p>
            </div>

            {/* Action per band */}
            <div style={{ borderTop: '1px solid #1e293b', paddingTop: '20px' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#e2e8f0', fontWeight: 600 }}>Actions by Band</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <ActionSelect label="Low Risk" value={settings.action_low} color="#10b981"
                  onChange={v => setSettings(s => ({ ...s, action_low: v }))} />
                <ActionSelect label="Medium Risk" value={settings.action_medium} color="#f59e0b"
                  onChange={v => setSettings(s => ({ ...s, action_medium: v }))} />
                <ActionSelect label="High Risk" value={settings.action_high} color="#ef4444"
                  onChange={v => setSettings(s => ({ ...s, action_high: v }))} />
              </div>
            </div>

            {/* Journey pickers */}
            <div style={{ borderTop: '1px solid #1e293b', paddingTop: '20px' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#e2e8f0', fontWeight: 600 }}>Linked Journeys</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <JourneyPicker label="COD Confirm Journey" journeys={journeys}
                  value={settings.cod_confirm_journey_id}
                  onChange={v => setSettings(s => ({ ...s, cod_confirm_journey_id: v }))} />
                <JourneyPicker label="Prepay Nudge Journey" journeys={journeys}
                  value={settings.prepay_journey_id}
                  onChange={v => setSettings(s => ({ ...s, prepay_journey_id: v }))} />
              </div>
            </div>

            {/* Hold callback */}
            <div style={{ borderTop: '1px solid #1e293b', paddingTop: '20px' }}>
              <SettingRow label="Hold callback" description="When action is 'Hold', POST hold decision to integration callback_url">
                <ToggleSwitch checked={settings.hold_callback} onChange={v => setSettings(s => ({ ...s, hold_callback: v }))} />
              </SettingRow>
            </div>

            {/* Prepay discount */}
            {(settings.action_medium === 'prepay_nudge' || settings.action_high === 'prepay_nudge') && (
              <div style={{ borderTop: '1px solid #1e293b', paddingTop: '20px' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#e2e8f0', fontWeight: 600 }}>Prepay Incentive</h4>
                <label style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                  Discount for switching to prepaid: {settings.prepay_discount_pct}%
                </label>
                <input type="range" min={0} max={50} value={settings.prepay_discount_pct}
                  onChange={e => setSettings(s => ({ ...s, prepay_discount_pct: parseInt(e.target.value) }))}
                  style={{ width: '100%', accentColor: '#8b5cf6' }} />
                <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#64748b' }}>
                  {settings.prepay_discount_pct > 0
                    ? `Customer sees ₹X after ${settings.prepay_discount_pct}% off — incentivizes prepay conversion`
                    : 'No discount — full amount payment link'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───

function StatCard({ icon, label, value, color, subtitle }: { icon: React.ReactNode; label: string; value: string | number; color: string; subtitle?: string }) {
  return (
    <div style={{
      background: '#0f172a', borderRadius: '10px', border: '1px solid #1e293b',
      padding: '16px', display: 'flex', alignItems: 'center', gap: '12px',
    }}>
      <div style={{
        width: '36px', height: '36px', borderRadius: '8px',
        background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '20px', fontWeight: 700, color: '#f1f5f9' }}>{value}</div>
        <div style={{ fontSize: '12px', color: '#64748b' }}>{label}</div>
        {subtitle && <div style={{ fontSize: '11px', color: '#475569' }}>{subtitle}</div>}
      </div>
    </div>
  );
}

function OrderTableRow({ order, expanded, onToggle }: { order: OrderRow; expanded: boolean; onToggle: () => void }) {
  const bandStyle = order.risk_band ? BAND_COLORS[order.risk_band] : null;

  return (
    <>
      <tr onClick={onToggle} style={{ borderBottom: '1px solid #1e293b22', cursor: 'pointer', transition: 'background 0.15s' }}
        onMouseEnter={e => (e.currentTarget.style.background = '#1e293b44')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
        <td style={{ padding: '10px 14px', color: '#e2e8f0', fontFamily: 'monospace', fontSize: '12px' }}>
          {order.external_order_id}
          {expanded ? <ChevronUp size={12} style={{ marginLeft: '6px', color: '#64748b' }} /> : <ChevronDown size={12} style={{ marginLeft: '6px', color: '#64748b' }} />}
        </td>
        <td style={{ padding: '10px 14px', color: '#94a3b8', fontSize: '12px' }}>{order.contact_phone || '—'}</td>
        <td style={{ padding: '10px 14px', color: '#e2e8f0' }}>₹{Number(order.total ?? 0).toLocaleString()}</td>
        <td style={{ padding: '10px 14px' }}>
          {order.is_cod ? (
            <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>COD</span>
          ) : (
            <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>Paid</span>
          )}
        </td>
        <td style={{ padding: '10px 14px' }}>
          {order.risk_score !== null && bandStyle ? (
            <span style={{
              padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 700,
              background: bandStyle.bg, color: bandStyle.text, border: `1px solid ${bandStyle.border}40`,
            }}>
              {order.risk_score}
            </span>
          ) : '—'}
        </td>
        <td style={{ padding: '10px 14px', color: '#94a3b8', fontSize: '12px' }}>
          {order.routed_action ? ACTION_LABELS[order.routed_action] || order.routed_action : '—'}
        </td>
        <td style={{ padding: '10px 14px' }}>
          {order.confirm_status ? (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px',
              color: order.confirm_status === 'confirmed' ? '#10b981' :
                     order.confirm_status === 'declined' ? '#ef4444' :
                     order.confirm_status === 'no_response' ? '#f59e0b' : '#94a3b8',
            }}>
              {order.confirm_status === 'confirmed' && <CheckCircle size={12} />}
              {order.confirm_status === 'declined' && <XCircle size={12} />}
              {order.confirm_status === 'no_response' && <Clock size={12} />}
              {order.confirm_status === 'pending' && <Loader2 size={12} />}
              {order.confirm_status}
            </span>
          ) : '—'}
        </td>
        <td style={{ padding: '10px 14px' }}>
          {order.converted_to_prepaid ? (
            <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }}>✅ Prepaid</span>
          ) : order.payment_link_id ? (
            <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 500, background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>Link sent</span>
          ) : '—'}
        </td>
        <td style={{ padding: '10px 14px' }}>
          <span style={{
            padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 500,
            background: `${STATUS_COLORS[order.status] ?? '#6b7280'}20`,
            color: STATUS_COLORS[order.status] ?? '#6b7280',
          }}>
            {order.status}
          </span>
        </td>
        <td style={{ padding: '10px 14px', color: '#64748b', fontSize: '12px' }}>
          {new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
        </td>
      </tr>
      {/* Expanded: factor breakdown + timeline */}
      {expanded && (
        <tr>
          <td colSpan={10} style={{ padding: '0 14px 16px 14px', background: '#0f172a' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '16px', background: '#1e293b', borderRadius: '8px' }}>
              {/* Risk Factors */}
              <div>
                <h4 style={{ margin: '0 0 10px', fontSize: '13px', color: '#e2e8f0', fontWeight: 600 }}>
                  <Shield size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                  Risk Factors (base 30)
                </h4>
                {(order.risk_factors ?? []).map((f, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #334155', fontSize: '12px' }}>
                    <span style={{ color: '#cbd5e1' }}>{f.factor}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#64748b', maxWidth: '200px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{f.detail}</span>
                      <span style={{ fontWeight: 700, fontFamily: 'monospace', color: f.points > 0 ? '#ef4444' : '#10b981', minWidth: '40px', textAlign: 'right' }}>
                        {f.points > 0 ? '+' : ''}{f.points}
                      </span>
                    </span>
                  </div>
                ))}
                <div style={{ marginTop: '8px', fontSize: '13px', fontWeight: 700, color: '#f1f5f9' }}>
                  Final: {order.risk_score} → <span style={{ color: bandStyle?.text ?? '#94a3b8' }}>{order.risk_band?.toUpperCase()}</span>
                </div>
              </div>
              {/* Timeline */}
              <div>
                <h4 style={{ margin: '0 0 10px', fontSize: '13px', color: '#e2e8f0', fontWeight: 600 }}>
                  <Clock size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                  Lifecycle
                </h4>
                {[
                  { label: 'Created', ts: order.created_at },
                  { label: 'Confirmed', ts: order.confirmed_at },
                  { label: 'Shipped', ts: order.shipped_at },
                  { label: 'Delivered', ts: order.delivered_at },
                  { label: 'Closed', ts: order.closed_at },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '12px' }}>
                    <span style={{ color: item.ts ? '#cbd5e1' : '#475569' }}>{item.label}</span>
                    <span style={{ color: item.ts ? '#94a3b8' : '#334155', fontFamily: 'monospace' }}>
                      {item.ts ? new Date(item.ts).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </span>
                  </div>
                ))}
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#64748b' }}>
                  Source: <span style={{ color: '#94a3b8' }}>{order.source}</span> · Pincode: <span style={{ color: '#94a3b8' }}>{order.address_pincode || '—'}</span>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function SettingRow({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <div style={{ fontSize: '14px', color: '#e2e8f0', fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: '12px', color: '#64748b' }}>{description}</div>
      </div>
      {children}
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} style={{
      width: '44px', height: '24px', borderRadius: '12px', border: 'none',
      background: checked ? '#8b5cf6' : '#334155', cursor: 'pointer',
      position: 'relative', transition: 'background 0.2s',
    }}>
      <div style={{
        width: '18px', height: '18px', borderRadius: '50%', background: 'white',
        position: 'absolute', top: '3px', left: checked ? '23px' : '3px',
        transition: 'left 0.2s',
      }} />
    </button>
  );
}

function ActionSelect({ label, value, color, onChange }: { label: string; value: string; color: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label style={{ fontSize: '12px', color, fontWeight: 600, display: 'block', marginBottom: '6px' }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #334155',
        background: '#0f172a', color: '#e2e8f0', fontSize: '13px',
      }}>
        <option value="none">No action</option>
        <option value="cod_confirm">COD Confirm</option>
        <option value="prepay_nudge">Prepay Nudge</option>
        <option value="hold">Hold Order</option>
      </select>
    </div>
  );
}

function JourneyPicker({ label, journeys, value, onChange }: { label: string; journeys: Journey[]; value: string | null; onChange: (v: string | null) => void }) {
  return (
    <div>
      <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500, display: 'block', marginBottom: '6px' }}>{label}</label>
      <select value={value ?? ''} onChange={e => onChange(e.target.value || null)} style={{
        width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #334155',
        background: '#0f172a', color: '#e2e8f0', fontSize: '13px',
      }}>
        <option value="">— None —</option>
        {journeys.map(j => (
          <option key={j.id} value={j.id}>{j.name}{j.preset ? ` (${j.preset})` : ''}</option>
        ))}
      </select>
    </div>
  );
}
