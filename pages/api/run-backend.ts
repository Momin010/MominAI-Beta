import { NextApiRequest, NextApiResponse } from 'next';
import { spawn } from 'child_process';
import { createClient } from '@supabase/supabase-js';
import { sendLogToSession, sendExecutionComplete } from '../../lib/websocket-server';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Store active processes and their session information
const activeProcesses = new Map<string, {
  process: any;
  sessionId: string;
  timeout: NodeJS.Timeout;
  tempFile?: string;
}>();

interface ExecutionRequest {
  code: string;
  language: 'python' | 'node';
  userContext: {
    userId: string;
    roomId?: string;
    sessionName?: string;
  };
}

interface ExecutionResponse {
  sessionId: string;
  processId: string;
  status: 'running' | 'completed' | 'failed';
}

// Execution timeout in milliseconds (30 seconds for local execution)
const EXECUTION_TIMEOUT = 30 * 1000;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, language, userContext }: ExecutionRequest = req.body;

    // Validate request
    if (!code || !language) {
      return res.status(400).json({
        error: 'Missing required fields: code, language'
      });
    }

    // Use provided userId or default to anonymous
    const userId = userContext?.userId || 'anonymous-user';

    if (!['python', 'node'].includes(language)) {
      return res.status(400).json({
        error: 'Unsupported language. Supported: python, node'
      });
    }

    // Create execution session in database
    const { data: session, error: sessionError } = await supabase
      .from('backend_execution_sessions')
      .insert({
        user_id: userId,
        room_id: userContext?.roomId,
        session_name: userContext?.sessionName || `Execution ${new Date().toISOString()}`,
        status: 'active'
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Failed to create session:', sessionError);
      return res.status(500).json({ error: 'Failed to create execution session' });
    }

    // Create and run local process
    const processInfo = await createLocalProcess(code, language, session.id);

    // Store process reference
    const processData = {
      process: processInfo.process,
      sessionId: session.id,
      timeout: setTimeout(() => cleanupProcess(session.id), EXECUTION_TIMEOUT),
      tempFile: processInfo.tempFile
    };

    activeProcesses.set(session.id, processData);

    // Handle process output
    processInfo.process.stdout?.on('data', async (data: Buffer) => {
      const logMessage = data.toString();
      console.log(`[${session.id}] ${logMessage}`);

      // Store log in database
      await supabase
        .from('execution_logs')
        .insert({
          container_id: session.id, // Using session ID as container ID for local processes
          message: logMessage.trim(),
          log_level: 'info'
        });

      // Send to WebSocket
      sendLogToSession(session.id, logMessage, 'info');
    });

    processInfo.process.stderr?.on('data', async (data: Buffer) => {
      const errorMessage = data.toString();
      console.error(`[${session.id}] ERROR: ${errorMessage}`);

      // Store error log in database
      await supabase
        .from('execution_logs')
        .insert({
          container_id: session.id,
          message: errorMessage.trim(),
          log_level: 'error'
        });

      // Send to WebSocket
      sendLogToSession(session.id, errorMessage, 'error');
    });

    processInfo.process.on('close', async (code: number) => {
      const status = code === 0 ? 'completed' : 'failed';
      await finalizeExecution(session.id, status);
    });

    processInfo.process.on('error', async (error: Error) => {
      console.error(`Process ${session.id} error:`, error);
      await finalizeExecution(session.id, 'failed');
    });

    // Return session information
    const response: ExecutionResponse = {
      sessionId: session.id,
      processId: session.id,
      status: 'running'
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Execution error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Create local process for code execution
async function createLocalProcess(code: string, language: 'python' | 'node', sessionId: string) {
  const tempDir = os.tmpdir();
  const tempFile = path.join(tempDir, `code_${sessionId}.${language === 'python' ? 'py' : 'js'}`);

  // Write code to temporary file
  fs.writeFileSync(tempFile, code);

  // Create process
  const command = language === 'python' ? 'python3' : 'node';
  const args = language === 'python' ? [tempFile] : [tempFile];

  const childProcess = spawn(command, args, {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: tempDir,
    env: { ...process.env, NODE_ENV: 'production' } // Limit environment variables for security
  });

  // Store process info in database
  await supabase
    .from('container_instances')
    .insert({
      session_id: sessionId,
      container_id: sessionId, // Using session ID as container ID for local processes
      image: `${language}:local`,
      status: 'running'
    });

  return { process, tempFile };
}


// Finalize execution and cleanup
async function finalizeExecution(sessionId: string, status: 'completed' | 'failed') {
  try {
    const processData = activeProcesses.get(sessionId);
    if (!processData) return;

    // Update session status
    await supabase
      .from('backend_execution_sessions')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    // Update container status
    await supabase
      .from('container_instances')
      .update({
        status: status === 'completed' ? 'stopped' : 'failed',
        updated_at: new Date().toISOString()
      })
      .eq('container_id', sessionId);

    // Send final message to WebSocket
    sendExecutionComplete(sessionId, status);

    // Cleanup
    cleanupProcess(sessionId);

  } catch (error) {
    console.error(`Failed to finalize execution ${sessionId}:`, error);
  }
}

// Cleanup process resources
async function cleanupProcess(sessionId: string) {
  try {
    const processData = activeProcesses.get(sessionId);
    if (!processData) return;

    // Clear timeout
    clearTimeout(processData.timeout);

    // Kill process if still running
    try {
      if (!processData.process.killed) {
        processData.process.kill('SIGTERM');

        // Force kill after 5 seconds
        setTimeout(() => {
          if (!processData.process.killed) {
            processData.process.kill('SIGKILL');
          }
        }, 5000);
      }
    } catch (error) {
      console.warn(`Failed to kill process ${sessionId}:`, error);
    }

    // Clean up temporary file
    if (processData.tempFile && fs.existsSync(processData.tempFile)) {
      try {
        fs.unlinkSync(processData.tempFile);
      } catch (error) {
        console.warn(`Failed to cleanup temp file ${processData.tempFile}:`, error);
      }
    }

    // Remove from active processes
    activeProcesses.delete(sessionId);

  } catch (error) {
    console.error(`Failed to cleanup process for session ${sessionId}:`, error);
  }
}

// API route configuration
export const config = {
  api: {
    bodyParser: true,
  },
};