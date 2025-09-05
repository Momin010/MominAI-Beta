import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { createClient } from '@supabase/supabase-js';
import { CollaborationServer } from './collaboration-server';
import { Server as SocketIOServer } from 'socket.io';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Store active WebSocket connections
const activeConnections = new Map<string, WebSocket>();

export function createWebSocketServer(server: any) {
  const wss = new WebSocketServer({ noServer: true });

  // Handle WebSocket upgrade
  server.on('upgrade', (request: IncomingMessage, socket: any, head: any) => {
    const pathname = request.url;

    if (pathname?.startsWith('/api/run-backend/ws/')) {
      const sessionId = pathname.split('/').pop();

      wss.handleUpgrade(request, socket, head, (ws) => {
        if (sessionId) {
          activeConnections.set(sessionId, ws);
          console.log(`WebSocket connected for session ${sessionId}`);

          ws.on('close', () => {
            console.log(`WebSocket closed for session ${sessionId}`);
            activeConnections.delete(sessionId);
          });

          ws.on('error', (error) => {
            console.error(`WebSocket error for session ${sessionId}:`, error);
            activeConnections.delete(sessionId);
          });

          // Send connection confirmation
          ws.send(JSON.stringify({
            type: 'connected',
            sessionId,
            timestamp: new Date().toISOString()
          }));

        } else {
          ws.close(1008, 'Invalid session ID');
        }
      });
    }
  });

  return wss;
}

// Send log message to specific session
export function sendLogToSession(sessionId: string, message: string, level: 'info' | 'error' = 'info') {
  const ws = activeConnections.get(sessionId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'log',
      message,
      level,
      timestamp: new Date().toISOString()
    }));
  }
}

// Send execution completion to specific session
export function sendExecutionComplete(sessionId: string, status: 'completed' | 'failed') {
  const ws = activeConnections.get(sessionId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'execution_complete',
      status,
      timestamp: new Date().toISOString()
    }));

    // Close connection after sending completion
    setTimeout(() => {
      ws.close();
      activeConnections.delete(sessionId);
    }, 1000);
  }
}

// Get active connection count
export function getActiveConnectionCount(): number {
  return activeConnections.size;
}