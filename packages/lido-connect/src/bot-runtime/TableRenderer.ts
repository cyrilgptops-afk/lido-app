import type { BotContext, TableDefinition, TableColumn } from './context';

/**
 * Table Renderer Helper
 * 
 * Build structured tables from data
 */
export class TableRenderer {
  private context: BotContext;
  private table: TableDefinition;

  constructor(context: BotContext) {
    this.context = context;
    this.table = {
      columns: [],
      rows: [],
    };
  }

  /**
   * Set table title
   */
  setTitle(title: string): this {
    this.table.title = title;
    return this;
  }

  /**
   * Add column definition
   */
  addColumn(
    key: string,
    label: string,
    type: TableColumn['type'] = 'text',
    options: Partial<TableColumn> = {}
  ): this {
    this.table.columns.push({
      key,
      label,
      type,
      ...options,
    });
    return this;
  }

  /**
   * Set table rows
   */
  setRows(rows: Array<Record<string, any>>): this {
    this.table.rows = rows;
    return this;
  }

  /**
   * Set pagination info
   */
  setPagination(page: number, pageSize: number, total: number): this {
    this.table.pagination = { page, pageSize, total };
    return this;
  }

  /**
   * Build from database query result
   */
  static fromQueryResult(
    context: BotContext,
    rows: Array<Record<string, any>>,
    columnConfig: Array<{ key: string; label: string; type?: TableColumn['type'] }>
  ): TableDefinition {
    const renderer = new TableRenderer(context);
    
    for (const col of columnConfig) {
      renderer.addColumn(col.key, col.label, col.type || 'text');
    }
    
    renderer.setRows(rows);
    return renderer.build();
  }

  /**
   * Build and return table definition
   */
  build(): TableDefinition {
    if (this.table.columns.length === 0) {
      throw new Error('Table must have at least one column');
    }
    return this.table;
  }
}
