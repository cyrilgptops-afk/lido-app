import { createHash } from 'crypto';

export interface StorageUploadResult {
  success: boolean;
  data?: {
    key: string;
    size: number;
    checksum: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Bot Script Storage Service
 * 
 * Manages version control and storage of bot scripts in MinIO
 */
export class BotScriptStorageService {
  private storage: any;
  private db: any;
  private logger?: any;
  private readonly BUCKET = 'lido-bots';

  constructor(storage: any, db: any, logger?: any) {
    this.storage = storage;
    this.db = db;
    this.logger = logger;
  }

  /**
   * Upload a new bot script version
   */
  async uploadVersion(
    botId: string,
    version: string,
    scriptContent: string,
    userId: string,
    changelog?: string
  ): Promise<StorageUploadResult> {
    try {
      // Get bot org_id
      const botSql = 'SELECT organization_id FROM bot_scripts WHERE id = ? AND deleted_at IS NULL';
      const botResult = await this.db.queryOne(botSql, [botId]);
      
      if (!botResult) {
        return {
          success: false,
          error: { code: 'BOT_NOT_FOUND', message: 'Bot not found' },
        };
      }

      const orgId = botResult.organization_id;

      // Calculate checksum
      const checksum = this.calculateChecksum(scriptContent);

      // Check for duplicate content
      const dupSql = 'SELECT id FROM bot_script_versions WHERE bot_id = ? AND checksum = ?';
      const dupResult = await this.db.queryOne(dupSql, [botId, checksum]);
      
      if (dupResult) {
        return {
          success: false,
          error: {
            code: 'DUPLICATE_CONTENT',
            message: 'This exact script version already exists',
          },
        };
      }

      // Generate storage key
      const timestamp = Date.now();
      const storageKey = `bot-scripts/${orgId}/${botId}/${version}-${timestamp}.js`;

      // Upload to MinIO
      const buffer = Buffer.from(scriptContent, 'utf-8');
      const uploadResult = await this.storage.upload(
        this.BUCKET,
        storageKey,
        buffer,
        {
          contentType: 'application/javascript',
          metadata: {
            botId,
            version,
            uploadedBy: userId,
            timestamp: timestamp.toString(),
          },
        }
      );

      if (!uploadResult.success) {
        this.logger?.error({ error: uploadResult.error, storageKey }, 'MinIO upload failed');
        return {
          success: false,
          error: {
            code: 'STORAGE_UPLOAD_FAILED',
            message: uploadResult.error?.message || 'Failed to upload script to storage',
          },
        };
      }

      this.logger?.info({ storageKey, size: buffer.length }, 'Script uploaded to MinIO successfully');

      // Insert version record
      const insertSql = `
        INSERT INTO bot_script_versions (
          uuid, bot_id, version, storage_key, file_size,
          checksum, changelog, created_by, created_at
        ) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, NOW())
      `;

      await this.db.queryRaw(insertSql, [
        botId,
        version,
        storageKey,
        buffer.length,
        checksum,
        changelog || null,
        userId,
      ]);

      this.logger?.info({ botId, version, storageKey }, 'Bot script version uploaded successfully');

      return {
        success: true,
        data: {
          key: storageKey,
          size: buffer.length,
          checksum,
        },
      };
    } catch (error) {
      this.logger?.error({ error, botId, version }, 'Failed to upload bot script version');
      return {
        success: false,
        error: {
          code: 'UPLOAD_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Download a bot script version
   */
  async downloadVersion(versionId: string): Promise<{ success: boolean; data?: string; error?: any }> {
    try {
      const sql = 'SELECT storage_key FROM bot_script_versions WHERE id = ?';
      const result = await this.db.queryOne(sql, [versionId]);

      if (!result) {
        return {
          success: false,
          error: { code: 'VERSION_NOT_FOUND', message: 'Version not found' },
        };
      }

      const downloadResult = await this.storage.download(this.BUCKET, result.storage_key);

      if (!downloadResult.success) {
        this.logger?.error({ error: downloadResult.error, versionId, storageKey: result.storage_key }, 'Storage download failed');
        return {
          success: false,
          error: {
            code: 'STORAGE_DOWNLOAD_FAILED',
            message: downloadResult.error?.message || 'Failed to download script from storage',
          },
        };
      }

      // Read stream to string
      const chunks: Buffer[] = [];
      const stream = downloadResult.stream!;
      
      return new Promise((resolve) => {
        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('end', () => {
          const scriptContent = Buffer.concat(chunks).toString('utf-8');
          resolve({ success: true, data: scriptContent });
        });
        stream.on('error', (error: Error) => {
          this.logger?.error({ error, versionId }, 'Stream read error');
          resolve({
            success: false,
            error: { code: 'STREAM_ERROR', message: 'Failed to read script content' },
          });
        });
      });
    } catch (error) {
      this.logger?.error({ error, versionId }, 'Failed to download bot script version');
      return {
        success: false,
        error: { code: 'DOWNLOAD_ERROR', message: 'Failed to download script' },
      };
    }
  }

  /**
   * Deploy a specific version
   */
  async deployVersion(
    botId: string,
    versionId: string,
    userId: string
  ): Promise<{ success: boolean; error?: any }> {
    try {
      // Get current deployed version
      const currentSql = 'SELECT deployed_version_id FROM bot_scripts WHERE id = ? AND deleted_at IS NULL';
      const currentResult = await this.db.queryOne(currentSql, [botId]);

      if (!currentResult) {
        return {
          success: false,
          error: { code: 'BOT_NOT_FOUND', message: 'Bot not found' },
        };
      }

      const previousVersionId = currentResult.deployed_version_id;

      // Get the version number
      const versionData = await this.db.queryOne(
        'SELECT version FROM bot_script_versions WHERE id = ?',
        [versionId]
      );

      if (!versionData) {
        return {
          success: false,
          error: { code: 'VERSION_NOT_FOUND', message: 'Version not found' },
        };
      }

      // Update bot deployed version and version number
      const updateSql = 'UPDATE bot_scripts SET deployed_version_id = ?, version = ?, updated_at = NOW() WHERE id = ?';
      await this.db.queryRaw(updateSql, [versionId, versionData.version, botId]);

      // Mark version as deployed
      const markSql = 'UPDATE bot_script_versions SET is_deployed = TRUE WHERE id = ?';
      await this.db.queryRaw(markSql, [versionId]);

      // Unmark previous version
      if (previousVersionId) {
        const unmarkSql = 'UPDATE bot_script_versions SET is_deployed = FALSE WHERE id = ?';
        await this.db.queryRaw(unmarkSql, [previousVersionId]);
      }

      // Log deployment
      const logSql = `
        INSERT INTO bot_script_deployments (
          uuid, bot_id, version_id, deployed_by,
          deployed_from_version, deployment_status, deployed_at
        ) VALUES (UUID(), ?, ?, ?, ?, 'success', NOW())
      `;

      await this.db.queryRaw(logSql, [botId, versionId, userId, previousVersionId]);

      this.logger?.info({ botId, versionId, userId }, 'Bot script version deployed successfully');

      return { success: true };
    } catch (error) {
      this.logger?.error({ error, botId, versionId }, 'Failed to deploy bot script version');
      return {
        success: false,
        error: { code: 'DEPLOY_ERROR', message: 'Failed to deploy version' },
      };
    }
  }

  /**
   * List all versions for a bot
   */
  async listVersions(botId: string): Promise<any[]> {
    const sql = `
      SELECT id, uuid, version, file_size, checksum,
             changelog, is_deployed, created_by, created_at
      FROM bot_script_versions
      WHERE bot_id = ?
      ORDER BY created_at DESC
    `;

    const rows = await this.db.query(sql, [botId]);
    return rows;
  }

  /**
   * Get deployment history
   */
  async getDeploymentHistory(botId: string, limit: number = 10): Promise<any[]> {
    const sql = `
      SELECT d.*, v.version, u.email as deployed_by_email
      FROM bot_script_deployments d
      JOIN bot_script_versions v ON d.version_id = v.id
      LEFT JOIN users u ON d.deployed_by = u.id
      WHERE d.bot_id = ?
      ORDER BY d.deployed_at DESC
      LIMIT ?
    `;

    const rows = await this.db.query(sql, [botId, limit]);
    return rows;
  }

  /**
   * Delete a version (soft delete)
   */
  async deleteVersion(versionId: string): Promise<{ success: boolean; error?: any }> {
    try {
      // Check if version is currently deployed
      const checkSql = 'SELECT is_deployed FROM bot_script_versions WHERE id = ?';
      const result = await this.db.queryOne(checkSql, [versionId]);

      if (!result) {
        return {
          success: false,
          error: { code: 'VERSION_NOT_FOUND', message: 'Version not found' },
        };
      }

      if (result.is_deployed) {
        return {
          success: false,
          error: {
            code: 'VERSION_DEPLOYED',
            message: 'Cannot delete currently deployed version',
          },
        };
      }

      // Soft delete in database
      const deleteSql = 'UPDATE bot_script_versions SET deleted_at = NOW() WHERE id = ?';
      await this.db.queryRaw(deleteSql, [versionId]);

      // Note: We keep the file in MinIO for audit purposes

      return { success: true };
    } catch (error) {
      this.logger?.error({ error, versionId }, 'Failed to delete bot script version');
      return {
        success: false,
        error: { code: 'DELETE_ERROR', message: 'Failed to delete version' },
      };
    }
  }

  /**
   * Calculate SHA-256 checksum
   */
  private calculateChecksum(content: string): string {
    return createHash('sha256').update(content, 'utf8').digest('hex');
  }
}
