import { NextApiRequest, NextApiResponse } from 'next';
import { exec, spawn } from 'child_process';
import path from 'path';
import { promisify } from 'util';
import { handleError, getUserFriendlyMessage, NetworkError } from '../../lib/error-handler';
import { createProcessOperation, cancelOperation } from '../../lib/cancellation-manager';

const execAsync = promisify(exec);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { command, cwd, action, operationId } = req.body;

  // Handle cancellation requests
  if (action === 'cancel' && operationId) {
    try {
      const cancelled = await cancelOperation(operationId);
      return res.status(200).json({
        success: cancelled,
        message: cancelled ? 'Operation cancelled successfully' : 'Operation not found or already completed'
      });
    } catch (error) {
      const errorDetails = handleError(error, 'terminal_cancel');
      return res.status(500).json({
        error: getUserFriendlyMessage(errorDetails),
        code: errorDetails.code
      });
    }
  }

  if (!command) {
    return res.status(400).json({ error: 'Command is required' });
  }

  try {
    // Set working directory for the command
    const workingDir = cwd ? path.join(process.cwd(), 'projects', cwd) : process.cwd();

    // Generate operation ID for this command
    const commandOperationId = `terminal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // For long-running commands, use spawn instead of exec for better cancellation support
    if (command.includes('npm install') || command.includes('npm run') || command.includes('yarn') || command.length > 100) {
      // Use spawn for long-running or complex commands
      const isWindows = process.platform === 'win32';
      const [cmd, ...args] = isWindows ? ['cmd', '/c', command] : ['sh', '-c', command];

      const childProcess = spawn(cmd, args, {
        cwd: workingDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: !isWindows
      });

      // Register the process for cancellation
      createProcessOperation(commandOperationId, childProcess, () => {
        console.log(`Terminal operation ${commandOperationId} cancelled`);
      });

      let stdout = '';
      let stderr = '';

      // Collect output
      childProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      childProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      // Wait for completion or timeout
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          childProcess.kill('SIGTERM');
          reject(new Error('Command timed out'));
        }, 300000); // 5 minute timeout for long-running commands

        childProcess.on('close', (code) => {
          clearTimeout(timeout);
          if (code === 0 || code === null) {
            resolve(void 0);
          } else {
            reject(new Error(`Command failed with exit code ${code}`));
          }
        });

        childProcess.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      const output = stdout || stderr || 'Command executed successfully';

      res.status(200).json({
        success: true,
        output: output.trim(),
        command,
        operationId: commandOperationId
      });
    } else {
      // Use exec for simple commands
      const { stdout, stderr } = await execAsync(command, {
        cwd: workingDir,
        timeout: 30000, // 30 second timeout
        maxBuffer: 1024 * 1024 // 1MB buffer
      });

      const output = stdout || stderr || 'Command executed successfully';

      res.status(200).json({
        success: true,
        output: output.trim(),
        command,
        operationId: commandOperationId
      });
    }
  } catch (error: any) {
    const errorDetails = handleError(error, 'terminal_command');

    res.status(200).json({
      success: false,
      output: getUserFriendlyMessage(errorDetails),
      command,
      error: true,
      code: errorDetails.code,
      recoverable: errorDetails.recoverable
    });
  }
}