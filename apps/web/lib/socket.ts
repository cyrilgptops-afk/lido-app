import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export interface SocketConfig {
  url: string;
  token: string;
}

export function initializeSocket(config: SocketConfig): Socket {
  if (socket?.connected) {
    return socket;
  }

  socket = io(config.url, {
    auth: {
      token: config.token,
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    console.log('✅ Socket.IO connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Socket.IO disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket.IO connection error:', error);
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
    socket = null;
  }
}

export default {
  initialize: initializeSocket,
  get: getSocket,
  disconnect: disconnectSocket,
};
