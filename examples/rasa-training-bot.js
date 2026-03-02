/**
 * Lido Connect — Rasa Training Application Bot
 * Version: 1.0.0
 *
 * A dynamic application bot for managing and monitoring Rasa NLU/Core
 * training data, model versions, and training runs.
 *
 * Supported intents:
 *   init                  — main dashboard (stats + training status)
 *   view_intents          — full intents table
 *   view_intent_detail    — single intent with training examples (params: { intentName })
 *   add_intent_form       — blank new-intent form
 *   submit_intent         — handle new intent submission (params: form values)
 *   delete_intent         — remove an intent (params: { intentName })
 *   view_stories          — conversation stories/flows list
 *   view_entities         — NLU entities table
 *   view_training_history — timeline of past training runs
 *   start_training        — trigger a new training run (simulated)
 *   view_model_info       — current deployed model details + analytics
 */

// ─── Mock data ─────────────────────────────────────────────────────────────────

const INTENTS = [
  { name: 'greet',            examples: 12, lastUpdated: '2026-02-18', status: 'active',   stories: 3 },
  { name: 'goodbye',          examples: 8,  lastUpdated: '2026-02-18', status: 'active',   stories: 2 },
  { name: 'affirm',           examples: 9,  lastUpdated: '2026-02-19', status: 'active',   stories: 5 },
  { name: 'deny',             examples: 7,  lastUpdated: '2026-02-19', status: 'active',   stories: 4 },
  { name: 'ask_order_status', examples: 15, lastUpdated: '2026-02-22', status: 'active',   stories: 6 },
  { name: 'ask_product_info', examples: 11, lastUpdated: '2026-02-23', status: 'active',   stories: 3 },
  { name: 'request_refund',   examples: 10, lastUpdated: '2026-02-24', status: 'active',   stories: 4 },
  { name: 'escalate_human',   examples: 6,  lastUpdated: '2026-02-25', status: 'active',   stories: 2 },
  { name: 'bot_challenge',    examples: 5,  lastUpdated: '2026-02-26', status: 'active',   stories: 1 },
  { name: 'track_shipment',   examples: 4,  lastUpdated: '2026-03-01', status: 'draft',    stories: 0 },
  { name: 'cancel_order',     examples: 3,  lastUpdated: '2026-03-01', status: 'draft',    stories: 0 },
];

const INTENT_EXAMPLES = {
  greet:            ['hello', 'hi', 'hey there', 'good morning', 'hi there', 'howdy', 'greetings', 'hey', "what's up", 'yo', 'hiya', 'sup'],
  goodbye:          ['bye', 'goodbye', 'see you later', 'take care', 'talk later', 'cya', 'good night'],
  affirm:           ['yes', 'yeah', 'of course', 'sure', 'absolutely', 'definitely', "that's correct", 'correct', 'right'],
  deny:             ['no', 'nope', 'not really', 'never', "don't think so", 'negative'],
  ask_order_status: ['where is my order', 'what is the status of my order', 'check order status', 'order #1234 status', 'has my order shipped', 'when will my order arrive', 'track my order', 'order status please', 'is my order ready', 'order update'],
  ask_product_info: ['tell me about laptop pro', 'what are the specs', 'product details', 'how much does it cost', 'is it in stock'],
  request_refund:   ['I want a refund', 'refund my order', 'return this product', 'how do I get my money back', 'cancel and refund'],
  escalate_human:   ['talk to human', 'connect me to agent', 'I want to speak to a person', 'human please'],
  bot_challenge:    ['are you a robot', 'are you a bot', 'am I talking to AI', 'is this automated'],
  track_shipment:   ['track my shipment', 'where is my package'],
  cancel_order:     ['cancel my order', 'I want to cancel'],
};

