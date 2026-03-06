# App Renderer — Component & Layout Props Reference

All components are returned inside a `layout` array from a bot intent handler.
The bot returns `{ layout: AppComponent[], message?: string | null }`.

---

## Layout Components

### `grid`

Arranges child components in a responsive MUI Grid row.

```js
{
  type   : 'grid',
  spacing: 2,           // MUI grid spacing (0–10), default 2
  columns: [
    {
      xs: 12, sm: 6, md: 3,   // MUI breakpoint widths (1–12)
      components: [ /* AppComponent[] */ ]
    },
  ],
}
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `spacing` | `number` | No | Gap between columns (MUI spacing units) |
| `columns` | `GridColumnDef[]` | ✅ | Array of column definitions |
| `columns[].xs` | `number` | No | Width at xs breakpoint (1–12) |
| `columns[].sm` | `number` | No | Width at sm breakpoint |
| `columns[].md` | `number` | No | Width at md breakpoint |
| `columns[].lg` | `number` | No | Width at lg breakpoint |
| `columns[].components` | `AppComponent[]` | ✅ | Components to render in this column |

---

### `tabs`

Renders a tabbed panel. Each tab contains its own component list.

```js
{
  type      : 'tabs',
  defaultTab: 0,            // zero-based index of initially active tab
  variant   : 'standard',  // 'standard' | 'fullWidth' | 'scrollable'
  tabs: [
    {
      label     : 'Tab Label',
      icon      : 'BarChart',   // optional MUI icon name
      components: [ /* AppComponent[] */ ],
    },
  ],
}
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `defaultTab` | `number` | No | Index of the initially selected tab (default `0`) |
| `variant` | `string` | No | `'standard'` \| `'fullWidth'` \| `'scrollable'` |
| `tabs` | `TabDef[]` | ✅ | Tab definitions |
| `tabs[].label` | `string` | ✅ | Tab header text |
| `tabs[].icon` | `string` | No | MUI icon name for tab header |
| `tabs[].components` | `AppComponent[]` | ✅ | Components rendered when tab is active |

---

## Content Components

### `stat_card`

A KPI metric card with optional trend and action chip.

```js
{
  type    : 'stat_card',
  title   : 'Total Revenue',
  value   : '$41,800',
  subtitle: 'Last 12 months',
  icon    : 'AttachMoney',         // MUI icon name
  color   : 'success',             // 'primary' | 'success' | 'warning' | 'error' | 'info'
  trend   : { value: '+12.4%', direction: 'up' },  // optional
  action  : { label: 'View', intent: 'view_detail' }, // optional chip button
}
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `title` | `string` | ✅ | Card heading |
| `value` | `string \| number` | ✅ | Main metric value |
| `subtitle` | `string` | No | Small text below value |
| `icon` | `string` | No | MUI icon name (e.g. `'TrendingUp'`, `'People'`) |
| `color` | `string` | No | Accent colour — `primary` \| `success` \| `warning` \| `error` \| `info` |
| `trend.value` | `string` | No | Trend label, e.g. `'+5.2%'` |
| `trend.direction` | `string` | No | `'up'` \| `'down'` \| `'neutral'` |
| `action.label` | `string` | No | Chip button label |
| `action.intent` | `string` | No | Intent to fire when chip is clicked |
| `action.params` | `object` | No | Extra params passed to intent |

---

### `data_table`

A full data table with optional chips, row actions, and pagination.

```js
{
  type  : 'data_table',
  title : 'Orders',           // optional table heading
  columns: [
    { field: 'id',     label: 'Order #', align: 'left' },
    { field: 'status', label: 'Status',  align: 'center',
      chip: { colorMap: { delivered: 'success', pending: 'warning', cancelled: 'error' } }
    },
    {
      field  : '_actions',     // special field — renders buttons, no data key needed
      label  : 'Actions',
      align  : 'center',
      actions: [
        { label: 'View',   intent: 'view_detail', params: { id: '{{row.id}}' } },
        { label: 'Delete', intent: 'delete_item', params: { id: '{{row.id}}' } },
      ],
    },
  ],
  rows        : [ { id: 1, status: 'delivered', ... } ],
  emptyMessage: 'No records found.',
  pagination  : { page: 1, pageSize: 10, total: 42, intent: 'load_page' }, // optional
}
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `title` | `string` | No | Table caption |
| `columns` | `DataTableColumn[]` | ✅ | Column definitions |
| `columns[].field` | `string` | ✅ | Row data key, or `'_actions'` for button column |
| `columns[].label` | `string` | ✅ | Column header text |
| `columns[].align` | `string` | No | `'left'` \| `'right'` \| `'center'` |
| `columns[].chip.colorMap` | `object` | No | Maps cell value → MUI chip colour |
| `columns[].actions` | `array` | No | Row action buttons (only for `_actions` field) |
| `columns[].actions[].params` | `object` | No | Supports `{{row.fieldName}}` template strings |
| `rows` | `object[]` | ✅ | Data rows — each object's keys must match `field` values |
| `emptyMessage` | `string` | No | Shown when `rows` is empty |
| `pagination.page` | `number` | No | Current page (1-based) |
| `pagination.pageSize` | `number` | No | Rows per page |
| `pagination.total` | `number` | No | Total record count |
| `pagination.intent` | `string` | No | Intent fired on page change (receives `{ page }`) |

