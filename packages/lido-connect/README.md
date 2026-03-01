# @lido/connect

Communication platform package for Lido SaaS, providing NLP-powered chat, customizable bot runtime, WebRTC video calls, and intelligent agent routing.

## Features

- **NLP Integration** - Rasa-based natural language processing with intent detection and entity extraction
- **Bot Runtime** - Sandboxed JavaScript execution for customizable bot scripts with predefined helper classes
- **Storage Service** - MinIO-based version control for bot scripts
- **WebRTC** - Peer-to-peer video/audio calls with recording
- **Agent Routing** - Intelligent routing strategies (round-robin, skill-based, load-balanced)

## Installation

```bash
pnpm add @lido/connect
```

## Usage

### NLP Client

```typescript
import { getNLPClient, createNLPConfig } from '@lido/connect';

const nlpConfig = createNLPConfig({
  LIDO_CONNECT_NLP_ADAPTER: 'rasa',
  LIDO_CONNECT_RASA_URL: 'http://localhost:5005',
  LIDO_CONNECT_NLP_CONFIDENCE_THRESHOLD: '0.7'
});

const nlpClient = await getNLPClient(nlpConfig);
const result = await nlpClient.parseMessage('I need help with my account');

if (result.success) {
  console.log('Intent:', result.data.intent.name);
  console.log('Confidence:', result.data.intent.confidence);
}
```

### Bot Script Executor

```typescript
import { BotScriptExecutor } from '@lido/connect';

const executor = new BotScriptExecutor(logger);
await executor.loadScript('my-bot', scriptCode);

const response = await executor.execute('my-bot', 'account_help', context);
console.log(response.message);
```

### Storage Service

```typescript
import { BotScriptStorageService } from '@lido/connect';

const storage = new BotScriptStorageService(storageClient, db, logger);
const result = await storage.uploadVersion(botId, '2.0.0', scriptContent, userId, 'Added billing support');
```

## Development

```bash
# Build package
pnpm build

# Watch mode
pnpm watch

# Run tests
pnpm test

# Lint code
pnpm lint
```

## License

MIT
