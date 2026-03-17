import { supabase } from './supabase';

/**
 * Notification service for sending in-app + email notifications.
 * 
 * Emails are sent via a Postgres function (send_email_via_resend) that
 * calls Resend API using pg_net extension — no edge function needed.
 * 
 * IMPORTANT: User-facing notifications should present the platform as a 
 * legitimate WhatsApp marketing tool. No references to manual admin management
 * or auto-incrementing campaigns should appear in user communications.
 */

interface SendNotificationOptions {
  userId: string;
  userEmail: string;
  userName: string;
  title: string;
  message: string;
  type: 'campaign_approved' | 'campaign_rejected' | 'campaign_completed' | 'system';
  campaignId?: string;
  emailSubject?: string;
  emailBody?: string;
}

/**
 * Send both in-app notification and email notification
 */
export async function sendNotification(opts: SendNotificationOptions) {
  // 1. Create in-app notification
  await supabase.from('notifications').insert({
    user_id: opts.userId,
    title: opts.title,
    message: opts.message,
    type: opts.type,
    campaign_id: opts.campaignId || null,
  });

  // 2. Send email via Postgres function (pg_net → Resend API)
  if (opts.userEmail) {
    try {
      const { error } = await supabase.rpc('send_email_via_resend', {
        recipient: opts.userEmail,
        email_subject: opts.emailSubject || opts.title,
        email_html: opts.emailBody || generateEmailHtml(opts),
      });
      if (error) console.warn('Email send failed:', error.message);
    } catch (err) {
      console.warn('Email notification skipped:', err);
    }
  }
}

/**
 * Pre-built notification templates for common events.
 * These are user-facing — never mention admin approval, auto-increment, or manual management.
 */
export const NotificationTemplates = {
  campaignLaunched: (campaignName: string, contactCount: number) => ({
    title: 'Campaign Launched! 🚀',
    message: `Your campaign "${campaignName}" is now live and messages are being delivered to ${contactCount.toLocaleString()} contacts.`,
    emailSubject: `🚀 Campaign "${campaignName}" is Live!`,
    emailBody: generateCampaignEmail({
      heading: 'Your Campaign is Live! 🚀',
      campaignName,
      bodyText: `Great news! Your WhatsApp campaign <strong>"${campaignName}"</strong> has been launched and messages are being delivered to <strong>${contactCount.toLocaleString()} contacts</strong>.`,
      ctaText: 'View Campaign Progress',
      ctaUrl: `${getBaseUrl()}/campaigns`,
      footerText: 'You can track delivery progress in real-time from your dashboard.',
    }),
  }),

  campaignScheduled: (campaignName: string, scheduledDate: string) => ({
    title: 'Campaign Scheduled ⏰',
    message: `Your campaign "${campaignName}" has been scheduled and will start on ${scheduledDate}.`,
    emailSubject: `⏰ Campaign "${campaignName}" Scheduled`,
    emailBody: generateCampaignEmail({
      heading: 'Campaign Scheduled! ⏰',
      campaignName,
      bodyText: `Your WhatsApp campaign <strong>"${campaignName}"</strong> has been successfully scheduled and will launch automatically on <strong>${scheduledDate}</strong>.`,
      ctaText: 'View Campaign',
      ctaUrl: `${getBaseUrl()}/campaigns`,
      footerText: 'We\'ll notify you when your campaign starts delivering messages.',
    }),
  }),

  campaignRejected: (campaignName: string, reason: string) => ({
    title: 'Campaign Needs Changes',
    message: `Your campaign "${campaignName}" needs some adjustments: ${reason}`,
    emailSubject: `Action Required: Campaign "${campaignName}"`,
    emailBody: generateCampaignEmail({
      heading: 'Campaign Needs Adjustments',
      campaignName,
      bodyText: `Your campaign <strong>"${campaignName}"</strong> needs some changes before it can be launched:<br><br><em>"${reason}"</em>`,
      ctaText: 'Edit Campaign',
      ctaUrl: `${getBaseUrl()}/campaigns`,
      footerText: 'Please make the required changes and resubmit your campaign.',
    }),
  }),

  campaignCompleted: (campaignName: string, sent: number, total: number) => ({
    title: 'Campaign Completed ✅',
    message: `Your campaign "${campaignName}" has finished! ${sent.toLocaleString()} messages delivered out of ${total.toLocaleString()}.`,
    emailSubject: `✅ Campaign "${campaignName}" Completed`,
    emailBody: generateCampaignEmail({
      heading: 'Campaign Completed! ✅',
      campaignName,
      bodyText: `Your WhatsApp campaign <strong>"${campaignName}"</strong> has finished delivering messages.<br><br>
        <strong>Messages Sent:</strong> ${sent.toLocaleString()}<br>
        <strong>Total Contacts:</strong> ${total.toLocaleString()}<br>
        <strong>Delivery Rate:</strong> ${total > 0 ? ((sent / total) * 100).toFixed(1) : 0}%`,
      ctaText: 'View Full Report',
      ctaUrl: `${getBaseUrl()}/campaigns`,
      footerText: 'Check your dashboard for detailed analytics and engagement metrics.',
    }),
  }),

  welcomeUser: (userName: string) => ({
    title: 'Welcome to ReachPeak! 🎉',
    message: `Welcome ${userName}! Your WhatsApp marketing platform is ready. Start by adding contacts and creating your first campaign.`,
    emailSubject: `Welcome to ReachPeak, ${userName}! 🎉`,
    emailBody: generateCampaignEmail({
      heading: `Welcome to ReachPeak! 🎉`,
      campaignName: '',
      bodyText: `Hi <strong>${userName}</strong>,<br><br>
        Welcome to ReachPeak — your powerful WhatsApp marketing platform!<br><br>
        Here's how to get started:<br>
        1️⃣ <strong>Add your contacts</strong> — Single, bulk, or CSV upload<br>
        2️⃣ <strong>Create a campaign</strong> — Write your message and add interactive buttons<br>
        3️⃣ <strong>Launch & track</strong> — Monitor delivery in real-time<br><br>
        Your account is now active and ready to go!`,
      ctaText: 'Go to Dashboard',
      ctaUrl: `${getBaseUrl()}/dashboard`,
      footerText: 'Need help? Contact us at support@reachpeak.in',
    }),
  }),

  accountActivated: (userName: string, businessName: string) => ({
    title: 'Account Activated! 🎉',
    message: `Your business account for "${businessName}" is now active. Start creating campaigns!`,
    emailSubject: `🎉 Your ReachPeak Account is Active!`,
    emailBody: generateCampaignEmail({
      heading: 'Your Account is Active! 🎉',
      campaignName: '',
      bodyText: `Hi <strong>${userName}</strong>,<br><br>
        Great news! Your business account for <strong>"${businessName}"</strong> has been activated.<br><br>
        You now have full access to:<br>
        ✅ WhatsApp campaign management<br>
        ✅ Contact management with tags<br>
        ✅ Message templates with buttons<br>
        ✅ Real-time delivery tracking<br>
        ✅ Detailed analytics & reports`,
      ctaText: 'Start Creating Campaigns',
      ctaUrl: `${getBaseUrl()}/campaigns`,
      footerText: 'Thank you for choosing ReachPeak!',
    }),
  }),
};

