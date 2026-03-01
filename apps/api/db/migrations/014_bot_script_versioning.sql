-- ============================================================================
-- Migration: 014_bot_script_versioning
-- Description: Add version control and deployment tracking for bot scripts
-- ============================================================================

-- Bot Script Versions Table (stores in MinIO, not in script_code column)
CREATE TABLE IF NOT EXISTS bot_script_versions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid CHAR(36) NOT NULL UNIQUE,
  bot_id INT UNSIGNED NOT NULL,
  version VARCHAR(50) NOT NULL,
  storage_key VARCHAR(500) NOT NULL COMMENT 'MinIO object key: bot-scripts/{org_id}/{bot_id}/{version}-{timestamp}.js',
  file_size INT UNSIGNED NOT NULL,
  checksum CHAR(64) NOT NULL COMMENT 'SHA-256 checksum for duplicate detection',
  changelog TEXT,
  is_deployed BOOLEAN DEFAULT FALSE,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  INDEX idx_bot_id (bot_id),
  INDEX idx_version (bot_id, version),
  INDEX idx_checksum (bot_id, checksum),
  INDEX idx_deployed (is_deployed),
  INDEX idx_deleted (deleted_at),
  UNIQUE KEY unique_bot_version (bot_id, version),
  FOREIGN KEY (bot_id) REFERENCES bot_scripts(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bot Script Deployments Table (audit trail)
CREATE TABLE IF NOT EXISTS bot_script_deployments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid CHAR(36) NOT NULL UNIQUE,
  bot_id INT UNSIGNED NOT NULL,
  version_id INT UNSIGNED NOT NULL,
  deployed_by BIGINT UNSIGNED NOT NULL,
  deployed_from_version INT UNSIGNED NULL COMMENT 'Previous version ID for rollback tracking',
  deployment_status ENUM('success', 'failed', 'rolled_back') DEFAULT 'success',
  error_message TEXT,
  deployed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_bot_id (bot_id),
  INDEX idx_version (version_id),
  INDEX idx_deployed_at (deployed_at),
  FOREIGN KEY (bot_id) REFERENCES bot_scripts(id) ON DELETE CASCADE,
  FOREIGN KEY (version_id) REFERENCES bot_script_versions(id) ON DELETE CASCADE,
  FOREIGN KEY (deployed_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (deployed_from_version) REFERENCES bot_script_versions(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add foreign key from bot_scripts to deployed version
ALTER TABLE bot_scripts
ADD CONSTRAINT fk_deployed_version
FOREIGN KEY (deployed_version_id) REFERENCES bot_script_versions(id) ON DELETE SET NULL;
