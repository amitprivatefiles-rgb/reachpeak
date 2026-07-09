/**
 * Legal page wrappers — CONTENT FROZEN.
 * These import the exact legal text from the original public/ components
 * and wrap them in the new LegalPageShell for dark theme + ToC + progress bar.
 * 
 * IMPORTANT: Do NOT alter any legal text — Meta's app review references 
 * these exact texts/URLs.
 */

// Re-export the privacy page from the marketing version
export { PrivacyPolicyPage } from './PrivacyPolicyPage';

// For Terms, Refund, and DataDeletion — we use a content extractor pattern:
// The original components render full pages with their own headers/shells.
// We create new components that render the same JSX content inside LegalPageShell.

import { LegalPageShell } from './LegalPageShell';

export function TermsPage() {
  return (
    <LegalPageShell title="Terms of Service" lastUpdated="June 19, 2026">
      <p>These Terms of Service ("Terms") govern your access to and use of the ReachPeak API platform, operated at <strong>reachpeakapi.in</strong> ("we," "our," "us," or "ReachPeak API"). By creating an account or using our services, you ("you," "user," or "customer") agree to be bound by these Terms in their entirety.</p>
      <p>If you are using ReachPeak API on behalf of a business or organization, you represent and warrant that you have the authority to bind that entity to these Terms.</p>

      <h2>1. Service Description</h2>
      <p>ReachPeak API is a Software-as-a-Service (SaaS) platform that enables businesses to:</p>
      <ul>
        <li>Send and receive messages through the WhatsApp Business API (powered by Meta)</li>
        <li>Manage WhatsApp message templates and submit them for Meta approval</li>
        <li>Create and execute bulk messaging campaigns to opted-in contacts</li>
        <li>Manage contact databases with tagging, segmentation, and custom fields</li>
        <li>View real-time delivery analytics, reports, and campaign performance metrics</li>
        <li>Engage in two-way conversations with customers through the Inbox feature</li>
      </ul>
      <p>ReachPeak API acts as a technology platform and does not generate message content on your behalf. You are solely responsible for the content of messages you send through our platform.</p>

      <h2>2. Account Registration &amp; Eligibility</h2>
      <p>To use ReachPeak API, you must:</p>
      <ul>
        <li>Be at least 18 years of age</li>
        <li>Be a registered business, sole proprietorship, or authorized representative of a legal entity</li>
        <li>Provide accurate, current, and complete registration information</li>
        <li>Maintain the confidentiality and security of your account credentials</li>
        <li>Have a valid WhatsApp Business Account (WABA) registered with Meta</li>
        <li>Promptly update your information if it changes</li>
      </ul>
      <p>You are responsible for all activity that occurs under your account, whether or not authorized by you. You must notify us immediately of any unauthorized access or security breach at <strong>support@reachpeakapi.in</strong>.</p>

      <h2>3. WhatsApp Business API Compliance</h2>
      <p>As our platform integrates with the Meta WhatsApp Business API, you agree to comply with the following:</p>
      <ul>
        <li><strong>Meta's Policies:</strong> You must comply with Meta's WhatsApp Business Policy, Commerce Policy, and all applicable Meta platform terms at all times.</li>
        <li><strong>Opt-In Requirement:</strong> You must obtain explicit opt-in consent from every recipient before sending them WhatsApp messages. You are solely responsible for maintaining records of consent.</li>
        <li><strong>Template Approval:</strong> All marketing and utility message templates must be submitted to Meta for approval before use. You may not circumvent the template approval process.</li>
        <li><strong>24-Hour Messaging Window:</strong> Free-form (non-template) messages can only be sent within 24 hours of the customer's last message to you, in accordance with Meta's rules.</li>
        <li><strong>Rate Limits &amp; Quality:</strong> You must respect WhatsApp's messaging rate limits and quality rating thresholds.</li>
        <li><strong>Opt-Out Handling:</strong> You must honor opt-out requests promptly and stop messaging contacts who have requested to be removed.</li>
      </ul>
      <p><strong>Important:</strong> Violations of Meta's policies may result in Meta restricting or banning your WhatsApp Business Account. ReachPeak API is not responsible for actions taken by Meta against your account due to policy violations.</p>

      <h2>4. Prohibited Uses</h2>
      <p>You agree NOT to use ReachPeak API to:</p>
      <ul>
        <li>Send unsolicited messages (spam) to contacts who have not opted in</li>
        <li>Send messages containing illegal, fraudulent, or deceptive content</li>
        <li>Harass, threaten, or abuse recipients</li>
        <li>Impersonate another person, business, or entity</li>
        <li>Send content that promotes violence, hatred, discrimination, or illegal activities</li>
        <li>Transmit malware, phishing links, or harmful content</li>
        <li>Circumvent rate limits, quality controls, or template approval requirements</li>
        <li>Resell or sublicense the platform to third parties without our written consent</li>
        <li>Reverse engineer, decompile, or attempt to extract our source code</li>
        <li>Use the platform for any purpose that violates applicable laws or regulations</li>
      </ul>

      <h2>5. Subscription Plans &amp; Billing</h2>
      <ul>
        <li><strong>Plans:</strong> We offer subscription plans with varying features, messaging limits, and support levels as described on our Pricing page.</li>
        <li><strong>Billing Cycle:</strong> Subscriptions are billed monthly or annually, depending on the plan selected. Billing occurs on the date of subscription activation and recurs on the same day each month/year.</li>
        <li><strong>Payment:</strong> All payments are processed through secure third-party payment gateways. You are responsible for providing valid and up-to-date payment information.</li>
        <li><strong>Meta Conversation Charges:</strong> In addition to our platform fees, WhatsApp conversations incur per-conversation charges set by Meta. These charges are passed through to you at Meta's published rates without markup.</li>
        <li><strong>Plan Changes:</strong> You may upgrade or downgrade your plan at any time. Changes take effect at the next billing cycle.</li>
        <li><strong>Failed Payments:</strong> If a payment fails, we will attempt to notify you. If payment remains outstanding for more than 7 days, your account may be suspended.</li>
      </ul>

      <h2>6. Cancellation &amp; Refunds</h2>
      <ul>
        <li>You may cancel your subscription at any time through your account settings or by contacting support.</li>
        <li>Upon cancellation, your account remains active until the end of the current billing period.</li>
        <li>Refunds are subject to our Refund Policy available at reachpeakapi.in/refund-policy.</li>
        <li>We reserve the right to terminate accounts that violate these Terms without refund.</li>
      </ul>

      <h2>7. Data Ownership &amp; Privacy</h2>
      <ul>
        <li><strong>Your Data:</strong> You retain ownership of all data you upload, including contact lists, message templates, and campaign content.</li>
        <li><strong>Our Use:</strong> We access your data only to provide the service, generate analytics, and improve platform performance. We do not sell or share your data with third parties for marketing purposes.</li>
        <li><strong>Privacy Policy:</strong> Our collection and use of personal information is governed by our Privacy Policy at reachpeakapi.in/privacy-policy.</li>
        <li><strong>Data Deletion:</strong> Upon account termination, we will delete your data within 30 days, unless retention is required by law.</li>
      </ul>

      <h2>8. Intellectual Property</h2>
      <ul>
        <li>The ReachPeak API platform, including its design, code, features, documentation, and branding, is our proprietary intellectual property.</li>
        <li>Your subscription grants you a limited, non-exclusive, non-transferable license to use the platform for its intended purpose during your subscription period.</li>
        <li>You may not copy, modify, distribute, or create derivative works based on any part of our platform.</li>
      </ul>

      <h2>9. Service Availability &amp; Limitations</h2>
      <ul>
        <li>We strive to maintain 99.9% platform uptime but do not guarantee uninterrupted service.</li>
        <li>Service may be temporarily unavailable during maintenance windows, which we will announce in advance when possible.</li>
        <li>We are not responsible for outages or performance issues caused by Meta's WhatsApp Cloud API infrastructure.</li>
        <li>Message delivery depends on Meta's infrastructure and the recipient's device. We cannot guarantee delivery of every message.</li>
      </ul>

      <h2>10. Limitation of Liability</h2>
      <p>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:</p>
      <ul>
        <li>ReachPeak API provides the platform on an "as-is" and "as-available" basis without warranties of any kind.</li>
        <li>We are not liable for indirect, incidental, special, consequential, or punitive damages.</li>
        <li>Our total liability to you shall not exceed the amount paid by you in the 3 months preceding the claim.</li>
        <li>We are not responsible for any loss of data, revenue, or business opportunities arising from platform use or outages.</li>
      </ul>

      <h2>11. Indemnification</h2>
      <p>You agree to indemnify, defend, and hold harmless ReachPeak API, its officers, directors, employees, and agents from any claims, damages, losses, or expenses arising from:</p>
      <ul>
        <li>Your use of the platform</li>
        <li>Your violation of these Terms</li>
        <li>Your violation of Meta's policies</li>
        <li>Content you send through the platform</li>
        <li>Your violation of any applicable laws or third-party rights</li>
      </ul>

      <h2>12. Governing Law &amp; Dispute Resolution</h2>
      <p>These Terms shall be governed by and construed in accordance with the laws of India. Any disputes arising from these Terms or your use of the platform shall be subject to the exclusive jurisdiction of the courts in Bangalore, Karnataka, India.</p>

      <h2>13. Changes to Terms</h2>
      <p>We reserve the right to modify these Terms at any time. Material changes will be communicated via email or in-platform notification at least 15 days before they take effect. Continued use of the platform after changes constitutes acceptance.</p>

      <h2>14. Contact</h2>
      <p>For questions about these Terms:</p>
      <ul>
        <li><strong>Email:</strong> legal@reachpeakapi.in</li>
        <li><strong>Website:</strong> reachpeakapi.in</li>
      </ul>
    </LegalPageShell>
  );
}

