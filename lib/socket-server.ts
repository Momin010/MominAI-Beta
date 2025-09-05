/**
 * Socket.IO Server for Real-time Collaboration
 * Integrates with existing WebSocket infrastructure
 */

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { CollaborationServer } from './collaboration-server';

let io: SocketIOServer | null = null;
let collaborationServer: CollaborationServer | null = null;

export function initializeSocketServer(server: HTTPServer): SocketIOServer {
  if (io) return io;

  // Initialize Socket.IO server
  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    },
    path: '/api/socket'
  });

  // Initialize collaboration server
  collaborationServer = new CollaborationServer(io);

  console.log('🚀 Socket.IO server initialized for collaboration');

  return io;
}

export function getSocketServer(): SocketIOServer | null {
  return io;
}

export function getCollaborationServer(): CollaborationServer | null {
  return collaborationServer;
}

export function broadcastToRoom(roomId: string, event: string, data: any): void {
  if (io) {
    io.to(roomId).emit(event, data);
  }
}

export function broadcastGlobal(event: string, data: any): void {
  if (io) {
    io.emit(event, data);
  }
}

// Cleanup function
export function cleanupSocketServer(): void {
  if (collaborationServer) {
    // Cleanup collaboration server resources
  }

  if (io) {
    io.close();
    io = null;
  }

  collaborationServer = null;
}