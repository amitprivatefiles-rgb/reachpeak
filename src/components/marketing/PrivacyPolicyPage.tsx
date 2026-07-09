import { LegalPageShell } from './LegalPageShell';

/** Privacy Policy — CONTENT FROZEN. Only the shell is new.
 *  Text below is identical to the original PrivacyPolicyPage.tsx.
 *  Do NOT alter any legal text — Meta's app review references these exact words/URLs.
 */
export function PrivacyPolicyPage() {
  return (
    <LegalPageShell title="Privacy Policy" lastUpdated="June 19, 2026">
      <p>ReachPeak API ("we," "our," or "us") operates the website <strong>reachpeakapi.in</strong> and provides a WhatsApp Business API messaging platform. This Privacy Policy explains how we collect, use, store, and protect your information when you use our services.</p>
      <p>By accessing or using ReachPeak API, you agree to the practices described in this Privacy Policy. If you do not agree, please do not use our services.</p>

      <h2>1. Information We Collect</h2>
      <p>When you use ReachPeak API, we collect the following types of information:</p>
      <ul>
        <li><strong>Account Information:</strong> Name, email address, phone number, and business details provided during registration.</li>
        <li><strong>Business Data:</strong> Business name, type, logo, WhatsApp Business Account credentials (WABA ID, Phone Number ID), and address submitted during onboarding.</li>
        <li><strong>WhatsApp Messaging Data:</strong> Message content, delivery status, recipient phone numbers, template names, and media files sent or received through the WhatsApp Business API via our platform.</li>
        <li><strong>Contact Lists:</strong> Phone numbers and associated contact details (name, email, tags, custom fields) you upload for campaigns.</li>
        <li><strong>Usage Data:</strong> Campaign metrics, message delivery statistics, login activity, feature usage patterns, and device/browser information.</li>
        <li><strong>Payment Information:</strong> Payment references and transaction IDs. We do not store credit/debit card numbers directly; payments are processed through secure third-party payment gateways.</li>
      </ul>

      <h2>2. How We Use Your Information</h2>
      <p>We use the information we collect for the following purposes:</p>
      <ul>
        <li>To provide, operate, maintain, and improve the ReachPeak API platform</li>
        <li>To process your subscription, verify payments, and manage your account</li>
        <li>To send WhatsApp campaign messages and template messages on your behalf through the Meta WhatsApp Cloud API</li>
        <li>To receive and display inbound WhatsApp messages from your customers</li>
        <li>To provide customer support and respond to inquiries</li>
        <li>To generate analytics and reporting on your campaign performance</li>
        <li>To detect, prevent, and address fraud, abuse, or security issues</li>
        <li>To comply with legal obligations and enforce our Terms of Service</li>
      </ul>

      <h2>3. Data Sharing and Disclosure</h2>
      <p>We do not sell your personal information. We may share your data with:</p>
      <ul>
        <li><strong>Meta/WhatsApp:</strong> Message content and recipient phone numbers are transmitted through the WhatsApp Cloud API as required to deliver your messages.</li>
        <li><strong>Cloud Infrastructure:</strong> Our platform is hosted on Supabase (backed by AWS) with servers located in India (ap-south-1 region).</li>
        <li><strong>Payment Processors:</strong> Payment details are shared with our payment gateway provider to process transactions securely.</li>
        <li><strong>Legal Requirements:</strong> We may disclose information when required by law, legal process, or government request.</li>
      </ul>

      <h2>4. Data Storage and Security</h2>
      <p>Your data is stored on secure servers provided by Supabase (AWS infrastructure) in the Asia Pacific (Mumbai, ap-south-1) region. We implement industry-standard security measures including:</p>
      <ul>
        <li>SSL/TLS encryption for all data in transit</li>
        <li>Encrypted storage for sensitive credentials (WhatsApp access tokens)</li>
        <li>Row-Level Security (RLS) policies ensuring tenant data isolation</li>
        <li>Regular security audits and access monitoring</li>
        <li>Role-based access control for platform administration</li>
      </ul>

      <h2>5. Data Retention</h2>
      <ul>
        <li><strong>Messages:</strong> Message content and metadata are retained for 90 days, after which they are automatically purged.</li>
        <li><strong>Campaign Data:</strong> Campaign configurations and performance metrics are retained for the duration of your subscription plus 30 days.</li>
        <li><strong>Account Data:</strong> Account information is retained until you request deletion or your subscription is terminated.</li>
        <li><strong>Logs:</strong> System and access logs are retained for 30 days for security monitoring.</li>
      </ul>

      <h2>6. Your Rights</h2>
      <p>You have the right to:</p>
      <ul>
        <li>Access the personal data we hold about you</li>
        <li>Request correction of inaccurate data</li>
        <li>Request deletion of your data (subject to legal retention requirements)</li>
        <li>Export your contact lists and campaign data</li>
        <li>Withdraw consent for data processing (which may affect service availability)</li>
      </ul>
      <p>To exercise these rights, contact us at <strong>privacy@reachpeakapi.in</strong>.</p>

      <h2>7. WhatsApp Business API Compliance</h2>
      <p>As a WhatsApp Business Solution Provider, we comply with:</p>
      <ul>
        <li>Meta's WhatsApp Business API Terms of Service</li>
        <li>WhatsApp Business Messaging Policy</li>
        <li>WhatsApp Commerce Policy</li>
        <li>Meta's data handling requirements for Business Solution Providers</li>
      </ul>
      <p>We ensure that all messages sent through our platform comply with WhatsApp's messaging policies, including opt-in requirements and template approval processes.</p>

      <h2>8. Cookies and Tracking</h2>
      <p>We use essential cookies required for authentication and session management. We do not use third-party tracking cookies or advertising pixels.</p>

      <h2>9. Children's Privacy</h2>
      <p>ReachPeak API is not intended for use by individuals under 18 years of age. We do not knowingly collect personal information from minors.</p>

      <h2>10. Changes to This Policy</h2>
      <p>We may update this Privacy Policy from time to time. We will notify registered users of material changes via email. Continued use of the platform after changes constitutes acceptance of the updated policy.</p>

      <h2>11. Contact Us</h2>
      <p>For privacy-related questions or concerns:</p>
      <ul>
        <li><strong>Email:</strong> privacy@reachpeakapi.in</li>
        <li><strong>Website:</strong> reachpeakapi.in</li>
        <li><strong>Data Deletion Requests:</strong> reachpeakapi.in/data-deletion</li>
      </ul>
    </LegalPageShell>
  );
}
