/**
 * Lido Connect — Order Dashboard Application Bot
 * Version: 1.0.0
 *
 * A fully dynamic application bot that renders a rich order-management
 * dashboard using the Lido AppRenderer component system.
 *
 * Supported intents:
 *   init               — main dashboard (stats + recent orders table)
 *   view_orders        — full orders table with filters
 *   view_order_detail  — single order detail (params: { orderId })
 *   view_analytics     — revenue & volume charts
 *   view_customers     — top-customers list
 *   create_order_form  — blank new-order form
 *   submit_order       — handle form submission (params: form values)
 *   mark_shipped       — mark order as shipped (params: { orderId })
 *   cancel_order       — cancel an order (params: { orderId })
 */

// ─── Mock data ────────────────────────────────────────────────────────────────
const ORDERS = [
  { id: 1001, customer: 'Alice Martin',   product: 'Laptop Pro 15"',  qty: 1, total: 1299.00, status: 'delivered', date: '2026-02-20' },
  { id: 1002, customer: 'Bob Chen',       product: 'Wireless Earbuds',qty: 2, total: 159.98,  status: 'shipped',   date: '2026-02-22' },
  { id: 1003, customer: 'Carol Smith',    product: 'USB-C Hub 7-in-1', qty: 3, total: 119.97,  status: 'pending',   date: '2026-02-24' },
  { id: 1004, customer: 'David Park',     product: 'Mechanical Keyboard',qty:1,total: 189.00, status: 'processing',date: '2026-02-25' },
  { id: 1005, customer: 'Emma Johnson',   product: '27" 4K Monitor',  qty: 1, total: 599.00,  status: 'pending',   date: '2026-02-26' },
  { id: 1006, customer: 'Frank Liu',      product: 'Laptop Stand',    qty: 2, total:  79.98,  status: 'cancelled', date: '2026-02-27' },
  { id: 1007, customer: 'Grace Kim',      product: 'Laptop Pro 15"',  qty: 1, total: 1299.00, status: 'shipped',   date: '2026-02-28' },
  { id: 1008, customer: 'Hank Torres',    product: 'Wireless Mouse',  qty: 1, total:  49.99,  status: 'delivered', date: '2026-03-01' },
];

const MONTHLY_REVENUE = [12400, 18900, 15300, 22100, 19800, 27500, 24300, 31200, 28700, 35400, 32100, 41800];
const MONTHLY_ORDERS  = [  82,   130,   104,   158,   141,   199,   175,   231,   208,   262,   244,   318];
const MONTHS = ['Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb'];

// Status → MUI chip color
const STATUS_COLORS = {
  delivered : 'success',
  shipped   : 'info',
  processing: 'warning',
  pending   : 'warning',
  cancelled : 'error',
};

function totalRevenue() { return ORDERS.reduce((s, o) => s + o.total, 0).toFixed(2); }
function pendingCount()  { return ORDERS.filter(o => o.status === 'pending' || o.status === 'processing').length; }

// ─── Module export ────────────────────────────────────────────────────────────

