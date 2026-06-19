import { supabase } from './supabase.js';

export interface ClaimedMessage {
  id: string;
  user_id: string;
  whatsapp_account_id: string;
  contact_id: string | null;
  campaign_id: string | null;
  wamid: string | null;
  direction: string;
  wa_from: string;
  wa_to: string;
  message_type: string;
  template_name: string | null;
  content: any;
  status: string;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
}

/**
 * Atomically claim a batch of queued messages using FOR UPDATE SKIP LOCKED.
 * Transitions status from 'queued' → 'sending' so no other worker picks them.
 */
export async function claimMessages(batchSize: number): Promise<ClaimedMessage[]> {
  const { data, error } = await supabase.rpc('claim_queued_messages', {
    batch_size: batchSize,
  });

  if (error) {
    console.error('[Claim] Error claiming messages:', error.message);
    return [];
  }

  return (data || []) as ClaimedMessage[];
}
