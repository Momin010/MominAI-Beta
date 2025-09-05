/**
 * Real-time Collaboration Panel
 * Shows active users, cursors, and collaboration features
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, User, MessageCircle, Eye, Edit } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

interface User {
  id: string;
  name: string;
  avatar?: string;
  color: string;
}

interface Presence {
  userId: string;
  status: 'online' | 'away' | 'offline';
  lastSeen: Date;
  cursor?: {
    userId: string;
    position: { line: number; column: number };
    filePath: string;
  };
}

interface CollaborationPanelProps {
  projectId: string;
  currentUser: User;
  isVisible: boolean;
  onToggle: () => void;
}

export const CollaborationPanel: React.FC<CollaborationPanelProps> = ({
  projectId,
  currentUser,
  isVisible,
  onToggle
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [presence, setPresence] = useState<Map<string, Presence>>(new Map());
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      auth: {
        userId: currentUser.id,
        projectId
      }
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('Connected to collaboration server');
      setIsConnected(true);

      // Join project room
      newSocket.emit('join-room', {
        roomId: projectId,
        user: currentUser
      });
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from collaboration server');
      setIsConnected(false);
    });

    // Room events
    newSocket.on('room-joined', (data: any) => {
      setUsers(data.room.users);
      setPresence(new Map(data.presence.map((p: Presence) => [p.userId, p])));
    });

    newSocket.on('user-joined', (data: any) => {
      setUsers(data.roomUsers);
    });

    newSocket.on('user-left', (data: any) => {
      setUsers(data.roomUsers);
    });

    newSocket.on('presence-changed', (presenceData: Presence) => {
      setPresence(prev => new Map(prev.set(presenceData.userId, presenceData)));
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [projectId, currentUser]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <Edit className="w-3 h-3" />;
      case 'away': return <Eye className="w-3 h-3" />;
      default: return <User className="w-3 h-3" />;
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 300, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed right-0 top-16 h-[calc(100vh-4rem)] w-80 bg-black/95 backdrop-blur-xl border-l border-white/10 shadow-2xl z-40"
        >
          {/* Header */}
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-white" />
                <h3 className="text-white font-semibold">Collaboration</h3>
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              </div>
              <button
                onClick={onToggle}
                className="text-white/60 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Users List */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-3">
              <h4 className="text-white/80 text-sm font-medium mb-3">
                Active Users ({users.length})
              </h4>

              {users.map((user) => {
                const userPresence = presence.get(user.id);
                return (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center space-x-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    {/* Avatar */}
                    <div className="relative">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                        style={{ backgroundColor: user.color }}
                      >
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      {/* Status indicator */}
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-black flex items-center justify-center ${getStatusColor(userPresence?.status || 'offline')}`}>
                        {getStatusIcon(userPresence?.status || 'offline')}
                      </div>
                    </div>

                    {/* User info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {user.name}
                        {user.id === currentUser.id && (
                          <span className="text-white/60 ml-1">(You)</span>
                        )}
                      </p>
                      <p className="text-white/60 text-xs">
                        {userPresence?.status === 'online' && userPresence.cursor
                          ? `Editing ${userPresence.cursor.filePath.split('/').pop()}`
                          : userPresence?.status || 'Offline'
                        }
                      </p>
                    </div>

                    {/* Current file indicator */}
                    {userPresence?.cursor && (
                      <div className="text-white/40 text-xs">
                        L{userPresence.cursor.position.line + 1}
                      </div>
                    )}
                  </motion.div>
                );
              })}

              {users.length === 0 && (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="text-white/60 text-sm">No active collaborators</p>
                  <p className="text-white/40 text-xs mt-1">
                    Share your project to start collaborating
                  </p>
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="mt-6">
              <h4 className="text-white/80 text-sm font-medium mb-3">
                Recent Activity
              </h4>
              <div className="space-y-2">
                {/* Activity items would be populated from collaboration events */}
                <div className="text-white/40 text-xs text-center py-4">
                  No recent activity
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/10">
            <div className="flex items-center justify-between text-xs text-white/60">
              <span>Real-time sync active</span>
              <span>{isConnected ? '🟢 Connected' : '🔴 Disconnected'}</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CollaborationPanel;