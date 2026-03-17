export function TermsPage() {
  return (
    <div>
      <section className="bg-gradient-to-br from-brand to-brand-dark text-white py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-extrabold mb-4">Terms & Conditions</h1>
          <p className="text-white/80">Last updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </section>
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-8 text-secondary-light leading-relaxed">
            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">1. Service Description</h2>
              <p>ReachPeak API is a WhatsApp marketing platform that enables businesses to send bulk campaign messages, manage contacts, track delivery analytics, and automate message delivery. By using our service, you agree to these terms.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">2. Account Registration & Eligibility</h2>
              <p className="mb-2">To use ReachPeak API, you must:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Be at least 18 years of age</li>
                <li>Provide accurate and complete registration information</li>
                <li>Be a registered business or authorized representative</li>
                <li>Maintain the security of your account credentials</li>
              </ul>
              <p className="mt-2">You are responsible for all activity that occurs under your account.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">3. User Responsibilities & Acceptable Use</h2>
              <p className="mb-2">When using our platform, you agree to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Comply with all applicable laws and regulations, including data protection laws</li>
                <li>Only send messages to contacts who have opted in or given consent</li>
                <li>Not use the platform for sending spam, fraudulent, or misleading messages</li>
                <li>Not attempt to reverse engineer, hack, or compromise platform security</li>
                <li>Respect WhatsApp's terms of service and messaging policies</li>
              </ul>
            </div>
            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">4. Payment Terms & Billing</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Subscription fees are billed in advance (monthly or yearly)</li>
                <li>All payments are made via UPI and are non-recurring (manual renewal)</li>
                <li>Prices are in Indian Rupees (INR) and inclusive of applicable taxes</li>
                <li>Accounts are activated only after payment verification by our team</li>
                <li>We reserve the right to change pricing with 30 days' notice to existing subscribers</li>
              </ul>
            </div>
            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">5. Refund Policy</h2>
              <p>We offer a 7-day money-back guarantee for new subscribers. Please refer to our <a href="/refund-policy" className="text-brand hover:text-brand-dark transition font-medium">Refund Policy</a> for complete details.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">6. Prohibited Use</h2>
              <p className="mb-2">The following uses of ReachPeak API are strictly prohibited:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Sending unsolicited bulk messages (spam)</li>
                <li>Promoting illegal products, services, or activities</li>
                <li>Sending content that is abusive, threatening, defamatory, or obscene</li>
                <li>Impersonating other businesses or individuals</li>
                <li>Distributing malware, phishing links, or harmful content</li>
                <li>Using the platform to harass, stalk, or intimidate individuals</li>
              </ul>
              <p className="mt-2">Violation of these terms may result in immediate account suspension or termination.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">7. Intellectual Property</h2>
              <p>All content, features, and functionality of the ReachPeak API platform are owned by us and are protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, or distribute any part of our platform without written permission.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">8. Limitation of Liability</h2>
              <p>To the maximum extent permitted by law, ReachPeak API shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your use of the platform. This includes but is not limited to lost profits, data loss, or business interruption. Our total liability shall not exceed the amount you have paid for the service in the 12 months preceding the claim.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">9. Service Availability & Uptime</h2>
              <p>We strive to maintain 99.9% uptime but do not guarantee uninterrupted access. We may perform scheduled maintenance with advance notice. We are not liable for downtime caused by factors beyond our control, including internet outages, third-party service failures, or force majeure events.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">10. Termination & Suspension</h2>
              <p>We may suspend or terminate your account if you violate these terms, fail to pay subscription fees, or engage in prohibited activities. Upon termination, your right to use the platform ceases immediately. You may request data export before account deletion.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">11. Governing Law</h2>
              <p>These Terms & Conditions are governed by and construed in accordance with the laws of India. Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the courts in India.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">12. Dispute Resolution</h2>
              <p>In the event of a dispute, both parties agree to first attempt resolution through informal negotiation. If the dispute is not resolved within 30 days, it may be escalated to mediation or arbitration under Indian arbitration laws.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">13. Contact</h2>
              <p>For questions about these Terms & Conditions, contact us at <span className="text-brand font-medium">support@reachpeakapi.com</span>.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
