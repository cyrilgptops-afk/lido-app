# Lido Connect - Frontend Implementation

## ✅ Implemented Components

### User-Facing Chat Interface
**File:** `pages/chat/index.tsx`
- Real-time chat with Socket.IO integration
- Message list with bot/user avatars
- NLP intent and confidence display
- Smart suggestions (clickable chips)
- Typing indicators
- Auto-scroll to latest message
- Message input with keyboard shortcuts (Enter to send)
- File attachment button (UI ready)

### Admin Bot Management
**Files:** 
- `pages/admin/bots/index.tsx` - Bot list view
- `pages/admin/bots/new.tsx` - Create new bot
- `pages/admin/bots/[id].tsx` - Bot detail with version control

**Features:**
- Create/list bot scripts
- Upload new versions with changelog
- Deploy specific versions
- Download bot script files
- Delete non-deployed versions
- View deployment history
- Version status indicators (deployed/not deployed)
- Tabbed interface (Versions / Deployment History)

### API Client Libraries
**Files:**
- `lib/socket.ts` - Socket.IO client singleton
- `lib/api/chat.ts` - Chat API functions (create conversation, send message, get messages, upload attachment)
- `lib/api/bots.ts` - Bot API functions (CRUD, versioning, deployment)

### Navigation Updates
- Added "Bot Scripts" to Admin menu (SmartToy icon)
- Added "Chat" to Dashboard menu (Chat icon)

## 📦 Dependencies Added
Added to `apps/web/package.json`:
- `axios`: ^1.7.9 (HTTP client)
- `socket.io-client`: ^4.8.3 (WebSocket client)

## 🎨 UI/UX Features

### Chat Interface
- Clean Material UI design
- Real-time updates via WebSocket
- Message bubbles (user: right/primary, bot: left/white)
- Smart suggestion chips below bot messages
- NLP metadata badges (intent, confidence %)
- Typing indicator animation
- Responsive layout

### Admin Bot Management
- Table view with sorting
- Status chips (Active/Inactive, Deployed/Not Deployed)
- Upload dialog with file picker
- Deployment confirmation prompts
- Delete confirmation prompts
- Download script files
- Deployment history audit trail
- Version changelog display

## 🔌 API Integration

### Chat API Endpoints
```typescript
POST   /chat/conversations          // Create conversation
GET    /chat/conversations/:id/messages  // Get messages
POST   /chat/messages               // Send message (triggers NLP + bot)
POST   /chat/attachments            // Upload file
```

### Bot Scripts API Endpoints
```typescript
POST   /bot-scripts                 // Create bot
GET    /bots                        // List all bots
GET    /bots/:id                    // Get bot details
POST   /bot-scripts/:id/versions    // Upload version
GET    /bot-scripts/:id/versions    // List versions
GET    /bot-scripts/:id/versions/:vid/download  // Download
POST   /bot-scripts/:id/versions/:vid/deploy    // Deploy
GET    /bot-scripts/:id/deployments // History
DELETE /bot-scripts/:id/versions/:vid // Delete
POST   /bot-scripts/assign          // Assign to conversation
```

## 🚀 How to Use

### Start Development Servers
```bash
# Terminal 1: API server
cd apps/api
npm run dev

# Terminal 2: Web frontend
cd apps/web
npm run dev

# Terminal 3: Rasa NLP
cd rasa
rasa run --enable-api --cors "*" --port 5005
```

### Access the App
- **User Chat:** http://localhost:3000/chat
- **Admin Bots:** http://localhost:3000/admin/bots
- **Create Bot:** http://localhost:3000/admin/bots/new

### Create & Deploy a Bot
1. Go to Admin → Bot Scripts
2. Click "Create New Bot"
3. Enter name and description
4. Click on the bot to open detail page
5. Click "Upload New Version"
6. Choose your `.js` file (e.g., `examples/account-help-bot-v2.js`)
7. Enter version (e.g., `1.0.0`) and changelog
8. Click "Upload"
9. Click the rocket icon (🚀) to deploy
10. Test in the chat interface

### Test the Chat
1. Navigate to Chat page
2. Type a message like "I need help with my account"
3. Bot will respond with NLP-detected intent
4. Click on smart suggestions to quickly send responses
5. Watch real-time updates via Socket.IO

## 🎯 Key Features

### Real-Time Communication
- Socket.IO automatic reconnection
- Typing indicators
- Instant message delivery
- Real-time bot responses

### Version Control
- Upload multiple versions per bot
- SHA-256 checksums prevent duplicates
- Deploy any version instantly
- Rollback by deploying previous version
- Audit trail of all deployments

### NLP Integration
- Automatic intent detection (via Rasa)
- Entity extraction display
- Confidence scoring
- Smart suggestions based on context
- Fallback responses

### Security
- JWT authentication required
- Admin-only bot management
- Organization-scoped data access
- File upload validation

## 📝 Environment Variables

Add to `apps/web/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## 🐛 Troubleshooting

### Socket.IO Connection Issues
- Check API server is running on port 4000
- Verify JWT token is stored in localStorage
- Check browser console for connection errors

### NLP Not Working
- Ensure Rasa is running on port 5005
- Check `LIDO_CONNECT_RASA_URL` in API `.env`
- Verify Rasa model is trained (`rasa train`)

### Bot Not Responding
- Verify bot is deployed (check deployment status)
- Check bot script syntax (upload validates)
- Review bot execution logs in database (`bot_execution_logs`)

## 🔮 Future Enhancements
- [ ] Voice/video calls (WebRTC UI)
- [ ] Agent dashboard (live conversations)
- [ ] Chat history search
- [ ] Export conversation transcripts
- [ ] Bot analytics dashboard
- [ ] A/B testing for bot responses
- [ ] Multi-language support
- [ ] Dark mode
