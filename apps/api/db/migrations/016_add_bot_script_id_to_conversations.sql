-- 016: pin each conversation to a specific bot script
-- This allows the chat page to load the correct bot when a user has multiple
-- deployed chat bots and selects one via the sidebar nav (?botId=<id>).

ALTER TABLE conversations
  ADD COLUMN bot_script_id INT UNSIGNED NULL AFTER organization_id,
  ADD INDEX idx_conversations_bot_script_id (bot_script_id),
  ADD CONSTRAINT fk_conversations_bot_script
    FOREIGN KEY (bot_script_id) REFERENCES bot_scripts(id) ON DELETE SET NULL;