const ENTITIES = [
  { name: 'order_id',     type: 'regex',    intents: ['ask_order_status', 'track_shipment'], examples: 22, status: 'active'  },
  { name: 'product_name', type: 'lookup',   intents: ['ask_product_info'], examples: 18, status: 'active'  },
  { name: 'date',         type: 'duckling', intents: ['ask_order_status', 'track_shipment'], examples: 14, status: 'active'  },
  { name: 'email',        type: 'regex',    intents: ['request_refund'], examples: 9, status: 'active'  },
  { name: 'quantity',     type: 'duckling', intents: ['ask_product_info'], examples: 6, status: 'active'  },
  { name: 'location',     type: 'spacy',    intents: ['track_shipment'], examples: 3, status: 'draft'   },
];

const STORIES = [
  { name: 'happy path',              steps: 5, intents: ['greet', 'ask_order_status', 'affirm', 'goodbye'],       status: 'active',  updated: '2026-02-20' },
  { name: 'product enquiry',         steps: 4, intents: ['greet', 'ask_product_info', 'affirm', 'goodbye'],       status: 'active',  updated: '2026-02-21' },
  { name: 'refund flow',             steps: 6, intents: ['greet', 'request_refund', 'affirm', 'goodbye'],         status: 'active',  updated: '2026-02-22' },
  { name: 'escalation',              steps: 4, intents: ['greet', 'escalate_human'],                              status: 'active',  updated: '2026-02-23' },
  { name: 'order + shipment track',  steps: 7, intents: ['greet', 'ask_order_status', 'track_shipment', 'deny'],  status: 'draft',   updated: '2026-03-01' },
  { name: 'bot challenge handled',   steps: 3, intents: ['bot_challenge', 'greet'],                               status: 'active',  updated: '2026-02-26' },
];

const TRAINING_RUNS = [
  { id: 'run-009', date: '2026-03-01', duration: '3m 12s', status: 'success', accuracy: 96.4, modelFile: 'rasa-20260301-152210.tar.gz', pipeline: 'DIET + TED' },
  { id: 'run-008', date: '2026-02-26', duration: '3m 05s', status: 'success', accuracy: 95.8, modelFile: 'rasa-20260226-110432.tar.gz', pipeline: 'DIET + TED' },
  { id: 'run-007', date: '2026-02-22', duration: '2m 58s', status: 'success', accuracy: 94.1, modelFile: 'rasa-20260222-094512.tar.gz', pipeline: 'DIET + TED' },
  { id: 'run-006', date: '2026-02-18', duration: '4m 31s', status: 'failed',  accuracy: null, modelFile: null,                          pipeline: 'DIET + TED' },
  { id: 'run-005', date: '2026-02-14', duration: '2m 47s', status: 'success', accuracy: 93.5, modelFile: 'rasa-20260214-083310.tar.gz', pipeline: 'DIET + TED' },
];

const MONTHLY_ACCURACY  = [87.2, 88.5, 89.1, 90.3, 91.0, 92.4, 93.1, 93.5, 94.1, 94.8, 95.8, 96.4];
const MONTHS = ['Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb'];

const STATUS_COLORS = { active: 'success', draft: 'warning', failed: 'error', success: 'success', running: 'info' };
const ENTITY_TYPE_COLORS = { regex: 'info', lookup: 'primary', duckling: 'warning', spacy: 'secondary' };

function totalExamples() { return INTENTS.reduce((s, i) => s + i.examples, 0); }
function activeIntents()  { return INTENTS.filter(i => i.status === 'active').length; }
function draftIntents()   { return INTENTS.filter(i => i.status === 'draft').length; }
const LATEST_RUN = TRAINING_RUNS[0];

// ─── Module export ─────────────────────────────────────────────────────────────