module.exports = {
  name   : 'Order Dashboard',
  version: '1.0.0',

  async initialize(context) {
    console.log(`[OrderDashboard] init for user=${context.userId} org=${context.organizationId}`);
  },

  intents: {

    // ── Main dashboard ────────────────────────────────────────────────────────
    init: async (context) => {
      const recentOrders = ORDERS.slice(-5).reverse();

      return {
        message: null,
        layout: [
          // ── Top KPI row ──────────────────────────────────────────────────
          {
            type   : 'grid',
            spacing: 2,
            columns: [
              {
                xs: 12, sm: 6, md: 3,
                components: [{
                  type    : 'stat_card',
                  title   : 'Total Revenue',
                  value   : `$${totalRevenue()}`,
                  subtitle: 'All-time orders',
                  icon    : 'AttachMoney',
                  color   : 'success',
                  trend   : { value: '+12.4%', direction: 'up' },
                }],
              },
              {
                xs: 12, sm: 6, md: 3,
                components: [{
                  type    : 'stat_card',
                  title   : 'Total Orders',
                  value   : ORDERS.length,
                  subtitle: 'All-time',
                  icon    : 'ShoppingCart',
                  color   : 'primary',
                  trend   : { value: '+8.1%', direction: 'up' },
                }],
              },
              {
                xs: 12, sm: 6, md: 3,
                components: [{
                  type    : 'stat_card',
                  title   : 'Pending / Processing',
                  value   : pendingCount(),
                  subtitle: 'Need attention',
                  icon    : 'HourglassEmpty',
                  color   : 'warning',
                  trend   : { value: '-2', direction: 'down' },
                }],
              },
              {
                xs: 12, sm: 6, md: 3,
                components: [{
                  type    : 'stat_card',
                  title   : 'Avg. Order Value',
                  value   : `$${(ORDERS.reduce((s,o)=>s+o.total,0)/ORDERS.length).toFixed(2)}`,
                  subtitle: 'Per order',
                  icon    : 'TrendingUp',
                  color   : 'info',
                  trend   : { value: '+5.7%', direction: 'up' },
                }],
              },
            ],
          },

          // ── Alert if pending orders exist ────────────────────────────────
          {
            type      : 'alert',
            severity  : 'warning',
            title     : `${pendingCount()} orders awaiting action`,
            message   : 'Some orders are pending or processing. Review them to keep fulfilment on track.',
            dismissible: true,
            action    : { label: 'View Pending', intent: 'view_orders', params: { filter: 'pending' } },
          },

          // ── Recent orders table ──────────────────────────────────────────
          {
            type   : 'text',
            content: '## Recent Orders',
            markdown: true,
            variant: 'h6',
          },
          {
            type  : 'data_table',
            title : 'Last 5 Orders',
            columns: [
              { field: 'id',       label: 'Order #',  align: 'left'  },
              { field: 'customer', label: 'Customer', align: 'left'  },
              { field: 'product',  label: 'Product',  align: 'left'  },
              { field: 'total',    label: 'Total',    align: 'right' },
              {
                field  : 'status',
                label  : 'Status',
                align  : 'center',
                chip   : { colorMap: STATUS_COLORS },
              },
              {
                field  : '_actions',
                label  : 'Actions',
                align  : 'center',
                actions: [
                  { label: 'View',   intent: 'view_order_detail', params: { orderId: '{{row.id}}' } },
                  { label: 'Ship',   intent: 'mark_shipped',      params: { orderId: '{{row.id}}' } },
                ],
              },
            ],
            rows        : recentOrders,
            emptyMessage: 'No orders yet.',
          },

          // ── Quick action buttons ─────────────────────────────────────────
          {
            type   : 'grid',
            spacing: 2,
            columns: [
              {
                xs: 12, sm: 4,
                components: [{
                  type    : 'action_button',
                  label   : 'All Orders',
                  intent  : 'view_orders',
                  variant : 'outlined',
                  color   : 'primary',
                  icon    : 'ListAlt',
                  fullWidth: true,
                }],
              },
              {
                xs: 12, sm: 4,
                components: [{
                  type    : 'action_button',
                  label   : 'Analytics',
                  intent  : 'view_analytics',
                  variant : 'outlined',
                  color   : 'primary',
                  icon    : 'BarChart',
                  fullWidth: true,
                }],
              },
              {
                xs: 12, sm: 4,
                components: [{
                  type    : 'action_button',
                  label   : 'New Order',
                  intent  : 'create_order_form',
                  variant : 'contained',
                  color   : 'primary',
                  icon    : 'AddShoppingCart',
                  fullWidth: true,
                }],
              },
            ],
          },
        ],
      };
    },

    // ── Full orders table ─────────────────────────────────────────────────────
    view_orders: async (context) => {
      const filter = context.metadata?.filter;
      const rows   = filter
        ? ORDERS.filter(o => o.status === filter || (filter === 'pending' && o.status === 'processing'))
        : ORDERS;

      return {
        message: null,
        layout: [
          {
            type   : 'grid',
            spacing: 2,
            columns: [
              {
                xs: 6,
                components: [{
                  type    : 'text',
                  content : filter ? `Showing: **${filter}** orders` : 'All Orders',
                  markdown: true,
                  variant : 'h6',
                }],
              },
              {
                xs: 6,
                components: [{
                  type    : 'action_button',
                  label   : '← Dashboard',
                  intent  : 'init',
                  variant : 'text',
                  color   : 'primary',
                  icon    : 'ArrowBack',
                }],
              },
            ],
          },
          {
            type   : 'data_table',
            columns: [
              { field: 'id',       label: 'Order #',  align: 'left'  },
              { field: 'customer', label: 'Customer', align: 'left'  },
              { field: 'product',  label: 'Product',  align: 'left'  },
              { field: 'qty',      label: 'Qty',      align: 'center'},
              { field: 'total',    label: 'Total',    align: 'right' },
              { field: 'date',     label: 'Date',     align: 'center'},
              {
                field: 'status',
                label: 'Status',
                align: 'center',
                chip : { colorMap: STATUS_COLORS },
              },
              {
                field  : '_actions',
                label  : 'Actions',
                align  : 'center',
                actions: [
                  { label: 'View',   intent: 'view_order_detail', params: { orderId: '{{row.id}}' } },
                  { label: 'Cancel', intent: 'cancel_order',      params: { orderId: '{{row.id}}' } },
                ],
              },
            ],
            rows        : rows,
            emptyMessage: 'No orders match the filter.',
          },
        ],
      };
    },

    // ── Single order detail ───────────────────────────────────────────────────
    view_order_detail: async (context) => {
      const orderId = Number(context.metadata?.orderId);
      const order   = ORDERS.find(o => o.id === orderId);

      if (!order) {
        return {
          layout: [{
            type    : 'alert',
            severity: 'error',
            title   : 'Not Found',
            message : `Order #${orderId} was not found.`,
          }],
        };
      }

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
                  content : `Order #${order.id} — **${order.customer}**`,
                  markdown: true,
                  variant : 'h6',
                }],
              },
              {
                xs: 4,
                components: [{
                  type    : 'action_button',
                  label   : '← Back',
                  intent  : 'view_orders',
                  variant : 'text',
                  icon    : 'ArrowBack',
                }],
              },
            ],
          },

          // Status alert
          {
            type    : 'alert',
            severity: order.status === 'cancelled' ? 'error'
                    : order.status === 'delivered'  ? 'success'
                    : order.status === 'shipped'    ? 'info'
                    : 'warning',
            message : `Order is currently **${order.status.toUpperCase()}**`,
            markdown: true,
          },

          // Detail stats
          {
            type   : 'grid',
            spacing: 2,
            columns: [
              {
                xs: 12, sm: 6, md: 3,
                components: [{
                  type : 'stat_card', title: 'Product',
                  value: order.product, color: 'primary', icon: 'Inventory',
                }],
              },
              {
                xs: 12, sm: 6, md: 3,
                components: [{
                  type : 'stat_card', title: 'Quantity',
                  value: order.qty, color: 'info', icon: 'Numbers',
                }],
              },
              {
                xs: 12, sm: 6, md: 3,
                components: [{
                  type : 'stat_card', title: 'Total',
                  value: `$${order.total.toFixed(2)}`, color: 'success', icon: 'AttachMoney',
                }],
              },
              {
                xs: 12, sm: 6, md: 3,
                components: [{
                  type : 'stat_card', title: 'Date',
                  value: order.date, color: 'primary', icon: 'CalendarToday',
                }],
              },
            ],
          },

          // Timeline
          {
            type : 'timeline',
            title: 'Order History',
            items: [
              { label: 'Order Placed',   title: 'Order Placed',   icon: 'ShoppingCart',    color: 'success',  timestamp: order.date },
              { label: 'Payment',        title: 'Payment Confirmed',icon: 'CreditCard',    color: 'success',  timestamp: order.date },
              ...(order.status !== 'cancelled' ? [{
                label: 'Processing', title: 'Processing',  icon: 'Autorenew',  color: 'warning',
                timestamp: order.date,
              }] : []),
              ...(order.status === 'shipped' || order.status === 'delivered' ? [{
                label: 'Shipped', title: 'Shipped',   icon: 'LocalShipping', color: 'info',
                timestamp: order.date,
              }] : []),
              ...(order.status === 'delivered' ? [{
                label: 'Delivered', title: 'Delivered', icon: 'CheckCircle', color: 'success',
                timestamp: order.date,
              }] : []),
              ...(order.status === 'cancelled' ? [{
                label: 'Cancelled', title: 'Cancelled', icon: 'Cancel', color: 'error',
                timestamp: order.date,
              }] : []),
            ],
          },

          // Action buttons
          ...(order.status === 'processing' || order.status === 'pending' ? [{
            type   : 'grid',
            spacing: 2,
            columns: [
              {
                xs: 6,
                components: [{
                  type    : 'action_button',
                  label   : 'Mark as Shipped',
                  intent  : 'mark_shipped',
                  params  : { orderId: order.id },
                  variant : 'contained',
                  color   : 'primary',
                  icon    : 'LocalShipping',
                  fullWidth: true,
                }],
              },
              {
                xs: 6,
                components: [{
                  type    : 'action_button',
                  label   : 'Cancel Order',
                  intent  : 'cancel_order',
                  params  : { orderId: order.id },
                  variant : 'outlined',
                  color   : 'error',
                  icon    : 'Cancel',
                  fullWidth: true,
                }],
              },
            ],
          }] : []),
        ],
      };
    },

    // ── Analytics charts ──────────────────────────────────────────────────────
    view_analytics: async (context) => {
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
                  type: 'text', content: 'Analytics', variant: 'h6',
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

          // Tabs: Revenue | Orders
          {
            type  : 'tabs',
            defaultTab: 0,
            tabs  : [
              {
                label     : 'Revenue',
                components: [{
                  type     : 'chart',
                  title    : 'Monthly Revenue (USD)',
                  chartType: 'area',
                  labels   : MONTHS,
                  datasets : [{ label: 'Revenue', data: MONTHLY_REVENUE, color: '#696cff' }],
                  legend   : false,
                  height   : 260,
                }],
              },
              {
                label     : 'Order Volume',
                components: [{
                  type     : 'chart',
                  title    : 'Monthly Order Volume',
                  chartType: 'bar',
                  labels   : MONTHS,
                  datasets : [{ label: 'Orders', data: MONTHLY_ORDERS, color: '#4caf50' }],
                  legend   : false,
                  height   : 260,
                }],
              },
              {
                label     : 'Status Mix',
                components: [{
                  type     : 'chart',
                  title    : 'Orders by Status',
                  chartType: 'doughnut',
                  labels   : ['Delivered', 'Shipped', 'Processing', 'Pending', 'Cancelled'],
                  datasets : [{
                    label: 'Orders',
                    data : [
                      ORDERS.filter(o=>o.status==='delivered').length,
                      ORDERS.filter(o=>o.status==='shipped').length,
                      ORDERS.filter(o=>o.status==='processing').length,
                      ORDERS.filter(o=>o.status==='pending').length,
                      ORDERS.filter(o=>o.status==='cancelled').length,
                    ],
                  }],
                  legend: true,
                  height: 260,
                }],
              },
            ],
          },

          // Top KPI row
          {
            type   : 'grid',
            spacing: 2,
            columns: [
              {
                xs: 12, md: 4,
                components: [{
                  type   : 'stat_card', title: 'Best Month',
                  value  : 'February',  icon: 'EmojiEvents', color: 'warning',
                  subtitle: `$${Math.max(...MONTHLY_REVENUE).toLocaleString()}`,
                }],
              },
              {
                xs: 12, md: 4,
                components: [{
                  type   : 'stat_card', title: 'Annual Revenue',
                  value  : `$${MONTHLY_REVENUE.reduce((a,b)=>a+b,0).toLocaleString()}`,
                  icon   : 'MonetizationOn', color: 'success',
                  subtitle: 'Last 12 months',
                }],
              },
              {
                xs: 12, md: 4,
                components: [{
                  type   : 'stat_card', title: 'Annual Orders',
                  value  : MONTHLY_ORDERS.reduce((a,b)=>a+b,0),
                  icon   : 'Inventory2', color: 'info',
                  subtitle: 'Last 12 months',
                }],
              },
            ],
          },
        ],
      };
    },

    // ── Top customers list ────────────────────────────────────────────────────
    view_customers: async (context) => {
      // Aggregate spend per customer
      const spend = {};
      ORDERS.forEach(o => {
        if (o.status !== 'cancelled') spend[o.customer] = (spend[o.customer] || 0) + o.total;
      });
      const sorted = Object.entries(spend)
        .sort(([,a],[,b]) => b - a)
        .slice(0, 6);

      return {
        message: null,
        layout: [
          { type: 'text', content: 'Top Customers', variant: 'h6' },
          {
            type  : 'list',
            title : 'Ranked by total spend',
            dividers: true,
            items : sorted.map(([name, total], i) => ({
              primary    : name,
              description: `Total spend: $${total.toFixed(2)}`,
              icon       : i === 0 ? 'EmojiEvents' : 'Person',
              badge      : `#${i + 1}`,
            })),
          },
          {
            type: 'action_button', label: '← Dashboard',
            intent: 'init', variant: 'text', icon: 'ArrowBack',
          },
        ],
      };
    },

    // ── New order form ────────────────────────────────────────────────────────
    create_order_form: async (context) => {
      return {
        message: null,
        layout: [
          {
            type        : 'form',
            title       : 'Create New Order',
            intent      : 'submit_order',
            cancelIntent: 'init',
            submitLabel : 'Place Order',
            fields      : [
              {
                name       : 'customer',
                label      : 'Customer Name',
                type       : 'text',
                required   : true,
                placeholder: 'Full name',
              },
              {
                name       : 'product',
                label      : 'Product',
                type       : 'select',
                required   : true,
                options    : [
                  { label: 'Laptop Pro 15"',        value: 'Laptop Pro 15"'        },
                  { label: 'Wireless Earbuds',       value: 'Wireless Earbuds'       },
                  { label: 'USB-C Hub 7-in-1',       value: 'USB-C Hub 7-in-1'       },
                  { label: 'Mechanical Keyboard',    value: 'Mechanical Keyboard'    },
                  { label: '27" 4K Monitor',         value: '27" 4K Monitor'         },
                  { label: 'Laptop Stand',           value: 'Laptop Stand'           },
                  { label: 'Wireless Mouse',         value: 'Wireless Mouse'         },
                ],
              },
              {
                name       : 'qty',
                label      : 'Quantity',
                type       : 'number',
                required   : true,
                value      : 1,
                validation : { min: 1, max: 100 },
              },
              {
                name       : 'notes',
                label      : 'Notes (optional)',
                type       : 'textarea',
                placeholder: 'Special instructions…',
              },
            ],
          },
        ],
      };
    },

    // ── Handle form submission ────────────────────────────────────────────────
    submit_order: async (context) => {
      const { customer, product, qty, notes } = context.metadata ?? {};

      // Simulate order creation
      const newId   = Math.max(...ORDERS.map(o => o.id)) + 1;
      const prices  = { 'Laptop Pro 15"': 1299, 'Wireless Earbuds': 79.99,
                        'USB-C Hub 7-in-1': 39.99, 'Mechanical Keyboard': 189,
                        '27" 4K Monitor': 599, 'Laptop Stand': 39.99, 'Wireless Mouse': 49.99 };
      const total   = ((prices[product] ?? 99) * Number(qty)).toFixed(2);

      ORDERS.push({
        id      : newId,
        customer: customer || 'Unknown',
        product : product  || 'Unknown',
        qty     : Number(qty) || 1,
        total   : parseFloat(total),
        status  : 'pending',
        date    : new Date().toISOString().slice(0,10),
      });

      return {
        message: null,
        layout: [
          {
            type    : 'alert',
            severity: 'success',
            title   : 'Order Placed!',
            message : `Order #${newId} for ${customer} has been created successfully. Total: $${total}`,
          },
          {
            type   : 'grid',
            spacing: 2,
            columns: [
              {
                xs: 6,
                components: [{
                  type: 'action_button', label: 'View Order',
                  intent: 'view_order_detail', params: { orderId: newId },
                  variant: 'contained', icon: 'Visibility',
                }],
              },
              {
                xs: 6,
                components: [{
                  type: 'action_button', label: '← Dashboard',
                  intent: 'init', variant: 'outlined', icon: 'Dashboard',
                }],
              },
            ],
          },
        ],
      };
    },

    // ── Mark order as shipped ─────────────────────────────────────────────────
    mark_shipped: async (context) => {
      const orderId = Number(context.metadata?.orderId);
      const order   = ORDERS.find(o => o.id === orderId);

      if (order && (order.status === 'pending' || order.status === 'processing')) {
        order.status = 'shipped';
      }

      return {
        message: null,
        layout: [{
          type    : 'alert',
          severity: order ? 'success' : 'error',
          title   : order ? `Order #${orderId} Shipped` : 'Not Found',
          message : order
            ? `Order #${orderId} for ${order.customer} has been marked as shipped.`
            : `Order #${orderId} was not found.`,
          action  : { label: 'View Order', intent: 'view_order_detail', params: { orderId } },
        }],
      };
    },

    // ── Cancel order ──────────────────────────────────────────────────────────
    cancel_order: async (context) => {
      const orderId = Number(context.metadata?.orderId);
      const order   = ORDERS.find(o => o.id === orderId);

      if (order && order.status !== 'delivered' && order.status !== 'cancelled') {
        order.status = 'cancelled';
      }

      return {
        message: null,
        layout: [{
          type    : 'alert',
          severity: order ? 'warning' : 'error',
          title   : order ? `Order #${orderId} Cancelled` : 'Not Found',
          message : order
            ? `Order #${orderId} has been cancelled.`
            : `Order #${orderId} was not found or cannot be cancelled.`,
          action  : { label: '← Back to Orders', intent: 'view_orders' },
        }],
      };
    },
  },
};
