import { Server, Socket } from 'socket.io';
import { query } from '../db/pool';
import { UserTokenPayload } from '../utils/jwt';

export interface MonacoChange {
  range: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  };
  rangeOffset: number;
  rangeLength: number;
  text: string;
}

export interface CollaboratorMember {
  id: string;
  username: string;
  email: string;
  color: string;
  activeFileId?: string;
  cursorPosition?: {
    lineNumber: number;
    column: number;
  };
}

const COLLABORATOR_COLORS = [
  '#e5a93c', // Amber
  '#4ec9b0', // Emerald
  '#4fc1ff', // Sky
  '#f14c4c', // Rose
  '#c586c0', // Purple
  '#ce9178'  // Orange
];

// Room state: projectId -> Map<userId, CollaboratorMember & { socketId: string }>
const projectRooms = new Map<string, Map<string, CollaboratorMember & { socketId: string }>>();

export function registerEditorSyncHandlers(io: Server, socket: Socket) {
  const user = socket.data.user as UserTokenPayload;
  let currentProjectId: string | null = null;

  // 1. Join Project Room
  socket.on('room:join', async (data: { projectId: string }) => {
    try {
      const { projectId } = data;
      if (!projectId) return;

      // Leave previous room if joined
      if (currentProjectId && currentProjectId !== projectId) {
        handleLeaveRoom(currentProjectId);
      }

      currentProjectId = projectId;
      const roomId = `project:${projectId}`;
      socket.join(roomId);

      // Initialize room members map if not existing
      if (!projectRooms.has(projectId)) {
        projectRooms.set(projectId, new Map());
      }
      const roomMembers = projectRooms.get(projectId)!;

      // Assign deterministic color based on existing count
      const assignedColor = COLLABORATOR_COLORS[roomMembers.size % COLLABORATOR_COLORS.length];

      const memberInfo: CollaboratorMember & { socketId: string } = {
        socketId: socket.id,
        id: user.id,
        username: user.username,
        email: user.email,
        color: assignedColor
      };
      roomMembers.set(user.id, memberInfo);

      // Fetch recent 50 chat messages from database
      let pastMessages: any[] = [];
      try {
        const chatRes = await query(
          `SELECT c.id, c.user_id as "userId", u.username, c.message, c.created_at as "createdAt"
           FROM chat_messages c
           JOIN users u ON c.user_id = u.id
           WHERE c.project_id = $1
           ORDER BY c.created_at ASC
           LIMIT 50`,
          [projectId]
        );
        pastMessages = chatRes.rows;
      } catch (chatErr) {
        console.warn(`[Socket] Failed to fetch past chat messages for project ${projectId}:`, chatErr);
      }

      // Convert current members to array (excluding internal socketId)
      const membersList: CollaboratorMember[] = Array.from(roomMembers.values()).map(
        ({ socketId, ...rest }) => rest
      );

      // Send room:joined event to the connecting user
      socket.emit('room:joined', {
        projectId,
        assignedColor,
        members: membersList,
        pastMessages
      });

      // Broadcast room:user_joined to all other members in the room
      socket.to(roomId).emit('room:user_joined', {
        user: {
          id: user.id,
          username: user.username,
          color: assignedColor
        }
      });

      console.log(`[Socket] User ${user.username} joined room ${roomId} (${roomMembers.size} active)`);
    } catch (err: any) {
      console.error(`[Socket room:join Error]:`, err);
      socket.emit('error', { message: 'Failed to join project room' });
    }
  });

  // 2. Editor Delta Broadcast (CRITICAL: socket.to avoids infinite echo loop)
  socket.on('editor:change', (data: {
    projectId: string;
    fileId: string;
    changes: MonacoChange[];
    version: number;
  }) => {
    const { projectId, fileId, changes, version } = data;
    if (!projectId || !fileId || !changes || !Array.isArray(changes)) return;

    const roomId = `project:${projectId}`;

    // Broadcast ONLY to peers in the room (sender never receives its own keystrokes back)
    socket.to(roomId).emit('editor:change', {
      fileId,
      changes,
      senderId: user.id,
      version
    });
  });

  // 3. Cursor Move Broadcast
  socket.on('cursor:move', (data: {
    projectId: string;
    fileId: string;
    position: { lineNumber: number; column: number };
  }) => {
    const { projectId, fileId, position } = data;
    if (!projectId || !position) return;

    const roomId = `project:${projectId}`;
    const room = projectRooms.get(projectId);
    const member = room?.get(user.id);

    if (member) {
      member.activeFileId = fileId;
      member.cursorPosition = position;
    }

    // Broadcast remote cursor update to peers
    socket.to(roomId).emit('cursor:update', {
      userId: user.id,
      username: user.username,
      color: member?.color || '#4fc1ff',
      position,
      fileId
    });
  });

  // 4. Collaborative Chat Send
  socket.on('chat:send', async (data: { projectId: string; message: string }) => {
    try {
      const { projectId, message } = data;
      if (!projectId || !message || !message.trim()) return;

      const trimmedMsg = message.trim();
      const roomId = `project:${projectId}`;
      const room = projectRooms.get(projectId);
      const member = room?.get(user.id);

      // Persist to PostgreSQL chat_messages table
      const res = await query(
        `INSERT INTO chat_messages (project_id, user_id, message)
         VALUES ($1, $2, $3)
         RETURNING id, created_at as "createdAt"`,
        [projectId, user.id, trimmedMsg]
      );

      const savedMessage = res.rows[0];

      // Broadcast to ALL members in the room (including sender so UI confirms persistence)
      io.to(roomId).emit('chat:message', {
        id: savedMessage.id,
        userId: user.id,
        username: user.username,
        color: member?.color || '#4fc1ff',
        message: trimmedMsg,
        createdAt: savedMessage.createdAt
      });
    } catch (err: any) {
      console.error(`[Socket chat:send Error]:`, err);
      socket.emit('error', { message: 'Failed to send chat message' });
    }
  });

  // Helper to remove user from room
  const handleLeaveRoom = (projectId: string) => {
    const roomId = `project:${projectId}`;
    socket.leave(roomId);

    const room = projectRooms.get(projectId);
    if (room) {
      room.delete(user.id);
      if (room.size === 0) {
        projectRooms.delete(projectId);
      } else {
        socket.to(roomId).emit('room:user_left', { userId: user.id });
      }
    }
    console.log(`[Socket] User ${user.username} left room ${roomId}`);
  };

  // 5. Disconnect Lifecycle
  socket.on('disconnect', () => {
    if (currentProjectId) {
      handleLeaveRoom(currentProjectId);
    }
    console.log(`[Socket] User disconnected: ${socket.id} (${user.username})`);
  });
}
