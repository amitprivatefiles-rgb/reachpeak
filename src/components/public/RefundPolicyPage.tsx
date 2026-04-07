export function RefundPolicyPage() {
  return (
    <div>
      <section className="bg-gradient-to-br from-brand to-brand-dark text-white py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-extrabold mb-4">Refund Policy</h1>
          <p className="text-white/80">Last updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </section>
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-8 text-secondary-light leading-relaxed">
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <h2 className="text-xl font-bold text-green-800 mb-2">7-Day Money-Back Guarantee</h2>
              <p className="text-green-700">We stand behind our platform. If you are not satisfied with ReachPeak API within 7 days of your first subscription, we will issue a full refund -- no questions asked.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">1. Eligible Conditions for Refund</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Refund requests made within 7 days of the initial subscription payment</li>
                <li>First-time subscribers only (the guarantee applies to your first subscription period)</li>
                <li>The platform did not meet your expectations or business requirements</li>
                <li>Technical issues that prevent you from using core platform features</li>
                <li>Your account was approved but the service was not delivered as described</li>
              </ul>
            </div>
            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">2. Non-Refundable Scenarios</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Refund requests made after 7 days from the initial payment</li>
                <li>Account suspended or terminated due to violation of Terms & Conditions</li>
                <li>Subscription renewals (refunds apply only to the first subscription)</li>
                <li>Message delivery failures caused by invalid contact numbers or recipient blocking</li>
                <li>Issues caused by user error (incorrect campaign setup, wrong contact data)</li>
              </ul>
            </div>
            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">3. How to Request a Refund</h2>
              <p className="mb-3">To request a refund, please follow these steps:</p>
              <ol className="list-decimal pl-6 space-y-2">
                <li>Send an email to <span className="text-brand font-medium">support@reachpeakapi.in</span> with the subject line "Refund Request"</li>
                <li>Include your registered email address and payment reference/transaction ID</li>
                <li>Briefly describe the reason for your refund request</li>
                <li>Our team will review your request and respond within 24 hours</li>
              </ol>
            </div>
            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">4. Refund Processing Timeline</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Refund requests are reviewed within 1-2 business days</li>
                <li>Approved refunds are processed within 5-7 business days</li>
                <li>Refunds are issued to the original payment method (UPI account)</li>
                <li>You will receive an email confirmation when the refund is processed</li>
              </ul>
            </div>
            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">5. Partial Refund Policy for Yearly Plans</h2>
              <p>If you cancel a yearly plan after the 7-day guarantee period, you may be eligible for a prorated refund based on the unused portion of your subscription. The refund amount will be calculated as follows:</p>
              <div className="bg-gray-50 rounded-xl p-4 mt-3 border border-gray-200">
                <p className="text-sm font-medium text-secondary">Refund = Total Paid - (Monthly Rate x Months Used)</p>
                <p className="text-xs text-secondary-light mt-1">Where Monthly Rate is calculated at the standard monthly price of Rs. 2,499/month.</p>
              </div>
              <p className="mt-3">Partial refunds are evaluated on a case-by-case basis and are not guaranteed. Please contact our support team to discuss your situation.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">6. Contact</h2>
              <p>For any questions about this Refund Policy, please reach out to us at <span className="text-brand font-medium">support@reachpeakapi.in</span>.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
