# Lido SaaS Automation Platform

A SaaS automation platform that allows users to deploy and manage bots that integrate with external services (Dropbox, Google Drive, Zoho, etc.).

## 🚀 Quick Start

### Development Mode

#### Windows
```bash
dev.cmd
```

#### Linux/Mac
```bash
chmod +x dev.sh
./dev.sh
```

#### Using npm
```bash
npm run dev
```

This will start:
- **API Server**: http://localhost:3001
- **Web App**: http://localhost:3000
- **API Docs**: http://localhost:3001/api-docs

### Manual Setup

1. **Install dependencies**
   ```bash
   npm run install:all
   ```

2. **Configure environment**
   ```bash
   cp .env.example apps/api/.env
   # Edit apps/api/.env with your configuration
   ```

3. **Start development servers**
   ```bash
   # Run both API and Web
   npm run dev

   # Or run individually
   npm run dev:api
   npm run dev:web
   ```

## 📁 Project Structure

```
lido-app/
├── apps/
│   ├── api/              # Express.js API Gateway
│   │   ├── src/
│   │   │   ├── cache/    # Cache layer (Redis/Memory)
│   │   │   ├── config/   # Configuration files
│   │   │   ├── lib/      # Utilities (logger, redis, etc.)
│   │   │   ├── middleware/
│   │   │   └── routes/   # API routes
│   │   └── package.json
│   └── web/              # Next.js Frontend
│       ├── components/
│       ├── pages/
│       └── package.json
├── packages/             # Shared packages (future)
│   ├── bot-engine/
│   ├── integrations/
│   └── shared/
├── .env.example
├── dev.cmd              # Windows launcher
├── dev.sh               # Linux/Mac launcher
└── package.json         # Root package.json
```

## 🛠️ Available Scripts

### Root Level
- `npm run dev` - Start both API and Web in development mode
- `npm run dev:api` - Start only API server
- `npm run dev:web` - Start only Web server
- `npm run build` - Build both API and Web
- `npm run start` - Start both in production mode
- `npm run lint` - Lint both projects
- `npm run test` - Run tests

### API (`apps/api`)
- `npm run dev` - Start API in development mode with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run Jest tests

### Web (`apps/web`)
- `npm run dev` - Start Next.js dev server
- `npm run build` - Build for production
- `npm start` - Start production server

## 🔧 Configuration

### Environment Variables

See `.env.example` for all available configuration options.

Key variables:
- `NODE_ENV` - Environment (development/production)
- `PORT` - API server port (default: 3001)
- `JWT_SECRET` - Secret key for JWT tokens
- `CACHE_ADAPTER` - Cache backend (memory/redis)
- `REDIS_HOST` - Redis host (if using Redis cache)

### Cache Configuration

The API supports two cache adapters:

1. **Memory** (default for development)
   - No setup required
   - Data cleared on restart
   - Good for development

2. **Redis** (recommended for production)
   ```bash
   CACHE_ADAPTER=redis
   REDIS_HOST=localhost
   REDIS_PORT=6379
   ```

## 📚 API Documentation

Interactive API documentation available at:
- Swagger UI: http://localhost:3001/api-docs
- OpenAPI JSON: http://localhost:3001/api-docs.json

### Key Endpoints

- `GET /health` - Health check with Redis status
- `POST /auth/oauth/callback` - OAuth authentication
- `GET /bots` - List user's bots
- `POST /bots/deploy` - Deploy a new bot
- `GET /services/list` - List available integrations
- `DELETE /services/:id/disconnect` - Disconnect a service

## 🏗️ Architecture

### API Gateway Layer
- Express.js REST API
- JWT authentication
- Rate limiting
- Request validation with Zod
- Structured logging with Pino
- Redis/Memory caching

### Cache Layer
- Singleton Redis client with lifecycle management
- Support for String, Hash, List, Set operations
- Automatic reconnection
- Health checks
- Type-safe JSON operations

### Frontend Layer
- Next.js with App Router
- React Server Components
- TailwindCSS styling
- OAuth integration

## 🧪 Testing

```bash
# Run all tests
npm test

# Run API tests only
npm run test:api

# Run tests in watch mode
cd apps/api && npm test -- --watch
```

## 📦 Production Build

```bash
# Build all
npm run build

# Start production servers
npm start
```

## 🐛 Debugging

### Enable Debug Logging
```bash
LOG_LEVEL=debug npm run dev:api
```

### Check Redis Connection
```bash
curl http://localhost:3001/health
```

### View API Logs
Logs are automatically formatted in development with `pino-pretty`.

## 🤝 Contributing

1. Follow TypeScript best practices
2. Use structured logging (never `console.log`)
3. Validate all inputs with Zod
4. Write tests for new features
5. Update API documentation (OpenAPI comments)
6. Follow the project's coding conventions

## 📄 License

MIT

## 🔗 Links

- [Architecture Guide](.github/copilot-instructions.md)
- [Redis Usage Guide](apps/api/REDIS_USAGE.md)
- [API Documentation](http://localhost:3001/api-docs)
