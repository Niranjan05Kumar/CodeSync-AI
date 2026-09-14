import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import { verifyAccessToken, UserTokenPayload } from '../utils/jwt';
import { registerEditorSyncHandlers } from './editorSyncHandler';

export interface AuthenticatedSocketData {
  user: UserTokenPayload;
}

let ioInstance: SocketIOServer | null = null;

export function initSocketServer(httpServer: HTTPServer): SocketIOServer {
  const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (
          process.env.NODE_ENV !== 'production' ||
          allowedOrigins.includes(origin) ||
          allowedOrigins.includes('*') ||
          origin.endsWith('.vercel.app')
        ) {
          return callback(null, true);
        }
        return callback(new Error(`Socket.IO CORS origin '${origin}' not allowed.`));
      },
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling']
  });

  // Handshake Authentication Middleware
  io.use((socket, next) => {
    try {
      const authHeader = 
        socket.handshake.auth?.token || 
        socket.handshake.headers?.authorization;

      if (!authHeader) {
        return next(new Error('Authentication token required'));
      }

      const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.substring(7)
        : authHeader;

      const user = verifyAccessToken(token);
      socket.data.user = user;
      next();
    } catch (err: any) {
      console.warn(`[Socket.IO Auth] Handshake rejected from ${socket.id}: ${err.message}`);
      next(new Error('Authentication failed: ' + err.message));
    }
  });

  // Connection Lifecycle
  io.on('connection', (socket) => {
    const user = socket.data.user as UserTokenPayload;
    console.log(`[Socket.IO] Client connected: ${socket.id} (User: ${user.username}, ID: ${user.id})`);

    // Register editor sync, delta, cursor and chat event handlers
    registerEditorSyncHandlers(io, socket);

    socket.on('error', (err) => {
      console.error(`[Socket.IO Error] ${socket.id}:`, err);
    });
  });

  ioInstance = io;
  return io;
}

export function getIO(): SocketIOServer {
  if (!ioInstance) {
    throw new Error('Socket.IO server has not been initialized');
  }
  return ioInstance;
}
