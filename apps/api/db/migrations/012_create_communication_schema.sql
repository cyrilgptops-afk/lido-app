-- Lido Connect Communication Schema
-- Supports NLP-powered chat, video calls, and agent routing

-- Chat conversations
CREATE TABLE conversations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid CHAR(36) NOT NULL UNIQUE,
  user_id BIGINT UNSIGNED NOT NULL,
  organization_id BIGINT UNSIGNED NOT NULL,
  type ENUM('user_bot', 'user_agent', 'group') NOT NULL DEFAULT 'user_bot',
  status ENUM('active', 'closed', 'archived') NOT NULL DEFAULT 'active',
  metadata JSON DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  INDEX idx_user_org (user_id, organization_id, deleted_at),
  INDEX idx_status (status, deleted_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Chat messages with Rasa NLP integration
CREATE TABLE messages (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid CHAR(36) NOT NULL UNIQUE,
  conversation_id BIGINT UNSIGNED NOT NULL,
  sender_id BIGINT UNSIGNED NOT NULL,
  sender_type ENUM('user', 'agent', 'bot') NOT NULL,
  content TEXT NOT NULL,
  content_type ENUM('text', 'attachment', 'system') NOT NULL DEFAULT 'text',
  attachment_key TEXT NULL,
  nlp_intent VARCHAR(100) DEFAULT NULL,
  nlp_entities JSON DEFAULT NULL,
  nlp_confidence DECIMAL(3,2) DEFAULT NULL,
  nlp_suggestions JSON DEFAULT NULL,
  metadata JSON DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  INDEX idx_conversation (conversation_id, created_at, deleted_at),
  INDEX idx_sender (sender_id, sender_type, deleted_at),
  INDEX idx_intent (nlp_intent, deleted_at),
  FULLTEXT idx_content (content),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Video/agent calls
CREATE TABLE calls (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid CHAR(36) NOT NULL UNIQUE,
  conversation_id BIGINT UNSIGNED NOT NULL,
  initiator_id BIGINT UNSIGNED NOT NULL,
  agent_id BIGINT UNSIGNED NULL,
  type ENUM('video', 'audio', 'agent') NOT NULL,
  status ENUM('pending', 'ringing', 'active', 'ended', 'failed') NOT NULL DEFAULT 'pending',
  started_at TIMESTAMP NULL DEFAULT NULL,
  ended_at TIMESTAMP NULL DEFAULT NULL,
  duration_seconds INT UNSIGNED DEFAULT 0,
  recording_key TEXT NULL,
  transcript_key TEXT NULL,
  metadata JSON DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  INDEX idx_conversation (conversation_id, deleted_at),
  INDEX idx_status (status, deleted_at),
  INDEX idx_agent (agent_id, status, deleted_at),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (initiator_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Agent availability and routing
CREATE TABLE agent_profiles (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL UNIQUE,
  status ENUM('online', 'busy', 'away', 'offline') NOT NULL DEFAULT 'offline',
  skills JSON DEFAULT NULL,
  max_concurrent_calls INT UNSIGNED DEFAULT 3,
  current_calls INT UNSIGNED DEFAULT 0,
  total_calls INT UNSIGNED DEFAULT 0,
  avg_rating DECIMAL(3,2) DEFAULT NULL,
  last_active_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status, current_calls),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Call ratings and feedback
CREATE TABLE call_ratings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  call_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  rating TINYINT UNSIGNED NOT NULL,
  feedback TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_call (call_id),
  INDEX idx_agent_rating (call_id, rating),
  FOREIGN KEY (call_id) REFERENCES calls(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- NLP processing logs (for debugging and analytics)
CREATE TABLE nlp_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  message_id BIGINT UNSIGNED NOT NULL,
  adapter VARCHAR(50) NOT NULL,
  operation VARCHAR(50) NOT NULL,
  latency_ms INT UNSIGNED DEFAULT 0,
  success BOOLEAN NOT NULL DEFAULT TRUE,
  error_message TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_message (message_id),
  INDEX idx_adapter_success (adapter, success, created_at),
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
