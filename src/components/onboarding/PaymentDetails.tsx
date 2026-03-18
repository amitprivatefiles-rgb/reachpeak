import { useState, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Upload, X, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { sendNotification, NotificationTemplates } from '../../lib/notifications';

const QR_URL = 'https://i.ibb.co/FbJYV34w/Avatar.png';

const businessTypes = [
  'E-commerce', 'Real Estate', 'Education', 'Healthcare', 'Finance',
  'Restaurant', 'Retail', 'Travel', 'Fitness', 'Services', 'Other',
];

export function PaymentDetails() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const plan = (location.state as any)?.plan || 'monthly';
  const amount = plan === 'yearly' ? 14999 : 2499;

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [form, setForm] = useState({
    payment_reference: '',
    business_name: '',
    business_type: '',
    whatsapp_number: '',
    website_url: '',
    business_address: '',
    contact_person: '',
  });

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const processFile = (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      alert('File size must be under 2MB');
      return;
    }
    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'].includes(file.type)) {
      alert('Only PNG, JPG, JPEG, and SVG files are accepted');
      return;
    }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setLogoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    try {
      let logoUrl: string | null = null;

      if (logoFile) {
        const ext = logoFile.name.split('.').pop();
        const path = `${user.id}-${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('business-logos')
          .upload(path, logoFile, { cacheControl: '3600', upsert: false });
        if (uploadErr) throw uploadErr;
        const { data: { publicUrl } } = supabase.storage.from('business-logos').getPublicUrl(path);
        logoUrl = publicUrl;
      }

      const { error } = await supabase.from('subscriptions').insert({
        user_id: user.id,
        plan_type: plan,
        amount,
        payment_reference: form.payment_reference,
        business_name: form.business_name,
        business_type: form.business_type,
        whatsapp_number: form.whatsapp_number,
        website_url: form.website_url || null,
        logo_url: logoUrl,
        business_address: form.business_address || null,
        contact_person: form.contact_person,
        status: 'pending',
      } as any);

      if (error) throw error;

      // Send welcome email with plan + business details
      const template = NotificationTemplates.welcomeUser(
        form.contact_person || user.email || '',
        {
          planType: plan,
          amount,
          businessName: form.business_name,
          businessType: form.business_type,
        }
      );
      await sendNotification({
        userId: user.id,
        userEmail: user.email || '',
        userName: form.contact_person,
        title: template.title,
        message: template.message,
        type: 'system',
        emailSubject: template.emailSubject,
        emailBody: template.emailBody,
      });

      setSubmitted(true);
    } catch (err: any) {
      alert('Error submitting: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center animate-scale-in">
          <div className="bg-white rounded-2xl p-10 border border-gray-200 shadow-lg">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-secondary mb-3">Submission Received!</h2>
            <p className="text-secondary-light mb-6">
              Thank you! Your account is being reviewed. You will receive a confirmation within 24 hours.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-2.5 bg-brand text-white font-semibold rounded-xl hover:bg-brand-dark transition"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2.5 mb-4">
            <img src="https://i.ibb.co/K3M8zPq/Avatar.png" alt="ReachPeak API" className="w-10 h-10 rounded-lg" />
            <span className="text-2xl font-bold text-brand">ReachPeak API</span>
          </div>
          <h1 className="text-3xl font-extrabold text-secondary mb-2">Complete Your Registration</h1>
          <p className="text-secondary-light">Make payment and fill in your business details</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl p-8 border border-gray-200">
              <h2 className="text-xl font-bold text-secondary mb-6">Payment</h2>
              <div className="bg-brand-lighter rounded-xl p-4 mb-6 border border-brand/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-secondary">{plan === 'yearly' ? 'Yearly Plan' : 'Monthly Plan'}</span>
                  <span className="text-xl font-extrabold text-secondary">&#8377;{amount.toLocaleString()}</span>
                </div>
                <p className="text-xs text-secondary-light">{plan === 'yearly' ? 'Billed annually' : 'Billed monthly'}</p>
              </div>
              <div className="flex justify-center mb-6">
                <div className="bg-white border-2 border-gray-200 rounded-xl p-3">
                  <img src={QR_URL} alt="Payment QR Code" className="w-56 h-56 object-contain" />
                </div>
              </div>
              <p className="text-sm text-secondary-light text-center mb-6">
                Scan the QR code using any UPI app to make payment. After payment, fill in your business details and submit.
              </p>
              <div>
                <label className="block text-sm font-medium text-secondary mb-1.5">Payment Reference / UTR / Transaction ID *</label>
                <input
                  type="text"
                  required
                  value={form.payment_reference}
                  onChange={(e) => setForm({ ...form, payment_reference: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-secondary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
                  placeholder="e.g., UTR123456789"
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 border border-gray-200">
              <h2 className="text-xl font-bold text-secondary mb-6">Business Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1.5">Business Name *</label>
                  <input
                    type="text"
                    required
                    value={form.business_name}
                    onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-secondary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
                    placeholder="Your business name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1.5">Business Type *</label>
                  <select
                    required
                    value={form.business_type}
                    onChange={(e) => setForm({ ...form, business_type: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-secondary focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition bg-white"
                  >
                    <option value="">Select type</option>
                    {businessTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1.5">WhatsApp Business Number *</label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 border border-r-0 border-gray-200 rounded-l-xl bg-gray-50 text-secondary-light text-sm">+91</span>
                    <input
                      type="tel"
                      required
                      value={form.whatsapp_number}
                      onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })}
                      className="flex-1 px-4 py-2.5 border border-gray-200 rounded-r-xl text-secondary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
                      placeholder="98765 43210"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1.5">Website URL</label>
                  <input
                    type="url"
                    value={form.website_url}
                    onChange={(e) => setForm({ ...form, website_url: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-secondary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
                    placeholder="https://yourbusiness.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1.5">Business Logo</label>
                  {logoPreview ? (
                    <div className="relative border-2 border-brand/30 rounded-xl p-4 bg-brand-lighter/50">
                      <img src={logoPreview} alt="Logo preview" className="w-24 h-24 object-contain mx-auto rounded-lg" />
                      <p className="text-xs text-secondary-light text-center mt-2">{logoFile?.name}</p>
                      <button
                        type="button"
                        onClick={removeLogo}
                        className="absolute top-2 right-2 p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
                        dragActive ? 'border-brand bg-brand-lighter/50' : 'border-gray-300 hover:border-brand/50 hover:bg-gray-50'
                      }`}
                    >
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-secondary-light">Drag & drop your logo here, or click to browse</p>
                      <p className="text-xs text-gray-400 mt-1">PNG, JPG, JPEG, SVG (max 2MB)</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".png,.jpg,.jpeg,.svg"
                        onChange={handleFileInput}
                        className="hidden"
                      />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1.5">Business Address</label>
                  <textarea
                    rows={2}
                    value={form.business_address}
                    onChange={(e) => setForm({ ...form, business_address: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-secondary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition resize-none"
                    placeholder="Your business address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1.5">Contact Person Name *</label>
                  <input
                    type="text"
                    required
                    value={form.contact_person}
                    onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-secondary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1.5">Contact Email</label>
                  <input
                    type="email"
                    readOnly
                    value={user?.email || ''}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-secondary-light bg-gray-50"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 max-w-md mx-auto">
            <button
              type="submit"
              disabled={submitting}
              className="w-full px-8 py-3.5 bg-brand text-white font-semibold rounded-xl hover:bg-brand-dark transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</>
              ) : (
                'Submit for Approval'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
