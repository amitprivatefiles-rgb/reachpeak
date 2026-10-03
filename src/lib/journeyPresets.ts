/**
 * Journey Presets — code constants that the UI instantiates
 * with user-chosen templates and delays.
 *
 * Each preset defines:
 *  - name, description, trigger_event, exit_on_events
 *  - steps (with placeholder template_id slots)
 *  - payload_fields (known payload keys for variable binding dropdowns)
 */

export interface JourneyStep {
  type: 'wait' | 'send_template' | 'send_buttons' | 'condition' | 'set_tag' | 'callback' | 'end';
  // wait
  minutes?: number;
  /** wait until a time from the event (e.g. 'payload.appointment_at') + offset_minutes (negative = before) */
  until_field?: string;
  offset_minutes?: number;
  // send_template / send_buttons
  template_id?: string;
  variable_bindings?: Record<string, string>; // e.g. { "1": "contact.name", "2": "payload.cart_total" }
  header_media?: string | null;
  // send_buttons
  on_reply?: Record<string, JourneyStep[]>;
  reply_timeout_hours?: number;
  on_timeout?: JourneyStep[];
  // condition
  field?: string;
  op?: '>=' | '<=' | '==' | '!=' | 'contains';
  value?: string | number;
  then?: JourneyStep[];
  else?: JourneyStep[];
  // set_tag
  tag?: string;
  // callback
  decision?: string;
  // label for UI
  label?: string;
}

export interface JourneyPreset {
  key: string;
  name: string;
  description: string;
  trigger_event: string;
  exit_on_events: string[];
  steps: JourneyStep[];
  /** Known payload fields for variable binding dropdowns */
  payload_fields: string[];
  /** Known contact fields */
  contact_fields: string[];
  /** Optional feature this preset needs (see lib/businessTypes FEATURES); omitted = every business */
  feature?: string;
  /** Default trigger filters saved with the journey (e.g. { outcome: ['booked'] }) */
  trigger_filters?: Record<string, any>;
}

// ─── Payload fields shared across presets ───
const CONTACT_FIELDS = ['contact.name', 'contact.phone_number', 'contact.city', 'contact.state'];

// Master catalog of every field a store event can provide — used so the
// variable-mapping dropdown always offers all store data, and so custom
// (auto-discovered) triggers have rich mapping options.
export const MASTER_BINDING_FIELDS: string[] = [
  'contact.name', 'contact.first_name', 'contact.phone_number', 'contact.email', 'contact.city', 'contact.state',
  'payload.order_id', 'payload.order_number', 'payload.total', 'payload.total_display', 'payload.currency',
  'payload.items', 'payload.product_name', 'payload.payment_method',
  'payload.cart_total', 'payload.cart_value', 'payload.checkout_url', 'payload.cart_url',
  'payload.discount', 'payload.discount_code', 'payload.tracking_url', 'payload.tracking_number',
  'payload.carrier', 'payload.eta', 'payload.store_name', 'payload.refund_amount',
  'payload.address_city', 'payload.address_pincode', 'payload.email', 'payload.pay_url',
];

// ─── 1. Abandoned Cart ───
export const PRESET_ABANDONED_CART: JourneyPreset = {
  key: 'abandoned_cart',
  name: 'Abandoned Cart Recovery',
  description: 'Remind customers who abandoned their cart. Stops automatically when they complete the order.',
  trigger_event: 'cart_abandoned',
  feature: 'store_journeys',
  exit_on_events: ['order_created', 'order_paid'],
  steps: [
    { type: 'wait', minutes: 30, label: 'Wait 30 minutes' },
    {
      type: 'send_template',
      template_id: '',  // user fills
      variable_bindings: { '1': 'contact.name', '2': 'payload.cart_total', '3': 'payload.checkout_url' },
      label: 'Send cart reminder',
    },
    { type: 'wait', minutes: 240, label: 'Wait 4 hours' },
    {
      type: 'send_template',
      template_id: '',  // user fills — nudge/discount
      variable_bindings: { '1': 'contact.name', '2': 'payload.cart_total' },
      label: 'Send nudge/discount',
    },
    { type: 'end' },
  ],
  payload_fields: ['payload.cart_total', 'payload.currency', 'payload.checkout_url', 'payload.items'],
  contact_fields: CONTACT_FIELDS,
};

