import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { ProjectManager } from '../../../lib/project-manager';
import { handleError, getUserFriendlyMessage, FilesystemError } from '../../../lib/error-handler';

interface BatchOperation {
  id: string;
  type: 'read' | 'write' | 'create' | 'delete' | 'list';
  path: string;
  content?: string;
  priority: 'low' | 'normal' | 'high';
}

interface BatchResult {
  operationId: string;
  success: boolean;
  data?: any;
  error?: string;
  code?: string;
  recoverable?: boolean;
  duration: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { operations } = req.body;

  if (!operations || !Array.isArray(operations)) {
    return res.status(400).json({ error: 'Operations array is required' });
  }

  const results: BatchResult[] = [];
  const projectsDir = path.join(process.cwd(), 'projects');

  // Ensure projects directory exists
  if (!fs.existsSync(projectsDir)) {
    fs.mkdirSync(projectsDir, { recursive: true });
  }

  // Process operations in parallel for better performance
  const operationPromises = operations.map(async (operation: BatchOperation) => {
    const startTime = Date.now();

    try {
      let result: any = null;

      switch (operation.type) {
        case 'read':
          result = await handleReadOperation(operation, projectsDir);
          break;
        case 'write':
          result = await handleWriteOperation(operation, projectsDir);
          break;
        case 'create':
          result = await handleCreateOperation(operation, projectsDir);
          break;
        case 'delete':
          result = await handleDeleteOperation(operation, projectsDir);
          break;
        case 'list':
          result = await handleListOperation(operation, projectsDir);
          break;
        default:
          throw new Error(`Unknown operation type: ${operation.type}`);
      }

      return {
        operationId: operation.id,
        success: true,
        data: result,
        duration: Date.now() - startTime
      };

    } catch (error: any) {
      const errorDetails = handleError(error, `batch_${operation.type}_${operation.path}`);

      return {
        operationId: operation.id,
        success: false,
        error: getUserFriendlyMessage(errorDetails),
        code: errorDetails.code,
        recoverable: errorDetails.recoverable,
        duration: Date.now() - startTime
      };
    }
  });

  // Wait for all operations to complete
  const batchResults = await Promise.allSettled(operationPromises);

  // Process results
  for (const promiseResult of batchResults) {
    if (promiseResult.status === 'fulfilled') {
      results.push(promiseResult.value);
    } else {
      // This shouldn't happen with our error handling, but just in case
      const errorDetails = handleError(promiseResult.reason, 'batch_operation_failed');
      results.push({
        operationId: 'unknown',
        success: false,
        error: getUserFriendlyMessage(errorDetails),
        code: errorDetails.code,
        recoverable: errorDetails.recoverable,
        duration: 0
      });
    }
  }

  res.status(200).json(results);
}

// Helper functions for each operation type
async function handleReadOperation(operation: BatchOperation, projectsDir: string): Promise<string> {
  let fullPath: string;

  if (operation.path.startsWith('projects/')) {
    fullPath = path.join(projectsDir, operation.path.substring(9));
  } else {
    fullPath = path.join(process.cwd(), operation.path);
  }

  if (!fs.existsSync(fullPath)) {
    throw new FilesystemError('File not found', 'ENOENT');
  }

  return fs.readFileSync(fullPath, 'utf-8');
}

async function handleWriteOperation(operation: BatchOperation, projectsDir: string): Promise<boolean> {
  let fullPath: string;

  if (operation.path.startsWith('projects/')) {
    fullPath = path.join(projectsDir, operation.path.substring(9));
  } else {
    fullPath = path.join(process.cwd(), operation.path);
  }

  const dirPath = path.dirname(fullPath);

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  fs.writeFileSync(fullPath, operation.content || '', 'utf-8');
  return true;
}

async function handleCreateOperation(operation: BatchOperation, projectsDir: string): Promise<boolean> {
  let fullPath: string;

  if (operation.path.startsWith('projects/')) {
    fullPath = path.join(projectsDir, operation.path.substring(9));
  } else {
    fullPath = path.join(process.cwd(), operation.path);
  }

  const dirPath = path.dirname(fullPath);

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  // Check if it's a directory or file
  if (operation.path.endsWith('/')) {
    fs.mkdirSync(fullPath, { recursive: true });
  } else {
    fs.writeFileSync(fullPath, operation.content || '', 'utf-8');
  }

  return true;
}

async function handleDeleteOperation(operation: BatchOperation, projectsDir: string): Promise<boolean> {
  let fullPath: string;

  if (operation.path.startsWith('projects/')) {
    fullPath = path.join(projectsDir, operation.path.substring(9));
  } else {
    fullPath = path.join(process.cwd(), operation.path);
  }

  if (!fs.existsSync(fullPath)) {
    throw new FilesystemError('File or directory not found', 'ENOENT');
  }

  const stat = fs.statSync(fullPath);
  if (stat.isDirectory()) {
    fs.rmSync(fullPath, { recursive: true, force: true });
  } else {
    fs.unlinkSync(fullPath);
  }

  return true;
}

async function handleListOperation(operation: BatchOperation, projectsDir: string): Promise<any[]> {
  let fullPath: string;

  if (operation.path.startsWith('projects/')) {
    fullPath = path.join(projectsDir, operation.path.substring(9));
  } else {
    fullPath = path.join(process.cwd(), operation.path);
  }

  if (!fs.existsSync(fullPath)) {
    throw new FilesystemError('Directory not found', 'ENOENT');
  }

  const items = fs.readdirSync(fullPath, { withFileTypes: true });

  return items.map(item => ({
    name: item.name,
    path: path.join(operation.path, item.name).replace(/\\/g, '/'),
    type: item.isDirectory() ? 'folder' : 'file',
    size: item.isFile() ? fs.statSync(path.join(fullPath, item.name)).size : 0,
    modified: fs.statSync(path.join(fullPath, item.name)).mtime.toISOString()
  }));
}