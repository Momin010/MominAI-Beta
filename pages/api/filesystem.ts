import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, path: filePath, content, template, projectName } = req.body;

  try {
    switch (action) {
      case 'createFile':
        if (!filePath || !content) {
          return res.status(400).json({ error: 'File path and content are required' });
        }

        // Create directory if it doesn't exist
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        // Write file
        fs.writeFileSync(filePath, content, 'utf8');

        console.log(`✅ Created real file: ${filePath}`);
        return res.status(200).json({
          success: true,
          message: `File created: ${filePath}`,
          path: filePath
        });

      case 'readFile':
        if (!filePath) {
          return res.status(400).json({ error: 'File path is required' });
        }

        if (!fs.existsSync(filePath)) {
          return res.status(404).json({ error: 'File not found' });
        }

        const fileContent = fs.readFileSync(filePath, 'utf8');
        return res.status(200).json({
          success: true,
          content: fileContent,
          path: filePath
        });

      case 'createProject':
        if (!projectName) {
          return res.status(400).json({ error: 'Project name is required' });
        }

        const projectPath = path.join(process.cwd(), 'projects', projectName);

        // Create project directory
        if (!fs.existsSync(projectPath)) {
          fs.mkdirSync(projectPath, { recursive: true });
        }

        // Create basic project structure based on template
        const files = createProjectStructure(projectPath, template || 'react', projectName);

        console.log(`✅ Created real project: ${projectName} with ${files.length} files`);
        return res.status(200).json({
          success: true,
          message: `Project created: ${projectName}`,
          projectPath,
          files
        });

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Filesystem API error:', error);
    return res.status(500).json({
      success: false,
      error: `Filesystem operation failed: ${error}`
    });
  }
}

function createProjectStructure(projectPath: string, template: string, projectName: string) {
  const files = [];

  switch (template) {
    case 'react':
      files.push(
        createFile(path.join(projectPath, 'package.json'), getPackageJson(projectName)),
        createFile(path.join(projectPath, 'src', 'App.tsx'), getReactApp(projectName)),
        createFile(path.join(projectPath, 'src', 'index.tsx'), getReactIndex()),
        createFile(path.join(projectPath, 'src', 'components', 'Header.tsx'), getReactHeader()),
        createFile(path.join(projectPath, 'public', 'index.html'), getHtmlTemplate(projectName)),
        createFile(path.join(projectPath, 'src', 'styles.css'), getCssStyles())
      );
      break;

    case 'node':
      files.push(
        createFile(path.join(projectPath, 'package.json'), getNodePackageJson(projectName)),
        createFile(path.join(projectPath, 'index.js'), getNodeIndex(projectName)),
        createFile(path.join(projectPath, 'README.md'), getReadme(projectName))
      );
      break;

    default:
      files.push(
        createFile(path.join(projectPath, 'README.md'), getReadme(projectName))
      );
  }

  return files;
}

function createFile(filePath: string, content: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content, 'utf8');
  return { path: filePath, content };
}

function getPackageJson(projectName: string) {
  return JSON.stringify({
    name: projectName,
    version: '0.1.0',
    private: true,
    dependencies: {
      'react': '^18.2.0',
      'react-dom': '^18.2.0',
      'react-scripts': '5.0.1'
    },
    scripts: {
      start: 'react-scripts start',
      build: 'react-scripts build',
      test: 'react-scripts test',
      eject: 'react-scripts eject'
    }
  }, null, 2);
}

function getReactApp(projectName: string) {
  return `import React from 'react';
import Header from './components/Header';

function App() {
  return (
    <div className="App">
      <Header />
      <main className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-4">Welcome to ${projectName}</h1>
        <p className="text-gray-600">This is your new React application!</p>
      </main>
    </div>
  );
}

export default App;`;
}

function getReactIndex() {
  return `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`;
}

function getReactHeader() {
  return `import React from 'react';

const Header = () => {
  return (
    <header className="bg-blue-600 text-white p-4">
      <div className="container mx-auto">
        <h1 className="text-2xl font-bold">My React App</h1>
      </div>
    </header>
  );
};

export default Header;`;
}

function getHtmlTemplate(projectName: string) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${projectName}</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;
}

function getCssStyles() {
  return `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}`;
}

function getNodePackageJson(projectName: string) {
  return JSON.stringify({
    name: projectName,
    version: '0.1.0',
    main: 'index.js',
    scripts: {
      start: 'node index.js'
    }
  }, null, 2);
}

function getNodeIndex(projectName: string) {
  return `console.log('Hello from ${projectName}!');
console.log('Node.js application started successfully!');`;
}

function getReadme(projectName: string) {
  return `# ${projectName}

This is a new project created with MominAI.

## Getting Started

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Start the development server:
   \`\`\`bash
   npm start
   \`\`\`

## Features

- Modern development setup
- Ready for production deployment
- Scalable architecture

Happy coding! 🚀`;
}