---

### `chart`

Pure SVG charts — no external charting library.

```js
{
  type     : 'chart',
  title    : 'Monthly Revenue',
  chartType: 'area',     // 'line' | 'bar' | 'area' | 'pie' | 'doughnut'
  labels   : ['Jan', 'Feb', 'Mar'],
  datasets : [
    { label: 'Revenue', data: [1200, 1800, 1500], color: '#696cff' },
  ],
  height: 260,   // px, default 200
  legend: true,  // show legend below chart
}
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `chartType` | `string` | ✅ | `'line'` \| `'bar'` \| `'area'` \| `'pie'` \| `'doughnut'` |
| `labels` | `string[]` | ✅ | X-axis / slice labels |
| `datasets` | `ChartDataset[]` | ✅ | One or more data series |
| `datasets[].label` | `string` | ✅ | Series name (shown in legend) |
| `datasets[].data` | `number[]` | ✅ | Data points — must match `labels` length |
| `datasets[].color` | `string` | No | Line/bar/slice colour (hex or CSS) |
| `title` | `string` | No | Chart heading |
| `height` | `number` | No | SVG height in px (default `200`) |
| `legend` | `boolean` | No | Show colour legend (default `false`) |

---

### `form`

A form panel that collects input and fires an intent on submit.

```js
{
  type        : 'form',
  title       : 'New Order',
  intent      : 'submit_order',   // intent fired on submit (receives form values as params)
  cancelIntent: 'init',           // optional — intent fired on Cancel button
  submitLabel : 'Place Order',    // optional, default 'Submit'
  fields: [
    { name: 'customer', label: 'Customer Name', type: 'text',     required: true },
    { name: 'product',  label: 'Product',       type: 'select',
      options: [{ label: 'Laptop', value: 'laptop' }] },
    { name: 'qty',      label: 'Quantity',      type: 'number',
      value: 1, validation: { min: 1, max: 100 } },
    { name: 'notes',    label: 'Notes',         type: 'textarea', placeholder: 'Optional…' },
    { name: 'notify',   label: 'Send email',    type: 'switch' },
    { name: 'ship_date',label: 'Ship Date',     type: 'date' },
  ],
}
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `intent` | `string` | ✅ | Intent fired on form submit |
| `fields` | `AppFormField[]` | ✅ | Field definitions |
| `title` | `string` | No | Form heading |
| `submitLabel` | `string` | No | Submit button text (default `'Submit'`) |
| `cancelIntent` | `string` | No | Intent fired when user clicks Cancel |
| `fields[].name` | `string` | ✅ | Form field key (passed as param on submit) |
| `fields[].label` | `string` | ✅ | Field label |
| `fields[].type` | `string` | ✅ | `text` \| `email` \| `password` \| `number` \| `textarea` \| `select` \| `multiselect` \| `switch` \| `date` |
| `fields[].value` | `any` | No | Initial value |
| `fields[].required` | `boolean` | No | Mark as required |
| `fields[].placeholder` | `string` | No | Input placeholder |
| `fields[].disabled` | `boolean` | No | Disable the field |
| `fields[].options` | `{label, value}[]` | No | Options for `select` / `multiselect` |
| `fields[].validation.min` | `number` | No | Minimum value (number fields) |
| `fields[].validation.max` | `number` | No | Maximum value |
| `fields[].validation.minLength` | `number` | No | Minimum string length |
| `fields[].validation.maxLength` | `number` | No | Maximum string length |

