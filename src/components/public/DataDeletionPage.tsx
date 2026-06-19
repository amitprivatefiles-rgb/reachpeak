export function DataDeletionPage() {
  return (
    <div>
      <section className="bg-gradient-to-br from-brand to-brand-dark text-white py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-extrabold mb-4">Data Deletion Request</h1>
          <p className="text-white/80">Request deletion of your personal data from ReachPeak API</p>
        </div>
      </section>
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-8 text-secondary-light leading-relaxed">

            <div>
              <p className="mb-3">At ReachPeak API, we respect your right to privacy and your right to have your personal data deleted. This page explains how you can request the deletion of your data from our platform.</p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">What Data We Store</h2>
              <p className="mb-3">When you use ReachPeak API (directly or through a WhatsApp interaction with a business using our platform), we may store the following data:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong className="text-secondary">Account Data:</strong> Name, email, phone number, and business details (for registered users)</li>
                <li><strong className="text-secondary">Message Data:</strong> WhatsApp message content, delivery status, timestamps, and media files</li>
                <li><strong className="text-secondary">Contact Data:</strong> Phone numbers and associated contact information uploaded by businesses</li>
                <li><strong className="text-secondary">Campaign Data:</strong> Campaign configurations, analytics, and performance metrics</li>
                <li><strong className="text-secondary">WhatsApp Account Data:</strong> WABA credentials and connection details</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">How to Request Data Deletion</h2>
              <p className="mb-4">You can request deletion of your data using any of the following methods:</p>

              <div className="space-y-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
                  <h3 className="font-bold text-secondary mb-2">Option 1: Email Request</h3>
                  <p className="mb-2">Send an email to <span className="text-brand font-medium">support@reachpeakapi.in</span> with:</p>
                  <ul className="list-disc pl-6 space-y-1 text-sm">
                    <li>Subject line: <strong>"Data Deletion Request"</strong></li>
                    <li>Your registered email address or phone number</li>
                    <li>Description of what data you want deleted (account, messages, contact info, or all data)</li>
                  </ul>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
                  <h3 className="font-bold text-secondary mb-2">Option 2: In-App Account Deletion</h3>
                  <p className="mb-2">If you have a ReachPeak API account:</p>
                  <ol className="list-decimal pl-6 space-y-1 text-sm">
                    <li>Log in to your account at <a href="https://reachpeakapi.in/login" className="text-brand hover:text-brand-dark font-medium">reachpeakapi.in/login</a></li>
                    <li>Go to <strong>Settings</strong></li>
                    <li>Scroll to the <strong>"Danger Zone"</strong> section</li>
                    <li>Click <strong>"Delete My Account"</strong></li>
                    <li>Confirm the deletion</li>
                  </ol>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
                  <h3 className="font-bold text-secondary mb-2">Option 3: For WhatsApp Users (Non-Account Holders)</h3>
                  <p className="text-sm">If you do not have a ReachPeak API account but have interacted with a business that uses our platform via WhatsApp, and you want your conversation data removed, please email <span className="text-brand font-medium">support@reachpeakapi.in</span> with your phone number and we will delete your data from our systems.</p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">What Happens After Your Request</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong className="text-secondary">Acknowledgment:</strong> We will acknowledge your request within 2 business days.</li>
                <li><strong className="text-secondary">Processing:</strong> Your data will be deleted within 30 days of your request.</li>
                <li><strong className="text-secondary">Confirmation:</strong> You will receive an email confirmation once your data has been permanently deleted.</li>
                <li><strong className="text-secondary">Scope:</strong> All personal data, message history, contact lists, campaign data, media files, and account credentials will be permanently removed from our systems.</li>
                <li><strong className="text-secondary">Exceptions:</strong> We may retain certain data if required by law, regulation, or legitimate legal obligation (e.g., tax records, fraud prevention). If applicable, we will inform you of any data that cannot be deleted and the reason for retention.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">Third-Party Data</h2>
              <p>Please note that data processed by Meta (WhatsApp) is subject to Meta's own data deletion policies. To request deletion of data held by Meta, please visit <a href="https://www.facebook.com/help/contact/delete_account" target="_blank" rel="noopener noreferrer" className="text-brand hover:text-brand-dark font-medium">Meta's Data Deletion page</a>. ReachPeak API can only delete data stored within our own systems.</p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">Data Deletion Callback</h2>
              <p>For automated data deletion requests (e.g., from Meta's platform), our data deletion callback endpoint is:</p>
              <div className="bg-gray-100 border border-gray-200 rounded-lg p-3 mt-2 font-mono text-sm break-all">
                https://mxupzmwznkekdjylaztl.supabase.co/functions/v1/data-deletion
              </div>
              <p className="text-sm text-gray-500 mt-2">This endpoint processes deletion requests programmatically and returns a confirmation URL for tracking.</p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-secondary mb-3">Contact Us</h2>
              <p>If you have any questions about data deletion or your privacy rights, please contact us:</p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-2">
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
