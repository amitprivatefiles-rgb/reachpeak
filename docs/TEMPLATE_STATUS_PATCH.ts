// =====================================================================
// WEBHOOK PATCH — Add this block to your existing whatsapp-webhook/index.ts
// =====================================================================
//
// Insert this code inside your existing webhook handler, AFTER the
// message/status processing blocks, where you iterate over `entry.changes`.
//
// The existing webhook already handles:
//   - change.field === 'messages' → process inbound messages + status updates
//
// ADD this new block to handle template approval/rejection webhooks:
//
// ─────────────────────────────────────────────────────
//
// if (change.field === 'message_template_status_update') {
//   const evt = change.value;
//   // evt = {
//   //   event: 'APPROVED' | 'REJECTED' | 'PENDING_DELETION' | 'DISABLED' | ...,
//   //   message_template_id: 123456789,
//   //   message_template_name: 'my_template',
//   //   message_template_language: 'en_US',
//   //   reason?: 'INCORRECT_CATEGORY' | 'SCAM' | ...
//   // }
//
//   // CORRECTION 1: Normalize Meta uppercase status → lowercase
//   const normalizedStatus = (evt.event || 'pending').toLowerCase();
//
//   const { error } = await serviceClient
//     .from('templates')
//     .update({
//       status: normalizedStatus,
//       rejected_reason: evt.reason || null,
//       updated_at: new Date().toISOString(),
//     })
//     .eq('meta_template_id', String(evt.message_template_id));
//
//   if (error) {
//     console.error('Template status webhook update failed:', error.message);
//   } else {
//     console.log(`Template ${evt.message_template_name} → ${normalizedStatus}`);
//   }
// }
//
// ─────────────────────────────────────────────────────
//
// OPERATOR STEP (manual, in Meta Dashboard):
//   1. Go to Meta Developer Dashboard → Your App → WhatsApp → Configuration
//   2. Under Webhooks → click "Manage" next to your webhook URL
//   3. Subscribe to the "message_template_status_update" field
//      (alongside the existing "messages" field)
//   4. This is NOT done via code — it's a dashboard-only toggle
//
// The sync action in manage-template serves as a fallback for any
// missed webhook events.
// =====================================================================
