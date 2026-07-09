import { SolutionPage } from './SolutionPage';

export function EcommerceSolution() {
  return <SolutionPage config={{
    slug: 'ecommerce',
    metaTitle: 'WhatsApp for E-commerce & D2C — ReachPeak',
    metaDesc: 'Recover abandoned carts, kill RTO with OrderGuard, and convert COD to prepaid — all on WhatsApp.',
    heroTitle: 'Recover carts.',
    heroHighlight: 'Kill RTO.',
    heroSub: 'Automated cart recovery, real-time COD fraud scoring, and prepay conversion — purpose-built for Indian D2C and e-commerce.',
    chatBusiness: 'Your Store',
    chatMessages: [
      { type: 'image-template', sender: 'business', content: '🛒 You left something behind!\nYour cart (₹2,499) is waiting.', time: '11:30 AM', status: 'delivered' },
      { type: 'text', sender: 'customer', content: 'Oh I forgot! Can I pay online?', time: '11:45 AM' },
      { type: 'payment', sender: 'business', content: '₹2,249 (10% off for prepay)\nPay securely →', time: '11:46 AM', status: 'read', paid: true },
    ],
    painPoints: [
      { problem: '70% of carts are abandoned. Most brands send only one email that goes unread.', solution: 'Multi-step WhatsApp journey: 30-min reminder → 4-hr nudge with discount → 24-hr last chance. 98% open rate.', metric: '3× recovery rate' },
      { problem: 'COD returns cost ₹200+ per order in logistics and restock. Serial RTO customers abuse the system.', solution: 'OrderGuard scores every order, auto-confirms low-risk, nudges high-risk to prepay, blocks repeat offenders.', metric: '28% lower RTO' },
      { problem: 'Customers want COD but you want prepaid. Forcing prepaid drops conversion.', solution: 'Smart prepay nudge: offer 5–15% discount on prepay. Customer pays via Razorpay link in one tap.', metric: '22% COD→prepaid' },
    ],
    journeySteps: [
      { label: 'Cart Abandoned', type: 'trigger', icon: '🛒' },
      { label: 'Wait 30min', type: 'wait', icon: '⏱' },
      { label: 'Send Reminder', type: 'send', icon: '💬' },
      { label: 'Purchased?', type: 'condition', icon: '🎯' },
      { label: 'Recovered ✓', type: 'exit', icon: '✅' },
    ],
    journeyPackTitle: 'E-commerce',
    journeyPresets: ['Cart recovery', 'Order confirmation', 'COD verification', 'Prepay nudge', 'Delivery updates', 'Review request', 'Win-back campaign'],
    featureBadge: 'OrderGuard™',
    featureTitle: 'Real-time COD fraud scoring',
    featureDesc: 'Every COD order is scored using 12+ risk signals — customer history, order value, pincode RTO rate, payment pattern. High-risk orders get auto-nudged to prepay. Serial RTOs get blocked before they cost you.',
    metrics: [
      { value: 3, suffix: '×', label: 'cart recovery rate' },
      { value: 28, suffix: '%', label: 'lower RTO' },
      { value: 12.5, suffix: '×', label: 'ROI', decimals: 1 },
    ],
  }} />;
}

