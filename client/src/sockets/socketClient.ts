import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = localStorage.getItem('codesync_access_token');

    socket = io(SOCKET_URL, {
      auth: {
        token: token ? `Bearer ${token}` : ''
      },
      transports: ['websocket', 'polling'],
      autoConnect: false,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000
    });

    socket.on('connect', () => {
      console.log(`[Socket.IO] Connected to server (${socket?.id})`);
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Disconnected: ${reason}`);
    });

    socket.on('connect_error', (err) => {
      console.warn(`[Socket.IO Connection Warning]:`, err.message);
    });
  }

  return socket;
}

export function updateSocketAuthToken(token: string) {
  const currentSocket = getSocket();
  currentSocket.auth = {
    token: `Bearer ${token}`
  };
  if (currentSocket.connected) {
    currentSocket.disconnect().connect();
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
