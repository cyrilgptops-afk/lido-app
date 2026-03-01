# Lido Connect - Bot Scripts Examples

This directory contains sample bot scripts demonstrating the Lido Connect bot runtime capabilities.

## Available Examples

### account-help-bot-v2.js
A comprehensive bot handling account-related queries:
- Account information display
- Password resets
- Email updates
- Profile management
- Security settings
- Account deletion

## Bot Script Structure

All bot scripts must follow this structure:

```javascript
module.exports = {
  name: 'Bot Name',
  version: '1.0.0',
  
  // Optional initialization
  async initialize(context) {
    // Setup code
  },
  
  // Intent handlers
  intents: {
    intent_name: async (context, helpers) => {
      // Handler logic
      return {
        message: 'Response text',
        suggestions: ['Option 1', 'Option 2'],
        form: formDefinition,
        table: tableDefinition,
        actions: actionButtons,
        metadata: {}
      };
    },
    
    // Wildcard fallback
    '*': async (context, helpers) => {
      return { message: 'Fallback response' };
    }
  }
};
```

## Helper Classes

Bot scripts have access to these helpers:

- **suggestions** - SmartSuggestion instance
- **db** - DatabaseQuery instance (org-scoped, whitelisted tables)
- **form** - FormBuilder instance
- **table** - TableRenderer instance
- **utils** - BotUtils instance

## Testing a Bot Script

1. Upload via API:
```bash
curl -X POST http://localhost:4000/bot-scripts/1/versions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "script=@account-help-bot-v2.js" \
  -F "version=2.0.0" \
  -F "changelog=Initial version"
```

2. Deploy the version:
```bash
curl -X POST http://localhost:4000/bot-scripts/1/versions/VERSION_ID/deploy \
  -H "Authorization: Bearer YOUR_TOKEN"
```

3. Test in chat:
Send a message to trigger the bot's intent handlers.

## Best Practices

- Keep handlers focused and simple
- Always provide a fallback ('*') handler
- Use async/await for database operations
- Validate user input before processing
- Return meaningful error messages
- Include relevant suggestions
- Log important events via console methods
