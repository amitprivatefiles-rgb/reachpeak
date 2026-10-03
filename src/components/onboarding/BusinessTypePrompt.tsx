import { useState } from 'react';
import { Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { BUSINESS_TYPES, BusinessType } from '../../lib/businessTypes';

const ACCENT = '#E04632';

// One-time question for accounts that don't have a business type yet. The answer decides which
// features, journeys and integrations the dashboard shows (an admin can change it later).
export function BusinessTypePrompt() {
  const { user, refreshProfile } = useAuth();
  const [picked, setPicked] = useState<BusinessType | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const save = async () => {
    if (!picked || !user) return;
    setSaving(true); setErr('');
    const { error } = await supabase.from('profiles').update({ business_type: picked }).eq('id', user.id);
    if (error) { setSaving(false); setErr('Could not save. Please try again.'); return; }
    await refreshProfile();
    setSaving(false);
  };
  return (
    <div role="dialog" aria-modal="true" aria-label="Choose your business type"
      style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(15,23,42,.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '5vh 12px', overflowY: 'auto' }}>
      <div className="rp-card" style={{ width: '100%', maxWidth: 640, borderRadius: 20, padding: 22, background: '#fff' }}>
        <h2 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: '#0f172a', fontFamily: "'Space Grotesk', sans-serif" }}>What type of business are you?</h2>
        <p style={{ margin: '6px 0 16px', color: '#64748b', fontSize: 14 }}>We'll set up your dashboard with the right features, automations and integrations for you.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
          {BUSINESS_TYPES.map((b) => {
            const on = picked === b.id;
            return (
              <button key={b.id} type="button" onClick={() => setPicked(b.id)}
                style={{ textAlign: 'left', display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 13px', borderRadius: 14, cursor: 'pointer', border: '1.5px solid ' + (on ? ACCENT : '#e2e8f0'), background: on ? ACCENT + '0d' : '#fff' }}>
                <span style={{ fontSize: 22, lineHeight: 1 }} aria-hidden>{b.emoji}</span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{b.label}</span>
                  <span style={{ display: 'block', fontSize: 12, color: '#64748b', marginTop: 2 }}>{b.hint}</span>
                </span>
                {on && <Check size={18} color={ACCENT} />}
              </button>
            );
          })}
        </div>
        {err && <div style={{ marginTop: 12, color: '#b91c1c', fontSize: 13 }}>{err}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
          <button type="button" disabled={!picked || saving} onClick={save}
            style={{ padding: '11px 20px', borderRadius: 12, border: 'none', background: ACCENT, color: '#fff', fontWeight: 700, fontSize: 14, cursor: picked ? 'pointer' : 'not-allowed', opacity: !picked || saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