// ─── 2. Order Notifications ───
// Three mini-journeys (user instantiates one or more)
export const PRESET_ORDER_CONFIRM: JourneyPreset = {
  key: 'order_notifications',
  name: 'Order Confirmation',
  description: 'Send order confirmation when an order is created.',
  trigger_event: 'order_created',
  feature: 'store_journeys',
  exit_on_events: [],
  steps: [
    {
      type: 'send_template',
      template_id: '',
      variable_bindings: { '1': 'contact.name', '2': 'payload.order_id', '3': 'payload.total' },
      label: 'Send order confirmation',
    },
    { type: 'end' },
  ],
  payload_fields: ['payload.order_id', 'payload.total', 'payload.currency', 'payload.items', 'payload.payment_method'],
  contact_fields: CONTACT_FIELDS,
};

export const PRESET_ORDER_SHIPPED: JourneyPreset = {
  key: 'order_notifications',
  name: 'Order Shipped',
  description: 'Notify customer when their order ships.',
  trigger_event: 'order_shipped',
  feature: 'store_journeys',
  exit_on_events: ['order_returned', 'order_cancelled'],
  steps: [
    {
      type: 'send_template',
      template_id: '',
      variable_bindings: { '1': 'contact.name', '2': 'payload.order_id', '3': 'payload.tracking_url' },
      label: 'Send shipping notification',
    },
    { type: 'end' },
  ],
  payload_fields: ['payload.order_id', 'payload.tracking_url', 'payload.carrier'],
  contact_fields: CONTACT_FIELDS,
};

export const PRESET_ORDER_DELIVERED: JourneyPreset = {
  key: 'order_notifications',
  name: 'Review Request',
  description: 'Ask for a review 72 hours after delivery.',
  trigger_event: 'order_delivered',
  feature: 'store_journeys',
  exit_on_events: ['order_returned', 'order_refunded'],
  steps: [
    { type: 'wait', minutes: 4320, label: 'Wait 72 hours' },  // 72h = 4320m
    {
      type: 'send_template',
      template_id: '',
      variable_bindings: { '1': 'contact.name', '2': 'payload.order_id' },
      label: 'Send review request',
    },
    { type: 'end' },
  ],
  payload_fields: ['payload.order_id'],
  contact_fields: CONTACT_FIELDS,
};

// ─── 3. COD Confirmation ───
export const PRESET_COD_CONFIRM: JourneyPreset = {
  key: 'cod_confirm',
  name: 'COD Confirmation',
  description: 'Ask COD customers to confirm their order via button reply. Sends decision to your store callback.',
  trigger_event: 'cod_pending',
  feature: 'store_journeys',
  exit_on_events: ['order_confirmed', 'order_cancelled', 'order_paid'],
  steps: [
    {
      type: 'send_buttons',
      template_id: '',  // user fills — must be a template with quick-reply buttons
      variable_bindings: { '1': 'payload.order_id', '2': 'payload.total' },
      on_reply: {
        'CONFIRM': [
          { type: 'callback', decision: 'confirmed' },
          { type: 'end' },
        ],
        'CANCEL': [
          { type: 'callback', decision: 'cancelled' },
          { type: 'end' },
        ],
      },
      reply_timeout_hours: 24,
      on_timeout: [
        {
          type: 'send_template',
          template_id: '',  // user fills — timeout reminder
          variable_bindings: { '1': 'contact.name', '2': 'payload.order_id' },
          label: 'Send timeout reminder',
        },
        { type: 'end' },
      ],
      label: 'Send COD confirm/cancel buttons',
    },
  ],
  payload_fields: ['payload.order_id', 'payload.total', 'payload.address_city', 'payload.address_pincode'],
  contact_fields: CONTACT_FIELDS,
};

