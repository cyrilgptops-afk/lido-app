# Lido Connect - Rasa NLP Engine

## Quick Start

### 1. Install Rasa (if not using Docker)

```bash
pip install rasa
```

### 2. Train the Model

```bash
cd rasa
rasa train
```

This will create a trained model in the `models/` directory.

### 3. Run Rasa Server

```bash
# Development mode
rasa run --enable-api --cors "*" --port 5005 --debug

# Production mode (with token authentication)
rasa run --enable-api --cors "*" --port 5005 --auth-token your_token_here
```

### 4. Test the NLP Engine

```bash
# Health check
curl http://localhost:5005/status

# Parse a message
curl -X POST http://localhost:5005/model/parse \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, I need help with my account"}'
```

Expected response:
```json
{
  "intent": {
    "name": "account_help",
    "confidence": 0.95
  },
  "entities": [],
  "text": "Hello, I need help with my account"
}
```

## Project Structure

```
rasa/
├── config.yml          # Pipeline and policy configuration
├── domain.yml          # Bot domain (intents, entities, responses)
├── data/
│   ├── nlu.yml        # Training data for NLU
│   ├── stories.yml    # Conversation flows
│   └── rules.yml      # Rule-based behavior
└── models/            # Trained models (generated)
```

## Supported Intents

- `greet` - User greetings
- `goodbye` - User farewells
- `affirm` - Affirmations (yes, sure, etc.)
- `deny` - Denials (no, never, etc.)
- `help` - Help requests
- `thank` - Thank you messages
- `bot_challenge` - User asks if bot is human
- `account_help` - Account-related issues
- `technical_support` - Technical problems
- `billing_inquiry` - Billing questions

## Customization

### Add New Intent

1. Add to `domain.yml`:
```yaml
intents:
  - my_new_intent
```

2. Add training examples in `data/nlu.yml`:
```yaml
- intent: my_new_intent
  examples: |
    - example phrase 1
    - example phrase 2
```

3. Add response in `domain.yml`:
```yaml
responses:
  utter_my_new_intent:
    - text: "Response text here"
```

4. Retrain the model:
```bash
rasa train
```

### Add Entities

```yaml
# In domain.yml
entities:
  - product_name
  - account_type

# In data/nlu.yml
- intent: account_help
  examples: |
    - I need help with my [premium](account_type) account
    - My [basic](account_type) plan is not working
```

## Docker Setup

Use the provided `docker-compose.yml` configuration:

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
```

Run:
```bash
docker-compose up -d rasa
```

## Testing with Lido Connect

Once Rasa is running, the Lido Connect API will automatically use it for NLP processing:

```bash
# Send a message via Lido Connect API
curl -X POST http://localhost:4000/chat/messages \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "I need help with my account",
    "contentType": "text"
  }'
```

The response will include:
- `nlpIntent` - Detected intent and confidence
- `nlpEntities` - Extracted entities
- `nlpSuggestions` - Smart reply suggestions

## Production Considerations

1. **Token Authentication**: Always use `--auth-token` in production
2. **Model Updates**: Train models offline and deploy to production
3. **Monitoring**: Track NLP confidence scores and latency
4. **Fallback**: Configure fallback responses for low-confidence predictions
5. **Scaling**: Use Redis for tracker store in high-traffic scenarios

## Advanced Configuration

### Custom Actions (Python)

Create `actions/actions.py`:

```python
from typing import Any, Text, Dict, List
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher

class ActionEscalateToAgent(Action):
    def name(self) -> Text:
        return "action_escalate_to_agent"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        dispatcher.utter_message(text="Connecting you to a live agent...")
        return []
```

Run actions server:
```bash
rasa run actions
```

## Troubleshooting

### Model not found
```bash
# Ensure you've trained the model
rasa train
```

### Port already in use
```bash
# Kill existing Rasa process
pkill -f rasa
# Or use a different port
rasa run --port 5006
```

### Low confidence predictions
- Add more training examples
- Increase epochs in `config.yml`
- Add synonyms for entities

---

**Lido Connect** - Powered by Rasa NLP
