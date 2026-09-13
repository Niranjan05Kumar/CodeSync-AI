import { useEffect, useCallback } from 'react';
import { getSocket } from '../sockets/socketClient';
import { useProjectStore } from '../store/useProjectStore';
import { useAuthStore } from '../store/useAuthStore';
import { MonacoChange, ChatMessage } from '../types';

export function useSocketSync() {
  const { 
    currentProject, 
    setCollaborators, 
    updateCollaboratorCursor, 
    removeCollaborator, 
    setChatMessages, 
    addChatMessage,
    clearChatMessages,
    deleteChatMessage
  } = useProjectStore();
  const { accessToken, user } = useAuthStore();

  useEffect(() => {
    if (!currentProject || !accessToken) return;

    const socket = getSocket();

    // Ensure socket auth has the latest token
    socket.auth = { token: `Bearer ${accessToken}` };

    if (!socket.connected) {
      socket.connect();
    }

    // Join project room
    socket.emit('room:join', { projectId: currentProject.id });

    // 1. Initial room state hydration
    const handleRoomJoined = (data: {
      projectId: string;
      assignedColor: string;
      members: any[];
      pastMessages: any[];
    }) => {
      // Exclude self from collaborators list
      const remoteMembers = data.members.filter((m) => m.id !== user?.id);
      setCollaborators(remoteMembers);

      if (data.pastMessages && Array.isArray(data.pastMessages)) {
        const formatted: ChatMessage[] = data.pastMessages.map((m) => ({
          id: m.id,
          userId: m.userId,
          username: m.username,
          color: '#4fc1ff',
          message: m.message,
          createdAt: m.createdAt
        }));
        setChatMessages(formatted);
      }
    };

    // 2. Peer joined
    const handleUserJoined = (data: { user: { id: string; username: string; color: string } }) => {
      if (data.user.id === user?.id) return;
      setCollaborators([
        ...useProjectStore.getState().collaborators.filter((c) => c.id !== data.user.id),
        {
          id: data.user.id,
          username: data.user.username,
          color: data.user.color
        }
      ]);
    };

    // 3. Peer left
    const handleUserLeft = (data: { userId: string }) => {
      removeCollaborator(data.userId);
    };

    // 4. Remote cursor moved
    const handleCursorUpdate = (data: {
      userId: string;
      username: string;
      color: string;
      position: { lineNumber: number; column: number };
      fileId: string;
    }) => {
      if (data.userId === user?.id) return;
      updateCollaboratorCursor(data.userId, data.position, data.fileId, data.username, data.color);
    };

    // 5. In-room chat message
    const handleChatMessage = (data: ChatMessage) => {
      addChatMessage(data);
    };

    // 6. In-room chat cleared
    const handleChatCleared = () => {
      clearChatMessages();
    };

    // 7. In-room single message deleted
    const handleChatDeleted = (data: { messageId: string }) => {
      if (data?.messageId) {
        deleteChatMessage(data.messageId);
      }
    };

    socket.on('room:joined', handleRoomJoined);
    socket.on('room:user_joined', handleUserJoined);
    socket.on('room:user_left', handleUserLeft);
    socket.on('cursor:update', handleCursorUpdate);
    socket.on('chat:message', handleChatMessage);
    socket.on('chat:cleared', handleChatCleared);
    socket.on('chat:deleted', handleChatDeleted);

    return () => {
      socket.off('room:joined', handleRoomJoined);
      socket.off('room:user_joined', handleUserJoined);
      socket.off('room:user_left', handleUserLeft);
      socket.off('cursor:update', handleCursorUpdate);
      socket.off('chat:message', handleChatMessage);
      socket.off('chat:cleared', handleChatCleared);
      socket.off('chat:deleted', handleChatDeleted);
    };
  }, [currentProject?.id, accessToken, user?.id, setCollaborators, updateCollaboratorCursor, removeCollaborator, setChatMessages, addChatMessage, clearChatMessages, deleteChatMessage]);

  // Broadcast cursor movement
  const broadcastCursorMove = useCallback((fileId: string, position: { lineNumber: number; column: number }) => {
    if (!currentProject) return;
    const socket = getSocket();
    if (socket.connected) {
      socket.emit('cursor:move', {
        projectId: currentProject.id,
        fileId,
        position
      });
    }
  }, [currentProject]);

  // Broadcast Monaco delta changes
  const broadcastDeltaChange = useCallback((fileId: string, changes: MonacoChange[], version: number) => {
    if (!currentProject) return;
    const socket = getSocket();
    if (socket.connected) {
      socket.emit('editor:change', {
        projectId: currentProject.id,
        fileId,
        changes,
        version
      });
    }
  }, [currentProject]);

  // Broadcast chat message
  const broadcastChatMessage = useCallback((message: string) => {
    if (!currentProject || !message.trim()) return;
    const socket = getSocket();
    if (socket.connected) {
      socket.emit('chat:send', {
        projectId: currentProject.id,
        message: message.trim()
      });
    }
  }, [currentProject]);

  return {
    broadcastCursorMove,
    broadcastDeltaChange,
    broadcastChatMessage
  };
}
