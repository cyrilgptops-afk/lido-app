-- ==================== Users Table (Independent & Lightweight) ====================
-- Pure user identity. No roles, no org logic.
-- Following Lido principle: Keep bots small and focused, one table = one concern.

CREATE TABLE `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `uuid` CHAR(36) NOT NULL UNIQUE COMMENT 'Public UUID for API references',
  
  -- Core Identity (Minimal)
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `email_verified_at` TIMESTAMP NULL,
  
  -- Profile (Basic)
  `first_name` VARCHAR(100) NULL,
  `last_name` VARCHAR(100) NULL,
  `avatar_url` TEXT NULL,
  
  -- User State
  `status` ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
  
  -- Flexible Properties (Lido pattern: JSON for extensibility)
  `preferences` JSON NULL COMMENT 'UI preferences: theme, language, timezone, notifications',
  `metadata` JSON NULL COMMENT 'System metadata: signup_source, last_login_ip, utm_params',
  
  -- Timestamps
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL COMMENT 'Soft delete',
  `last_seen_at` TIMESTAMP NULL COMMENT 'Last activity timestamp',
  
  PRIMARY KEY (`id`),
  UNIQUE INDEX `idx_email` (`email`),
  UNIQUE INDEX `idx_uuid` (`uuid`),
  INDEX `idx_status` (`status`),
  INDEX `idx_deleted_at` (`deleted_at`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Independent user profiles. No roles/org logic. Pure identity.';

-- Virtual columns for common preferences (Lido best practice: index frequently queried JSON)
ALTER TABLE `users` 
  ADD COLUMN `theme` VARCHAR(20) 
    AS (JSON_UNQUOTE(JSON_EXTRACT(`preferences`, '$.theme'))) VIRTUAL,
  ADD COLUMN `language` VARCHAR(10) 
    AS (JSON_UNQUOTE(JSON_EXTRACT(`preferences`, '$.language'))) VIRTUAL,
  ADD INDEX `idx_theme` (`theme`),
  ADD INDEX `idx_language` (`language`);

-- ==================== Organizations Table (Independent) ====================
CREATE TABLE `organizations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `uuid` CHAR(36) NOT NULL UNIQUE,
  `name` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(100) NOT NULL UNIQUE,
  `logo_url` TEXT NULL,
  `settings` JSON NULL COMMENT 'Org settings: max_bots, max_integrations, feature_flags, billing',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `idx_slug` (`slug`),
  INDEX `idx_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Independent organizations/tenants. No user references.';

-- ==================== Roles Table (Independent) ====================
CREATE TABLE `roles` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(50) NOT NULL UNIQUE COMMENT 'owner, admin, member, viewer',
  `description` VARCHAR(255) NULL,
  `permissions` JSON NULL COMMENT 'Array of permission strings: ["bots:create", "bots:delete", "services:connect"]',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `idx_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Role definitions with permissions. Independent of users/orgs.';

-- ==================== User Organization Memberships (Join Table) ====================
-- This table connects users to orgs with roles
CREATE TABLE `user_organizations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `org_id` BIGINT UNSIGNED NOT NULL,
  `role_id` INT UNSIGNED NOT NULL,
  
  -- Membership metadata
  `invited_by` BIGINT UNSIGNED NULL COMMENT 'User ID who invited',
  `joined_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  
  PRIMARY KEY (`id`),
  UNIQUE INDEX `idx_user_org_unique` (`user_id`, `org_id`, `deleted_at`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_org_id` (`org_id`),
  INDEX `idx_role_id` (`role_id`),
  INDEX `idx_is_active` (`is_active`),
  
  CONSTRAINT `fk_user_orgs_user_id` 
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) 
    ON DELETE CASCADE,
  CONSTRAINT `fk_user_orgs_org_id` 
    FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) 
    ON DELETE CASCADE,
  CONSTRAINT `fk_user_orgs_role_id` 
    FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) 
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='User-to-Organization memberships with roles. Many-to-many relationship.';

-- ==================== Seed Roles ====================
INSERT INTO `roles` (`name`, `description`, `permissions`) VALUES
('owner', 'Organization owner with full access', JSON_ARRAY(
  'org:manage', 'org:delete',
  'members:invite', 'members:remove', 'members:manage_roles',
  'bots:create', 'bots:edit', 'bots:delete', 'bots:view',
  'services:connect', 'services:disconnect', 'services:view',
  'billing:manage', 'settings:manage'
)),
('admin', 'Organization administrator', JSON_ARRAY(
  'members:invite', 'members:manage_roles',
  'bots:create', 'bots:edit', 'bots:delete', 'bots:view',
  'services:connect', 'services:disconnect', 'services:view',
  'settings:manage'
)),
('member', 'Regular member with bot access', JSON_ARRAY(
  'bots:create', 'bots:edit', 'bots:view',
  'services:connect', 'services:view'
)),
('viewer', 'Read-only access', JSON_ARRAY(
  'bots:view',
  'services:view'
));

-- ==================== Seed Sample Data ====================
-- Create demo organization
INSERT INTO `organizations` (`uuid`, `name`, `slug`, `settings`) VALUES (
  UUID(),
  'Lido Demo Workspace',
  'lido-demo',
  JSON_OBJECT(
    'plan', 'free',
    'max_bots', 5,
    'max_integrations', 3,
    'max_members', 5,
    'features', JSON_ARRAY('basic_bots', 'email_notifications')
  )
);

-- Create demo user
INSERT INTO `users` (
  `uuid`, 
  `email`, 
  `email_verified_at`,
  `first_name`, 
  `last_name`,
  `status`,
  `preferences`,
  `metadata`
) VALUES (
  UUID(),
  'demo@lido.app',
  NOW(),
  'Demo',
  'User',
  'active',
  JSON_OBJECT(
    'theme', 'dark',
    'language', 'en',
    'timezone', 'UTC',
    'notifications', JSON_OBJECT('email', true, 'push', false)
  ),
  JSON_OBJECT(
    'signup_source', 'direct',
    'utm_campaign', NULL
  )
);

-- Assign demo user as owner of demo org
INSERT INTO `user_organizations` (`user_id`, `org_id`, `role_id`) VALUES (
  (SELECT id FROM users WHERE email = 'demo@lido.app' LIMIT 1),
  (SELECT id FROM organizations WHERE slug = 'lido-demo' LIMIT 1),
  (SELECT id FROM roles WHERE name = 'owner' LIMIT 1)
);
