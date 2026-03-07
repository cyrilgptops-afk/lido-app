/**
 * Call Routes - Lido Connect
 * 
 * Handles video/audio calls and agent routing
 */

import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/authenticate';
import { db } from '../lib/db';
import { successResponse, errorResponse } from '../lib/response';
import { agentRouter } from '../services/agent-router.service';
import { logger } from '../lib/logger';
import crypto from 'crypto';

const router = Router();

const InitiateCallSchema = z.object({
  conversationId: z.string().uuid(),
  type: z.enum(['video', 'audio', 'agent']),
  requiredSkills: z.array(z.string()).optional(),
});

const RateCallSchema = z.object({
  rating: z.number().min(1).max(5),
  feedback: z.string().max(1000).optional(),
});

// Initiate call
router.post('/', authenticate, async (req, res) => {
  try {
    const { conversationId, type, requiredSkills } = InitiateCallSchema.parse(req.body);
    const userId = parseInt(req.user!.sub);

    const callUuid = crypto.randomUUID();
    let agentId: number | null = null;

    // Find agent if agent call
    if (type === 'agent') {
      const agentResult = await agentRouter.findAvailableAgent(requiredSkills || []);
      if (!agentResult.success) {
        return res.status(503).json(errorResponse('NO_AGENTS', agentResult.error!));
      }
      agentId = agentResult.data!;
    }

    const convIdNum = await db.queryOne<{ id: number }>(
      `SELECT id FROM conversations WHERE uuid = ? AND deleted_at IS NULL`,
      [conversationId]
    );

    if (!convIdNum) {
      return res.status(404).json(errorResponse('NOT_FOUND', 'Conversation not found'));
    }

    await db.queryRaw(
      `INSERT INTO calls (uuid, conversation_id, initiator_id, agent_id, type, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [callUuid, convIdNum.id, userId, agentId, type, agentId ? 'ringing' : 'pending']
    );

    logger.info({ callId: callUuid, userId, type, agentId, requestId: req.id }, 'Call initiated');

    return res.json(successResponse({ callId: callUuid, agentId }));
  } catch (error) {
    logger.error({ error, requestId: req.id }, 'Initiate call failed');
    return res.status(400).json(errorResponse('INVALID_REQUEST', 'Failed to initiate call'));
  }
});

// End call
router.post('/:callId/end', authenticate, async (req, res) => {
  try {
    const { callId } = req.params;

    const call = await db.queryOne<{ id: number; agent_id: number | null; status: string }>(
      `SELECT id, agent_id, status FROM calls WHERE uuid = ? AND deleted_at IS NULL`,
      [callId]
    );

    if (!call) {
      return res.status(404).json(errorResponse('NOT_FOUND', 'Call not found'));
    }

    if (call.status === 'ended') {
      return res.status(400).json(errorResponse('ALREADY_ENDED', 'Call already ended'));
    }

    await db.queryRaw(
      `UPDATE calls SET status = 'ended', ended_at = NOW(),
       duration_seconds = TIMESTAMPDIFF(SECOND, started_at, NOW())
       WHERE uuid = ? AND deleted_at IS NULL`,
      [callId]
    );

    if (call.agent_id) {
      await agentRouter.releaseAgent(call.agent_id);
    }

    logger.info({ callId, requestId: req.id }, 'Call ended');

    return res.json(successResponse({ callId }));
  } catch (error) {
    logger.error({ error, requestId: req.id }, 'End call failed');
    return res.status(500).json(errorResponse('END_CALL_FAILED', 'Failed to end call'));
  }
});

// Rate call
router.post('/:callId/rate', authenticate, async (req, res) => {
  try {
    const { callId } = req.params;
    const { rating, feedback } = RateCallSchema.parse(req.body);
    const userId = parseInt(req.user!.sub);

    const call = await db.queryOne<{ id: number; agent_id: number | null; status: string }>(
      `SELECT id, agent_id, status FROM calls WHERE uuid = ? AND deleted_at IS NULL`,
      [callId]
    );

    if (!call) {
      return res.status(404).json(errorResponse('NOT_FOUND', 'Call not found'));
    }

    if (call.status !== 'ended') {
      return res.status(400).json(errorResponse('CALL_ACTIVE', 'Cannot rate active call'));
    }

    await db.queryRaw(
      `INSERT INTO call_ratings (call_id, user_id, rating, feedback) VALUES (?, ?, ?, ?)`,
      [call.id, userId, rating, feedback || null]
    );

    // Update agent's average rating
    if (call.agent_id) {
      await db.queryRaw(
        `UPDATE agent_profiles
         SET avg_rating = (
           SELECT AVG(cr.rating)
           FROM call_ratings cr
           JOIN calls c ON cr.call_id = c.id
           WHERE c.agent_id = ? AND c.deleted_at IS NULL
         )
         WHERE user_id = ?`,
        [call.agent_id, call.agent_id]
      );
    }

    logger.info({ callId, userId, rating, requestId: req.id }, 'Call rated');

    return res.json(successResponse({ callId, rating }));
  } catch (error) {
    logger.error({ error, requestId: req.id }, 'Rate call failed');
    return res.status(400).json(errorResponse('INVALID_REQUEST', 'Failed to rate call'));
  }
});

// Get call history
router.get('/history', authenticate, async (req, res) => {
  try {
    const userId = parseInt(req.user!.sub);
    const { limit = '20', offset = '0' } = req.query;

    const safeLimit = Math.floor(parseInt(limit as string)) || 20;
    const safeOffset = Math.floor(parseInt(offset as string)) || 0;

    const calls = await db.query(
      `SELECT c.uuid, c.type, c.status, c.started_at, c.ended_at, c.duration_seconds,
              u.email as agent_email,
              cr.rating, cr.feedback
       FROM calls c
       LEFT JOIN users u ON c.agent_id = u.id
       LEFT JOIN call_ratings cr ON c.id = cr.call_id AND cr.user_id = ?
       WHERE c.initiator_id = ? AND c.deleted_at IS NULL
       ORDER BY c.created_at DESC
       LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      [userId, userId]
    );

    return res.json(successResponse({ calls }));
  } catch (error) {
    logger.error({ error }, 'Fetch call history failed');
    return res.status(500).json(errorResponse('FETCH_FAILED', 'Failed to fetch call history'));
  }
});

// Agent status update
router.post('/agent/status', authenticate, requireRole('agent', 'admin'), async (req, res) => {
  try {
    const { status } = z.object({ status: z.enum(['online', 'busy', 'away', 'offline']) }).parse(req.body);
    const agentId = parseInt(req.user!.sub);

    await agentRouter.updateAgentStatus(agentId, status);

    logger.info({ agentId, status, requestId: req.id }, 'Agent status updated');

    return res.json(successResponse({ status }));
  } catch (error) {
    logger.error({ error, requestId: req.id }, 'Update agent status failed');
    return res.status(400).json(errorResponse('INVALID_REQUEST', 'Failed to update status'));
  }
});

// Agent stats
router.get('/agent/stats', authenticate, requireRole('agent', 'admin'), async (req, res) => {
  try {
    const agentId = parseInt(req.user!.sub);
    const stats = await agentRouter.getAgentStats(agentId);

    if (!stats) {
      return res.status(404).json(errorResponse('NOT_FOUND', 'Agent profile not found'));
    }

    return res.json(successResponse(stats));
  } catch (error) {
    logger.error({ error }, 'Fetch agent stats failed');
    return res.status(500).json(errorResponse('FETCH_FAILED', 'Failed to fetch stats'));
  }
});

export default router;
