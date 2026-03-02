-- ============================================================================
-- Migration: 015_bot_type_fields
-- Description: Add type, display_name, avatar_url, config to bot_scripts
-- ============================================================================

ALTER TABLE bot_scripts
  ADD COLUMN type         ENUM('chat', 'application') NOT NULL DEFAULT 'chat'
                          COMMENT 'chat = conversational bot; application = embedded app/tool'
                          AFTER description,
  ADD COLUMN display_name VARCHAR(255)                NULL
                          COMMENT 'User-facing name shown in the bot selector and app launcher'
                          AFTER type,
  ADD COLUMN avatar_url   TEXT                        NULL
                          COMMENT 'MinIO object key for bot avatar image (lido-assets bucket)'
                          AFTER display_name,
  ADD COLUMN config       JSON                        NULL
                          COMMENT 'Type-specific configuration (chat theme / app embed options)'
                          AFTER avatar_url,
  ADD INDEX idx_type (type);
