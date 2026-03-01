import type { BotContext } from './context';

/**
 * Bot Utility Functions
 * 
 * Common helper functions for bot scripts
 */
export class BotUtils {
  private context: BotContext;

  constructor(context: BotContext) {
    this.context = context;
  }

  /**
   * Format date to user-friendly string
   */
  formatDate(date: Date | string, format: 'short' | 'long' | 'relative' = 'short'): string {
    const d = typeof date === 'string' ? new Date(date) : date;

    if (format === 'relative') {
      return this.getRelativeTime(d);
    }

    const options: Intl.DateTimeFormatOptions =
      format === 'long'
        ? { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }
        : { year: 'numeric', month: 'short', day: 'numeric' };

    return d.toLocaleDateString('en-US', options);
  }

  /**
   * Get relative time (e.g., "2 hours ago")
   */
  private getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
    
    return this.formatDate(date, 'short');
  }

  /**
   * Format currency
   */
  formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  }

  /**
   * Extract entity value by name
   */
  getEntity(entityName: string): string | null {
    const entity = this.context.entities.find((e) => e.entity === entityName);
    return entity ? entity.value : null;
  }

  /**
   * Check if entity exists
   */
  hasEntity(entityName: string): boolean {
    return this.context.entities.some((e) => e.entity === entityName);
  }

  /**
   * Generate random ID
   */
  generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sanitize user input
   */
  sanitize(input: string): string {
    return input
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim();
  }

  /**
   * Truncate text
   */
  truncate(text: string, maxLength: number, suffix: string = '...'): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - suffix.length) + suffix;
  }

  /**
   * Sleep/delay execution
   */
  async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
