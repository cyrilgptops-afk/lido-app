/**
 * Lido Connect — NLP Support Bot
 * Version: 1.0.0
 *
 * Demonstrates NLP-driven intent handling:
 *  - context.intent   → the intent key resolved by the runtime (keyword match or NLP)
 *  - context.entities → extracted named entities e.g. [{ entity: 'order_id', value: 'ORD-123' }]
 *  - helpers.utils.getEntity() / hasEntity() — typed entity accessors
 *  - helpers.utils.formatDate() / formatCurrency() — formatting helpers
 *  - helpers.db.getCurrentUser() — current authenticated user from DB
 *  - helpers.db.select() — org-scoped DB queries
 *  - helpers.form / helpers.table — rich response builders
 *  - helpers.suggestions.generate() — context-aware suggestion chips
 *
 * Intents handled:
 *  init            → greeting (only on conversation start, never via message routing)
 *  order_status    → look up an order by entity or prompt for order ID
 *  track_shipment  → shipment tracking with table display
 *  request_refund  → refund request form
 *  billing_inquiry → billing / invoice table
 *  product_inquiry → product detail lookup
 *  technical       → bug report / feature request form
 *  escalate        → hand off to human agent
 *  *               → fallback for unrecognised intents
 */

module.exports = {
  name: 'NLP Support Bot',
  version: '1.0.0',

  /** Optional — runs once when the script is first loaded into the VM */
  async initialize(context) {
    console.log(`[NLP Support Bot] initialised for user ${context.userId}`);
  },

  /**
   * Keyword map — used by the Lido Connect runtime for intent detection.
   *
   * The runtime tests each intent's phrases against the user message.
   * Longest phrases are tested first to avoid partial-word shadowing.
   * Intents that should only be triggered by entity extraction (no
   * keyword shortcut) are omitted from this map.
   */
  keywords: {
    // --- order & shipping ---
    order_status:   [
      'where is my order', 'order status', 'check order', 'my order',
      'order update', 'order number', 'order id',
    ],
    track_shipment: [
      'track shipment', 'track my package', 'track package',
      'shipping update', 'where is my package', 'delivery status',
    ],
    request_refund: [
      'refund', 'request refund', 'get my money back', 'return',
      'return item', 'cancel order', 'money back', 'reimburse',
    ],
    // --- billing ---
    billing_inquiry: [
      'billing', 'invoice', 'payment', 'charge', 'subscription',
      'payment history', 'billing history', 'my invoices',
    ],
    // --- product ---
    product_inquiry: [
      'product', 'item', 'specification', 'specs', 'compare',
      'review', 'product details', 'tell me about',
    ],
    // --- technical ---
    technical: [
      'bug', 'error', 'issue', 'not working', 'broken', 'crash',
      'feature request', 'feedback', 'problem', 'glitch',
    ],
    // --- escalation ---
    escalate: [
      'talk to agent', 'human agent', 'live agent', 'speak to someone',
      'real person', 'escalate', 'connect me',
    ],
  },

  /**
   * Intent handlers
   * ─────────────────────────────────────────────────────────────────────────
   * Each handler receives:
   *   context  — { userId, organizationId, conversationId, messageId,
   *                userMessage, intent, entities }
   *   helpers  — { db, form, table, suggestions, utils }
   *
   * Return a BotResponse: { message, suggestions?, form?, table?, actions?, metadata? }
   */
  intents: {

    // ── Greeting ─────────────────────────────────────────────────────────
    /**
     * `init` fires only once — when a new conversation is created.
     * It is never reachable via user message routing.
     */
    init: async (context, helpers) => {
      const user = await helpers.db.getCurrentUser();
      const name = user
        ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email
        : 'there';

      return {
        message: `👋 Hi ${name}! I'm your NLP-powered support assistant.\n\nI understand natural language — just describe what you need and I'll help right away.`,
        suggestions: [
          'Check order status',
          'Track my shipment',
          'Billing & invoices',
          'Report a problem',
        ],
        metadata: { intent: 'init', userId: context.userId },
      };
    },

    // ── Order status ──────────────────────────────────────────────────────
    /**
     * NLP entities used:
     *   order_id  — e.g. "ORD-12345"
     *   order_ref — synonym entity
     */
    order_status: async (context, helpers) => {
      // Try to pull an order_id directly from extracted entities
      const orderId =
        helpers.utils.getEntity('order_id') ||
        helpers.utils.getEntity('order_ref');

      if (!orderId) {
        // NLP found the intent but no order entity — ask the user
        return {
          message: "I can check your order status. What's your order number?",
          suggestions: ['ORD-12345 (example)', 'I don\'t have it', 'Cancel'],
          metadata: { awaiting_entity: 'order_id' },
        };
      }

      // Query DB for the order (adjust table name to your schema)
      const orders = await helpers.db.select(
        'orders',
        ['id', 'order_number', 'status', 'total_amount', 'created_at', 'updated_at'],
        { order_number: orderId },
        { limit: 1 },
      ).catch(() => []);

      if (!orders.length) {
        return {
          message: `I couldn't find order **${helpers.utils.sanitize(orderId)}**. Please double-check the order number.`,
          suggestions: ['Try another order', 'Talk to an agent', 'Go back'],
        };
      }

      const order = orders[0];
      const statusEmoji = {
        pending:    '🕐',
        processing: '⚙️',
        shipped:    '📦',
        delivered:  '✅',
        cancelled:  '❌',
      }[order.status] ?? '📋';

      const statusTable = helpers.table
        .setTitle(`Order ${order.order_number}`)
        .addColumn('field',  'Field',  'text')
        .addColumn('value',  'Value',  'text')
        .setRows([
          { field: 'Order #',    value: order.order_number },
          { field: 'Status',     value: `${statusEmoji} ${order.status}` },
          { field: 'Total',      value: helpers.utils.formatCurrency(order.total_amount ?? 0) },
          { field: 'Placed',     value: helpers.utils.formatDate(order.created_at, 'long') },
          { field: 'Updated',    value: helpers.utils.formatDate(order.updated_at, 'relative') },
        ])
        .build();

      return {
        message: `Here's the status for order **${order.order_number}**:`,
        table: statusTable,
        suggestions: ['Track shipment', 'Request refund', 'Contact support'],
        metadata: { orderId: order.id, orderNumber: order.order_number },
      };
    },

    // ── Track shipment ────────────────────────────────────────────────────
    /**
     * NLP entities used:
     *   tracking_number — courier tracking code
     *   carrier         — e.g. "FedEx", "UPS"
     */
    track_shipment: async (context, helpers) => {
      const trackingNumber = helpers.utils.getEntity('tracking_number');
      const carrier        = helpers.utils.getEntity('carrier');

      if (!trackingNumber) {
        return {
          message: "I can track your shipment. Please provide your tracking number.",
          suggestions: ['I don\'t have it', 'Check order status instead', 'Cancel'],
          metadata: { awaiting_entity: 'tracking_number' },
        };
      }

      // Mock shipment events — replace with a real carrier API call
      const events = [
        { date: new Date(Date.now() - 2 * 86400000).toISOString(), location: 'Chicago, IL',    status: 'In Transit' },
        { date: new Date(Date.now() - 1 * 86400000).toISOString(), location: 'Columbus, OH',   status: 'Out for Delivery' },
        { date: new Date().toISOString(),                           location: 'New York, NY',   status: 'Delivered' },
      ];

      const trackingTable = helpers.table
        .setTitle(`Tracking: ${helpers.utils.sanitize(trackingNumber)}`)
        .addColumn('date',     'Date',     'date')
        .addColumn('location', 'Location', 'text')
        .addColumn('status',   'Status',   'badge')
        .setRows(
          events.map((e) => ({
            date:     helpers.utils.formatDate(e.date, 'long'),
            location: e.location,
            status:   e.status,
          }))
        )
        .build();

      const latest = events[events.length - 1];
      return {
        message: `📦 Latest update for **${helpers.utils.sanitize(trackingNumber)}** (${carrier ?? 'carrier unknown'}): **${latest.status}** at ${latest.location}.`,
        table: trackingTable,
        suggestions: ['Delivered — great!', 'Report missing package', 'Talk to an agent'],
        metadata: { trackingNumber, carrier },
      };
    },

    // ── Refund request ────────────────────────────────────────────────────
    /**
     * NLP entities used:
     *   order_id — pre-fills the form if extracted
     *   reason   — free-text reason phrase
     */
    request_refund: async (context, helpers) => {
      const orderId = helpers.utils.getEntity('order_id') || '';
      const reason  = helpers.utils.getEntity('reason')   || '';

      const refundForm = helpers.form
        .setTitle('Request a Refund')
        .addTextField('order_number', 'Order Number', {
          defaultValue: helpers.utils.sanitize(orderId),
          required: true,
          placeholder: 'ORD-12345',
        })
        .addSelectField('reason_type', 'Reason', [
          { label: 'Item not received',       value: 'not_received' },
          { label: 'Item damaged / defective', value: 'damaged' },
          { label: 'Wrong item sent',          value: 'wrong_item' },
          { label: 'Changed my mind',          value: 'changed_mind' },
          { label: 'Other',                    value: 'other' },
        ])
        .addTextArea('reason_detail', 'Additional Details', {
          required: false,
          defaultValue: helpers.utils.sanitize(reason),
          placeholder: 'Optional — describe the issue…',
        })
        .addEmailField('contact_email', 'Confirm Contact Email', {
          required: true,
          placeholder: 'your@email.com',
        })
        .setSubmitLabel('Submit Refund Request')
        .setCancelLabel('Cancel')
        .build();

      return {
        message: '💳 Fill out the form below and we\'ll process your refund within 3-5 business days.',
        form: refundForm,
        suggestions: ['Cancel'],
        metadata: {
          intent: 'request_refund',
          prefilled: { orderId, reason },
        },
      };
    },

    // ── Billing inquiry ───────────────────────────────────────────────────
    billing_inquiry: async (context, helpers) => {
      const user = await helpers.db.getCurrentUser();
      if (!user) {
        return {
          message: 'I couldn\'t load your billing information right now. Please try again.',
          suggestions: ['Try again', 'Talk to an agent'],
        };
      }

      // Replace with a real query once an `invoices` table is available
      const mockInvoices = [
        { invoice: 'INV-001', date: '2026-02-01', amount: 49.00,  status: 'Paid' },
        { invoice: 'INV-002', date: '2026-01-01', amount: 49.00,  status: 'Paid' },
        { invoice: 'INV-003', date: '2025-12-01', amount: 29.00,  status: 'Paid' },
      ];

      const billingTable = helpers.table
        .setTitle('Billing History')
        .addColumn('invoice', 'Invoice',  'text')
        .addColumn('date',    'Date',     'date')
        .addColumn('amount',  'Amount',   'number')
        .addColumn('status',  'Status',   'badge')
        .setRows(
          mockInvoices.map((inv) => ({
            invoice: inv.invoice,
            date:    helpers.utils.formatDate(inv.date, 'short'),
            amount:  helpers.utils.formatCurrency(inv.amount),
            status:  inv.status,
          }))
        )
        .build();

      return {
        message: `Here's your billing history, ${user.first_name || 'there'}:`,
        table: billingTable,
        suggestions: [
          'Download invoice',
          'Update payment method',
          'Cancel subscription',
        ],
        metadata: { intent: 'billing_inquiry' },
      };
    },

    // ── Product inquiry ───────────────────────────────────────────────────
    /**
     * NLP entities used:
     *   product_name — the product the user asked about
     *   product_sku  — exact SKU if extracted
     */
    product_inquiry: async (context, helpers) => {
      const productName = helpers.utils.getEntity('product_name');
      const productSku  = helpers.utils.getEntity('product_sku');

      if (!productName && !productSku) {
        return {
          message: 'Which product are you asking about? You can describe it or give me the product name / SKU.',
          suggestions: ['Browse products', 'Cancel'],
          metadata: { awaiting_entity: 'product_name' },
        };
      }

      const label = productName
        ? helpers.utils.sanitize(productName)
        : productSku;

      return {
        message: `Let me look up **${label}** for you.`,
        actions: [
          { type: 'button', label: 'View Specifications', value: `product_specs:${label}` },
          { type: 'button', label: 'Compare Products',    value: `product_compare:${label}` },
          { type: 'button', label: 'Read Reviews',        value: `product_reviews:${label}` },
          { type: 'button', label: 'Add to Cart',         value: `product_cart:${label}` },
        ],
        suggestions: ['View specifications', 'Compare products', 'Back to menu'],
        metadata: { productName, productSku },
      };
    },

    // ── Technical support ─────────────────────────────────────────────────
    /**
     * NLP entities used:
     *   error_code — e.g. "404", "500", "E_CONN_REFUSED"
     *   feature    — feature name for feature requests
     */
    technical: async (context, helpers) => {
      const errorCode = helpers.utils.getEntity('error_code');
      const feature   = helpers.utils.getEntity('feature');
      const isFeatureRequest =
        context.userMessage.toLowerCase().includes('feature') ||
        context.userMessage.toLowerCase().includes('request') ||
        !!feature;

      if (isFeatureRequest) {
        const featureForm = helpers.form
          .setTitle('Feature Request')
          .addTextField('title', 'Feature Title', {
            required: true,
            defaultValue: feature ? helpers.utils.sanitize(feature) : '',
            placeholder: 'Short description of the feature',
          })
          .addSelectField('priority', 'Priority', [
            { label: 'Nice to have',  value: 'low' },
            { label: 'Important',     value: 'medium' },
            { label: 'Critical',      value: 'high' },
          ])
          .addTextArea('description', 'Describe the feature', {
            required: true,
            placeholder: 'What should it do? How would you use it?',
          })
          .addTextArea('use_case', 'Use Case / Business Impact', {
            required: false,
            placeholder: 'Why is this valuable to you?',
          })
          .setSubmitLabel('Submit Request')
          .build();

        return {
          message: '💡 Great idea! Tell us about the feature you\'d like to see:',
          form: featureForm,
          suggestions: ['Cancel'],
          metadata: { type: 'feature_request', feature },
        };
      }

      const bugForm = helpers.form
        .setTitle('Report a Problem')
        .addTextField('title', 'Issue Summary', {
          required: true,
          placeholder: 'One-line description of the problem',
        })
        .addSelectField('severity', 'Severity', [
          { label: 'Low — minor inconvenience',     value: 'low' },
          { label: 'Medium — affects my work',      value: 'medium' },
          { label: 'High — can\'t use the product', value: 'high' },
          { label: 'Critical — data loss / breach', value: 'critical' },
        ])
        .addTextArea('description', 'Steps to Reproduce', {
          required: true,
          placeholder: '1. Go to…\n2. Click…\n3. See error',
        })
        .addTextField('error_code', 'Error Code (if any)', {
          defaultValue: errorCode ? helpers.utils.sanitize(errorCode) : '',
          required: false,
          placeholder: 'e.g. 500, E_NOT_FOUND',
        })
        .addSelectField('browser', 'Browser / Platform', [
          { label: 'Chrome',  value: 'chrome' },
          { label: 'Firefox', value: 'firefox' },
          { label: 'Safari',  value: 'safari' },
          { label: 'Mobile',  value: 'mobile' },
          { label: 'Other',   value: 'other' },
        ])
        .setSubmitLabel('Submit Bug Report')
        .build();

      return {
        message: '🐛 Sorry to hear you\'re having trouble. Please fill in the details below so our team can investigate:',
        form: bugForm,
        suggestions: ['Cancel', 'Talk to an agent instead'],
        metadata: { type: 'bug_report', errorCode },
      };
    },

    // ── Escalate to human agent ───────────────────────────────────────────
    escalate: async (context, helpers) => {
      const user = await helpers.db.getCurrentUser();
      const name = user
        ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email
        : 'there';

      return {
        message: `Connecting you to a live agent, ${name}. Please hold — average wait time is under 2 minutes.`,
        actions: [
          { type: 'escalate', label: 'Connect to Agent', value: 'human_handoff' },
          { type: 'button',   label: 'Cancel',            value: 'cancel_escalation' },
        ],
        suggestions: ['Cancel — I\'ll wait', 'Leave a callback number'],
        metadata: {
          intent: 'escalate',
          userId: context.userId,
          conversationId: context.conversationId,
          timestamp: new Date().toISOString(),
        },
      };
    },

    // ── Fallback ──────────────────────────────────────────────────────────
    /**
     * Triggered when no intent keyword matched AND the NLP model
     * confidence was below threshold, or the intent key is unknown.
     */
    '*': async (context, helpers) => {
      const raw = context.userMessage
        ? helpers.utils.truncate(helpers.utils.sanitize(context.userMessage), 80)
        : '';

      const quoteStr = raw ? ` ("${raw}")` : '';

      return {
        message: `I didn't quite understand your message${quoteStr}. Here are some things I can help with:`,
        actions: [
          { type: 'button', label: '📦 Order Status',     value: 'order_status' },
          { type: 'button', label: '🚚 Track Shipment',   value: 'track_shipment' },
          { type: 'button', label: '💳 Billing',          value: 'billing_inquiry' },
          { type: 'button', label: '🐛 Report a Problem', value: 'technical' },
          { type: 'button', label: '🧑 Talk to an Agent', value: 'escalate' },
        ],
        suggestions: helpers.suggestions.generate('greet', 3),
        metadata: { fallback: true, originalMessage: context.userMessage },
      };
    },

  }, // end intents
};
