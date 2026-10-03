// Business types + which optional features each type gets by default.
// Admins can override any feature per account (profiles.feature_overrides), e.g. { orderguard: true }.

export type BusinessType = 'ecommerce' | 'clinics' | 'education' | 'real_estate' | 'salons' | 'finance' | 'services' | 'other';

export const BUSINESS_TYPES: { id: BusinessType; label: string; hint: string; emoji: string }[] = [
  { id: 'ecommerce', label: 'Online store / D2C brand', hint: 'Orders, COD, shipping updates, abandoned carts', emoji: '🛍️' },
  { id: 'clinics', label: 'Clinic / Healthcare', hint: 'Appointments, reminders, follow-ups after visits', emoji: '🩺' },
  { id: 'education', label: 'Education / Coaching', hint: 'Enquiries, counselling calls, admissions, fee reminders', emoji: '🎓' },
  { id: 'real_estate', label: 'Real estate', hint: 'Ad leads, site visits, long follow-ups', emoji: '🏠' },
  { id: 'salons', label: 'Salon / Spa / Wellness', hint: 'Bookings, reminders, win back regulars', emoji: '💇' },
  { id: 'finance', label: 'Finance / Insurance / Loans', hint: 'Lead qualification, EMI & renewal reminders', emoji: '💼' },
  { id: 'services', label: 'Services / Agency', hint: 'Enquiries, meetings, project updates, invoices', emoji: '🧩' },
  { id: 'other', label: 'Other business', hint: 'General customer messaging and calls', emoji: '✨' },
];
export const businessTypeLabel = (t?: string | null) => BUSINESS_TYPES.find((b) => b.id === t)?.label || 'Not set';

const ALL: BusinessType[] = BUSINESS_TYPES.map((b) => b.id);
const NOT_ECOM = ALL.filter((t) => t !== 'ecommerce');

// Optional features (everything else in the app is available to every business).
export const FEATURES: Record<string, { label: string; description: string; types: BusinessType[] }> = {
  orderguard: { label: 'OrderGuard', description: 'COD order risk scoring and confirmation', types: ['ecommerce'] },
  disputes: { label: 'Returns & disputes', description: 'Returns, exchanges, refunds and complaints', types: ['ecommerce'] },
  'ai-broadcast': { label: 'AI product broadcasts', description: 'AI-written campaigns from your product catalogue', types: ['ecommerce'] },
  store_integrations: { label: 'Store integrations', description: 'Shopify and order/shipping event connectors', types: ['ecommerce'] },
  store_journeys: { label: 'Store journeys', description: 'Cart, order, COD and delivery automations', types: ['ecommerce'] },
  leads: { label: 'Leads', description: 'Capture enquiries from forms, ads and APIs; instant follow-up', types: NOT_ECOM },
  appointment_journeys: { label: 'Appointment journeys', description: 'Booking confirmations, reminders, no-show follow-ups', types: ['clinics', 'education', 'salons', 'services', 'real_estate', 'other'] },
  payment_journeys: { label: 'Payment & renewal reminders', description: 'Fee, EMI, premium, invoice and renewal reminders', types: ['education', 'finance', 'services', 'clinics', 'other', 'salons', 'real_estate'] },
};

type ProfileLike = { role?: string | null; business_type?: string | null; feature_overrides?: Record<string, boolean> | null } | null | undefined;

// Is a feature on for this account? Admins see everything; overrides win over the business-type default.
export function hasFeature(profile: ProfileLike, feature: string): boolean {
  if (!FEATURES[feature]) return true;
  if (!profile) return false; // still loading: keep optional features hidden (no flash)
  if (profile.role === 'admin') return true;
  const o = profile.feature_overrides?.[feature];
  if (typeof o === 'boolean') return o;
  const t = (profile.business_type || '') as BusinessType;
  if (!t) return false; // type not chosen yet: show only the core app
  return FEATURES[feature].types.includes(t);
}
