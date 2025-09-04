import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { ProjectManager, ProjectTemplate } from '../../lib/project-manager';
import { ErrorHandler, FilesystemError, handleError, getUserFriendlyMessage } from '../../lib/error-handler';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // List files in a directory
    const { dir = '.' } = req.query;

    try {
      const fullPath = path.join(process.cwd(), 'projects', dir as string);

      if (!fs.existsSync(fullPath)) {
        const errorDetails = handleError(new FilesystemError('Directory not found', 'ENOENT'), 'list_directory');
        return res.status(404).json({
          error: getUserFriendlyMessage(errorDetails),
          code: errorDetails.code,
          recoverable: errorDetails.recoverable
        });
      }

      const items = fs.readdirSync(fullPath, { withFileTypes: true });

      const files = items.map(item => {
        try {
          const itemPath = path.join(fullPath, item.name);
          return {
            name: item.name,
            path: path.join(dir as string, item.name).replace(/\\/g, '/'),
            type: item.isDirectory() ? 'folder' : 'file',
            size: item.isFile() ? fs.statSync(itemPath).size : 0,
            modified: fs.statSync(itemPath).mtime.toISOString()
          };
        } catch (itemError) {
          // Log error but continue processing other items
          handleError(itemError, 'read_file_stats');
          return {
            name: item.name,
            path: path.join(dir as string, item.name).replace(/\\/g, '/'),
            type: item.isDirectory() ? 'folder' : 'file',
            size: 0,
            modified: new Date().toISOString()
          };
        }
      });

      res.status(200).json({ files });
    } catch (error) {
      const errorDetails = handleError(error, 'list_directory');
      res.status(500).json({
        error: getUserFriendlyMessage(errorDetails),
        code: errorDetails.code,
        recoverable: errorDetails.recoverable
      });
    }
  } else if (req.method === 'POST') {
    const { action, filePath, content, template, projectName } = req.body;

    try {
      const projectsDir = path.join(process.cwd(), 'projects');

      // Ensure projects directory exists
      if (!fs.existsSync(projectsDir)) {
        fs.mkdirSync(projectsDir, { recursive: true });
      }

      if (action === 'read') {
        // Read file content - support both workspace and projects directories
        let fullPath: string;

        if (filePath.startsWith('projects/')) {
          // File is in projects directory
          fullPath = path.join(projectsDir, filePath.substring(9));
        } else {
          // File is in main workspace directory
          fullPath = path.join(process.cwd(), filePath);
        }

        if (!fs.existsSync(fullPath)) {
          return res.status(404).json({ error: 'File not found' });
        }

        const fileContent = fs.readFileSync(fullPath, 'utf-8');
        res.status(200).json({ content: fileContent });
      } else if (action === 'write') {
        // Write file content - support both workspace and projects directories
        let fullPath: string;

        if (filePath.startsWith('projects/')) {
          // File is in projects directory
          fullPath = path.join(projectsDir, filePath.substring(9));
        } else {
          // File is in main workspace directory
          fullPath = path.join(process.cwd(), filePath);
        }

        const dirPath = path.dirname(fullPath);

        // Ensure directory exists
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }

        fs.writeFileSync(fullPath, content || '', 'utf-8');
        res.status(200).json({ success: true });
      } else if (action === 'createProject') {
        // Create project from template
        const templates = ProjectManager.getTemplates();
        const selectedTemplate = templates.find(t => t.name === template);

        if (!selectedTemplate) {
          return res.status(400).json({ error: 'Template not found' });
        }

        const projectPath = path.join(projectsDir, projectName);

        // Create project directory
        if (!fs.existsSync(projectPath)) {
          fs.mkdirSync(projectPath, { recursive: true });
        }

        // Create all files from template
        for (const file of selectedTemplate.files) {
          const filePath = path.join(projectPath, file.path);
          const fileDir = path.dirname(filePath);

          if (!fs.existsSync(fileDir)) {
            fs.mkdirSync(fileDir, { recursive: true });
          }

          fs.writeFileSync(filePath, file.content, 'utf-8');
        }

        res.status(200).json({
          success: true,
          projectPath: `${projectName}`,
          files: selectedTemplate.files
        });
      } else if (action === 'delete') {
        // Delete file or directory
        const fullPath = path.join(projectsDir, filePath);

        if (fs.existsSync(fullPath)) {
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            fs.rmSync(fullPath, { recursive: true, force: true });
          } else {
            fs.unlinkSync(fullPath);
          }
        }

        res.status(200).json({ success: true });
      } else {
        res.status(400).json({ error: 'Invalid action' });
      }
    } catch (error) {
      const errorDetails = handleError(error, 'filesystem_operation');
      res.status(errorDetails.code === 'FILE_NOT_FOUND' ? 404 : 500).json({
        error: getUserFriendlyMessage(errorDetails),
        code: errorDetails.code,
        recoverable: errorDetails.recoverable,
        operation: errorDetails.operation
      });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({ error: 'Method not allowed' });
  }
}