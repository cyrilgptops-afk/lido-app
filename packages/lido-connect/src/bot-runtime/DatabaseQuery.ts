import type { BotContext } from './context';

/**
 * Safe Database Query Helper
 *
 * Provides organization-scoped database access with whitelisted tables.
 * Add new tables here when bot scripts need access to them.
 */
export class DatabaseQuery {
  private context: BotContext;
  private db: any;
  private logger: any;

  // Tables that bot scripts are allowed to SELECT from.
  private readonly ALLOWED_TABLES = [
    // Core platform tables
    'users',
    'organizations',
    'roles',
    'bots',
    'user_organizations',
    'conversations',
    'messages',
    // Bot script management tables
    'bot_scripts',
    'bot_script_versions',
    'bot_execution_logs',
    // Commerce tables (used by support / e-commerce bots)
    'orders',
    'order_items',
    'products',
    'invoices',
  ];

  constructor(context: BotContext, db: any, logger?: any) {
    this.context = context;
    this.db = db;
    this.logger = logger;
  }

  /**
   * Execute a SELECT query with automatic org filtering
   */
  async select<T = any>(
    table: string,
    columns: string[] = ['*'],
    where: Record<string, any> = {},
    options: { limit?: number; offset?: number; orderBy?: string } = {}
  ): Promise<T[]> {
    // Validate table name
    if (!this.ALLOWED_TABLES.includes(table)) {
      throw new Error(`Table "${table}" is not allowed for bot queries`);
    }

    // Force organization_id filter for tables that have that column
    const orgFilteredTables = ['bots', 'bot_scripts', 'bot_script_versions', 'conversations', 'orders', 'order_items', 'products', 'invoices'];
    if (orgFilteredTables.includes(table)) {
      where.organization_id = this.context.organizationId;
    }
    // user_organizations uses org_id (not organization_id)
    if (table === 'user_organizations') {
      where.org_id = this.context.organizationId;
    }

    // Force deleted_at IS NULL for soft-delete tables
    const softDeleteTables = ['users', 'organizations', 'bots', 'bot_scripts'];
    if (softDeleteTables.includes(table)) {
      where.deleted_at = null;
    }

    // Build query
    const columnStr = columns.join(', ');
    const whereClauses: string[] = [];
    const values: any[] = [];

    for (const [key, value] of Object.entries(where)) {
      if (value === null) {
        whereClauses.push(`${key} IS NULL`);
      } else if (key === 'user_id' && typeof value === 'string' && value.includes('-')) {
        // context.userId is a UUID string — resolve to numeric users.id transparently
        whereClauses.push(`${key} = (SELECT id FROM users WHERE uuid = ? LIMIT 1)`);
        values.push(value);
      } else {
        whereClauses.push(`${key} = ?`);
        values.push(value);
      }
    }

    let sql = `SELECT ${columnStr} FROM ${table}`;
    if (whereClauses.length > 0) {
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    if (options.orderBy) {
      sql += ` ORDER BY ${options.orderBy}`;
    }

    if (options.limit) {
      sql += ` LIMIT ${options.limit}`;
    }

    if (options.offset) {
      sql += ` OFFSET ${options.offset}`;
    }

    // db.query() returns T[] directly — no destructuring needed
    const rows = await this.db.query(sql, values);
    return rows as T[];
  }

  /**
   * Execute aggregate queries (COUNT, SUM, AVG, etc.)
   */
  async aggregate(
    table: string,
    aggregations: Record<string, string>,
    where: Record<string, any> = {}
  ): Promise<Record<string, any>> {
    if (!this.ALLOWED_TABLES.includes(table)) {
      throw new Error(`Table "${table}" is not allowed for bot queries`);
    }

    // Force organization filter — same rules as select()
    const orgFilteredTables = ['bots', 'bot_scripts', 'bot_script_versions', 'conversations', 'orders', 'order_items', 'products', 'invoices'];
    if (orgFilteredTables.includes(table)) {
      where.organization_id = this.context.organizationId;
    }
    // user_organizations uses org_id
    if (table === 'user_organizations') {
      where.org_id = this.context.organizationId;
    }

    const aggParts: string[] = [];
    for (const [alias, expr] of Object.entries(aggregations)) {
      aggParts.push(`${expr} as ${alias}`);
    }

    const whereClauses: string[] = [];
    const values: any[] = [];

    for (const [key, value] of Object.entries(where)) {
      whereClauses.push(`${key} = ?`);
      values.push(value);
    }

    let sql = `SELECT ${aggParts.join(', ')} FROM ${table}`;
    if (whereClauses.length > 0) {
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    // db.query() returns T[] directly — no destructuring needed
    const rows = await this.db.query(sql, values);
    return rows[0] || {};
  }

  /**
   * Get current user information.
   * Always returns null on any failure — never throws — so bot handlers
   * can null-guard without worrying about executor catching their error.
   */
  async getCurrentUser(): Promise<any> {
    try {
      const users = await this.select('users', ['*'], { uuid: this.context.userId });
      return users[0] || null;
    } catch (err) {
      this.logger?.warn(
        { err, userId: this.context.userId },
        'DatabaseQuery.getCurrentUser failed — returning null',
      );
      return null;
    }
  }
}