// ─── 4. Welcome ───
export const PRESET_WELCOME: JourneyPreset = {
  key: 'welcome',
  name: 'Welcome Message',
  description: 'Send a welcome template when a new customer is created.',
  trigger_event: 'customer_created',
  exit_on_events: [],
  steps: [
    {
      type: 'send_template',
      template_id: '',
      variable_bindings: { '1': 'contact.name' },
      label: 'Send welcome message',
    },
    { type: 'end' },
  ],
  payload_fields: ['payload.email'],
  contact_fields: CONTACT_FIELDS,
};

// ─── 5. Prepay Nudge (OrderGuard) ───
export const PRESET_PREPAY_NUDGE: JourneyPreset = {
  key: 'prepay_nudge',
  name: 'Prepay Nudge',
  description: 'Nudge high-risk COD orders to switch to prepaid payment. Requires a payment link in the order payload.',
  trigger_event: 'prepay_nudge',
  feature: 'store_journeys',
  exit_on_events: ['order_paid'],
  steps: [
    {
      type: 'send_template',
      template_id: '',  // user fills — must include pay_url variable
      variable_bindings: { '1': 'contact.name', '2': 'payload.order_id', '3': 'payload.total', '4': 'payload.pay_url' },
      label: 'Send prepay nudge with payment link',
    },
    { type: 'end' },
  ],
  payload_fields: ['payload.order_id', 'payload.total', 'payload.pay_url', 'payload.discount', 'payload.risk_score', 'payload.risk_band'],
  contact_fields: CONTACT_FIELDS,
};

/** All presets for the UI preset picker */

// ─── Leads, appointments, payments (non-e-commerce businesses) ───
const LEAD_FIELDS = ['payload.name', 'payload.email', 'payload.source', 'payload.interest'];
const APPT_FIELDS = ['payload.appointment_at', 'payload.appointment_display', 'payload.service', 'payload.staff', 'payload.location', 'payload.booking_url'];
const PAY_FIELDS = ['payload.amount', 'payload.amount_display', 'payload.due_date', 'payload.due_display', 'payload.invoice_number', 'payload.pay_url', 'payload.renewal_date', 'payload.plan_name'];
const CALL_FIELDS = ['payload.outcome', 'payload.summary', 'payload.when', 'payload.agent_name', 'payload.business_name'];

export const PRESET_LEAD_FOLLOWUP: JourneyPreset = {
  key: 'lead_followup',
  name: 'New Lead: Instant Reply + Follow-up',
  description: 'Reply on WhatsApp the moment a lead comes in (form, ad, API or added by hand), then follow up next day. Stops if they book.',
  trigger_event: 'lead_created',
  exit_on_events: ['appointment_booked'],
  feature: 'leads',
  steps: [
    { type: 'send_template', template_id: '', variable_bindings: { '1': 'contact.name' }, label: 'Instant reply' },
    { type: 'wait', minutes: 1440, label: 'Wait 1 day' },
    { type: 'send_template', template_id: '', variable_bindings: { '1': 'contact.name' }, label: 'Follow-up' },
    { type: 'end' },
  ],
  payload_fields: LEAD_FIELDS,
  contact_fields: CONTACT_FIELDS,
};

