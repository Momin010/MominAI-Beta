const { WebSocketServer, WebSocket } = require('ws');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client (only if environment variables are available)
let supabase = null;
if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
} else {
  console.warn('Supabase environment variables not found. WebSocket server will run without database logging.');
}

// Store active WebSocket connections
const activeConnections = new Map();

function createWebSocketServer(server) {
  const wss = new WebSocketServer({ noServer: true });

  // Handle WebSocket upgrade
  server.on('upgrade', (request, socket, head) => {
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
function sendLogToSession(sessionId, message, level = 'info') {
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
function sendExecutionComplete(sessionId, status) {
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
function getActiveConnectionCount() {
  return activeConnections.size;
}

module.exports = {
  createWebSocketServer,
  sendLogToSession,
  sendExecutionComplete,
  getActiveConnectionCount
};