# Lido Connect - Quick Deployment Guide

## 🚀 Setup Instructions

### 1. Database Migration

Run the migration to create communication tables:

```bash
# Connect to MySQL
mysql -u root -p

# Select database
USE lido_db;

# Run migration
source apps/api/db/migrations/012_create_communication_schema.sql;

# Verify tables
SHOW TABLES;
```

You should see these new tables:
- `conversations`
- `messages`
- `calls`
- `agent_profiles`
- `call_ratings`
- `nlp_logs`

### 2. Install Dependencies

```bash
cd apps/api
npm install
```

This will install:
- `socket.io` - Real-time communication
- `socket.io-client` - Client library
- `@types/socket.io` - TypeScript definitions

### 3. Configure Environment

Copy and update the environment file:

```bash
cp .env.example .env
nano .env
```

Add Lido Connect configuration (already in `.env.example`):

```bash
# NLP Configuration
RASA_URL=http://localhost:5005
NLP_ADAPTER=rasa

# WebRTC
STUN_SERVERS=stun:stun.l.google.com:19302

# Agent Routing
AGENT_ROUTING_STRATEGY=load-balanced
```

### 4. Start Rasa NLP Server

#### Option A: Using Docker (Recommended)

```bash
# Pull Rasa image
docker pull rasa/rasa:3.6.0-full

# Train the model
cd rasa
docker run -v $(pwd):/app rasa/rasa:3.6.0-full train

# Run Rasa server
docker run -p 5005:5005 -v $(pwd):/app rasa/rasa:3.6.0-full \
  run --enable-api --cors "*"
```

#### Option B: Local Installation

```bash
# Install Rasa
pip install rasa

# Train model
cd rasa
rasa train

# Run server
rasa run --enable-api --cors "*" --port 5005 --debug
```

### 5. Verify Rasa is Running

```bash
# Health check
curl http://localhost:5005/status

# Test NLP parsing
curl -X POST http://localhost:5005/model/parse \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, I need help"}'
```

Expected response:
```json
{
  "intent": {
    "name": "help",
    "confidence": 0.95
  },
  "entities": [],
  "text": "Hello, I need help"
}
```

### 6. Start Lido API

```bash
cd apps/api
npm run dev
```

You should see:
```
🚀 Lido Connect API server started
Socket.IO initialized for Lido Connect
Rasa NLP adapter initialized
```

### 7. Test the API

#### Test Chat Endpoint

```bash
# Login to get JWT token
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@lido.com", "password": "your_password"}'

# Send a message (replace YOUR_JWT_TOKEN)
curl -X POST http://localhost:4000/chat/messages \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Hello, I need help with my account",
    "contentType": "text"
  }'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "messageId": "uuid-here",
    "conversationId": "uuid-here",
    "nlpIntent": {
      "name": "account_help",
      "confidence": 0.95
    },
    "nlpEntities": [],
    "nlpSuggestions": [
      {
        "text": "I can help with account-related issues...",
        "confidence": 0.9,
        "intent": "account_help"
      }
    ]
  }
}
```

#### Test WebSocket Connection

Create a test file `test-socket.js`:

```javascript
const io = require('socket.io-client');

const socket = io('http://localhost:4000', {
  auth: { token: 'YOUR_JWT_TOKEN' }
});

socket.on('connect', () => {
  console.log('✅ Connected to Lido Connect');
  
  // Join a conversation
  socket.emit('chat:join', { conversationId: 'test-conv-123' });
  
  // Listen for messages
  socket.on('chat:message', (data) => {
    console.log('📨 Message received:', data);
  });
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected');
});
```

Run:
```bash
node test-socket.js
```

### 8. Create Test Data (Optional)

#### Create an agent profile

```sql
INSERT INTO agent_profiles (user_id, status, skills, max_concurrent_calls)
VALUES (1, 'online', '["technical", "billing"]', 3);
```

#### Test agent routing

```bash
curl -X POST http://localhost:4000/calls \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "your-conversation-uuid",
    "type": "agent",
    "requiredSkills": ["technical"]
  }'
```

## 🔍 Troubleshooting

### Rasa not connecting

**Error:** `Failed to initialize Rasa adapter`

**Fix:**
```bash
# Check if Rasa is running
curl http://localhost:5005/status

# If not, start Rasa
cd rasa
rasa run --enable-api --cors "*" --port 5005
```

### Socket.IO connection failed

**Error:** `Authentication error`

**Fix:**
- Ensure JWT token is valid
- Check `JWT_SECRET` in `.env` matches the token
- Token format: `socket.io('url', { auth: { token: 'jwt-token' } })`

### Database migration failed

**Error:** `Table 'conversations' doesn't exist`

**Fix:**
```bash
# Re-run migration
mysql -u root -p lido_db < apps/api/db/migrations/012_create_communication_schema.sql
```

### NLP parsing returns low confidence

**Fix:**
- Add more training examples in `rasa/data/nlu.yml`
- Retrain the model: `rasa train`
- Lower confidence threshold in `.env`: `NLP_CONFIDENCE_THRESHOLD=0.5`

## 📊 Health Checks

### Check all services

```bash
# API Health
curl http://localhost:4000/health

# Rasa Health
curl http://localhost:5005/status

# MySQL
mysql -u root -p -e "SELECT 1;"

# Redis
redis-cli ping
```

## 🎯 Next Steps

1. ✅ Run database migration
2. ✅ Start Rasa server
3. ✅ Start Lido API with Socket.IO
4. ✅ Test chat endpoints
5. ✅ Test WebSocket connection
6. 📱 Build frontend components
7. 🎨 Create chat UI
8. 📹 Implement video call UI
9. 👥 Build agent dashboard
10. 🚀 Deploy to staging

## 📚 API Documentation

Full API docs available at: `http://localhost:4000/api-docs`

New endpoints:
- `POST /chat/messages` - Send message with NLP
- `GET /chat/conversations` - List conversations
- `POST /calls` - Initiate call
- `POST /calls/:id/end` - End call
- `POST /calls/:id/rate` - Rate call
- `POST /calls/agent/status` - Update agent status

## 🔐 Security Notes

- JWT authentication on all routes
- Socket.IO connections authenticated via JWT
- Rate limiting on chat endpoints (200 req/15min)
- File size limits on attachments (50 MB)
- Message length validation (10,000 chars)
- Agent RBAC enforcement

## 📈 Monitoring

Track in logs:
- NLP latency: `nlp_latency_ms`
- Intent confidence: `nlp_confidence`
- Active calls: `active_calls_total`
- Message throughput: `chat_messages_total`

---

**Lido Connect** is now ready! 🎉