export function ClinicsSolution() {
  return <SolutionPage config={{
    slug: 'clinics',
    metaTitle: 'WhatsApp for Clinics & Healthcare — ReachPeak',
    metaDesc: 'Reduce no-shows, automate appointment reminders, collect deposits, and send report alerts — all on WhatsApp.',
    heroTitle: 'Fewer no-shows.',
    heroHighlight: 'Fuller schedules.',
    heroSub: 'Automated appointment reminders with confirm/reschedule buttons, deposit collection for high-risk bookings, and report-ready alerts — built for clinics.',
    chatBusiness: "Dr. Mehta's Clinic",
    chatMessages: [
      { type: 'text', sender: 'business', content: '📋 Reminder: Your appointment with Dr. Mehta is tomorrow at 3:00 PM.', time: '10:00 AM', status: 'read' },
      { type: 'button-reply', sender: 'customer', content: '', time: '10:15 AM', buttons: ['✅ Confirm', '📅 Reschedule'] },
      { type: 'text', sender: 'customer', content: '✅ Confirmed!', time: '10:15 AM' },
      { type: 'payment', sender: 'business', content: '₹500 consultation deposit', time: '10:16 AM', status: 'read', paid: true },
    ],
    painPoints: [
      { problem: '15-25% of appointments are no-shows, costing thousands in lost revenue daily.', solution: 'WhatsApp reminders with one-tap Confirm/Reschedule buttons. Unconfirmed slots open for waitlist automatically.', metric: '40% fewer no-shows' },
      { problem: 'Repeat no-shows abuse the system with zero accountability.', solution: 'BookGuard flags risky bookings and auto-collects a deposit via payment link. Refunded on attendance.', metric: '₹500 deposit collection' },
      { problem: 'Patients call to ask if reports are ready, jamming reception lines.', solution: 'Report-ready alert sent via WhatsApp the moment the report is uploaded. Patient downloads from the link.', metric: 'Zero follow-up calls' },
    ],
    journeySteps: [
      { label: 'Booking Made', type: 'trigger', icon: '📅' },
      { label: 'Wait 24h', type: 'wait', icon: '⏱' },
      { label: 'Send Reminder', type: 'send', icon: '💬' },
      { label: 'Confirmed?', type: 'condition', icon: '🎯' },
      { label: 'Visit Done ✓', type: 'exit', icon: '✅' },
    ],
    journeyPackTitle: 'Healthcare',
    journeyPresets: ['Appointment reminders', 'Report-ready alerts', 'Feedback & Google reviews', 'Recall campaigns', 'Deposit collection'],
    featureBadge: 'BookGuard',
    featureTitle: 'No-show protection for clinics',
    featureDesc: 'Patients who repeatedly no-show get flagged. Their next booking requires a deposit — automatically collected via WhatsApp payment link. Refunded on attendance. No confrontation, no manual follow-up.',
    metrics: [
      { value: 40, suffix: '%', label: 'fewer no-shows' },
      { value: 92, suffix: '%', label: 'confirmation rate' },
      { value: 4.8, suffix: '★', label: 'Google review avg', decimals: 1 },
    ],
  }} />;
}

export function SalonsSolution() {
  return <SolutionPage config={{
    slug: 'salons',
    metaTitle: 'WhatsApp for Salons & Spas — ReachPeak',
    metaDesc: 'Keep every chair booked. Automated reminders, rebooking nudges, and loyalty campaigns on WhatsApp.',
    heroTitle: 'Keep every chair',
    heroHighlight: 'booked.',
    heroSub: 'Booking confirmations, last-minute cancellation fills, rebooking nudges, and loyalty campaigns — all automated on WhatsApp.',
    chatBusiness: 'Glow Salon',
    chatMessages: [
      { type: 'text', sender: 'business', content: '💇 Hi Ananya! Your haircut with Priya is tomorrow at 11 AM. See you!', time: '6:00 PM', status: 'read' },
      { type: 'text', sender: 'customer', content: "Can't make it 😢 reschedule?", time: '6:15 PM' },
      { type: 'text', sender: 'business', content: "No worries! Here are available slots:\n📅 Thu 2 PM\n📅 Fri 10 AM\n📅 Sat 3 PM", time: '6:16 PM', status: 'read' },
    ],
    painPoints: [
      { problem: 'Last-minute cancellations leave chairs empty and revenue on the table.', solution: 'Automated reminders 24h before + rebooking flow for cancellations. Cancelled slots are offered to the waitlist instantly.', metric: '30% fewer empty chairs' },
      { problem: 'Clients forget to rebook and visit frequency drops over time.', solution: 'Smart rebooking nudges: "It\'s been 6 weeks since your last haircut — book your next visit?" with one-tap scheduling.', metric: '2× visit frequency' },
      { problem: 'Birthday offers, loyalty rewards, and seasonal promos are sent via SMS that nobody reads.', solution: 'WhatsApp campaigns with 98% open rate. Personalized birthday offers, loyalty milestones, and new service launches.', metric: '98% open rate' },
    ],
    journeySteps: [
      { label: 'Booking Made', type: 'trigger', icon: '💇' },
      { label: 'Wait 24h', type: 'wait', icon: '⏱' },
      { label: 'Send Reminder', type: 'send', icon: '💬' },
      { label: 'Attended?', type: 'condition', icon: '🎯' },
      { label: 'Rebook Nudge', type: 'send', icon: '🔄' },
    ],
    journeyPackTitle: 'Salons & Spas',
    journeyPresets: ['Booking confirmation', 'Appointment reminder', 'Rebooking nudge', 'Birthday offer', 'Loyalty rewards'],
    featureBadge: 'BookGuard',
    featureTitle: 'No-show protection for salons',
    featureDesc: 'Clients who frequently cancel last-minute get flagged. Their next booking requires a deposit — collected in one tap via WhatsApp. Cuts no-shows dramatically without awkward conversations.',
    metrics: [
      { value: 30, suffix: '%', label: 'fewer empty slots' },
      { value: 98, suffix: '%', label: 'message open rate' },
      { value: 2, suffix: '×', label: 'rebooking rate' },
    ],
  }} />;
}

