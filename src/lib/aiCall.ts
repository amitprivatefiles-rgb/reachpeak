import { supabase } from './supabase';
import { VOICE_WS } from './useVoiceCall';

// HTTPS base of the voice server (same host as the WebSocket).
export const VOICE_HTTP = VOICE_WS.replace(/^ws/, 'http').replace(/\/ws$/, '');

// Ask the AI agent to phone a customer now (outbound). The voice server checks the account's
// calling rules (set by ReachPeak admin), calling hours, wallet balance and limits.
export async function placeAiCall(input: { agent_id: string; to: string; name?: string }): Promise<{ ok: true; call_id: string; minutes: number }> {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error('Your session expired. Please sign in again.');
  let r: Response;
  try {
    r = await fetch(`${VOICE_HTTP}/call`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
  } catch {
    throw new Error('Could not reach the calling service. Please check your internet and try again.');
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'The call could not be placed.');
  return j;
}

// Is outbound calling available for this account? (rules are set by the ReachPeak admin)
export async function outboundStatus(userId: string): Promise<{ allowed: boolean; reason: string; callerNumber?: string; hours?: [number, number] }> {
  const { data } = await (supabase as any).from('voice_account_settings').select('calling_enabled, outbound_enabled, caller_number, hours_start, hours_end').eq('user_id', userId).maybeSingle();
  if (data && data.calling_enabled === false) return { allowed: false, reason: 'AI calling is turned off for this account. Please contact ReachPeak support.' };
  if (!data?.outbound_enabled) return { allowed: false, reason: 'Outgoing AI calls are not enabled for your account yet. ReachPeak enables them after your calling number and compliance are set up.' };
  if (!data.caller_number) return { allowed: false, reason: 'No caller number is assigned to your account yet. Please contact ReachPeak support.' };
  return { allowed: true, reason: '', callerNumber: data.caller_number, hours: [data.hours_start ?? 9, data.hours_end ?? 21] };
}
