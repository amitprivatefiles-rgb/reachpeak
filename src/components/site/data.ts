// ReachPeak API marketing site — shared facts & copy. Keep every claim here true.
export const WA_NUMBER = '916290678045';
export const WA_DISPLAY = '+91 62906 78045';
export const SUPPORT_EMAIL = 'support@reachpeakapi.in';
export const SALES_EMAIL = 'hello@reachpeakapi.in';

export const LANGS_LIVE = ['Hindi', 'English', 'Hinglish'];
export const LANGS_NEXT = ['Bengali', 'Tamil', 'Telugu', 'Marathi', 'Gujarati', 'Kannada'];

export type Channel = 'Voice' | 'WhatsApp';
export interface Journey { k: string; title: string; text: string; ch: Channel[] }
export interface Industry {
  slug: string; name: string; short: string; hero: string; heroEm: string; sub: string;
  pain: string; journeys: Journey[]; call: { who: string; ctx: string; lines: [string, string][]; outcome: string };
  track: string[];
}

export const INDUSTRIES: Industry[] = [
  {
    slug: 'clinics', name: 'Clinics & healthcare', short: 'Book appointments, cut no-shows, follow up after visits.',
    hero: 'Every patient enquiry,', heroEm: 'answered in a minute.',
    sub: 'AI agents call new enquiries, book appointments, send reminders and follow up after visits, in Hindi, English or Hinglish. WhatsApp handles confirmations and reports.',
    pain: 'Patients enquire when they are worried, often after hours. If nobody calls back quickly, they book with the next clinic.',
    journeys: [
      { k: 'Respond', title: 'New enquiry', text: 'Called within 60 seconds. Symptoms, preferred doctor and time captured.', ch: ['Voice'] },
      { k: 'Book', title: 'Appointment', text: 'Slot booked and confirmed on WhatsApp with clinic location.', ch: ['Voice', 'WhatsApp'] },
      { k: 'Remind', title: 'Day before', text: 'Reminder call or message. Can’t come? Rescheduled on the spot.', ch: ['Voice', 'WhatsApp'] },
      { k: 'Follow up', title: 'After the visit', text: 'Feedback, next-visit booking and medicine reminders.', ch: ['WhatsApp'] },
    ],
    call: { who: 'Priya', ctx: 'New enquiry · skin clinic', lines: [['AI', 'Namaste Priya ji, main Aarogya Skin Clinic se baat kar rahi hoon. Aapne consultation ke liye enquiry ki thi?'], ['Priya', 'Haan, acne ke liye doctor se milna tha.'], ['AI', 'Zaroor. Dr. Mehta Saturday ko available hain, 11:30 ya 4 baje. Kaunsa time theek rahega?'], ['Priya', '11:30 theek hai.']], outcome: 'Booked · Sat 11:30 AM' },
    track: ['Enquiry-to-booking rate', 'No-show rate', 'Time to first response', 'Repeat visits'],
  },
  {
    slug: 'education', name: 'Education & coaching', short: 'Call every lead, book counselling, chase admissions.',
    hero: 'Every admission lead,', heroEm: 'called while they’re still deciding.',
    sub: 'Coaching institutes, schools and edtech teams use ReachPeak to call every enquiry in 60 seconds, book counselling sessions and follow up through admissions.',
    pain: 'Students and parents enquire with three institutes at once. The first one to call back usually wins the counselling session.',
    journeys: [
      { k: 'Respond', title: 'New lead', text: 'Course, class, city and budget captured on the first call.', ch: ['Voice'] },
      { k: 'Book', title: 'Counselling', text: 'Session or demo class booked, confirmed on WhatsApp.', ch: ['Voice', 'WhatsApp'] },
      { k: 'Collect', title: 'Admissions', text: 'Document and fee reminders until the seat is confirmed.', ch: ['Voice', 'WhatsApp'] },
      { k: 'Engage', title: 'Students', text: 'Batch updates, schedules and results on WhatsApp.', ch: ['WhatsApp'] },
    ],
    call: { who: 'Rohan', ctx: 'New lead · NEET coaching', lines: [['AI', 'Hi Rohan, this is Aditi from Vidya Academy. You asked about our NEET batch, right?'], ['Rohan', 'Yes, for my sister. She is in class 11.'], ['AI', 'Great. We have a free demo class this Sunday at 10. Should I book a seat for her?'], ['Rohan', 'Haan, book kar dijiye.']], outcome: 'Demo booked · Sun 10:00 AM' },
    track: ['Lead-to-counselling rate', 'Counselling-to-admission rate', 'Fee collection on time', 'Response time'],
  },
  {
    slug: 'real-estate', name: 'Real estate', short: 'Qualify ad leads, book site visits, follow up for months.',
    hero: 'Qualify every property lead', heroEm: 'before it goes cold.',
    sub: 'Builders, brokers and channel partners use ReachPeak to call every ad lead in 60 seconds, qualify budget and location, book site visits and keep follow-ups going.',
    pain: 'Property ads bring hundreds of leads, most of them not serious. Sales teams burn hours on calls, and the real buyers wait.',
    journeys: [
      { k: 'Qualify', title: 'Ad lead', text: 'Budget, location, BHK and timeline qualified on the first call.', ch: ['Voice'] },
      { k: 'Book', title: 'Site visit', text: 'Visit booked, location pin and reminder sent on WhatsApp.', ch: ['Voice', 'WhatsApp'] },
      { k: 'Route', title: 'Hot buyers', text: 'Serious buyers handed to your sales team with the call summary.', ch: ['Voice'] },
      { k: 'Nurture', title: 'Not yet', text: 'Polite follow-ups and new launches until they’re ready.', ch: ['WhatsApp'] },
    ],
    call: { who: 'Vikram', ctx: 'Facebook lead · 2BHK project', lines: [['AI', 'Hello Vikram ji, aapne Green Valley 2BHK ke liye form bhara tha. Budget kitna soch rahe hain?'], ['Vikram', '60 se 70 lakh ke beech.'], ['AI', 'Perfect, us range mein 3 options hain. Is Sunday site visit karna chahenge?'], ['Vikram', 'Sunday 11 baje.']], outcome: 'Site visit · Sun 11:00 AM' },
    track: ['Qualified leads %', 'Site visits booked', 'Visit-to-booking rate', 'Cost per qualified lead'],
  },
  {
    slug: 'salons', name: 'Salons & wellness', short: 'Fill the calendar, remind clients, win back regulars.',
    hero: 'A fuller calendar,', heroEm: 'without the phone ringing all day.',
    sub: 'Salons, spas, gyms and wellness studios use ReachPeak to book appointments, cut no-shows and bring regulars back, on calls and WhatsApp.',
    pain: 'Your team is busy with clients when the phone rings. Missed calls are missed bookings, and no-shows leave expensive gaps.',
    journeys: [
      { k: 'Book', title: 'Enquiry', text: 'Service, stylist and time booked by AI, confirmed on WhatsApp.', ch: ['Voice', 'WhatsApp'] },
      { k: 'Remind', title: 'Before the slot', text: 'Reminder with an easy reschedule option.', ch: ['WhatsApp'] },
      { k: 'Win back', title: 'Regulars', text: '“It’s been 6 weeks” reminders and offers, at the right time.', ch: ['WhatsApp', 'Voice'] },
      { k: 'Feedback', title: 'After the visit', text: 'Quick rating and review request.', ch: ['WhatsApp'] },
    ],
    call: { who: 'Neha', ctx: 'Missed call · bridal package', lines: [['AI', 'Hi Neha, you called Glow Studio a few minutes ago. How can I help?'], ['Neha', 'I wanted to know about the bridal package.'], ['AI', 'Sure! Should I book a free consultation with our senior artist on Thursday at 5?'], ['Neha', 'Yes please.']], outcome: 'Consultation · Thu 5:00 PM' },
    track: ['Missed calls recovered', 'No-show rate', 'Repeat-visit rate', 'Bookings per week'],
  },
  {
    slug: 'finance', name: 'Finance & insurance', short: 'Qualify leads, remind dues and renewals, politely.',
    hero: 'Follow-ups that are on time,', heroEm: 'every time.',
    sub: 'Lending teams, insurance advisors and financial-services firms use ReachPeak to qualify leads, remind about EMIs and renewals, and keep customers informed.',
    pain: 'Renewals lapse and dues slip not because customers refuse, but because nobody reminded them at the right time, in the right way.',
    journeys: [
      { k: 'Qualify', title: 'New lead', text: 'Need, eligibility basics and best time to talk captured.', ch: ['Voice'] },
      { k: 'Remind', title: 'Dues & EMIs', text: 'Polite reminders with a payment link on WhatsApp.', ch: ['Voice', 'WhatsApp'] },
      { k: 'Renew', title: 'Renewals', text: 'Policy and plan renewals reminded well before expiry.', ch: ['Voice', 'WhatsApp'] },
      { k: 'Update', title: 'Service', text: 'Document requests and status updates, without hold music.', ch: ['WhatsApp'] },
    ],
    call: { who: 'Suresh', ctx: 'Policy renewal · due in 7 days', lines: [['AI', 'Namaste Suresh ji, aapki health policy 7 din mein renew honi hai. Kya main renewal link WhatsApp par bhej doon?'], ['Suresh', 'Haan, bhej dijiye.'], ['AI', 'Bhej diya. Koi sawaal ho toh isi number par reply kar dijiye.']], outcome: 'Renewal link sent' },
    track: ['On-time payment rate', 'Renewal rate', 'Lead qualification rate', 'Collection effort per case'],
  },
  {
    slug: 'services', name: 'Services & agencies', short: 'Respond first, book meetings, keep projects moving.',
    hero: 'Be the first business', heroEm: 'to call back.',
    sub: 'Consultants, agencies, home services, travel and B2B firms use ReachPeak to respond to every enquiry instantly, book meetings and keep customers updated.',
    pain: 'Service buyers contact several providers at once. The one who responds first, clearly and politely, usually gets the job.',
    journeys: [
      { k: 'Respond', title: 'Enquiry', text: 'Called within 60 seconds, requirement and budget captured.', ch: ['Voice'] },
      { k: 'Book', title: 'Meeting or visit', text: 'Call, meeting or technician visit booked and confirmed.', ch: ['Voice', 'WhatsApp'] },
      { k: 'Update', title: 'In progress', text: 'Status updates and approvals on WhatsApp.', ch: ['WhatsApp'] },
      { k: 'Collect', title: 'Payment', text: 'Invoice and payment reminders, then a review request.', ch: ['WhatsApp', 'Voice'] },
    ],
    call: { who: 'Anjali', ctx: 'Website enquiry · interior design', lines: [['AI', 'Hi Anjali, this is Sana from Urban Nest Interiors. You asked about a 3BHK interior quote?'], ['Anjali', 'Yes, we move in next month.'], ['AI', 'Got it. Can our designer visit on Tuesday evening to take measurements?'], ['Anjali', 'Tuesday 6 works.']], outcome: 'Site visit · Tue 6:00 PM' },
    track: ['Response time', 'Enquiry-to-meeting rate', 'Win rate', 'Days to payment'],
  },
  {
    slug: 'ecommerce', name: 'Online & retail brands', short: 'Confirm orders, recover carts, update every delivery.',
    hero: 'Every order confirmed.', heroEm: 'Every customer updated.',
    sub: 'D2C brands, retailers and distributors use ReachPeak to confirm orders, recover abandoned carts and keep customers updated from order to delivery.',
    pain: 'Online shoppers want quick answers and clear updates. Unconfirmed orders get refused at the door, and abandoned carts quietly add up.',
    journeys: [
      { k: 'Confirm', title: 'New order', text: 'Confirmation call or message, with the real address.', ch: ['Voice', 'WhatsApp'] },
      { k: 'Recover', title: 'Cart left', text: 'A friendly reminder by WhatsApp, or a call for high-value carts.', ch: ['WhatsApp', 'Voice'] },
      { k: 'Update', title: 'Shipping', text: 'Order, dispatch and delivery updates on WhatsApp.', ch: ['WhatsApp'] },
      { k: 'Re-order', title: 'After delivery', text: 'Reviews, returns help and re-order reminders.', ch: ['WhatsApp'] },
    ],
    call: { who: 'Kavya', ctx: 'New COD order · ₹1,499', lines: [['AI', 'Hi Kavya, this is Riya from Urban Threads. Just confirming your order of the cotton kurta set, ₹1,499 cash on delivery?'], ['Kavya', 'Yes, that’s right.'], ['AI', 'Perfect. Could you share a landmark near your address so delivery is smooth?'], ['Kavya', 'Opposite the SBI ATM.']], outcome: 'Order confirmed · address updated' },
    track: ['Confirmed orders %', 'Return-to-origin rate', 'Carts recovered', 'Repeat-purchase rate'],
  },
];

export const STAGES = [
  { k: '01', title: 'Respond', text: 'Every new lead gets a call within 60 seconds, day or night.', ch: ['Voice'] as Channel[] },
  { k: '02', title: 'Qualify', text: 'Need, budget and timeline captured. Hot leads go straight to your team.', ch: ['Voice'] as Channel[] },
  { k: '03', title: 'Book', text: 'Appointments, site visits, demos and classes, confirmed on WhatsApp.', ch: ['Voice', 'WhatsApp'] as Channel[] },
  { k: '04', title: 'Remind', text: 'Fewer no-shows. Can’t make it? Rescheduled on the spot.', ch: ['Voice', 'WhatsApp'] as Channel[] },
  { k: '05', title: 'Collect', text: 'Polite payment, renewal and document reminders, with links.', ch: ['WhatsApp', 'Voice'] as Channel[] },
  { k: '06', title: 'Re-engage', text: 'Updates, feedback and offers that bring customers back.', ch: ['WhatsApp'] as Channel[] },
];

export const INTEGRATIONS = ['Website forms', 'REST API', 'Webhooks', 'Zapier', 'CSV upload', 'Shopify', 'WooCommerce', 'PeakCart', 'HubSpot', 'LeadSquared'];