export function EducationSolution() {
  return <SolutionPage config={{
    slug: 'education',
    metaTitle: 'WhatsApp for Coaching & Education — ReachPeak',
    metaDesc: 'From enquiry to enrolment on WhatsApp. Automate lead follow-up, fee reminders, and class updates.',
    heroTitle: 'From enquiry to enrolment',
    heroHighlight: 'on WhatsApp.',
    heroSub: 'Instant lead follow-up, automated fee reminders with payment links, class updates, and parent communication — all on WhatsApp.',
    chatBusiness: 'Bright Academy',
    chatMessages: [
      { type: 'text', sender: 'business', content: 'Hi Rahul! Thanks for enquiring about our JEE Crash Course.\n\n📚 Batch starts: July 15\n💰 Fee: ₹15,000\n\nShall I reserve your seat?', time: '9:00 AM', status: 'read' },
      { type: 'text', sender: 'customer', content: 'Yes! How do I pay?', time: '9:05 AM' },
      { type: 'payment', sender: 'business', content: '₹15,000 — JEE Crash Course Fee\nPay securely →', time: '9:06 AM', status: 'read', paid: true },
    ],
    painPoints: [
      { problem: 'Enquiries from ads and website go cold within hours. Manual follow-up can\'t keep up.', solution: 'Instant WhatsApp auto-reply with course details + fee payment link. Lead gets warm follow-up at 4h and 24h if no response.', metric: '3× lead conversion' },
      { problem: 'Fee collection is a monthly headache. Reminders go unread. Parents delay.', solution: 'Automated fee-due reminders with Razorpay payment link. One-tap payment. Auto-receipt on success.', metric: '85% on-time payment' },
      { problem: 'Class updates, schedule changes, and exam results require manual calls to each parent.', solution: 'Broadcast to batch/class groups on WhatsApp. Exam results, schedule changes, holiday notices — instant delivery.', metric: '98% delivery rate' },
    ],
    journeySteps: [
      { label: 'Enquiry Received', type: 'trigger', icon: '📩' },
      { label: 'Instant Reply', type: 'send', icon: '💬' },
      { label: 'Wait 4h', type: 'wait', icon: '⏱' },
      { label: 'Enrolled?', type: 'condition', icon: '🎯' },
      { label: 'Fee Collected ✓', type: 'exit', icon: '✅' },
    ],
    journeyPackTitle: 'Education',
    journeyPresets: ['Enquiry follow-up', 'Fee reminders', 'Class updates', 'Exam results', 'Re-enrolment campaign'],
    featureBadge: 'Lead Scoring',
    featureTitle: 'Never lose an enquiry again',
    featureDesc: 'Every enquiry gets an instant WhatsApp reply with course details and a payment link. Hot leads are flagged for personal follow-up. Cold leads enter a nurture drip. Zero manual work.',
    metrics: [
      { value: 3, suffix: '×', label: 'lead conversion' },
      { value: 85, suffix: '%', label: 'on-time fee payment' },
      { value: 98, suffix: '%', label: 'message delivery' },
    ],
  }} />;
}

