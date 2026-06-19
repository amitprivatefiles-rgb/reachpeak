export function TermsPage() {
  return (
    <div>
      <section className="bg-gradient-to-br from-brand to-brand-dark text-white py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-extrabold mb-4">Terms of Service</h1>
          <p className="text-white/80">Last updated: June 19, 2026</p>
        </div>
      </section>
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-8 text-secondary-light leading-relaxed">

            <div>
              <p className="mb-3">These Terms of Service ("Terms") govern your access to and use of the ReachPeak API platform, operated at <strong className="text-secondary">reachpeakapi.in</strong> ("we," "our," "us," or "ReachPeak API"). By creating an account or using our services, you ("you," "user," or "customer") agree to be bound by these Terms in their entirety.</p>
              <p>If you are using ReachPeak API on behalf of a business or organization, you represent and warrant that you have the authority to bind that entity to these Terms.</p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">1. Service Description</h2>
              <p className="mb-3">ReachPeak API is a Software-as-a-Service (SaaS) platform that enables businesses to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Send and receive messages through the WhatsApp Business API (powered by Meta)</li>
                <li>Manage WhatsApp message templates and submit them for Meta approval</li>
                <li>Create and execute bulk messaging campaigns to opted-in contacts</li>
                <li>Manage contact databases with tagging, segmentation, and custom fields</li>
                <li>View real-time delivery analytics, reports, and campaign performance metrics</li>
                <li>Engage in two-way conversations with customers through the Inbox feature</li>
              </ul>
              <p className="mt-3">ReachPeak API acts as a technology platform and does not generate message content on your behalf. You are solely responsible for the content of messages you send through our platform.</p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">2. Account Registration & Eligibility</h2>
              <p className="mb-2">To use ReachPeak API, you must:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Be at least 18 years of age</li>
                <li>Be a registered business, sole proprietorship, or authorized representative of a legal entity</li>
                <li>Provide accurate, current, and complete registration information</li>
                <li>Maintain the confidentiality and security of your account credentials</li>
                <li>Have a valid WhatsApp Business Account (WABA) registered with Meta</li>
                <li>Promptly update your information if it changes</li>
              </ul>
              <p className="mt-3">You are responsible for all activity that occurs under your account, whether or not authorized by you. You must notify us immediately of any unauthorized access or security breach at <span className="text-brand font-medium">support@reachpeakapi.in</span>.</p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">3. WhatsApp Business API Compliance</h2>
              <p className="mb-3">As our platform integrates with the Meta WhatsApp Business API, you agree to comply with the following:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong className="text-secondary">Meta's Policies:</strong> You must comply with Meta's <a href="https://www.whatsapp.com/legal/business-policy" target="_blank" rel="noopener noreferrer" className="text-brand hover:text-brand-dark transition font-medium">WhatsApp Business Policy</a>, <a href="https://www.whatsapp.com/legal/commerce-policy" target="_blank" rel="noopener noreferrer" className="text-brand hover:text-brand-dark transition font-medium">Commerce Policy</a>, and all applicable Meta platform terms at all times.</li>
                <li><strong className="text-secondary">Opt-In Requirement:</strong> You must obtain explicit opt-in consent from every recipient before sending them WhatsApp messages. You are solely responsible for maintaining records of consent.</li>
                <li><strong className="text-secondary">Template Approval:</strong> All marketing and utility message templates must be submitted to Meta for approval before use. You may not circumvent the template approval process.</li>
                <li><strong className="text-secondary">24-Hour Messaging Window:</strong> Free-form (non-template) messages can only be sent within 24 hours of the customer's last message to you, in accordance with Meta's rules.</li>
                <li><strong className="text-secondary">Rate Limits & Quality:</strong> You must respect WhatsApp's messaging rate limits and quality rating thresholds. Sending messages that result in high block or report rates may lead to restrictions imposed by Meta on your account.</li>
                <li><strong className="text-secondary">Opt-Out Handling:</strong> You must honor opt-out requests promptly and stop messaging contacts who have requested to be removed.</li>
              </ul>
              <p className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm"><strong className="text-secondary">Important:</strong> Violations of Meta's policies may result in Meta restricting or banning your WhatsApp Business Account. ReachPeak API is not responsible for actions taken by Meta against your account due to policy violations.</p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">4. Acceptable Use Policy</h2>
              <p className="mb-2">When using our platform, you agree to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Comply with all applicable local, national, and international laws and regulations</li>
                <li>Only send messages to contacts who have provided valid opt-in consent</li>
                <li>Provide accurate sender identification in all messages</li>
                <li>Include clear opt-out instructions in marketing messages</li>
                <li>Respect recipient privacy and handle contact data responsibly</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">5. Prohibited Use</h2>
              <p className="mb-2">The following uses of ReachPeak API are strictly prohibited:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Sending unsolicited bulk messages (spam) to contacts who have not opted in</li>
                <li>Promoting illegal products, services, substances, or activities</li>
                <li>Sending content that is abusive, threatening, defamatory, discriminatory, or obscene</li>
                <li>Impersonating other businesses, individuals, or government entities</li>
                <li>Distributing malware, phishing links, ransomware, or other harmful content</li>
                <li>Using the platform to harass, stalk, intimidate, or threaten individuals</li>
                <li>Scraping, harvesting, or collecting phone numbers from public sources without consent</li>
                <li>Reselling, sublicensing, or providing access to your account to third parties without our written consent</li>
                <li>Attempting to reverse engineer, decompile, disassemble, or hack the platform or its infrastructure</li>
                <li>Circumventing rate limits, security controls, or access restrictions</li>
                <li>Sending messages related to gambling, adult content, weapons, or other categories prohibited by Meta</li>
              </ul>
              <p className="mt-3"><strong className="text-secondary">Enforcement:</strong> Violation of this policy may result in immediate account suspension or permanent termination without refund. We reserve the right to report illegal activity to law enforcement authorities.</p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">6. Subscription Plans & Payment</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong className="text-secondary">Plans:</strong> We offer subscription plans with varying features, message limits, and user counts. Plan details and pricing are available on our <a href="/pricing" className="text-brand hover:text-brand-dark transition font-medium">Pricing page</a>.</li>
                <li><strong className="text-secondary">Billing:</strong> Subscription fees are billed in advance on a monthly or yearly basis.</li>
                <li><strong className="text-secondary">Payment Methods:</strong> All payments are processed via UPI and are non-recurring (manual renewal required).</li>
                <li><strong className="text-secondary">Currency:</strong> All prices are in Indian Rupees (INR) and inclusive of applicable taxes (GST).</li>
                <li><strong className="text-secondary">Activation:</strong> Your account is activated after payment verification by our team. Verification typically completes within 24 hours.</li>
                <li><strong className="text-secondary">Price Changes:</strong> We reserve the right to modify pricing with a minimum of 30 days' advance notice to existing subscribers. Price changes do not affect your current billing cycle.</li>
                <li><strong className="text-secondary">Message Costs:</strong> WhatsApp conversation charges imposed by Meta are separate from your ReachPeak API subscription fee and are billed directly by Meta to your WhatsApp Business Account.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">7. Refund Policy</h2>
              <p>We offer a 7-day money-back guarantee for new subscribers who are not satisfied with the service. Refunds are processed within 7–10 business days. Please refer to our <a href="/refund-policy" className="text-brand hover:text-brand-dark transition font-medium">Refund Policy</a> for complete details, conditions, and the refund request process.</p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">8. Data Ownership & Content</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong className="text-secondary">Your Data:</strong> You retain full ownership of all data you upload to the platform, including contact lists, message content, media files, and campaign configurations. We do not claim ownership over your data.</li>
                <li><strong className="text-secondary">License to Us:</strong> You grant us a limited, non-exclusive license to use, process, and transmit your data solely for the purpose of providing the ReachPeak API services to you.</li>
                <li><strong className="text-secondary">Your Responsibility:</strong> You are solely responsible for the accuracy, legality, and appropriateness of all content and data you upload, send, or process through our platform.</li>
                <li><strong className="text-secondary">Data Export:</strong> You may export your data at any time during your active subscription. Upon account termination, you may request a data export within 30 days.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">9. Intellectual Property</h2>
              <p>All content, features, functionality, branding, logos, design elements, software code, and documentation of the ReachPeak API platform are owned by us and are protected by copyright, trademark, trade secret, and other intellectual property laws of India and international treaties. You may not copy, reproduce, modify, distribute, create derivative works from, publicly display, or commercially exploit any part of our platform without our prior written consent.</p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">10. Service Availability & Uptime</h2>
              <p className="mb-3">We strive to maintain high availability of our platform but do not guarantee uninterrupted or error-free service.</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>We target 99.9% uptime but this is not a binding SLA</li>
                <li>Scheduled maintenance will be communicated with advance notice where possible</li>
                <li>We are not liable for downtime caused by factors beyond our reasonable control, including internet outages, third-party service failures (Meta, Supabase, hosting providers), natural disasters, or force majeure events</li>
                <li>WhatsApp API availability is subject to Meta's infrastructure and policies, which are outside our control</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">11. Limitation of Liability</h2>
              <p className="mb-3">To the maximum extent permitted by applicable law:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>ReachPeak API shall not be liable for any indirect, incidental, special, consequential, exemplary, or punitive damages arising out of or related to your use of the platform</li>
                <li>This includes but is not limited to: lost profits, lost revenue, lost data, business interruption, loss of goodwill, or cost of substitute services</li>
                <li>Our total aggregate liability for any claims arising from these Terms or your use of the service shall not exceed the total amount you paid to us in the 12 months immediately preceding the event giving rise to the claim</li>
                <li>We are not liable for any actions taken by Meta against your WhatsApp Business Account, including account restrictions, quality rating downgrades, or bans</li>
                <li>We are not liable for message delivery failures caused by invalid phone numbers, recipient-side blocks, or WhatsApp API errors</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">12. Indemnification</h2>
              <p>You agree to indemnify, defend, and hold harmless ReachPeak API, its officers, directors, employees, agents, and affiliates from and against any and all claims, damages, losses, liabilities, costs, and expenses (including reasonable legal fees) arising out of or related to: (a) your use of the platform; (b) your violation of these Terms; (c) your violation of any applicable law, regulation, or third-party rights; (d) the content of messages you send through the platform; or (e) any dispute between you and a message recipient.</p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">13. Account Suspension & Termination</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong className="text-secondary">By Us:</strong> We may suspend or terminate your account immediately if you violate these Terms, fail to pay subscription fees, engage in prohibited activities, or if required by law. We will make reasonable efforts to notify you before or promptly after suspension.</li>
                <li><strong className="text-secondary">By You:</strong> You may terminate your account at any time by contacting us at <span className="text-brand font-medium">support@reachpeakapi.in</span>. No refund will be issued for the remaining period of a prepaid subscription unless covered by our Refund Policy.</li>
                <li><strong className="text-secondary">Effect of Termination:</strong> Upon termination, your right to use the platform ceases immediately. We will retain your data for 30 days after termination, during which you may request a data export. After 30 days, your data will be permanently deleted.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">14. Privacy</h2>
              <p>Your use of ReachPeak API is also governed by our <a href="/privacy-policy" className="text-brand hover:text-brand-dark transition font-medium">Privacy Policy</a>, which explains how we collect, use, store, and protect your information. By using our services, you consent to the data practices described in the Privacy Policy.</p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">15. Modifications to Terms</h2>
              <p>We reserve the right to modify these Terms at any time. Material changes will be communicated via email or through a prominent notice on our platform at least 15 days before they take effect. Your continued use of the platform after the effective date of revised Terms constitutes your acceptance of the changes. If you disagree with the revised Terms, you must stop using the platform and contact us to close your account.</p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">16. Governing Law & Jurisdiction</h2>
              <p>These Terms are governed by and construed in accordance with the laws of the Republic of India, without regard to its conflict of law provisions. Any disputes arising from or related to these Terms or your use of the platform shall be subject to the exclusive jurisdiction of the competent courts located in India.</p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">17. Dispute Resolution</h2>
              <p className="mb-3">In the event of a dispute:</p>
              <ol className="list-decimal pl-6 space-y-2">
                <li><strong className="text-secondary">Informal Resolution:</strong> Both parties agree to first attempt resolution through good-faith informal negotiation by contacting <span className="text-brand font-medium">support@reachpeakapi.in</span>.</li>
                <li><strong className="text-secondary">Mediation:</strong> If the dispute is not resolved within 30 days of informal negotiation, either party may refer the dispute to mediation.</li>
                <li><strong className="text-secondary">Arbitration:</strong> If mediation fails, the dispute shall be resolved through binding arbitration under the Arbitration and Conciliation Act, 1996, conducted in India. The language of arbitration shall be English.</li>
              </ol>
            </div>

            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">18. Severability</h2>
              <p>If any provision of these Terms is found to be invalid, illegal, or unenforceable by a court of competent jurisdiction, the remaining provisions shall continue in full force and effect. The invalid provision shall be modified to the minimum extent necessary to make it valid and enforceable.</p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">19. Entire Agreement</h2>
              <p>These Terms, together with our Privacy Policy and Refund Policy, constitute the entire agreement between you and ReachPeak API regarding your use of the platform. These Terms supersede all prior agreements, communications, and understandings, whether written or oral, relating to the subject matter herein.</p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">20. Contact Us</h2>
              <p className="mb-3">If you have any questions, concerns, or feedback about these Terms of Service, please contact us:</p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p><strong className="text-secondary">ReachPeak API</strong></p>
                <p>Email: <span className="text-brand font-medium">support@reachpeakapi.in</span></p>
                <p>Website: <span className="text-brand font-medium">https://reachpeakapi.in</span></p>
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
