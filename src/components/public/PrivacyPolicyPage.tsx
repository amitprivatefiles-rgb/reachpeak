export function PrivacyPolicyPage() {
  return (
    <div>
      <section className="bg-gradient-to-br from-brand to-brand-dark text-white py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-extrabold mb-4">Privacy Policy</h1>
          <p className="text-white/80">Last updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </section>
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 prose prose-gray max-w-none">
          <div className="space-y-8 text-secondary-light leading-relaxed">
            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">1. Information We Collect</h2>
              <p className="mb-3">When you use ReachPeak API, we collect the following types of information:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong className="text-secondary">Personal Information:</strong> Name, email address, phone number, and business details provided during registration.</li>
                <li><strong className="text-secondary">Business Data:</strong> Business name, type, logo, WhatsApp number, and address submitted during onboarding.</li>
                <li><strong className="text-secondary">Usage Data:</strong> Campaign metrics, message delivery statistics, login activity, and feature usage patterns.</li>
                <li><strong className="text-secondary">Payment Information:</strong> Payment references and transaction IDs. We do not store credit/debit card numbers.</li>
                <li><strong className="text-secondary">Contact Lists:</strong> Phone numbers and associated contact details you upload for campaigns.</li>
              </ul>
            </div>
            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">2. How We Use Your Information</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>To provide, maintain, and improve the ReachPeak API platform</li>
                <li>To process your subscription and verify payments</li>
                <li>To send campaign messages on your behalf</li>
                <li>To provide customer support and respond to inquiries</li>
                <li>To generate analytics and reports for your account</li>
                <li>To detect and prevent fraud or unauthorized access</li>
                <li>To send service-related notifications and updates</li>
              </ul>
            </div>
            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">3. Data Storage and Security</h2>
              <p>Your data is stored securely using industry-standard encryption and hosted on Supabase cloud infrastructure. We implement technical and organizational measures to protect your data against unauthorized access, alteration, disclosure, or destruction. All data transmissions are encrypted using TLS/SSL protocols.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">4. Third-Party Sharing</h2>
              <p>We do not sell, trade, or rent your personal information to third parties. We may share data only with service providers who assist in operating our platform (e.g., hosting, payment processing), and only as necessary to provide our services. All third-party providers are bound by confidentiality obligations.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">5. Cookies and Tracking</h2>
              <p>We use essential cookies to maintain your login session and remember your preferences. We do not use third-party advertising cookies. You can disable cookies in your browser settings, though some platform features may not function properly without them.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">6. Your Rights</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong className="text-secondary">Access:</strong> Request a copy of the personal data we hold about you.</li>
                <li><strong className="text-secondary">Correction:</strong> Request correction of inaccurate or incomplete data.</li>
                <li><strong className="text-secondary">Deletion:</strong> Request deletion of your personal data, subject to legal retention requirements.</li>
                <li><strong className="text-secondary">Portability:</strong> Request your data in a machine-readable format.</li>
              </ul>
            </div>
            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">7. Data Retention</h2>
              <p>We retain your personal data for as long as your account is active or as needed to provide services. Upon account deletion, we will remove your data within 30 days, except where retention is required by law or for legitimate business purposes.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">8. Children's Privacy</h2>
              <p>ReachPeak API is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that we have collected data from a minor, we will take steps to delete it promptly.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">9. Changes to This Policy</h2>
              <p>We may update this Privacy Policy from time to time. We will notify you of significant changes by posting a notice on our platform or sending an email to your registered address. Continued use of the platform after changes constitutes acceptance of the updated policy.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">10. Contact Us</h2>
              <p>If you have questions about this Privacy Policy or wish to exercise your data rights, please contact us at <span className="text-brand font-medium">support@reachpeakapi.in</span>.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
