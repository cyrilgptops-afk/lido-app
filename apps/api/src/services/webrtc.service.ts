/**
 * WebRTC Service
 * 
 * Handles WebRTC signaling, call management, and recording
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '../lib/logger';
import { communicationConfig } from '../config';
import { db } from '../lib/db';
import { getStorageClient } from '../lib/storage';

interface ActiveCall {
  participants: Set<string>;
  startedAt: Date;
  conversationId: string;
}

export class WebRTCService {
  private io: SocketIOServer;
  private activeCalls = new Map<string, ActiveCall>();

  constructor(io: SocketIOServer) {
    this.io = io;
  }

  setupHandlers(socket: Socket, userId: string): void {
    // WebRTC offer
    socket.on('webrtc:offer', async ({ callId, offer, targetUserId }) => {
      logger.info({ callId, userId, targetUserId }, 'WebRTC offer received');
      socket.to(`user:${targetUserId}`).emit('webrtc:offer', {
        callId,
        offer,
        fromUserId: userId,
        iceServers: this.getICEServers(),
      });
    });

    // WebRTC answer
    socket.on('webrtc:answer', async ({ callId, answer, targetUserId }) => {
      logger.info({ callId, userId, targetUserId }, 'WebRTC answer received');
      socket.to(`user:${targetUserId}`).emit('webrtc:answer', {
        callId,
        answer,
        fromUserId: userId,
      });

      await db.queryRaw(
        `UPDATE calls SET status = 'active', started_at = NOW() WHERE uuid = ? AND status = 'ringing' AND deleted_at IS NULL`,
        [callId]
      );
    });

    // ICE candidate
    socket.on('webrtc:ice-candidate', async ({ callId, candidate, targetUserId }) => {
      socket.to(`user:${targetUserId}`).emit('webrtc:ice-candidate', {
        callId,
        candidate,
        fromUserId: userId,
      });
    });

    // Join call
    socket.on('call:join', async ({ callId, conversationId }) => {
      socket.join(`call:${callId}`);

      if (!this.activeCalls.has(callId)) {
        this.activeCalls.set(callId, {
          participants: new Set(),
          startedAt: new Date(),
          conversationId,
        });
      }

      const call = this.activeCalls.get(callId)!;
      call.participants.add(userId);

      logger.info({
        callId,
        userId,
        participantCount: call.participants.size,
      }, 'User joined call');

      socket.to(`call:${callId}`).emit('call:participant-joined', { userId });
    });

    // Leave call
    socket.on('call:leave', async ({ callId }) => {
      socket.leave(`call:${callId}`);

      const call = this.activeCalls.get(callId);
      if (call) {
        call.participants.delete(userId);

        socket.to(`call:${callId}`).emit('call:participant-left', { userId });

        if (call.participants.size === 0) {
          await this.finalizeCall(callId);
          this.activeCalls.delete(callId);
          logger.info({ callId }, 'Call ended - no participants remaining');
        }
      }
    });

    // Recording control
    socket.on('call:start-recording', async ({ callId }) => {
      if (!communicationConfig.webrtc.recordingEnabled) {
        socket.emit('call:recording-error', { error: 'Recording disabled' });
        return;
      }

      logger.info({ callId, userId }, 'Recording started');
      socket.to(`call:${callId}`).emit('call:recording-started', { by: userId });
    });

    socket.on('call:stop-recording', async ({ callId, recordingBlob }) => {
      logger.info({ callId, userId }, 'Recording stopped');

      try {
        const storageClient = await getStorageClient();
        const timestamp = Date.now();
        const key = `recordings/${callId}/recording-${timestamp}.webm`;

        const uploadResult = await storageClient.upload(
          'lido-cache',
          key,
          recordingBlob,
          { contentType: 'video/webm' }
        );

        if (uploadResult.success) {
          await db.queryRaw(
            `UPDATE calls SET recording_key = ? WHERE uuid = ? AND deleted_at IS NULL`,
            [key, callId]
          );
          logger.info({ callId, key }, 'Recording saved');
        }
      } catch (error) {
        logger.error({ error, callId }, 'Failed to save recording');
      }

      socket.to(`call:${callId}`).emit('call:recording-stopped');
    });
  }

  private async finalizeCall(callId: string): Promise<void> {
    await db.queryRaw(
      `UPDATE calls SET status = 'ended', ended_at = NOW(),
       duration_seconds = TIMESTAMPDIFF(SECOND, started_at, NOW())
       WHERE uuid = ? AND status = 'active' AND deleted_at IS NULL`,
      [callId]
    );
  }

  getICEServers(): Array<{ urls: string; username?: string; credential?: string }> {
    return [
      ...communicationConfig.webrtc.stunServers.map(url => ({ urls: url })),
      ...communicationConfig.webrtc.turnServers,
    ];
  }
}