export function RealEstateSolution() {
  return <SolutionPage config={{
    slug: 'real-estate',
    metaTitle: 'WhatsApp for Real Estate — ReachPeak',
    metaDesc: 'Every lead answered in seconds. Automate site visit booking, follow-up drips, and payment collection on WhatsApp.',
    heroTitle: 'Every lead answered',
    heroHighlight: 'in seconds.',
    heroSub: 'Instant lead qualification on WhatsApp, automated site visit booking, follow-up drips, and payment link collection — built for real estate.',
    chatBusiness: 'Green Valley Homes',
    chatMessages: [
      { type: 'text', sender: 'customer', content: 'Hi, I saw your ad for 2BHK in Whitefield. Price?', time: '8:30 PM' },
      { type: 'text', sender: 'business', content: '🏠 Green Valley 2BHK\n📍 Whitefield, Bangalore\n💰 ₹45L–55L\n📐 950–1100 sqft\n\nWould you like to schedule a site visit?', time: '8:30 PM', status: 'read' },
      { type: 'button-reply', sender: 'customer', content: '', time: '8:32 PM', buttons: ['📅 Book visit', '📄 Brochure'] },
    ],
    painPoints: [
      { problem: 'Leads from 99acres, MagicBricks, and Facebook ads go unanswered after office hours.', solution: 'Instant WhatsApp auto-reply with project details, pricing, and site visit booking — 24/7. No lead goes cold.', metric: '< 30 sec response' },
      { problem: 'Salespeople forget to follow up. Leads decay within 48 hours.', solution: 'Automated follow-up drip: Day 1 brochure → Day 3 virtual tour → Day 7 offer → Day 14 site visit nudge.', metric: '2× site visits' },
      { problem: 'Booking amount collection requires bank visits, cheques, or in-person payment.', solution: 'Send Razorpay payment link via WhatsApp. Collect booking amount (₹1L–5L) instantly. Receipt auto-generated.', metric: 'Instant collection' },
    ],
    journeySteps: [
      { label: 'Lead Enquiry', type: 'trigger', icon: '🏠' },
      { label: 'Instant Reply', type: 'send', icon: '💬' },
      { label: 'Wait 3 days', type: 'wait', icon: '⏱' },
      { label: 'Visited?', type: 'condition', icon: '🎯' },
      { label: 'Booked ✓', type: 'exit', icon: '✅' },
    ],
    journeyPackTitle: 'Real Estate',
    journeyPresets: ['Instant lead reply', 'Site visit booking', 'Follow-up drip', 'Booking amount collection', 'Project updates'],
    featureBadge: 'Instant Reply',
    featureTitle: 'Lead qualification on autopilot',
    featureDesc: 'Every enquiry gets an instant WhatsApp reply with project details, floor plans, and a site visit booking link. Hot leads (budget match, ready timeline) are flagged for your sales team. Cold leads enter a nurture drip.',
    metrics: [
      { value: 30, suffix: 's', label: 'avg response time', prefix: '<' },
      { value: 2, suffix: '×', label: 'site visit conversion' },
      { value: 45, suffix: '%', label: 'digital booking' },
    ],
  }} />;
}

export function ServicesSolution() {
  return <SolutionPage config={{
    slug: 'services',
    metaTitle: 'WhatsApp for Agencies & Local Services — ReachPeak',
    metaDesc: 'Quotes, bookings, and payments — one chat. Automate client communication for agencies and service businesses.',
    heroTitle: 'Quotes, bookings and payments —',
    heroHighlight: 'one chat.',
    heroSub: 'Send quotes, confirm bookings, collect advance payments, and follow up on pending invoices — all from WhatsApp.',
    chatBusiness: 'PixelCraft Agency',
    chatMessages: [
      { type: 'text', sender: 'business', content: '📋 Quote: Website Redesign\n\n🎨 UI/UX Design: ₹40,000\n💻 Development: ₹60,000\n📱 Mobile responsive: Included\n\nTotal: ₹1,00,000\n\nValid for 7 days.', time: '2:00 PM', status: 'read' },
      { type: 'text', sender: 'customer', content: 'Looks good! Let\'s go ahead', time: '2:15 PM' },
      { type: 'payment', sender: 'business', content: '₹30,000 advance (30%)\nPay to confirm booking →', time: '2:16 PM', status: 'read', paid: true },
    ],
    painPoints: [
      { problem: 'Quotes sent via email get buried. Follow-up requires manual tracking.', solution: 'Send quotes on WhatsApp with one-tap accept + payment link. Auto follow-up at 48h if unsigned.', metric: '2× quote acceptance' },
      { problem: 'Clients confirm verbally but don\'t show up or delay start dates.', solution: 'Booking confirmation with advance payment collection via Razorpay. Commitment captured in one tap.', metric: '₹ advance collected upfront' },
      { problem: 'Invoice follow-ups are awkward and time-consuming.', solution: 'Automated payment reminders: due date → 3 days overdue → 7 days overdue. Professional, not pushy.', metric: '60% faster payment' },
    ],
    journeySteps: [
      { label: 'Quote Sent', type: 'trigger', icon: '📋' },
      { label: 'Wait 48h', type: 'wait', icon: '⏱' },
      { label: 'Follow Up', type: 'send', icon: '💬' },
      { label: 'Accepted?', type: 'condition', icon: '🎯' },
      { label: 'Paid ✓', type: 'exit', icon: '✅' },
    ],
    journeyPackTitle: 'Services & Agencies',
    journeyPresets: ['Quote follow-up', 'Booking confirmation', 'Advance collection', 'Invoice reminders', 'Feedback request'],
    featureBadge: 'BookGuard',
    featureTitle: 'Commitment before service',
    featureDesc: 'Clients who book services pay an advance via WhatsApp payment link. No more verbal commitments that fall through. Works for agencies, consultants, freelancers, and any service-based business.',
    metrics: [
      { value: 2, suffix: '×', label: 'quote acceptance' },
      { value: 60, suffix: '%', label: 'faster payment' },
      { value: 85, suffix: '%', label: 'advance collected' },
    ],
  }} />;
}