module.exports = {
  name   : 'Rasa Training Manager',
  version: '1.0.0',

  async initialize(context) {
    console.log(`[RasaTrainingBot] init for user=${context.userId} org=${context.organizationId}`);
  },

  intents: {

    // ── Main dashboard ──────────────────────────────────────────────────────
    init: async (context) => {
      return {
        message: null,
        layout: [
          // ── KPI Stats row ────────────────────────────────────────────────
          {
            type   : 'grid',
            spacing: 2,
            columns: [
              {
                xs: 12, sm: 6, md: 3,
                components: [{
                  type    : 'stat_card',
                  title   : 'Total Intents',
                  value   : INTENTS.length,
                  subtitle: `${activeIntents()} active · ${draftIntents()} draft`,
                  icon    : 'Psychology',
                  color   : 'primary',
                  trend   : { value: '+2 new', direction: 'up' },
                }],
              },
              {
                xs: 12, sm: 6, md: 3,
                components: [{
                  type    : 'stat_card',
                  title   : 'Training Examples',
                  value   : totalExamples(),
                  subtitle: 'Across all intents',
                  icon    : 'FormatListBulleted',
                  color   : 'info',
                  trend   : { value: '+17 this week', direction: 'up' },
                }],
              },
              {
                xs: 12, sm: 6, md: 3,
                components: [{
                  type    : 'stat_card',
                  title   : 'Model Accuracy',
                  value   : `${LATEST_RUN.accuracy}%`,
                  subtitle: `Run ${LATEST_RUN.id} · ${LATEST_RUN.date}`,
                  icon    : 'Verified',
                  color   : 'success',
                  trend   : { value: '+0.6% vs last', direction: 'up' },
                }],
              },
              {
                xs: 12, sm: 6, md: 3,
                components: [{
                  type    : 'stat_card',
                  title   : 'Entities',
                  value   : ENTITIES.length,
                  subtitle: `${ENTITIES.filter(e=>e.status==='active').length} active`,
                  icon    : 'Label',
                  color   : 'warning',
                }],
              },
            ],
          },

          // ── Training status alert ────────────────────────────────────────
          {
            type      : 'alert',
            severity  : draftIntents() > 0 ? 'warning' : 'success',
            title     : draftIntents() > 0
              ? `${draftIntents()} intent(s) in draft — model not up to date`
              : 'Model is up to date',
            message   : draftIntents() > 0
              ? 'Review draft intents and start a new training run to update the deployed model.'
              : `Last trained on ${LATEST_RUN.date} (${LATEST_RUN.id}) — accuracy ${LATEST_RUN.accuracy}%.`,
            dismissible: true,
            action    : draftIntents() > 0
              ? { label: 'Start Training', intent: 'start_training' }
              : { label: 'View History',   intent: 'view_training_history' },
          },

          // ── Recent intents table ─────────────────────────────────────────
          {
            type    : 'text',
            content : '## Intents',
            markdown: true,
          },
          {
            type   : 'data_table',
            title  : 'Recent Intents',
            columns: [
              { field: 'name',        label: 'Intent',       align: 'left'   },
              { field: 'examples',    label: 'Examples',     align: 'center' },
              { field: 'stories',     label: 'Stories',      align: 'center' },
              { field: 'lastUpdated', label: 'Last Updated', align: 'center' },
              {
                field: 'status', label: 'Status', align: 'center',
                chip : { colorMap: STATUS_COLORS },
              },
              {
                field  : '_actions', label: 'Actions', align: 'center',
                actions: [
                  { label: 'View',   intent: 'view_intent_detail', params: { intentName: '{{row.name}}' } },
                  { label: 'Delete', intent: 'delete_intent',      params: { intentName: '{{row.name}}' } },
                ],
              },
            ],
            rows        : INTENTS.slice(0, 6),
            emptyMessage: 'No intents defined yet.',
          },

          // ── Quick actions ────────────────────────────────────────────────
          {
            type   : 'grid',
            spacing: 2,
            columns: [
              {
                xs: 12, sm: 3,
                components: [{
                  type: 'action_button', label: 'All Intents',
                  intent: 'view_intents', variant: 'outlined', color: 'primary',
                  icon: 'Psychology', fullWidth: true,
                }],
              },
              {
                xs: 12, sm: 3,
                components: [{
                  type: 'action_button', label: 'Entities',
                  intent: 'view_entities', variant: 'outlined', color: 'primary',
                  icon: 'Label', fullWidth: true,
                }],
              },
              {
                xs: 12, sm: 3,
                components: [{
                  type: 'action_button', label: 'Stories',
                  intent: 'view_stories', variant: 'outlined', color: 'primary',
                  icon: 'AccountTree', fullWidth: true,
                }],
              },
              {
                xs: 12, sm: 3,
                components: [{
                  type: 'action_button', label: 'Start Training',
                  intent: 'start_training', variant: 'contained', color: 'success',
                  icon: 'PlayArrow', fullWidth: true,
                }],
              },
            ],
          },
        ],
      };
    },

    // ── Full intents table ──────────────────────────────────────────────────
    view_intents: async (context) => {
      return {
        message: null,
        layout: [
          {
            type   : 'grid',
            spacing: 2,
            columns: [
              {
                xs: 8,
                components: [{
                  type: 'text', content: 'All Intents', variant: 'h6',
                }],
              },
              {
                xs: 4,
                components: [{
                  type: 'action_button', label: '← Dashboard',
                  intent: 'init', variant: 'text', icon: 'ArrowBack',
                }],
              },
            ],
          },

          {
            type   : 'data_table',
            columns: [
              { field: 'name',        label: 'Intent Name',  align: 'left'   },
              { field: 'examples',    label: 'Examples',     align: 'center' },
              { field: 'stories',     label: 'Stories Used', align: 'center' },
              { field: 'lastUpdated', label: 'Last Updated', align: 'center' },
              {
                field: 'status', label: 'Status', align: 'center',
                chip : { colorMap: STATUS_COLORS },
              },
              {
                field  : '_actions', label: 'Actions', align: 'center',
                actions: [
                  { label: 'View',   intent: 'view_intent_detail', params: { intentName: '{{row.name}}' } },
                  { label: 'Delete', intent: 'delete_intent',      params: { intentName: '{{row.name}}' } },
                ],
              },
            ],
            rows        : INTENTS,
            emptyMessage: 'No intents defined yet.',
          },

          {
            type: 'action_button', label: '+ Add Intent',
            intent: 'add_intent_form', variant: 'contained', color: 'primary',
            icon: 'Add',
          },
        ],
      };
    },

    // ── Intent detail ───────────────────────────────────────────────────────
    view_intent_detail: async (context) => {
      const intentName = context.metadata?.intentName;
      const intent     = INTENTS.find(i => i.name === intentName);

      if (!intent) {
        return {
          layout: [{
            type: 'alert', severity: 'error', title: 'Not Found',
            message: `Intent "${intentName}" was not found.`,
            action: { label: '← Back', intent: 'view_intents' },
          }],
        };
      }

      const examples = INTENT_EXAMPLES[intent.name] ?? [];

      return {
        message: null,
        layout: [
          {
            type   : 'grid',
            spacing: 2,
            columns: [
              {
                xs: 8,
                components: [{
                  type    : 'text',
                  content : `Intent: **${intent.name}**`,
                  markdown: true,
                  variant : 'h6',
                }],
              },
              {
                xs: 4,
                components: [{
                  type: 'action_button', label: '← Intents',
                  intent: 'view_intents', variant: 'text', icon: 'ArrowBack',
                }],
              },
            ],
          },

          // Status + stats
          {
            type    : 'alert',
            severity: intent.status === 'active' ? 'success' : 'warning',
            message : intent.status === 'active'
              ? `This intent is **active** and included in the current model.`
              : `This intent is in **draft** — retrain the model to activate it.`,
            markdown: true,
          },

          {
            type   : 'grid',
            spacing: 2,
            columns: [
              {
                xs: 12, sm: 4,
                components: [{
                  type: 'stat_card', title: 'Training Examples',
                  value: intent.examples, icon: 'FormatListBulleted', color: 'primary',
                }],
              },
              {
                xs: 12, sm: 4,
                components: [{
                  type: 'stat_card', title: 'Used in Stories',
                  value: intent.stories, icon: 'AccountTree', color: 'info',
                }],
              },
              {
                xs: 12, sm: 4,
                components: [{
                  type: 'stat_card', title: 'Last Updated',
                  value: intent.lastUpdated, icon: 'Update', color: 'secondary',
                }],
              },
            ],
          },

          // Examples list
          {
            type : 'list',
            title: 'Training Examples',
            items: examples.map((ex, i) => ({
              primary    : ex,
              icon       : 'Chat',
              badge      : `#${i + 1}`,
            })),
          },
        ],
      };
    },

    // ── Add intent form ─────────────────────────────────────────────────────
    add_intent_form: async (context) => {
      return {
        message: null,
        layout: [{
          type        : 'form',
          title       : 'Add New Intent',
          intent      : 'submit_intent',
          cancelIntent: 'view_intents',
          submitLabel : 'Save Intent',
          fields      : [
            {
              name       : 'name',
              label      : 'Intent Name',
              type       : 'text',
              required   : true,
              placeholder: 'e.g. ask_delivery_time (snake_case)',
            },
            {
              name       : 'examples',
              label      : 'Training Examples',
              type       : 'textarea',
              required   : true,
              placeholder: 'One example per line.\ne.g.\nwhen will my order arrive\nwhat is the delivery time',
              helpText   : 'Minimum 5 examples recommended for good NLU accuracy.',
            },
            {
              name   : 'status',
              label  : 'Status',
              type   : 'select',
              value  : 'draft',
              options: [
                { label: 'Draft (add to next training)',  value: 'draft'  },
                { label: 'Active (already in model)',     value: 'active' },
              ],
            },
            {
              name       : 'notes',
              label      : 'Notes (optional)',
              type       : 'textarea',
              placeholder: 'Any context about when this intent should fire…',
            },
          ],
        }],
      };
    },

    // ── Handle intent form submission ───────────────────────────────────────
    submit_intent: async (context) => {
      const { name, examples, status, notes } = context.metadata ?? {};

      if (!name || !examples) {
        return {
          layout: [{
            type: 'alert', severity: 'error', title: 'Validation Error',
            message: 'Intent name and at least one training example are required.',
            action : { label: 'Try Again', intent: 'add_intent_form' },
          }],
        };
      }

      const sanitized  = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      const exLines    = examples.split('\n').map(l => l.trim()).filter(Boolean);
      const alreadyExists = INTENTS.find(i => i.name === sanitized);

      if (alreadyExists) {
        return {
          layout: [{
            type: 'alert', severity: 'warning', title: 'Intent Already Exists',
            message: `An intent named "${sanitized}" already exists. Please use a unique name.`,
            action : { label: 'Try Again', intent: 'add_intent_form' },
          }],
        };
      }

      INTENTS.push({
        name       : sanitized,
        examples   : exLines.length,
        lastUpdated: new Date().toISOString().slice(0, 10),
        status     : status || 'draft',
        stories    : 0,
      });
      INTENT_EXAMPLES[sanitized] = exLines;

      return {
        message: null,
        layout: [
          {
            type    : 'alert',
            severity: 'success',
            title   : 'Intent Saved!',
            message : `Intent **${sanitized}** has been saved with ${exLines.length} training example(s). ${status === 'draft' ? 'Retrain the model to activate it.' : ''}`,
            markdown: true,
          },
          {
            type   : 'grid',
            spacing: 2,
            columns: [
              {
                xs: 6,
                components: [{
                  type: 'action_button', label: 'View Intent',
                  intent: 'view_intent_detail', params: { intentName: sanitized },
                  variant: 'contained', icon: 'Visibility',
                }],
              },
              {
                xs: 6,
                components: [{
                  type: 'action_button', label: 'Start Training',
                  intent: 'start_training',
                  variant: 'outlined', color: 'success', icon: 'PlayArrow',
                }],
              },
            ],
          },
        ],
      };
    },

    // ── Delete intent ───────────────────────────────────────────────────────
    delete_intent: async (context) => {
      const intentName = context.metadata?.intentName;
      const idx        = INTENTS.findIndex(i => i.name === intentName);

      if (idx !== -1) {
        INTENTS.splice(idx, 1);
        delete INTENT_EXAMPLES[intentName];
      }

      return {
        message: null,
        layout: [{
          type    : 'alert',
          severity: idx !== -1 ? 'warning' : 'error',
          title   : idx !== -1 ? `Intent "${intentName}" Deleted` : 'Not Found',
          message : idx !== -1
            ? `The intent "${intentName}" and all its training examples have been removed. Retrain the model to apply changes.`
            : `Intent "${intentName}" was not found.`,
          action  : { label: '← Back to Intents', intent: 'view_intents' },
        }],
      };
    },

    // ── Stories list ────────────────────────────────────────────────────────
    view_stories: async (context) => {
      return {
        message: null,
        layout: [
          {
            type   : 'grid',
            spacing: 2,
            columns: [
              {
                xs: 8,
                components: [{ type: 'text', content: 'Conversation Stories', variant: 'h6' }],
              },
              {
                xs: 4,
                components: [{
                  type: 'action_button', label: '← Dashboard',
                  intent: 'init', variant: 'text', icon: 'ArrowBack',
                }],
              },
            ],
          },

          {
            type   : 'data_table',
            columns: [
              { field: 'name',    label: 'Story Name',    align: 'left'   },
              { field: 'steps',   label: 'Steps',         align: 'center' },
              { field: 'updated', label: 'Last Updated',  align: 'center' },
              {
                field: 'status', label: 'Status', align: 'center',
                chip : { colorMap: STATUS_COLORS },
              },
            ],
            rows        : STORIES,
            emptyMessage: 'No stories defined yet.',
          },

          // Intent coverage overview
          {
            type    : 'text',
            content : '### Intent Coverage',
            markdown: true,
          },
          {
            type : 'list',
            title: 'Intents used in stories',
            items: [...new Set(STORIES.flatMap(s => s.intents))]
              .map(name => {
                const intent = INTENTS.find(i => i.name === name);
                return {
                  primary    : name,
                  description: `${intent?.examples ?? 0} examples`,
                  icon       : intent?.status === 'active' ? 'CheckCircle' : 'HourglassEmpty',
                  badge      : intent?.status ?? 'unknown',
                };
              }),
          },
        ],
      };
    },

    // ── Entities table ──────────────────────────────────────────────────────
    view_entities: async (context) => {
      return {
        message: null,
        layout: [
          {
            type   : 'grid',
            spacing: 2,
            columns: [
              {
                xs: 8,
                components: [{ type: 'text', content: 'NLU Entities', variant: 'h6' }],
              },
              {
                xs: 4,
                components: [{
                  type: 'action_button', label: '← Dashboard',
                  intent: 'init', variant: 'text', icon: 'ArrowBack',
                }],
              },
            ],
          },

          {
            type   : 'grid',
            spacing: 2,
            columns: [
              {
                xs: 12, sm: 4,
                components: [{
                  type : 'stat_card', title: 'Total Entities',
                  value: ENTITIES.length, icon: 'Label', color: 'primary',
                }],
              },
              {
                xs: 12, sm: 4,
                components: [{
                  type : 'stat_card', title: 'Active Entities',
                  value: ENTITIES.filter(e => e.status === 'active').length,
                  icon : 'CheckCircle', color: 'success',
                }],
              },
              {
                xs: 12, sm: 4,
                components: [{
                  type : 'stat_card', title: 'Total Annotations',
                  value: ENTITIES.reduce((s, e) => s + e.examples, 0),
                  icon : 'Bookmarks', color: 'info',
                }],
              },
            ],
          },

          {
            type   : 'data_table',
            title  : 'Entity Definitions',
            columns: [
              { field: 'name',     label: 'Entity Name', align: 'left'   },
              {
                field: 'type', label: 'Extractor Type', align: 'center',
                chip : { colorMap: ENTITY_TYPE_COLORS },
              },
              { field: 'examples', label: 'Annotations', align: 'center' },
              {
                field: 'status', label: 'Status', align: 'center',
                chip : { colorMap: STATUS_COLORS },
              },
            ],
            rows: ENTITIES.map(e => ({
              ...e,
              intents: e.intents.join(', '),
            })),
          },

          // Entity type legend
          {
            type    : 'text',
            content : '**Extractor types:** `regex` — pattern matching · `lookup` — word lists · `duckling` — dates/numbers/amounts · `spacy` — named-entity recognition',
            markdown: true,
            variant : 'body2',
          },
        ],
      };
    },

    // ── Training history ────────────────────────────────────────────────────
    view_training_history: async (context) => {
      return {
        message: null,
        layout: [
          {
            type   : 'grid',
            spacing: 2,
            columns: [
              {
                xs: 8,
                components: [{ type: 'text', content: 'Training History', variant: 'h6' }],
              },
              {
                xs: 4,
                components: [{
                  type: 'action_button', label: '← Dashboard',
                  intent: 'init', variant: 'text', icon: 'ArrowBack',
                }],
              },
            ],
          },

          // Accuracy trend chart
          {
            type     : 'chart',
            title    : 'Model Accuracy Over Time (%)',
            chartType: 'line',
            labels   : MONTHS,
            datasets : [{ label: 'Accuracy', data: MONTHLY_ACCURACY, color: '#4caf50' }],
            legend   : false,
            height   : 220,
          },

          // Training runs timeline
          {
            type : 'timeline',
            title: 'Training Runs',
            items: TRAINING_RUNS.map(run => ({
              label    : run.id,
              title    : `${run.id} — ${run.date}`,
              description: run.status === 'success'
                ? `Accuracy: ${run.accuracy}% · Duration: ${run.duration} · ${run.pipeline}`
                : `Failed after ${run.duration} · ${run.pipeline}`,
              icon     : run.status === 'success' ? 'CheckCircle' : 'Error',
              color    : run.status === 'success' ? 'success' : 'error',
              timestamp: run.date,
            })),
          },

          // Runs table
          {
            type   : 'data_table',
            title  : 'All Runs',
            columns: [
              { field: 'id',        label: 'Run ID',   align: 'left'   },
              { field: 'date',      label: 'Date',     align: 'center' },
              { field: 'duration',  label: 'Duration', align: 'center' },
              { field: 'accuracy',  label: 'Accuracy', align: 'center' },
              { field: 'pipeline',  label: 'Pipeline', align: 'left'   },
              {
                field: 'status', label: 'Status', align: 'center',
                chip : { colorMap: STATUS_COLORS },
              },
            ],
            rows: TRAINING_RUNS.map(r => ({
              ...r,
              accuracy: r.accuracy !== null ? `${r.accuracy}%` : '—',
            })),
          },
        ],
      };
    },

    // ── Start training ──────────────────────────────────────────────────────
    start_training: async (context) => {
      const runId     = `run-${String(TRAINING_RUNS.length + 1).padStart(3, '0')}`;
      const today     = new Date().toISOString().slice(0, 10);
      const simulated = { id: runId, date: today, duration: '3m 18s', status: 'success', accuracy: 97.1, modelFile: `rasa-${Date.now()}.tar.gz`, pipeline: 'DIET + TED' };

      // Promote all draft intents to active
      INTENTS.forEach(i => { if (i.status === 'draft') i.status = 'active'; });
      TRAINING_RUNS.unshift(simulated);

      return {
        message: null,
        layout: [
          {
            type    : 'alert',
            severity: 'success',
            title   : `Training Complete — ${runId}`,
            message : `Model trained successfully in ${simulated.duration}. New accuracy: **${simulated.accuracy}%** (+0.7% vs previous). All draft intents promoted to active.`,
            markdown: true,
          },

          {
            type   : 'grid',
            spacing: 2,
            columns: [
              {
                xs: 12, sm: 4,
                components: [{
                  type : 'stat_card', title: 'Accuracy',
                  value: `${simulated.accuracy}%`, icon: 'Verified', color: 'success',
                  trend: { value: '+0.7%', direction: 'up' },
                }],
              },
              {
                xs: 12, sm: 4,
                components: [{
                  type : 'stat_card', title: 'Training Duration',
                  value: simulated.duration, icon: 'Timer', color: 'info',
                }],
              },
              {
                xs: 12, sm: 4,
                components: [{
                  type : 'stat_card', title: 'Active Intents',
                  value: activeIntents(), icon: 'Psychology', color: 'primary',
                }],
              },
            ],
          },

          {
            type   : 'grid',
            spacing: 2,
            columns: [
              {
                xs: 6,
                components: [{
                  type: 'action_button', label: 'View History',
                  intent: 'view_training_history', variant: 'outlined', icon: 'History',
                  fullWidth: true,
                }],
              },
              {
                xs: 6,
                components: [{
                  type: 'action_button', label: 'Model Info',
                  intent: 'view_model_info', variant: 'contained', icon: 'Info',
                  fullWidth: true,
                }],
              },
            ],
          },
        ],
      };
    },

    // ── Model info ──────────────────────────────────────────────────────────
    view_model_info: async (context) => {
      const run = TRAINING_RUNS[0];

      return {
        message: null,
        layout: [
          {
            type   : 'grid',
            spacing: 2,
            columns: [
              {
                xs: 8,
                components: [{ type: 'text', content: 'Deployed Model', variant: 'h6' }],
              },
              {
                xs: 4,
                components: [{
                  type: 'action_button', label: '← Dashboard',
                  intent: 'init', variant: 'text', icon: 'ArrowBack',
                }],
              },
            ],
          },

          {
            type   : 'grid',
            spacing: 2,
            columns: [
              {
                xs: 12, sm: 3,
                components: [{
                  type : 'stat_card', title: 'Accuracy', value: `${run.accuracy}%`,
                  icon : 'Verified', color: 'success',
                  trend: { value: 'Latest run', direction: 'up' },
                }],
              },
              {
                xs: 12, sm: 3,
                components: [{
                  type : 'stat_card', title: 'Run ID',
                  value: run.id, icon: 'Tag', color: 'info',
                  subtitle: run.date,
                }],
              },
              {
                xs: 12, sm: 3,
                components: [{
                  type : 'stat_card', title: 'Pipeline',
                  value: run.pipeline, icon: 'AccountTree', color: 'primary',
                }],
              },
              {
                xs: 12, sm: 3,
                components: [{
                  type : 'stat_card', title: 'Model File',
                  value: 'Available', icon: 'CloudDone', color: 'success',
                  subtitle: run.modelFile,
                }],
              },
            ],
          },

          // Intent distribution chart
          {
            type     : 'chart',
            title    : 'Training Examples per Intent (Top 8)',
            chartType: 'bar',
            labels   : INTENTS.slice(0, 8).map(i => i.name),
            datasets : [{
              label: 'Examples',
              data : INTENTS.slice(0, 8).map(i => i.examples),
              color: '#696cff',
            }],
            legend: false,
            height: 240,
          },

          // Tabs: Intents | Entities | Stories breakdown
          {
            type      : 'tabs',
            defaultTab: 0,
            tabs      : [
              {
                label     : `Intents (${INTENTS.length})`,
                components: [{
                  type : 'list',
                  title: 'All Intents',
                  items: INTENTS.map(i => ({
                    primary    : i.name,
                    description: `${i.examples} examples · updated ${i.lastUpdated}`,
                    icon       : i.status === 'active' ? 'CheckCircle' : 'HourglassEmpty',
                    badge      : i.status,
                  })),
                }],
              },
              {
                label     : `Entities (${ENTITIES.length})`,
                components: [{
                  type : 'list',
                  title: 'All Entities',
                  items: ENTITIES.map(e => ({
                    primary    : e.name,
                    description: `${e.type} · ${e.examples} annotations`,
                    icon       : 'Label',
                    badge      : e.type,
                  })),
                }],
              },
              {
                label     : `Stories (${STORIES.length})`,
                components: [{
                  type : 'list',
                  title: 'All Stories',
                  items: STORIES.map(s => ({
                    primary    : s.name,
                    description: `${s.steps} steps · updated ${s.updated}`,
                    icon       : 'AccountTree',
                    badge      : s.status,
                  })),
                }],
              },
            ],
          },

          {
            type: 'action_button', label: 'Retrain Model',
            intent: 'start_training', variant: 'contained', color: 'success',
            icon: 'PlayArrow',
          },
        ],
      };
    },
  },
};
