import { getConversationalResponse } from '../src/IDE/services/aiService';

export interface ProjectSpec {
  files: Array<{
    path: string;
    content: string;
  }>;
  dependencies: Record<string, string>;
  scripts: Record<string, string>;
}

export class MominAIAgent {
  private projectPath: string;

  constructor(projectPath: string = 'projects/car-dealership') {
    this.projectPath = projectPath;
  }

  async analyzeIntent(userRequest: string): Promise<string> {
    const prompt = `Analyze the following user request and provide a detailed breakdown of requirements for a web application:

User Request: "${userRequest}"

Please provide:
1. Main purpose and goals
2. Key features needed
3. Target audience
4. Technical requirements
5. Design considerations

Format your response as a structured analysis.`;

    try {
      const analysis = await getConversationalResponse(prompt, 'ask');
      console.log('Intent Analysis:', analysis);
      return analysis;
    } catch (error) {
      console.error('Error in intent analysis:', error);
      return `Error analyzing intent: ${error}`;
    }
  }

  async generateProjectSpec(analysis: string): Promise<ProjectSpec> {
    const prompt = `Based on the following analysis, generate a complete React/Vite project specification for a car dealership website:

Analysis: ${analysis}

Please generate a JSON response with the following structure:
{
  "files": [
    {
      "path": "relative/path/to/file",
      "content": "complete file content as string"
    }
  ],
  "dependencies": {
    "package-name": "version"
  },
  "scripts": {
    "script-name": "command"
  }
}

Requirements:
- Use React 18 with TypeScript
- Include at least 10 files (components, pages, config, etc.)
- Modern responsive design with Tailwind CSS
- Include proper routing, components for car listings, contact forms, etc.
- Production-ready code with proper imports and exports

Generate the complete project structure and all file contents.`;

    try {
      const response = await getConversationalResponse(prompt, 'code');
      console.log('Project Generation Response:', response);

      // Try to parse JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const spec = JSON.parse(jsonMatch[0]) as ProjectSpec;
        return spec;
      } else {
        throw new Error('No valid JSON found in response');
      }
    } catch (error) {
      console.error('Error generating project spec:', error);
      // Fallback to a basic spec
      return this.getFallbackProjectSpec();
    }
  }

  private getFallbackProjectSpec(): ProjectSpec {
    return {
      files: [
        {
          path: 'package.json',
          content: JSON.stringify({
            name: 'car-dealership',
            version: '1.0.0',
            type: 'module',
            scripts: {
              dev: 'vite',
              build: 'vite build',
              preview: 'vite preview'
            },
            dependencies: {
              react: '^18.2.0',
              'react-dom': '^18.2.0'
            },
            devDependencies: {
              '@types/react': '^18.2.0',
              '@types/react-dom': '^18.2.0',
              '@vitejs/plugin-react': '^4.0.0',
              typescript: '^5.0.0',
              vite: '^4.0.0'
            }
          }, null, 2)
        },
        {
          path: 'vite.config.ts',
          content: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})`
        },
        {
          path: 'index.html',
          content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Car Dealership</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`
        },
        {
          path: 'src/main.tsx',
          content: `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`
        },
        {
          path: 'src/App.tsx',
          content: `import React from 'react'
import Header from './components/Header'
import Hero from './components/Hero'
import CarList from './components/CarList'
import Contact from './components/Contact'
import Footer from './components/Footer'

function App() {
  return (
    <div className="App">
      <Header />
      <Hero />
      <CarList />
      <Contact />
      <Footer />
    </div>
  )
}

export default App`
        },
        {
          path: 'src/index.css',
          content: `@tailwind base;
@tailwind components;
@tailwind utilities;`
        },
        {
          path: 'src/components/Header.tsx',
          content: `import React from 'react'

const Header: React.FC = () => {
  return (
    <header className="bg-blue-600 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-2xl font-bold">Elite Cars</h1>
        <nav>
          <ul className="flex space-x-4">
            <li><a href="#home" className="hover:underline">Home</a></li>
            <li><a href="#cars" className="hover:underline">Cars</a></li>
            <li><a href="#contact" className="hover:underline">Contact</a></li>
          </ul>
        </nav>
      </div>
    </header>
  )
}

export default Header`
        },
        {
          path: 'src/components/Hero.tsx',
          content: `import React from 'react'

const Hero: React.FC = () => {
  return (
    <section className="bg-gradient-to-r from-blue-500 to-purple-600 text-white py-20">
      <div className="container mx-auto text-center">
        <h2 className="text-4xl font-bold mb-4">Welcome to Elite Cars</h2>
        <p className="text-xl mb-8">Discover your dream car from our premium collection</p>
        <button className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded">
          View Our Cars
        </button>
      </div>
    </section>
  )
}

export default Hero`
        },
        {
          path: 'src/components/CarList.tsx',
          content: `import React from 'react'

const CarList: React.FC = () => {
  const cars = [
    { id: 1, name: 'BMW X5', price: '$50,000', image: '/car1.jpg' },
    { id: 2, name: 'Mercedes C-Class', price: '$45,000', image: '/car2.jpg' },
    { id: 3, name: 'Audi Q7', price: '$55,000', image: '/car3.jpg' },
  ]

  return (
    <section className="py-16">
      <div className="container mx-auto">
        <h2 className="text-3xl font-bold text-center mb-8">Our Featured Cars</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {cars.map(car => (
            <div key={car.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <img src={car.image} alt={car.name} className="w-full h-48 object-cover" />
              <div className="p-4">
                <h3 className="text-xl font-semibold mb-2">{car.name}</h3>
                <p className="text-gray-600 mb-4">{car.price}</p>
                <button className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">
                  Learn More
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default CarList`
        },
        {
          path: 'src/components/Contact.tsx',
          content: `import React from 'react'

const Contact: React.FC = () => {
  return (
    <section className="bg-gray-100 py-16">
      <div className="container mx-auto">
        <h2 className="text-3xl font-bold text-center mb-8">Contact Us</h2>
        <div className="max-w-md mx-auto">
          <form className="bg-white p-8 rounded-lg shadow-md">
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="name">Name</label>
              <input className="w-full px-3 py-2 border rounded" type="text" id="name" />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="email">Email</label>
              <input className="w-full px-3 py-2 border rounded" type="email" id="email" />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="message">Message</label>
              <textarea className="w-full px-3 py-2 border rounded" id="message" rows={4}></textarea>
            </div>
            <button className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700" type="submit">
              Send Message
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}

export default Contact`
        },
        {
          path: 'src/components/Footer.tsx',
          content: `import React from 'react'

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-800 text-white py-8">
      <div className="container mx-auto text-center">
        <p>&copy; 2024 Elite Cars. All rights reserved.</p>
      </div>
    </footer>
  )
}

export default Footer`
        },
        {
          path: 'tailwind.config.js',
          content: `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}`
        }
      ],
      dependencies: {
        react: '^18.2.0',
        'react-dom': '^18.2.0',
        tailwindcss: '^3.3.0'
      },
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview'
      }
    };
  }

  async createProjectFiles(spec: ProjectSpec): Promise<void> {
    for (const file of spec.files) {
      const fullPath = `${this.projectPath}/${file.path}`;
      try {
        await fetch('/api/filesystem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'write',
            filePath: fullPath,
            content: file.content
          })
        });
        console.log(`Created file: ${fullPath}`);
      } catch (error) {
        console.error(`Error creating file ${fullPath}:`, error);
      }
    }
  }

  async setupDevelopmentEnvironment(spec: ProjectSpec): Promise<void> {
    const packageJsonPath = `${this.projectPath}/package.json`;

    try {
      // Update package.json with dependencies
      const packageJson = JSON.parse(spec.files.find(f => f.path === 'package.json')?.content || '{}');
      packageJson.dependencies = { ...packageJson.dependencies, ...spec.dependencies };
      packageJson.scripts = { ...packageJson.scripts, ...spec.scripts };

      await fetch('/api/filesystem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'write',
          filePath: packageJsonPath,
          content: JSON.stringify(packageJson, null, 2)
        })
      });

      console.log('Updated package.json with dependencies');
    } catch (error) {
      console.error('Error updating package.json:', error);
    }
  }

  async runNpmInstall(): Promise<void> {
    // This would typically run npm install, but since we're in a browser environment,
    // we'll simulate this by calling a backend API
    try {
      const response = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: `cd ${this.projectPath} && npm install`
        })
      });

      if (response.ok) {
        console.log('npm install completed');
      } else {
        console.error('npm install failed');
      }
    } catch (error) {
      console.error('Error running npm install:', error);
    }
  }

  async runDevServer(): Promise<void> {
    try {
      const response = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: `cd ${this.projectPath} && npm run dev`
        })
      });

      if (response.ok) {
        console.log('Development server started');
      } else {
        console.error('Failed to start development server');
      }
    } catch (error) {
      console.error('Error starting dev server:', error);
    }
  }

  async autoLaunchWebsite(): Promise<void> {
    // Open the website in a new tab/window
    const devUrl = `http://localhost:5173`; // Default Vite dev server port
    window.open(devUrl, '_blank');
    console.log(`Launched website at ${devUrl}`);
  }

  async executeWorkflow(userRequest: string): Promise<void> {
    console.log('Starting MominAI Agent workflow...');

    // 1. Intent Analysis
    console.log('Step 1: Analyzing user intent...');
    const analysis = await this.analyzeIntent(userRequest);

    // 2. Project Generation
    console.log('Step 2: Generating project specification...');
    const spec = await this.generateProjectSpec(analysis);

    // 3. File Creation Pipeline
    console.log('Step 3: Creating project files...');
    await this.createProjectFiles(spec);

    // 4. Development Setup
    console.log('Step 4: Setting up development environment...');
    await this.setupDevelopmentEnvironment(spec);
    await this.runNpmInstall();

    // 5. Run Development Server
    console.log('Step 5: Starting development server...');
    await this.runDevServer();

    // 6. Auto-launch
    console.log('Step 6: Auto-launching website...');
    await this.autoLaunchWebsite();

    console.log('MominAI Agent workflow completed successfully!');
  }
}

export default MominAIAgent;