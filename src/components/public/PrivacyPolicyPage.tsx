export function PrivacyPolicyPage() {
  return (
    <div>
      <section className="bg-gradient-to-br from-brand to-brand-dark text-white py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-extrabold mb-4">Privacy Policy</h1>
          <p className="text-white/80">Last updated: June 19, 2026</p>
        </div>
      </section>
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 prose prose-gray max-w-none">
          <div className="space-y-8 text-secondary-light leading-relaxed">

            <div>
              <p className="mb-3">ReachPeak API ("we," "our," or "us") operates the website <strong className="text-secondary">reachpeakapi.in</strong> and provides a WhatsApp Business API messaging platform. This Privacy Policy explains how we collect, use, store, and protect your information when you use our services.</p>
              <p>By accessing or using ReachPeak API, you agree to the practices described in this Privacy Policy. If you do not agree, please do not use our services.</p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">1. Information We Collect</h2>
              <p className="mb-3">When you use ReachPeak API, we collect the following types of information:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong className="text-secondary">Account Information:</strong> Name, email address, phone number, and business details provided during registration.</li>
                <li><strong className="text-secondary">Business Data:</strong> Business name, type, logo, WhatsApp Business Account credentials (WABA ID, Phone Number ID), and address submitted during onboarding.</li>
                <li><strong className="text-secondary">WhatsApp Messaging Data:</strong> Message content, delivery status, recipient phone numbers, template names, and media files sent or received through the WhatsApp Business API via our platform.</li>
                <li><strong className="text-secondary">Contact Lists:</strong> Phone numbers and associated contact details (name, email, tags, custom fields) you upload for campaigns.</li>
                <li><strong className="text-secondary">Usage Data:</strong> Campaign metrics, message delivery statistics, login activity, feature usage patterns, and device/browser information.</li>
                <li><strong className="text-secondary">Payment Information:</strong> Payment references and transaction IDs. We do not store credit/debit card numbers directly; payments are processed through secure third-party payment gateways.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">2. How We Use Your Information</h2>
              <p className="mb-3">We use the information we collect for the following purposes:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>To provide, operate, maintain, and improve the ReachPeak API platform</li>
                <li>To process your subscription, verify payments, and manage your account</li>
                <li>To send WhatsApp campaign messages and template messages on your behalf through the Meta WhatsApp Cloud API</li>
                <li>To receive and display inbound WhatsApp messages from your customers</li>
                <li>To provide customer support and respond to inquiries</li>
                <li>To generate analytics, reports, and campaign performance metrics for your account</li>
                <li>To detect, prevent, and address fraud, abuse, or unauthorized access</li>
                <li>To send service-related notifications, updates, and administrative messages</li>
                <li>To comply with legal obligations and enforce our terms of service</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">3. WhatsApp Business API Data</h2>
              <p className="mb-3">As a platform that integrates with the Meta WhatsApp Business API, we handle WhatsApp-related data with special care:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong className="text-secondary">Message Content:</strong> We store message content (text, media, templates) to display conversation history and provide delivery reporting. Message content is associated with your account and protected by access controls.</li>
                <li><strong className="text-secondary">Access Tokens:</strong> Your WhatsApp Business API access tokens are stored securely using encryption and are never exposed to the frontend or to other users. Tokens are used exclusively server-side for API calls.</li>
                <li><strong className="text-secondary">Webhook Data:</strong> We receive delivery status updates, read receipts, and inbound messages from Meta's webhook system. This data is processed and stored to provide real-time messaging features.</li>
                <li><strong className="text-secondary">Media Files:</strong> Images, videos, documents, and audio files sent or received through WhatsApp are stored in secure cloud storage with access controls.</li>
                <li><strong className="text-secondary">No Selling of Data:</strong> We do not sell, share, or use WhatsApp message data for advertising, marketing to third parties, or any purpose unrelated to providing our services to you.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">4. Data Storage and Security</h2>
              <p className="mb-3">We take the security of your data seriously and implement industry-standard measures:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>All data is stored on secure cloud infrastructure (Supabase/AWS) with encryption at rest and in transit</li>
                <li>All data transmissions are encrypted using TLS/SSL protocols</li>
                <li>Row-Level Security (RLS) ensures multi-tenant data isolation — each user can only access their own data</li>
                <li>API access tokens and sensitive credentials are stored with server-side encryption and are never transmitted to client applications</li>
                <li>Regular security audits and monitoring are conducted to identify and address vulnerabilities</li>
                <li>Access to production systems is restricted to authorized personnel only</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">5. Third-Party Services</h2>
              <p className="mb-3">We use the following third-party services to operate our platform:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong className="text-secondary">Meta (WhatsApp Business API):</strong> To send and receive WhatsApp messages on your behalf. Meta's privacy policy applies to data processed by their systems.</li>
                <li><strong className="text-secondary">Supabase:</strong> For database hosting, authentication, and serverless functions.</li>
                <li><strong className="text-secondary">Vercel:</strong> For web application hosting and delivery.</li>
                <li><strong className="text-secondary">Payment Processors:</strong> For processing subscription payments. We do not store your full card details.</li>
              </ul>
              <p className="mt-3">We do not sell, trade, or rent your personal information to any third party. We share data with the service providers listed above only as necessary to deliver our services, and all providers are bound by confidentiality obligations.</p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">6. Cookies and Tracking</h2>
              <p>We use essential cookies to maintain your login session and remember your preferences. We do not use third-party advertising or tracking cookies. You can disable cookies in your browser settings, though some platform features (such as authentication) may not function properly without them.</p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">7. Your Rights</h2>
              <p className="mb-3">You have the following rights regarding your personal data:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong className="text-secondary">Access:</strong> Request a copy of the personal data we hold about you.</li>
                <li><strong className="text-secondary">Correction:</strong> Request correction of inaccurate or incomplete data.</li>
                <li><strong className="text-secondary">Deletion:</strong> Request deletion of your personal data, subject to legal retention requirements. Upon request, we will delete your account and associated data within 30 days.</li>
                <li><strong className="text-secondary">Portability:</strong> Request your data in a machine-readable format.</li>
                <li><strong className="text-secondary">Objection:</strong> Object to the processing of your data for specific purposes.</li>
                <li><strong className="text-secondary">Withdrawal of Consent:</strong> Withdraw your consent at any time by contacting us or deleting your account.</li>
              </ul>
              <p className="mt-3">To exercise any of these rights, please contact us at <span className="text-brand font-medium">support@reachpeakapi.in</span>.</p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">8. Data Retention</h2>
              <p>We retain your personal data for as long as your account is active or as needed to provide services. Message data and campaign history are retained for the duration of your subscription. Upon account deletion or subscription cancellation, we will remove your data within 30 days, except where retention is required by applicable law or for legitimate business purposes (such as fraud prevention or dispute resolution).</p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">9. International Data Transfers</h2>
              <p>Your data may be processed and stored on servers located outside your country of residence. By using our services, you consent to the transfer of your data to servers in regions where our infrastructure providers operate. We ensure that appropriate safeguards are in place to protect your data in compliance with applicable data protection laws.</p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">10. Children's Privacy</h2>
              <p>ReachPeak API is a business-to-business service and is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that we have collected data from a minor, we will take immediate steps to delete it.</p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">11. Changes to This Policy</h2>
              <p>We may update this Privacy Policy from time to time to reflect changes in our practices, technology, or legal requirements. We will notify you of significant changes by posting a notice on our platform or sending an email to your registered address. The "Last updated" date at the top of this page indicates when this policy was last revised. Continued use of the platform after changes constitutes acceptance of the updated policy.</p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">12. Grievance Officer</h2>
              <p className="mb-2">In accordance with the Information Technology Act, 2000 and rules made thereunder, the Grievance Officer for the purpose of this Privacy Policy is:</p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p><strong className="text-secondary">ReachPeak API</strong></p>
                <p>Email: <span className="text-brand font-medium">support@reachpeakapi.in</span></p>
                <p>Website: <span className="text-brand font-medium">reachpeakapi.in</span></p>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">13. Contact Us</h2>
              <p>If you have any questions about this Privacy Policy, wish to exercise your data rights, or have concerns about how your data is handled, please contact us at:</p>
              <p className="mt-2"><strong className="text-secondary">Email:</strong> <span className="text-brand font-medium">support@reachpeakapi.in</span></p>
              <p><strong className="text-secondary">Website:</strong> <span className="text-brand font-medium">https://reachpeakapi.in</span></p>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