function getBaseUrl(): string {
  return typeof window !== 'undefined' ? window.location.origin : 'https://reachpeakapi.in';
}

function generateEmailHtml(opts: SendNotificationOptions): string {
  return generateCampaignEmail({
    heading: opts.title,
    campaignName: '',
    bodyText: opts.message,
    ctaText: 'Open Dashboard',
    ctaUrl: `${getBaseUrl()}/dashboard`,
    footerText: '',
  });
}

interface EmailTemplateData {
  heading: string;
  campaignName: string;
  bodyText: string;
  ctaText: string;
  ctaUrl: string;
  footerText: string;
}

function generateCampaignEmail(data: EmailTemplateData): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:#10b981;font-size:24px;margin:0;">ReachPeak</h1>
      <p style="color:#64748b;font-size:13px;margin:4px 0 0;">WhatsApp Marketing Platform</p>
    </div>
    
    <!-- Card -->
    <div style="background:#1e293b;border-radius:16px;padding:32px;border:1px solid #334155;">
      <h2 style="color:#ffffff;font-size:20px;margin:0 0 16px;">${data.heading}</h2>
      ${data.campaignName ? `<p style="color:#94a3b8;font-size:13px;margin:0 0 20px;padding:8px 12px;background:#0f172a;border-radius:8px;border-left:3px solid #10b981;">Campaign: <strong style="color:#e2e8f0;">${data.campaignName}</strong></p>` : ''}
      <div style="color:#cbd5e1;font-size:14px;line-height:1.6;margin:0 0 24px;">${data.bodyText}</div>
      <a href="${data.ctaUrl}" style="display:inline-block;background:#10b981;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">${data.ctaText}</a>
      ${data.footerText ? `<p style="color:#64748b;font-size:12px;margin:20px 0 0;border-top:1px solid #334155;padding-top:16px;">${data.footerText}</p>` : ''}
    </div>
    
    <!-- Footer -->
    <p style="text-align:center;color:#475569;font-size:11px;margin:24px 0 0;">
      © ${new Date().getFullYear()} ReachPeak · WhatsApp Marketing Platform<br>
      <a href="${getBaseUrl()}" style="color:#10b981;text-decoration:none;">reachpeak.in</a>
    </p>
  </div>
</body>
</html>`;
}
