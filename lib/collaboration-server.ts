/**
 * Real-time Collaboration Server
 * WebSocket-based live editing with operational transform
 */

import { Server, Socket } from 'socket.io';
import { OperationalTransform, Operation } from './operational-transform';

export interface User {
  id: string;
  name: string;
  avatar?: string;
  color: string;
}

export interface Room {
  id: string;
  name: string;
  projectId: string;
  users: Map<string, User>;
  operations: Operation[];
  createdAt: Date;
}

export interface Cursor {
  userId: string;
  position: { line: number; column: number };
  filePath: string;
}

export interface Presence {
  userId: string;
  status: 'online' | 'away' | 'offline';
  lastSeen: Date;
  cursor?: Cursor;
}

export class CollaborationServer {
  private io: Server;
  private rooms: Map<string, Room> = new Map();
  private userPresence: Map<string, Presence> = new Map();
  private ot: OperationalTransform;

  constructor(io: Server) {
    this.io = io;
    this.ot = new OperationalTransform();
    this.setupSocketHandlers();
    this.startPresenceCleanup();
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log('User connected:', socket.id);

      // Join room
      socket.on('join-room', (data: { roomId: string; user: User }) => {
        this.handleJoinRoom(socket, data.roomId, data.user);
      });

      // Leave room
      socket.on('leave-room', (roomId: string) => {
        this.handleLeaveRoom(socket, roomId);
      });

      // Handle editor operations
      socket.on('operation', (operation: Operation) => {
        this.handleOperation(socket, operation);
      });

      // Handle cursor movements
      socket.on('cursor-move', (cursor: Cursor) => {
        this.handleCursorMove(socket, cursor);
      });

      // Handle presence updates
      socket.on('presence-update', (presence: Presence) => {
        this.handlePresenceUpdate(socket, presence);
      });

      // Handle file selection
      socket.on('file-select', (data: { filePath: string; userId: string }) => {
        this.handleFileSelect(socket, data);
      });

      // Handle comments
      socket.on('add-comment', (comment: any) => {
        this.handleAddComment(socket, comment);
      });

      // Handle disconnections
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  private handleJoinRoom(socket: Socket, roomId: string, user: User): void {
    // Create room if it doesn't exist
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        id: roomId,
        name: `Room ${roomId}`,
        projectId: roomId, // Assuming roomId is projectId for now
        users: new Map(),
        operations: [],
        createdAt: new Date()
      });
    }

    const room = this.rooms.get(roomId)!;

    // Add user to room
    room.users.set(user.id, user);
    socket.join(roomId);

    // Update presence
    this.userPresence.set(user.id, {
      userId: user.id,
      status: 'online',
      lastSeen: new Date()
    });

    // Notify others in room
    socket.to(roomId).emit('user-joined', {
      user,
      roomUsers: Array.from(room.users.values())
    });

    // Send current room state to new user
    socket.emit('room-joined', {
      room: {
        id: room.id,
        name: room.name,
        users: Array.from(room.users.values()),
        operations: room.operations.slice(-50) // Last 50 operations
      },
      presence: Array.from(this.userPresence.values())
    });

    console.log(`User ${user.name} joined room ${roomId}`);
  }

  private handleLeaveRoom(socket: Socket, roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // Find user by socket ID
    const userId = this.getUserIdBySocket(socket);
    if (userId) {
      room.users.delete(userId);

      // Update presence
      const presence = this.userPresence.get(userId);
      if (presence) {
        presence.status = 'offline';
        presence.lastSeen = new Date();
      }

      // Notify others
      socket.to(roomId).emit('user-left', {
        userId,
        roomUsers: Array.from(room.users.values())
      });

      // Clean up empty rooms
      if (room.users.size === 0) {
        this.rooms.delete(roomId);
      }
    }

    socket.leave(roomId);
  }

  private handleOperation(socket: Socket, operation: Operation): void {
    const room = this.getRoomBySocket(socket);
    if (!room) return;

    // Get concurrent operations for transformation
    const concurrentOps = this.ot.getConcurrentOperations(operation);

    // Apply operational transform
    const transformResult = this.ot.transform(operation, concurrentOps);

    // Store the transformed operation
    this.ot.storeOperation(transformResult.operation);
    room.operations.push(transformResult.operation);

    // Keep only recent operations
    if (room.operations.length > 1000) {
      room.operations = room.operations.slice(-500);
    }

    // Broadcast to all users in room except sender
    socket.to(room.id).emit('operation', {
      operation: transformResult.operation,
      transformed: transformResult.transformed
    });
  }

  private handleCursorMove(socket: Socket, cursor: Cursor): void {
    const room = this.getRoomBySocket(socket);
    if (!room) return;

    // Update presence with cursor
    const presence = this.userPresence.get(cursor.userId);
    if (presence) {
      presence.cursor = cursor;
      presence.lastSeen = new Date();
    }

    // Broadcast cursor movement
    socket.to(room.id).emit('cursor-update', cursor);
  }

  private handlePresenceUpdate(socket: Socket, presence: Presence): void {
    this.userPresence.set(presence.userId, {
      ...presence,
      lastSeen: new Date()
    });

    // Broadcast presence update to all connected clients
    this.io.emit('presence-changed', presence);
  }

  private handleFileSelect(socket: Socket, data: { filePath: string; userId: string }): void {
    const room = this.getRoomBySocket(socket);
    if (!room) return;

    // Broadcast file selection
    socket.to(room.id).emit('file-selected', data);
  }

  private handleAddComment(socket: Socket, comment: any): void {
    const room = this.getRoomBySocket(socket);
    if (!room) return;

    // Broadcast comment to room
    this.io.to(room.id).emit('comment-added', {
      ...comment,
      timestamp: new Date()
    });
  }

  private handleDisconnect(socket: Socket): void {
    // Find all rooms this socket was in
    for (const [roomId, room] of Array.from(this.rooms.entries())) {
      const userId = this.getUserIdBySocket(socket);
      if (userId && room.users.has(userId)) {
        this.handleLeaveRoom(socket, roomId);
      }
    }
  }

  private getRoomBySocket(socket: Socket): Room | null {
    for (const room of Array.from(this.rooms.values())) {
      for (const [userId, user] of Array.from(room.users.entries())) {
        // This is a simplified lookup - in production you'd track socket-to-user mapping
        if (socket.id.includes(userId) || userId === socket.id) {
          return room;
        }
      }
    }
    return null;
  }

  private getUserIdBySocket(socket: Socket): string | null {
    // Simplified user lookup - in production use proper session management
    return socket.id;
  }

  private startPresenceCleanup(): void {
    // Clean up offline users every 30 seconds
    setInterval(() => {
      const now = new Date();
      for (const [userId, presence] of Array.from(this.userPresence.entries())) {
        if (presence.status === 'offline' &&
            (now.getTime() - presence.lastSeen.getTime()) > 300000) { // 5 minutes
          this.userPresence.delete(userId);
        }
      }
    }, 30000);
  }

  // Public API methods
  public getRoom(roomId: string): Room | null {
    return this.rooms.get(roomId) || null;
  }

  public getActiveRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  public getUserPresence(userId: string): Presence | null {
    return this.userPresence.get(userId) || null;
  }

  public getAllPresence(): Presence[] {
    return Array.from(this.userPresence.values());
  }

  public broadcastToRoom(roomId: string, event: string, data: any): void {
    this.io.to(roomId).emit(event, data);
  }

  public broadcastGlobal(event: string, data: any): void {
    this.io.emit(event, data);
  }
}