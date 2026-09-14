import { io, Socket } from 'socket.io-client';

export function getSocketUrl(): string {
  const envUrl = import.meta.env.VITE_SOCKET_URL;
  if (envUrl && envUrl.trim() !== '') {
    // If accessing from another device (e.g. mobile/tablet on LAN), dynamically replace localhost with current host
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      try {
        const url = new URL(envUrl);
        if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
          return `${url.protocol}//${window.location.hostname}:${url.port || '5000'}`;
        }
      } catch {
        return typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000';
      }
    }
    return envUrl;
  }
  return typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000';
}

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = localStorage.getItem('codesync_access_token');
    const socketUrl = getSocketUrl();

    socket = io(socketUrl, {
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