export const PRESET_APPOINTMENT: JourneyPreset = {
  key: 'appointment_confirm',
  name: 'Appointment: Confirm + Reminders',
  description: 'Confirm the booking right away, then remind 24 hours and 2 hours before the appointment (payload.appointment_at). Stops if it is missed or completed.',
  trigger_event: 'appointment_booked',
  exit_on_events: ['appointment_missed', 'appointment_completed'],
  feature: 'appointment_journeys',
  steps: [
    { type: 'send_template', template_id: '', variable_bindings: { '1': 'contact.name', '2': 'payload.appointment_display' }, label: 'Booking confirmation' },
    { type: 'wait', minutes: 60, until_field: 'payload.appointment_at', offset_minutes: -1440, label: 'Wait until 24 h before' },
    { type: 'send_template', template_id: '', variable_bindings: { '1': 'contact.name', '2': 'payload.appointment_display' }, label: 'Reminder (1 day before)' },
    { type: 'wait', minutes: 60, until_field: 'payload.appointment_at', offset_minutes: -120, label: 'Wait until 2 h before' },
    { type: 'send_template', template_id: '', variable_bindings: { '1': 'contact.name', '2': 'payload.appointment_display' }, label: 'Reminder (2 hours before)' },
    { type: 'end' },
  ],
  payload_fields: APPT_FIELDS,
  contact_fields: CONTACT_FIELDS,
};

export const PRESET_APPOINTMENT_MISSED: JourneyPreset = {
  key: 'appointment_missed',
  name: 'Missed Appointment: Reschedule',
  description: 'When someone misses an appointment, offer to reschedule, and nudge again 2 days later. Stops if they book again.',
  trigger_event: 'appointment_missed',
  exit_on_events: ['appointment_booked'],
  feature: 'appointment_journeys',
  steps: [
    { type: 'wait', minutes: 30, label: 'Wait 30 minutes' },
    { type: 'send_template', template_id: '', variable_bindings: { '1': 'contact.name' }, label: 'Reschedule offer' },
    { type: 'wait', minutes: 2880, label: 'Wait 2 days' },
    { type: 'send_template', template_id: '', variable_bindings: { '1': 'contact.name' }, label: 'Gentle nudge' },
    { type: 'end' },
  ],
  payload_fields: APPT_FIELDS,
  contact_fields: CONTACT_FIELDS,
};

export const PRESET_REVIEW_REQUEST: JourneyPreset = {
  key: 'review_request',
  name: 'After Visit: Feedback / Review',
  description: 'A few hours after an appointment is completed, thank the customer and ask for feedback or a Google review.',
  trigger_event: 'appointment_completed',
  exit_on_events: [],
  feature: 'appointment_journeys',
  steps: [
    { type: 'wait', minutes: 180, label: 'Wait 3 hours' },
    { type: 'send_template', template_id: '', variable_bindings: { '1': 'contact.name' }, label: 'Thank you + review link' },
    { type: 'end' },
  ],
  payload_fields: APPT_FIELDS,
  contact_fields: CONTACT_FIELDS,
};

export const PRESET_PAYMENT_DUE: JourneyPreset = {
  key: 'payment_reminder',
  name: 'Payment Due: Reminders',
  description: 'Fee, EMI, invoice or premium due (payload.due_date): remind 3 days before and on the due date.',
  trigger_event: 'payment_due',
  exit_on_events: [],
  feature: 'payment_journeys',
  steps: [
    { type: 'wait', minutes: 60, until_field: 'payload.due_date', offset_minutes: -4320, label: 'Wait until 3 days before' },
    { type: 'send_template', template_id: '', variable_bindings: { '1': 'contact.name', '2': 'payload.amount_display', '3': 'payload.due_display' }, label: 'Reminder (3 days before)' },
    { type: 'wait', minutes: 60, until_field: 'payload.due_date', offset_minutes: 540, label: 'Wait until due date, 9 AM' },
    { type: 'send_template', template_id: '', variable_bindings: { '1': 'contact.name', '2': 'payload.amount_display', '3': 'payload.pay_url' }, label: 'Due today' },
    { type: 'end' },
  ],
  payload_fields: PAY_FIELDS,
  contact_fields: CONTACT_FIELDS,
};

