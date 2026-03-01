-- ============================================================================
-- Migration: 013_create_bot_scripts_schema
-- Description: Create tables for bot script management
-- ============================================================================

-- Bot Scripts Table
CREATE TABLE IF NOT EXISTS bot_scripts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid CHAR(36) NOT NULL UNIQUE,
  organization_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
  is_active BOOLEAN DEFAULT TRUE,
  deployed_version_id INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  INDEX idx_org_id (organization_id),
  INDEX idx_uuid (uuid),
  INDEX idx_active (is_active),
  INDEX idx_deleted (deleted_at),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Conversation Bot Assignment
CREATE TABLE IF NOT EXISTS conversation_bots (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  conversation_id BIGINT UNSIGNED NOT NULL,
  bot_id INT UNSIGNED NOT NULL,
  assigned_by BIGINT UNSIGNED NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_conversation (conversation_id),
  INDEX idx_bot (bot_id),
  UNIQUE KEY unique_conversation_bot (conversation_id, bot_id),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (bot_id) REFERENCES bot_scripts(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bot Execution Logs
CREATE TABLE IF NOT EXISTS bot_execution_logs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  bot_id INT UNSIGNED NOT NULL,
  conversation_id BIGINT UNSIGNED NOT NULL,
  message_id BIGINT UNSIGNED NOT NULL,
  intent VARCHAR(100) NOT NULL,
  handler_function VARCHAR(255) NOT NULL,
  execution_time_ms INT UNSIGNED NOT NULL,
  success BOOLEAN DEFAULT TRUE,
  response_data JSON,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_bot_id (bot_id),
  INDEX idx_conversation (conversation_id),
  INDEX idx_intent (intent),
  INDEX idx_created (created_at),
  FOREIGN KEY (bot_id) REFERENCES bot_scripts(id) ON DELETE CASCADE,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
