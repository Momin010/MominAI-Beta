# Backend Code Execution API

## Overview

The `/api/run-backend` API route provides secure backend code execution with real-time log streaming via WebSocket connections. It supports Python and Node.js code execution in isolated Docker containers.

## Features

- ✅ Secure code execution in Docker containers
- ✅ Real-time log streaming via WebSocket
- ✅ Session tracking with database integration
- ✅ Resource limits and timeout management
- ✅ Error handling and automatic cleanup
- ✅ Support for Python and Node.js

## API Endpoints

### POST /api/run-backend

Execute backend code in a containerized environment.

**Request Body:**
```json
{
  "code": "print('Hello, World!')",
  "language": "python",
  "userContext": {
    "userId": "user-uuid",
    "roomId": "room-uuid", // optional
    "sessionName": "Custom Session Name" // optional
  }
}
```

**Response:**
```json
{
  "sessionId": "session-uuid",
  "containerId": "container-id",
  "status": "running"
}
```

**Supported Languages:**
- `python` - Python 3.11
- `node` - Node.js 18

### WebSocket Connection

Connect to `ws://localhost:3000/api/run-backend/ws/{sessionId}` for real-time logs.

**WebSocket Messages:**

1. **Connection Confirmation:**
```json
{
  "type": "connected",
  "sessionId": "session-uuid",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

2. **Log Messages:**
```json
{
  "type": "log",
  "message": "Hello, World!",
  "level": "info",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

3. **Execution Complete:**
```json
{
  "type": "execution_complete",
  "status": "completed",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

## Database Schema

The API integrates with the following Supabase tables:

- `backend_execution_sessions` - Tracks execution sessions
- `container_instances` - Tracks Docker containers
- `execution_logs` - Stores execution logs

## Security Features

- **Container Isolation:** Code runs in Docker containers
- **Resource Limits:** Memory (512MB), CPU (50%), Process limits
- **Timeout Management:** 5-minute execution timeout
- **Read-only Filesystem:** Prevents container filesystem modifications
- **Network Isolation:** Containers run without network access

## Setup Instructions

1. **Install Dependencies:**
```bash
npm install dockerode ws @types/ws
```

2. **Environment Variables:**
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

3. **Start the Server:**
```bash
npm run dev
```

4. **Test the API:**
```bash
node test-api.js
```

## Error Handling

The API includes comprehensive error handling for:

- Invalid request parameters
- Docker daemon connectivity issues
- Container execution failures
- Database connection problems
- WebSocket connection errors
- Resource limit violations

## Example Usage

```javascript
// Execute Python code
const response = await fetch('/api/run-backend', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    code: 'print("Hello from Python!")',
    language: 'python',
    userContext: {
      userId: 'user-123',
      sessionName: 'My Python Script'
    }
  })
});

const { sessionId } = await response.json();

// Connect to WebSocket for logs
const ws = new WebSocket(`ws://localhost:3000/api/run-backend/ws/${sessionId}`);

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data.message);
};
```

## Architecture

- **API Route:** `pages/api/run-backend.ts` - Main API handler
- **WebSocket Server:** `lib/websocket-server.ts` - WebSocket connection management
- **Custom Server:** `server.js` - Next.js server with WebSocket support
- **Database Integration:** Full Supabase integration for session tracking

## Monitoring

All execution sessions, containers, and logs are tracked in the database for monitoring and debugging purposes.