---

### `alert`

An MUI Alert banner with optional dismiss and action button.

```js
{
  type       : 'alert',
  severity   : 'warning',      // 'success' | 'info' | 'warning' | 'error'
  title      : 'Heads up',     // optional bold title
  message    : 'Some orders need attention.',
  dismissible: true,           // optional — show × close button
  action     : { label: 'Review', intent: 'view_orders' }, // optional
}
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `severity` | `string` | ✅ | `'success'` \| `'info'` \| `'warning'` \| `'error'` |
| `message` | `string` | ✅ | Alert body text |
| `title` | `string` | No | Bold heading above message |
| `dismissible` | `boolean` | No | Show a close (×) button |
| `action.label` | `string` | No | Inline action button label |
| `action.intent` | `string` | No | Intent fired when action button clicked |
| `action.params` | `object` | No | Params for the action intent |

---

### `action_button`

A standalone MUI Button that fires an intent.

```js
{
  type     : 'action_button',
  label    : 'Start Training',
  intent   : 'start_training',
  params   : { mode: 'full' },   // optional extra params
  variant  : 'contained',        // 'contained' | 'outlined' | 'text'
  color    : 'success',          // 'primary' | 'secondary' | 'success' | 'warning' | 'error'
  icon     : 'PlayArrow',        // optional MUI icon name (placed left of label)
  fullWidth: true,               // optional — stretch to container width
  disabled : false,              // optional
}
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `label` | `string` | ✅ | Button text |
| `intent` | `string` | ✅ | Intent to fire on click |
| `params` | `object` | No | Extra params merged into intent call |
| `variant` | `string` | No | `'contained'` \| `'outlined'` \| `'text'` (default `'outlined'`) |
| `color` | `string` | No | Button colour theme |
| `icon` | `string` | No | MUI icon name shown left of label |
| `fullWidth` | `boolean` | No | Stretch to 100% of container |
| `disabled` | `boolean` | No | Disable the button |

---

### `text`

A typography block with optional Markdown rendering.

```js
{
  type    : 'text',
  content : '## Section Title\nSome **bold** and *italic* text with `code`.',
  markdown: true,    // parse ** * ` ## markers
  variant : 'h6',   // MUI Typography variant
  align   : 'left', // 'left' | 'center' | 'right'
  color   : 'text.secondary',  // MUI color token or CSS
}
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `content` | `string` | ✅ | Text or Markdown content |
| `markdown` | `boolean` | No | Enable minimal Markdown (`**bold**`, `*italic*`, `` `code` ``, `## heading`) |
| `variant` | `string` | No | MUI Typography variant (e.g. `'h4'`, `'body1'`, `'caption'`) |
| `align` | `string` | No | Text alignment |
| `color` | `string` | No | MUI color token or CSS color |

---

### `list`

A vertical MUI List with optional icons, badges, and clickable items.