export const PRESET_PAYMENT_OVERDUE: JourneyPreset = {
  key: 'payment_reminder',
  name: 'Payment Overdue: Polite Follow-up',
  description: 'When a payment is overdue, send a polite reminder, and another after 3 days.',
  trigger_event: 'payment_overdue',
  exit_on_events: [],
  feature: 'payment_journeys',
  steps: [
    { type: 'send_template', template_id: '', variable_bindings: { '1': 'contact.name', '2': 'payload.amount_display', '3': 'payload.pay_url' }, label: 'Overdue reminder' },
    { type: 'wait', minutes: 4320, label: 'Wait 3 days' },
    { type: 'send_template', template_id: '', variable_bindings: { '1': 'contact.name', '2': 'payload.amount_display', '3': 'payload.pay_url' }, label: 'Second reminder' },
    { type: 'end' },
  ],
  payload_fields: PAY_FIELDS,
  contact_fields: CONTACT_FIELDS,
};

export const PRESET_RENEWAL: JourneyPreset = {
  key: 'renewal_reminder',
  name: 'Renewal Reminders',
  description: 'Membership, policy, subscription or course renewal (payload.renewal_date): remind 7 days and 1 day before.',
  trigger_event: 'renewal_due',
  exit_on_events: [],
  feature: 'payment_journeys',
  steps: [
    { type: 'wait', minutes: 60, until_field: 'payload.renewal_date', offset_minutes: -10080, label: 'Wait until 7 days before' },
    { type: 'send_template', template_id: '', variable_bindings: { '1': 'contact.name', '2': 'payload.plan_name' }, label: 'Renewal reminder (7 days)' },
    { type: 'wait', minutes: 60, until_field: 'payload.renewal_date', offset_minutes: -1440, label: 'Wait until 1 day before' },
    { type: 'send_template', template_id: '', variable_bindings: { '1': 'contact.name', '2': 'payload.plan_name' }, label: 'Renewal reminder (1 day)' },
    { type: 'end' },
  ],
  payload_fields: PAY_FIELDS,
  contact_fields: CONTACT_FIELDS,
};

export const PRESET_AFTER_CALL_BOOKED: JourneyPreset = {
  key: 'after_call',
  name: 'After AI Call: Booking Confirmation',
  description: 'When an AI call ends with a booking or confirmation, send the details on WhatsApp right away.',
  trigger_event: 'call_completed',
  exit_on_events: [],
  trigger_filters: { outcome: ['booked', 'confirmed', 'rescheduled'] },
  steps: [
    { type: 'send_template', template_id: '', variable_bindings: { '1': 'contact.name', '2': 'payload.when' }, label: 'Booking details on WhatsApp' },
    { type: 'end' },
  ],
  payload_fields: CALL_FIELDS,
  contact_fields: CONTACT_FIELDS,
};

export const PRESET_AFTER_CALL_FOLLOWUP: JourneyPreset = {
  key: 'after_call',
  name: 'After AI Call: Callback / Team Follow-up',
  description: 'When the customer asked for a callback or a human, confirm on WhatsApp that the team will reach out.',
  trigger_event: 'call_completed',
  exit_on_events: [],
  trigger_filters: { outcome: ['callback', 'human_requested'] },
  steps: [
    { type: 'send_template', template_id: '', variable_bindings: { '1': 'contact.name', '2': 'payload.when' }, label: 'We will call you back' },
    { type: 'end' },
  ],
  payload_fields: CALL_FIELDS,
  contact_fields: CONTACT_FIELDS,
};

export const ALL_PRESETS: JourneyPreset[] = [
  PRESET_ABANDONED_CART,
  PRESET_ORDER_CONFIRM,
  PRESET_ORDER_SHIPPED,
  PRESET_ORDER_DELIVERED,
  PRESET_COD_CONFIRM,
  PRESET_WELCOME,
  PRESET_PREPAY_NUDGE,
  PRESET_LEAD_FOLLOWUP,
  PRESET_APPOINTMENT,
  PRESET_APPOINTMENT_MISSED,
  PRESET_REVIEW_REQUEST,
  PRESET_PAYMENT_DUE,
  PRESET_PAYMENT_OVERDUE,
  PRESET_RENEWAL,
  PRESET_AFTER_CALL_BOOKED,
  PRESET_AFTER_CALL_FOLLOWUP,
];
