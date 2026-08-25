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
export const ALL_PRESETS: JourneyPreset[] = [
  PRESET_ABANDONED_CART,
  PRESET_ORDER_CONFIRM,
  PRESET_ORDER_SHIPPED,
  PRESET_ORDER_DELIVERED,
  PRESET_COD_CONFIRM,
  PRESET_WELCOME,
  PRESET_PREPAY_NUDGE,
];
