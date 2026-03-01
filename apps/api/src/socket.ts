/**
 * Socket.IO Integration - Lido Connect
 * 
 * Real-time communication for chat, video calls, and agent presence
 */

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from './lib/logger';
import { WebRTCService } from './services/webrtc.service';
import { agentRouter } from './services/agent-router.service';

let _io: SocketIOServer | null = null;

/** Returns the Socket.IO server instance (available after initializeSocketIO has been called). */
export function getIO(): SocketIOServer | null {
  return _io;
}

export function initializeSocketIO(httpServer: HTTPServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  const webrtcService = new WebRTCService(io);

  // JWT authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { sub: string; email: string; role: string };
      socket.data.userId = decoded.sub;
      socket.data.role = decoded.role;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;
    const role = socket.data.role;

    logger.info({ userId, role, socketId: socket.id }, 'User connected to Lido Connect');

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Join role-specific rooms
    if (role === 'admin') {
      socket.join('admins');
    }
    if (role === 'agent' || role === 'admin') {
      socket.join('agents');
    }

    // Setup WebRTC handlers
    webrtcService.setupHandlers(socket, userId);

    // Chat events
    socket.on('chat:join', async ({ conversationId }) => {
      socket.join(`conversation:${conversationId}`);
      logger.info({ userId, conversationId }, 'Joined conversation');
    });

    socket.on('chat:leave', async ({ conversationId }) => {
      socket.leave(`conversation:${conversationId}`);
      logger.info({ userId, conversationId }, 'Left conversation');
    });

    socket.on('chat:typing', async ({ conversationId, isTyping }) => {
      socket.to(`conversation:${conversationId}`).emit('chat:typing', {
        userId,
        isTyping,
      });
    });

    socket.on('chat:message', async (data) => {
      const { conversationId, content, messageId } = data;
      logger.info({ userId, conversationId, messageId }, 'Chat message broadcast');

      // Broadcast to conversation participants
      socket.to(`conversation:${conversationId}`).emit('chat:message', {
        conversationId,
        messageId,
        content,
        senderId: userId,
        timestamp: new Date(),
      });
    });

    // Agent presence updates
    socket.on('agent:status', async ({ status }) => {
      if (role !== 'agent' && role !== 'admin') {
        return;
      }

      await agentRouter.updateAgentStatus(parseInt(userId), status);

      // Broadcast to supervisors/admins
      socket.to('admins').emit('agent:status-changed', {
        agentId: userId,
        status,
      });

      logger.info({ userId, status }, 'Agent status updated via socket');
    });

    // Agent call queue events
    socket.on('agent:queue-status', async () => {
      if (role !== 'agent' && role !== 'admin') {
        return;
      }

      // Fetch queue status (can be extended with Redis queue)
      socket.emit('agent:queue-status', {
        pending: 0,
        active: 0,
      });
    });

    // Disconnect handler
    socket.on('disconnect', async () => {
      logger.info({ userId, socketId: socket.id }, 'User disconnected from Lido Connect');

      // Auto set agent to offline if they disconnect
      if (role === 'agent') {
        await agentRouter.updateAgentStatus(parseInt(userId), 'offline');
        socket.to('admins').emit('agent:status-changed', {
          agentId: userId,
          status: 'offline',
        });
      }
    });
  });

  logger.info('Socket.IO initialized for Lido Connect');
  _io = io;
  return io;
}
