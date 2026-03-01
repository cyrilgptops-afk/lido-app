import type { BotContext } from './context';

/**
 * Smart Suggestion Generator
 * 
 * Generates context-aware suggestions for users
 */
export class SmartSuggestion {
  private context: BotContext;

  constructor(context: BotContext) {
    this.context = context;
  }

  /**
   * Generate suggestions based on intent
   */
  generate(intent: string, count: number = 3): string[] {
    const suggestionMap: Record<string, string[]> = {
      greet: ['View my account', 'Check my orders', 'Talk to support'],
      account_help: ['Reset password', 'Update email', 'Delete account'],
      billing: ['View invoices', 'Update payment method', 'Download receipt'],
      technical: ['Report a bug', 'Feature request', 'Check status'],
      order_status: ['Track shipment', 'Cancel order', 'Request refund'],
      product_inquiry: ['View specifications', 'Compare products', 'Read reviews'],
    };

    const suggestions = suggestionMap[intent] || [
      'Tell me more',
      'I need help',
      'Talk to an agent',
    ];

    return suggestions.slice(0, count);
  }

  /**
   * Generate suggestions from conversation history
   */
  fromHistory(history: Array<{ role: string; content: string }>): string[] {
    if (history.length === 0) {
      return this.generate('greet');
    }

    const lastMessage = history[history.length - 1];
    
    if (lastMessage.role === 'user') {
      const text = lastMessage.content.toLowerCase();
      
      if (text.includes('password')) return this.generate('account_help');
      if (text.includes('bill') || text.includes('payment')) return this.generate('billing');
      if (text.includes('order') || text.includes('track')) return this.generate('order_status');
      if (text.includes('product')) return this.generate('product_inquiry');
    }

    return this.generate(this.context.intent);
  }

  /**
   * Generate suggestions from extracted entities
   */
  fromEntities(): string[] {
    const suggestions: string[] = [];

    for (const entity of this.context.entities) {
      if (entity.entity === 'account_action') {
        suggestions.push(`Proceed with ${entity.value}`);
      } else if (entity.entity === 'product_name') {
        suggestions.push(`Learn more about ${entity.value}`);
      } else if (entity.entity === 'order_id') {
        suggestions.push(`Track order ${entity.value}`);
      }
    }

    return suggestions.length > 0 ? suggestions : this.generate(this.context.intent);
  }
}
