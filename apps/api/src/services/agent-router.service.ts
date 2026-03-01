/**
 * Agent Router Service
 * 
 * Handles agent availability, routing, and load balancing
 */

import { db } from '../lib/db';
import { logger } from '../lib/logger';
import { communicationConfig } from '../config';

interface AgentProfile {
  user_id: number;
  status: 'online' | 'busy' | 'away' | 'offline';
  skills: string[];
  current_calls: number;
  max_concurrent_calls: number;
  avg_rating: number | null;
}

export class AgentRouterService {
  async findAvailableAgent(requiredSkills: string[] = []): Promise<{ success: boolean; data?: number; error?: string }> {
    try {
      const agents = await db.query<AgentProfile>(
        `SELECT user_id, status, skills, current_calls, max_concurrent_calls, avg_rating
         FROM agent_profiles
         WHERE status = 'online'
         AND current_calls < max_concurrent_calls
         ORDER BY current_calls ASC, avg_rating DESC
         LIMIT 10`
      );

      if (agents.length === 0) {
        return { success: false, error: 'No agents available' };
      }

      let selectedAgent: AgentProfile | null = null;

      if (requiredSkills.length > 0 && communicationConfig.agent.routingStrategy === 'skill-based') {
        // Skill-based routing
        selectedAgent = agents.find(agent =>
          agent.skills && requiredSkills.every(skill => agent.skills.includes(skill))
        ) || null;
      }

      if (!selectedAgent) {
        // Fallback to load-balanced routing
        selectedAgent = agents[0];
      }

      if (!selectedAgent) {
        return { success: false, error: 'No suitable agent found' };
      }

      // Increment agent's current call count
      await db.queryRaw(
        `UPDATE agent_profiles SET current_calls = current_calls + 1, last_active_at = NOW() WHERE user_id = ?`,
        [selectedAgent.user_id]
      );

      logger.info({ agentId: selectedAgent.user_id, skills: requiredSkills }, 'Agent assigned');
      return { success: true, data: selectedAgent.user_id };
    } catch (error) {
      logger.error({ error }, 'Agent routing failed');
      return { success: false, error: 'Agent routing failed' };
    }
  }

  async releaseAgent(agentId: number): Promise<void> {
    await db.queryRaw(
      `UPDATE agent_profiles SET current_calls = GREATEST(0, current_calls - 1), last_active_at = NOW() WHERE user_id = ?`,
      [agentId]
    );
    logger.info({ agentId }, 'Agent released');
  }

  async updateAgentStatus(agentId: number, status: 'online' | 'busy' | 'away' | 'offline'): Promise<void> {
    await db.queryRaw(
      `UPDATE agent_profiles SET status = ?, last_active_at = NOW() WHERE user_id = ?`,
      [status, agentId]
    );
    logger.info({ agentId, status }, 'Agent status updated');
  }

  async getAgentStats(agentId: number): Promise<{
    totalCalls: number;
    avgRating: number | null;
    currentStatus: string;
  } | null> {
    const stats = await db.queryOne<{
      total_calls: number;
      avg_rating: number | null;
      status: string;
    }>(
      `SELECT total_calls, avg_rating, status FROM agent_profiles WHERE user_id = ?`,
      [agentId]
    );

    if (!stats) return null;

    return {
      totalCalls: stats.total_calls,
      avgRating: stats.avg_rating,
      currentStatus: stats.status,
    };
  }
}

export const agentRouter = new AgentRouterService();