export function RefundPolicyPage() {
  return (
    <LegalPageShell title="Refund Policy" lastUpdated="June 19, 2026">
      <p>At ReachPeak API ("we," "our," or "us"), we strive to provide a seamless experience. This Refund Policy outlines the conditions under which refunds may be issued for our subscription plans.</p>

      <h2>1. Subscription Payments</h2>
      <p>All subscription payments are processed securely through our third-party payment gateway. By subscribing to a plan, you authorize recurring billing as per your chosen billing cycle (monthly or annually).</p>

      <h2>2. Refund Eligibility</h2>
      <h3>Eligible for Refund</h3>
      <ul>
        <li><strong>First-time subscribers only:</strong> If you are dissatisfied with the service within the first 7 days of your initial subscription activation, you may request a full refund.</li>
        <li><strong>Service unavailability:</strong> If our platform experiences continuous downtime exceeding 72 hours due to issues on our end (not Meta/WhatsApp infrastructure), you may request a pro-rated refund for the affected period.</li>
        <li><strong>Duplicate charges:</strong> Accidental or duplicate charges will be refunded in full upon verification.</li>
      </ul>
      <h3>Not Eligible for Refund</h3>
      <ul>
        <li>Accounts suspended or terminated due to violation of our Terms of Service or Meta's policies</li>
        <li>WhatsApp conversation charges (Meta's per-conversation fees) — these are non-refundable as they are paid directly to Meta</li>
        <li>Partial-month or partial-year usage after the 7-day window</li>
        <li>Plan downgrades — unused portion of higher-tier plans are not refunded but credited toward future billing</li>
        <li>Dissatisfaction with WhatsApp API features or limitations imposed by Meta (rate limits, template rejections, etc.)</li>
      </ul>

      <h2>3. How to Request a Refund</h2>
      <p>To request a refund, email us at <strong>support@reachpeakapi.in</strong> with:</p>
      <ul>
        <li>Your registered email address</li>
        <li>Reason for the refund request</li>
        <li>Transaction ID or payment reference</li>
      </ul>
      <p>We will review your request within 3 business days and respond with our decision.</p>

      <h2>4. Refund Processing</h2>
      <ul>
        <li>Approved refunds will be processed to the original payment method within 7-10 business days.</li>
        <li>Bank processing times may vary; the refund may take an additional 3-5 business days to reflect in your account.</li>
      </ul>

      <h2>5. Cancellation</h2>
      <p>You may cancel your subscription at any time. Upon cancellation:</p>
      <ul>
        <li>Your account remains active until the end of the current billing period.</li>
        <li>No further charges will be made after cancellation.</li>
        <li>No refund is provided for the remaining unused period (unless within the 7-day window for first-time subscribers).</li>
      </ul>

      <h2>6. Contact</h2>
      <p>For refund-related queries:</p>
      <ul>
        <li><strong>Email:</strong> support@reachpeakapi.in</li>
        <li><strong>Website:</strong> reachpeakapi.in</li>
      </ul>
    </LegalPageShell>
  );
}

export function DataDeletionPage() {
  return (
    <LegalPageShell title="Data Deletion" lastUpdated="June 19, 2026">
      <p>At ReachPeak API, we respect your right to control your personal data. This page explains how you can request deletion of your data in accordance with applicable data protection regulations.</p>

      <h2>1. What Data We Store</h2>
      <p>When you use ReachPeak API, we may store the following:</p>
      <ul>
        <li><strong>Account Information:</strong> Name, email, phone number, business details</li>
        <li><strong>WhatsApp Account Data:</strong> WABA ID, Phone Number ID, access tokens (encrypted)</li>
        <li><strong>Contacts:</strong> Phone numbers, names, tags, and custom fields uploaded by you</li>
        <li><strong>Messages:</strong> Message content, delivery status, and metadata for sent/received messages</li>
        <li><strong>Campaign Data:</strong> Campaign configurations, templates, and performance metrics</li>
        <li><strong>Usage Logs:</strong> Login activity, feature usage, and system logs</li>
      </ul>

      <h2>2. How to Request Data Deletion</h2>
      <h3>Option 1: Email Request</h3>
      <p>Send an email to <strong>privacy@reachpeakapi.in</strong> with:</p>
      <ul>
        <li>Subject: "Data Deletion Request"</li>
        <li>Your registered email address</li>
        <li>The specific data you want deleted (or "all data")</li>
        <li>Reason for deletion (optional)</li>
      </ul>

      <h3>Option 2: In-App</h3>
      <p>You can delete your account and all associated data from <strong>Settings → Account → Delete Account</strong> in the ReachPeak API dashboard.</p>

      <h2>3. What Happens After Deletion</h2>
      <ul>
        <li>Your account will be deactivated immediately upon request confirmation.</li>
        <li>All personal data, contacts, messages, and campaign data will be permanently deleted within 30 days.</li>
        <li>Certain data may be retained for up to 90 days in encrypted backups before being permanently purged.</li>
        <li>Anonymous, aggregated analytics data (that cannot be linked to you) may be retained for platform improvement.</li>
        <li>Data required by law (e.g., financial transaction records) will be retained for the minimum legally required period.</li>
      </ul>

      <h2>4. Data We Cannot Delete</h2>
      <ul>
        <li>Messages already delivered to WhatsApp recipients (these are stored on their devices, not by us)</li>
        <li>Data that Meta/WhatsApp retains independently as part of their platform operations</li>
        <li>Financial records required for tax and accounting compliance (retained for the minimum legal period)</li>
      </ul>

      <h2>5. Confirmation</h2>
      <p>You will receive an email confirmation when your data deletion is complete.</p>

      <h2>6. Contact</h2>
      <p>For data deletion questions:</p>
      <ul>
        <li><strong>Email:</strong> privacy@reachpeakapi.in</li>
        <li><strong>Website:</strong> reachpeakapi.in</li>
      </ul>
    </LegalPageShell>
  );
}