```js
{
  type    : 'list',
  title   : 'Top Customers',
  dense   : false,
  dividers: true,
  items: [
    {
      primary    : 'Alice Martin',
      description: 'Total: $1,299',
      icon       : 'Person',         // MUI icon name
      badge      : '#1',             // small label on the right
      intent     : 'view_customer',  // fires intent on click
      params     : { id: 'alice' },
    },
  ],
}
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `items` | `ListItem[]` | ✅ | List item definitions |
| `title` | `string` | No | Section heading above list |
| `dense` | `boolean` | No | Reduce item padding |
| `dividers` | `boolean` | No | Show dividers between items |
| `items[].primary` | `string` | ✅ | Main item text |
| `items[].secondary` / `description` | `string` | No | Smaller subtext below primary |
| `items[].icon` | `string` | No | MUI icon name on the left |
| `items[].badge` | `string \| number` | No | Small label on the right edge |
| `items[].intent` | `string` | No | Intent fired on item click |
| `items[].params` | `object` | No | Params for the click intent |

---

### `timeline`

A vertical event timeline with icons and timestamps.

```js
{
  type : 'timeline',
  title: 'Order History',
  items: [
    {
      title      : 'Order Placed',
      description: 'Payment confirmed',
      icon       : 'ShoppingCart',    // MUI icon name
      color      : 'success',         // MUI color name or hex
      timestamp  : '2026-02-20',
      badge      : 'Step 1',
    },
  ],
}
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `items` | `TimelineItem[]` | ✅ | Timeline event definitions |
| `title` | `string` | No | Section heading |
| `items[].title` | `string` | No | Event heading |
| `items[].label` | `string` | No | Alias for `title` |
| `items[].description` | `string` | No | Event body text |
| `items[].icon` | `string` | No | MUI icon name inside the circle |
| `items[].color` | `string` | No | Circle accent colour (`'success'`, `'error'`, hex…) |
| `items[].timestamp` | `string` | No | Date/time shown on the right |
| `items[].badge` | `string` | No | Small label tag |

---

### `image`

Renders a static image (URL or MinIO-resolved key).

```js
{
  type    : 'image',
  src     : 'https://example.com/logo.png',
  alt     : 'Logo',
  maxWidth: 320,
  center  : true,
  rounded : true,
  radius  : 12,   // border-radius px
}
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `src` | `string` | ✅ | Image URL |
| `alt` | `string` | No | Alt text |
| `width` | `string \| number` | No | CSS width |
| `height` | `string \| number` | No | CSS height |
| `maxWidth` | `string \| number` | No | CSS max-width |
| `radius` | `number` | No | Border radius in px |
| `center` | `boolean` | No | Centre the image horizontally |
| `rounded` | `boolean` | No | Apply `border-radius: 50%` (circle) |

---

### `divider`

A horizontal rule with optional label.

```js
{
  type   : 'divider',
  label  : 'Section Break',  // optional centred text
  spacing: 2,                // vertical margin (MUI spacing units)
}
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `label` | `string` | No | Text centred on the divider line |
| `spacing` | `number` | No | Vertical margin (MUI units) |
| `mb` | `number` | No | Bottom margin override |

---

## Row-action `{{row.field}}` Templates

Inside `data_table` column action `params`, you can reference the current row's values using double-curly syntax:

```js
actions: [
  { label: 'View',   intent: 'view_detail', params: { id: '{{row.id}}', name: '{{row.customer}}' } },
  { label: 'Delete', intent: 'delete_item', params: { id: '{{row.id}}' } },
]
```

At render time `{{row.id}}` is replaced with the actual cell value from that row. All row fields are accessible.

---

## Intent Handler Signature

```js
module.exports = {
  name   : 'My Bot',
  version: '1.0.0',

  async initialize(context) { /* runs once on bot load */ },

  intents: {
    init: async (context) => {
      // context.userId          — logged-in user ID
      // context.organizationId  — org ID
      // context.metadata        — params passed from the previous action (or query params on init)

      return {
        message: 'Optional text message shown above the layout',
        layout : [ /* AppComponent[] */ ],
      };
    },
  },
};
```

`context.metadata` on the first load comes from the `?params` query string (if any). For subsequent actions it is the `params` object passed by the triggering component.
