// ─── AppComponent type definitions ───────────────────────────────────────────

export interface AppActionContext {
  onAction: (intent: string, params?: Record<string, any>) => void;
}

// stat_card
export interface StatCardComponent {
  type     : 'stat_card';
  title    : string;
  value    : string | number;
  subtitle?: string;
  icon?    : string;
  color?   : 'primary' | 'success' | 'warning' | 'error' | 'info';
  trend?   : { value: string; direction: 'up' | 'down' | 'neutral' };
  action?  : { label: string; intent: string; params?: Record<string, any> };
}

// data_table
export interface DataTableColumn {
  field     : string;
  label     : string;
  align?    : 'left' | 'right' | 'center';
  sortable? : boolean;
  chip?     : { colorMap: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> };
  actions?  : Array<{ label: string; intent: string; params?: Record<string, any> }>;
}
export interface DataTableComponent {
  type        : 'data_table';
  title?      : string;
  columns     : DataTableColumn[];
  rows        : Record<string, any>[];
  pagination? : { page: number; pageSize: number; total: number; intent: string };
  emptyMessage?: string;
}

// chart
export interface ChartDataset {
  label            : string;
  data             : number[];
  color?           : string;
  backgroundColor? : string;
}
export interface ChartComponent {
  type      : 'chart';
  title?    : string;
  chartType : 'line' | 'bar' | 'area' | 'pie' | 'doughnut';
  labels    : string[];
  datasets  : ChartDataset[];
  height?   : number;
  legend?   : boolean;
}

// form
export interface AppFormField {
  name        : string;
  label       : string;
  type        : 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select' | 'multiselect' | 'switch' | 'date';
  value?      : any;
  required?   : boolean;
  placeholder?: string;
  disabled?   : boolean;
  options?    : Array<{ label: string; value: string }>;
  validation? : { min?: number; max?: number; minLength?: number; maxLength?: number };
}
export interface FormComponent {
  type         : 'form';
  title?       : string;
  intent       : string;
  fields       : AppFormField[];
  submitLabel? : string;
  cancelIntent?: string;
}

// action_button
export interface ActionButtonComponent {
  type      : 'action_button';
  label     : string;
  intent    : string;
  params?   : Record<string, any>;
  variant?  : 'contained' | 'outlined' | 'text';
  color?    : 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  icon?     : string;
  fullWidth?: boolean;
  disabled? : boolean;
}

// alert
export interface AlertComponent {
  type        : 'alert';
  severity    : 'success' | 'info' | 'warning' | 'error';
  title?      : string;
  message     : string;
  action?     : { label: string; intent: string; params?: Record<string, any> };
  dismissible?: boolean;
}

// text
export interface TextComponent {
  type     : 'text';
  content  : string;
  markdown?: boolean;
  align?   : 'left' | 'center' | 'right';
  variant? : string;
  color?   : string;
}

// divider
export interface DividerComponent {
  type    : 'divider';
  label?  : string;
  mb?     : number;
  spacing?: number;
}

// grid
export interface GridColumnDef {
  xs?        : number;
  sm?        : number;
  md?        : number;
  lg?        : number;
  components : AppComponent[];
}
export interface GridComponent {
  type     : 'grid';
  spacing? : number;
  columns  : GridColumnDef[];
}

// tabs
export interface TabDef {
  label      : string;
  icon?      : string;
  components : AppComponent[];
}
export interface TabsComponent {
  type        : 'tabs';
  defaultTab? : number;
  tabs        : TabDef[];
  variant?    : 'standard' | 'fullWidth' | 'scrollable';
  scrollable? : boolean;
}

// timeline
export interface TimelineItem {
  label       : string;
  sublabel?   : string;
  description?: string;
  title?      : string;
  icon?       : string;
  color?      : string;
  content?    : string;
  badge?      : string;
  timestamp?  : string;
}
export interface TimelineComponent {
  type   : 'timeline';
  title? : string;
  items  : TimelineItem[];
}

// image
export interface ImageComponent {
  type      : 'image';
  src       : string;
  alt?      : string;
  width?    : string | number;
  height?   : string | number;
  maxWidth? : string | number;
  radius?   : number;
  center?   : boolean;
  rounded?  : boolean;
}

// list
export interface ListItem {
  primary   : string;
  secondary?: string;
  label?    : string;        // alias for primary
  description?: string;     // alias for secondary
  icon?     : string;
  intent?   : string;
  params?   : Record<string, any>;
  divider?  : boolean;
  badge?    : string | number;
}
export interface ListComponent {
  type     : 'list';
  title?   : string;
  items    : ListItem[];
  dense?   : boolean;
  dividers?: boolean;
}

export type AppComponent =
  | StatCardComponent
  | DataTableComponent
  | ChartComponent
  | FormComponent
  | ActionButtonComponent
  | AlertComponent
  | TextComponent
  | DividerComponent
  | GridComponent
  | TabsComponent
  | TimelineComponent
  | ImageComponent
  | ListComponent;
