# Lido Connect - Communication Platform

## Environment Variables

Add these to your `.env` file in `apps/api/`:

```bash
# NLP Configuration (Rasa)
NLP_ADAPTER=rasa
RASA_URL=http://localhost:5005
RASA_TOKEN=your_rasa_token_here
NLP_TIMEOUT=10000
NLP_RETRY_ATTEMPTS=2
NLP_CONFIDENCE_THRESHOLD=0.7

# WebRTC Configuration
STUN_SERVERS=stun:stun.l.google.com:19302
TURN_SERVERS=[]
RECORDING_ENABLED=true

# Agent Routing
AGENT_ROUTING_STRATEGY=load-balanced
AGENT_QUEUE_TIMEOUT=300
AGENT_MAX_QUEUE_SIZE=100

# Limits
MAX_MESSAGE_LENGTH=10000
MAX_ATTACHMENT_SIZE=52428800
MAX_CALL_DURATION=3600
MAX_SUGGESTIONS=3
```

## Database Migration

Run the migration to create the communication tables:

```bash
# Connect to MySQL
mysql -u root -p lido_db

# Run the migration
source apps/api/db/migrations/012_create_communication_schema.sql

# Verify tables
SHOW TABLES;
```

## Rasa Setup

### Option 1: Docker (Recommended)

Add to your `docker-compose.yml`:

```yaml
services:
  rasa:
    image: rasa/rasa:3.6.0-full
    ports:
      - "5005:5005"
    volumes:
      - ./rasa:/app
    command:
      - run
      - --enable-api
      - --cors
      - "*"
    environment:
      - RASA_TOKEN=${RASA_TOKEN}
    networks:
      - lido-network
```

### Option 2: Local Installation

```bash
# Install Rasa
pip install rasa

# Initialize a new Rasa project
rasa init --no-prompt

# Train the model
rasa train

# Run Rasa server
rasa run --enable-api --cors "*" --port 5005
```

### Basic Rasa Configuration

Create a minimal `rasa/domain.yml`:

```yaml
version: "3.1"

intents:
  - greet
  - goodbye
  - affirm
  - deny
  - help
  - thank

responses:
  utter_greet:
    - text: "Hello! How can I help you?"
  utter_goodbye:
    - text: "Goodbye! Have a great day!"
  utter_help:
    - text: "How can I assist you?"
  utter_thank:
    - text: "You're welcome!"

actions:
  - utter_greet
  - utter_goodbye
  - utter_help
  - utter_thank
```

## API Routes

### Chat Routes

- `POST /chat/messages` - Send a message (with NLP processing)
- `POST /chat/attachments` - Upload attachment
- `GET /chat/conversations/:conversationId/messages` - Get conversation history
- `GET /chat/conversations` - Get all user conversations

### Call Routes

- `POST /calls` - Initiate video/audio/agent call
- `POST /calls/:callId/end` - End a call
- `POST /calls/:callId/rate` - Rate a call
- `GET /calls/history` - Get call history
- `POST /calls/agent/status` - Update agent status (agent/admin only)
- `GET /calls/agent/stats` - Get agent statistics (agent/admin only)

## Socket.IO Events

### Chat Events

- `chat:join` - Join a conversation
- `chat:leave` - Leave a conversation
- `chat:typing` - Typing indicator
- `chat:message` - Real-time message broadcast

### WebRTC Events

- `webrtc:offer` - Send WebRTC offer
- `webrtc:answer` - Send WebRTC answer
- `webrtc:ice-candidate` - Exchange ICE candidates
- `call:join` - Join a call
- `call:leave` - Leave a call
- `call:start-recording` - Start recording
- `call:stop-recording` - Stop recording

### Agent Events

- `agent:status` - Update agent status
- `agent:status-changed` - Agent status changed (broadcast)
- `agent:queue-status` - Get queue status

## Testing

### Test NLP Endpoint

```bash
# Test Rasa health
curl http://localhost:5005/status

# Test message parsing
curl -X POST http://localhost:5005/model/parse \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello"}'
```

### Test Chat API

```bash
# Send a message
curl -X POST http://localhost:4000/chat/messages \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Hello, I need help with my account",
    "contentType": "text"
  }'
```

### Test WebSocket Connection

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000', {
  auth: { token: 'YOUR_JWT_TOKEN' }
});

socket.on('connect', () => {
  console.log('Connected to Lido Connect');
  
  // Join conversation
  socket.emit('chat:join', { conversationId: 'uuid-here' });
  
  // Listen for messages
  socket.on('chat:message', (data) => {
    console.log('Message received:', data);
  });
});
```

## Architecture

```
Lido Connect Architecture

┌─────────────────────────────────────┐
│   Frontend (Next.js Pages Router)  │
│   - Chat UI                         │
│   - Video Call UI                   │
│   - Agent Dashboard                 │
└────────────┬────────────────────────┘
             │ WebSocket + HTTPS
┌────────────▼────────────────────────┐
│   API Gateway (Express + Socket.IO) │
│   - /chat routes                    │
│   - /calls routes                   │
│   - JWT authentication              │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│   Services Layer                    │
│   - NLP Adapter (Rasa)             │
│   - WebRTC Service                  │
│   - Agent Router Service            │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│   Data Layer                        │
│   - MySQL (conversations, messages) │
│   - Redis (sessions, queues)        │
│   - MinIO (recordings, attachments) │
└─────────────────────────────────────┘
```

## Features

✅ **Smart Text Suggestions** - AI-powered autocomplete using Rasa NLP  
✅ **Text Chat** - Real-time messaging with rich formatting  
✅ **Video Calls** - WebRTC peer-to-peer video/audio  
✅ **Agent Calls** - Route to live agents with skill-based matching  
✅ **NLP Intent Detection** - Understand user intent and extract entities  
✅ **Call Recording** - Record and store calls in MinIO  
✅ **Agent Routing** - Load-balanced, skill-based, and round-robin strategies  
✅ **Real-time Presence** - Socket.IO for typing indicators and agent status  
✅ **Structured Logging** - Pino logger with request tracing  
✅ **RBAC** - Role-based access control for agents and admins

## Next Steps

1. Run database migration
2. Start Rasa server (Docker or local)
3. Update `.env` with Rasa URL
4. Install Socket.IO client dependencies: `npm install socket.io-client`
5. Create frontend components for chat and video calls
6. Test NLP endpoints
7. Deploy to staging environment

## Security Considerations

- JWT authentication on all Socket.IO connections
- Rate limiting on chat and call endpoints
- File size limits on attachments (50 MB)
- Message length validation (10,000 chars)
- Agent RBAC enforcement
- Soft deletes on all tables
- Recording storage in MinIO with 7-day auto-delete

## Monitoring

Track these metrics in Prometheus/Grafana:

- `nlp_requests_total{adapter, operation, success}`
- `nlp_latency_seconds{adapter}`
- `chat_messages_total`
- `active_calls_total{type}`
- `agent_queue_depth`
- `call_duration_seconds`

---

**Lido Connect** - Unified communication platform for Lido SaaS
