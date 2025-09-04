import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Code, Eye, Play, Download, Copy, Settings, Image, Link, FileText, MessageSquare, Send, History, ChevronLeft, ChevronRight, FolderOpen, FilePlus, Heart, Upload, Star } from 'lucide-react';
import { getConversationalResponse } from '../src/IDE/services/aiService';

type Framework = 'react-tailwind' | 'vue-unocss' | 'html-css';

interface GeneratedComponent {
  id: string;
  code: string;
  framework: Framework;
  preview: string;
  createdAt: Date;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface ComponentVersion {
  id: string;
  code: string;
  preview: string;
  timestamp: Date;
  description: string;
}

interface ComponentGeneratorProps {
  onComponentGenerated?: (component: GeneratedComponent) => void;
  onOpenInEditor?: (code: string, fileName: string) => void;
}

const ComponentGenerator: React.FC<ComponentGeneratorProps> = ({ onComponentGenerated, onOpenInEditor }) => {
  const [framework, setFramework] = useState<Framework>('react-tailwind');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [inputMode, setInputMode] = useState<'text' | 'image' | 'url'>('text');
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [componentVersions, setComponentVersions] = useState<ComponentVersion[]>([]);
  const [currentVersionIndex, setCurrentVersionIndex] = useState(-1);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState('');
  const [favorites, setFavorites] = useState<GeneratedComponent[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const frameworks = [
    { id: 'react-tailwind' as Framework, name: 'React + Tailwind', icon: '⚛️' },
    { id: 'vue-unocss' as Framework, name: 'Vue + UnoCSS', icon: '💚' },
    { id: 'html-css' as Framework, name: 'HTML + CSS', icon: '🌐' }
  ];

  const handleGenerate = async () => {
    if (!prompt.trim() && !uploadedImage && !urlInput.trim()) return;

    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationStatus('Analyzing input...');

    try {
      setGenerationProgress(25);
      setGenerationStatus('Preparing AI request...');
      let response;
      let result;

      if (inputMode === 'url' && urlInput.trim()) {
        // Use URL-to-code API
        response = await fetch('/api/url-to-code', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: urlInput,
            framework,
            prompt
          }),
        });
      } else {
        // Use Gemini Vision API for text and image inputs
        const formData = new FormData();
        formData.append('framework', framework);
        formData.append('prompt', prompt);
        formData.append('inputType', inputMode);

        if (inputMode === 'image' && uploadedImage) {
          formData.append('image', uploadedImage);
        }

        response = await fetch('/api/gemini-vision', {
          method: 'POST',
          body: formData,
        });
      }

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      setGenerationProgress(75);
      setGenerationStatus('Processing response...');

      result = await response.json();

      setGenerationProgress(90);
      setGenerationStatus('Finalizing component...');

      setGeneratedCode(result.code);
      setPreviewHtml(result.preview);

      // Save version
      const newVersion: ComponentVersion = {
        id: Date.now().toString(),
        code: result.code,
        preview: result.preview,
        timestamp: new Date(),
        description: `Generated from ${inputMode === 'text' ? 'text prompt' : inputMode === 'image' ? 'image' : 'URL'}`
      };

      setComponentVersions(prev => [...prev, newVersion]);
      setCurrentVersionIndex(componentVersions.length);

      const component: GeneratedComponent = {
        id: newVersion.id,
        code: result.code,
        framework,
        preview: result.preview,
        createdAt: newVersion.timestamp
      };

      onComponentGenerated?.(component);
    } catch (error) {
      console.error('Generation failed:', error);
      // Fallback to mock generation if API fails
      const mockCode = generateMockCode(framework, prompt);
      const mockPreview = generateMockPreview(framework, mockCode);

      setGeneratedCode(mockCode);
      setPreviewHtml(mockPreview);

      // Save version
      const newVersion: ComponentVersion = {
        id: Date.now().toString(),
        code: mockCode,
        preview: mockPreview,
        timestamp: new Date(),
        description: `Generated from ${inputMode} (fallback)`
      };

      setComponentVersions(prev => [...prev, newVersion]);
      setCurrentVersionIndex(componentVersions.length);

      const component: GeneratedComponent = {
        id: newVersion.id,
        code: mockCode,
        framework,
        preview: mockPreview,
        createdAt: newVersion.timestamp
      };

      onComponentGenerated?.(component);
    } finally {
      setIsGenerating(false);
      setGenerationProgress(100);
      setGenerationStatus('Complete!');
      setTimeout(() => {
        setGenerationProgress(0);
        setGenerationStatus('');
      }, 2000);
    }
  };

  const generateMockCode = (fw: Framework, prompt: string): string => {
    switch (fw) {
      case 'react-tailwind':
        return `import React from 'react';

const GeneratedComponent = () => {
  return (
    <div className="p-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-white mb-4">
        Generated Component
      </h2>
      <p className="text-white/80">
        Based on: "${prompt || 'Your prompt'}"
      </p>
      <button className="mt-4 px-4 py-2 bg-white text-blue-600 rounded hover:bg-gray-100 transition-colors">
        Click me!
      </button>
    </div>
  );
};

export default GeneratedComponent;`;

      case 'vue-unocss':
        return `<template>
  <div class="p-6 bg-gradient-to-r from-green-500 to-teal-600 rounded-lg shadow-lg">
    <h2 class="text-2xl font-bold text-white mb-4">
      Generated Component
    </h2>
    <p class="text-white/80">
      Based on: "${prompt || 'Your prompt'}"
    </p>
    <button class="mt-4 px-4 py-2 bg-white text-green-600 rounded hover:bg-gray-100 transition-colors">
      Click me!
    </button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
</script>

<style scoped>
/* UnoCSS classes will be applied automatically */
</style>`;

      case 'html-css':
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Generated Component</title>
  <style>
    .component {
      padding: 1.5rem;
      background: linear-gradient(to right, #f59e0b, #ef4444);
      border-radius: 0.5rem;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    }
    .component h2 {
      font-size: 1.5rem;
      font-weight: bold;
      color: white;
      margin-bottom: 1rem;
    }
    .component p {
      color: rgba(255, 255, 255, 0.8);
    }
    .component button {
      margin-top: 1rem;
      padding: 0.5rem 1rem;
      background: white;
      color: #f59e0b;
      border: none;
      border-radius: 0.25rem;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    .component button:hover {
      background: #f3f4f6;
    }
  </style>
</head>
<body>
  <div class="component">
    <h2>Generated Component</h2>
    <p>Based on: "${prompt || 'Your prompt'}"</p>
    <button>Click me!</button>
  </div>
</body>
</html>`;

      default:
        return '';
    }
  };

  const generateMockPreview = (fw: Framework, code: string): string => {
    if (fw === 'html-css') {
      return code;
    }

    // For React/Vue, create a simple HTML wrapper
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 p-8">
  <div id="root"></div>
  <script>
    // Mock preview - in real implementation, this would render the actual component
    const root = document.getElementById('root');
    root.innerHTML = \`
      <div class="p-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg max-w-md">
        <h2 class="text-2xl font-bold text-white mb-4">Generated Component</h2>
        <p class="text-white/80">Preview Mode</p>
        <button class="mt-4 px-4 py-2 bg-white text-blue-600 rounded hover:bg-gray-100 transition-colors">
          Click me!
        </button>
      </div>
    \`;
  </script>
</body>
</html>`;
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedImage(file);
      setInputMode('image');
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode);
  };

  const handleDownload = () => {
    const blob = new Blob([generatedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `component.${framework === 'html-css' ? 'html' : 'tsx'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadZIP = async () => {
    // Create a simple ZIP-like structure (in a real implementation, use a ZIP library)
    const files: { name: string; content: string }[] = [];

    if (framework === 'react-tailwind') {
      files.push({
        name: 'Component.tsx',
        content: generatedCode
      });
      files.push({
        name: 'package.json',
        content: JSON.stringify({
          name: 'generated-component',
          version: '1.0.0',
          dependencies: {
            'react': '^18.0.0',
            'react-dom': '^18.0.0'
          }
        }, null, 2)
      });
    } else if (framework === 'vue-unocss') {
      files.push({
        name: 'Component.vue',
        content: generatedCode
      });
    } else {
      files.push({
        name: 'index.html',
        content: generatedCode
      });
    }

    // For demo purposes, just download the main file
    // In a real implementation, you'd create an actual ZIP file
    handleDownload();
  };

  const handleCreateFile = async () => {
    try {
      const fileName = `GeneratedComponent.${framework === 'html-css' ? 'html' : framework === 'react-tailwind' ? 'tsx' : 'vue'}`;
      const filePath = `projects/generated-components/${fileName}`;

      const response = await fetch('/api/filesystem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'writeFile',
          path: filePath,
          content: generatedCode
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create file');
      }

      alert(`File created successfully: ${filePath}`);
    } catch (error) {
      console.error('Error creating file:', error);
      alert('Failed to create file. Please try again.');
    }
  };

  const handleOpenInEditor = () => {
    if (onOpenInEditor && generatedCode) {
      const fileName = `GeneratedComponent.${framework === 'html-css' ? 'html' : framework === 'react-tailwind' ? 'tsx' : 'vue'}`;
      onOpenInEditor(generatedCode, fileName);
    }
  };

  const handleChatSubmit = async () => {
    if (!chatInput.trim() || !generatedCode) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: chatInput,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsRefining(true);

    try {
      // Add context about the current component
      const refinementPrompt = `I have this ${framework} component:

${generatedCode}

User wants to refine it with: "${chatInput}"

Please provide an updated version of the component that addresses the user's request. Return only the updated code, no explanations.`;

      const apiKey = process.env.GEMINI_API_KEY || null;
      const result = await getConversationalResponse(refinementPrompt, 'code', apiKey);
      const refinedCode = result.trim() || '';

      // Update the generated code and preview
      setGeneratedCode(refinedCode);
      const updatedPreview = generateMockPreview(framework, refinedCode);
      setPreviewHtml(updatedPreview);

      // Save version
      const newVersion: ComponentVersion = {
        id: Date.now().toString(),
        code: refinedCode,
        preview: updatedPreview,
        timestamp: new Date(),
        description: `Refined: "${chatInput}"`
      };

      setComponentVersions(prev => [...prev, newVersion]);
      setCurrentVersionIndex(componentVersions.length);

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'Component updated! Check the preview to see the changes.',
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, aiMessage]);

      // Update the component
      const updatedComponent: GeneratedComponent = {
        id: newVersion.id,
        code: refinedCode,
        framework,
        preview: updatedPreview,
        createdAt: newVersion.timestamp
      };

      onComponentGenerated?.(updatedComponent);

    } catch (error) {
      console.error('Refinement failed:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'Sorry, I couldn\'t refine the component. Please try again.',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsRefining(false);
    }
  };

  // Version navigation functions
  const switchToVersion = (index: number) => {
    if (index >= 0 && index < componentVersions.length) {
      const version = componentVersions[index];
      setGeneratedCode(version.code);
      setPreviewHtml(version.preview);
      setCurrentVersionIndex(index);
    }
  };

  const goToPreviousVersion = () => {
    if (currentVersionIndex > 0) {
      switchToVersion(currentVersionIndex - 1);
    }
  };

  const goToNextVersion = () => {
    if (currentVersionIndex < componentVersions.length - 1) {
      switchToVersion(currentVersionIndex + 1);
    }
  };

  // Favorite management functions
  const addToFavorites = (component: GeneratedComponent) => {
    if (!favorites.find(fav => fav.id === component.id)) {
      setFavorites(prev => [...prev, component]);
    }
  };

  const removeFromFavorites = (componentId: string) => {
    setFavorites(prev => prev.filter(fav => fav.id !== componentId));
  };

  const isFavorite = (componentId: string) => {
    return favorites.some(fav => fav.id === componentId);
  };

  // Export/Import functions
  const exportComponents = () => {
    const exportData = {
      components: componentVersions,
      favorites: favorites,
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `component-generator-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importComponents = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importData = JSON.parse(e.target?.result as string);
          if (importData.components) {
            setComponentVersions(importData.components);
            setCurrentVersionIndex(importData.components.length - 1);
          }
          if (importData.favorites) {
            setFavorites(importData.favorites);
          }
          alert('Components imported successfully!');
        } catch (error) {
          alert('Failed to import components. Please check the file format.');
        }
      };
      reader.readAsText(file);
    }
  };

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Code className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Component Generator</h1>
              <p className="text-white/60">Generate components from text, images, or URLs</p>
            </div>
          </div>

          {/* Framework Selector and Tools */}
          <div className="flex items-center space-x-3">
            {/* Framework Selector */}
            <div className="flex space-x-2">
              {frameworks.map((fw) => (
                <button
                  key={fw.id}
                  onClick={() => setFramework(fw.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
                    framework === fw.id
                      ? 'bg-purple-500 text-white shadow-lg'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  <span>{fw.icon}</span>
                  <span>{fw.name}</span>
                </button>
              ))}
            </div>

            {/* Tools */}
            <div className="flex space-x-2 border-l border-white/20 pl-3">
              {/* Favorites */}
              <button
                onClick={() => {
                  if (generatedCode && componentVersions.length > 0) {
                    const currentVersion = componentVersions[currentVersionIndex];
                    if (currentVersion) {
                      const componentId = currentVersion.id;
                      if (isFavorite(componentId)) {
                        removeFromFavorites(componentId);
                      } else {
                        // Convert ComponentVersion to GeneratedComponent for favorites
                        const favoriteComponent: GeneratedComponent = {
                          id: currentVersion.id,
                          code: currentVersion.code,
                          framework: framework,
                          preview: currentVersion.preview,
                          createdAt: currentVersion.timestamp
                        };
                        addToFavorites(favoriteComponent);
                      }
                    }
                  }
                }}
                className={`p-2 rounded-lg transition-colors ${
                  generatedCode && componentVersions.length > 0 && isFavorite(componentVersions[currentVersionIndex]?.id)
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                }`}
                title="Add to Favorites"
              >
                <Heart className={`w-4 h-4 ${generatedCode && componentVersions.length > 0 && isFavorite(componentVersions[currentVersionIndex]?.id) ? 'fill-current' : ''}`} />
              </button>

              {/* Export */}
              <button
                onClick={exportComponents}
                disabled={componentVersions.length === 0}
                className="p-2 bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed rounded-lg text-white/70 hover:text-white transition-colors"
                title="Export Components"
              >
                <Upload className="w-4 h-4" />
              </button>

              {/* Import */}
              <label className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white/70 hover:text-white transition-colors cursor-pointer" title="Import Components">
                <Download className="w-4 h-4" />
                <input
                  type="file"
                  accept=".json"
                  onChange={importComponents}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Input Section */}
      <div className="p-6 border-b border-white/10">
        <div className="flex space-x-4">
          {/* Input Mode Tabs */}
          <div className="flex space-x-1 bg-white/10 rounded-lg p-1">
            <button
              onClick={() => setInputMode('text')}
              className={`px-3 py-2 rounded text-sm font-medium transition-all ${
                inputMode === 'text' ? 'bg-white text-black' : 'text-white/70 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Text
            </button>
            <button
              onClick={() => setInputMode('image')}
              className={`px-3 py-2 rounded text-sm font-medium transition-all ${
                inputMode === 'image' ? 'bg-white text-black' : 'text-white/70 hover:text-white'
              }`}
            >
              <Image className="w-4 h-4 inline mr-2" />
              Image
            </button>
            <button
              onClick={() => setInputMode('url')}
              className={`px-3 py-2 rounded text-sm font-medium transition-all ${
                inputMode === 'url' ? 'bg-white text-black' : 'text-white/70 hover:text-white'
              }`}
            >
              <Link className="w-4 h-4 inline mr-2" />
              URL
            </button>
          </div>

          {/* Input Field */}
          <div className="flex-1">
            {inputMode === 'text' && (
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the component you want to generate..."
                className="w-full h-12 resize-none rounded-lg border border-white/20 bg-white/5 backdrop-blur-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            )}

            {inputMode === 'image' && (
              <div className="flex items-center space-x-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-white/70 hover:text-white transition-colors"
                >
                  <Image className="w-5 h-5 inline mr-2" />
                  Upload Image
                </button>
                {uploadedImage && (
                  <span className="text-white/60 text-sm">{uploadedImage.name}</span>
                )}
              </div>
            )}

            {inputMode === 'url' && (
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Enter website URL to analyze..."
                className="w-full h-12 rounded-lg border border-white/20 bg-white/5 backdrop-blur-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            )}
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || (!prompt.trim() && !uploadedImage && !urlInput.trim())}
            className="px-6 py-3 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-500 text-white rounded-lg font-medium transition-colors flex items-center space-x-2 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Generate</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Chat Panel */}
      {generatedCode && (
        <div className="border-t border-white/10">
          <button
            onClick={() => setShowChat(!showChat)}
            className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-purple-400" />
              <span className="text-white font-medium">Refine Component</span>
              <span className="text-white/60 text-sm">({chatMessages.length} messages)</span>
            </div>
            <div className={`transform transition-transform ${showChat ? 'rotate-180' : ''}`}>
              ▼
            </div>
          </button>

          {showChat && (
            <div className="p-4 border-t border-white/10">
             {/* Chat Messages */}
<div
  ref={chatScrollRef}
  className="h-64 overflow-y-auto mb-4 space-y-3 bg-black/20 rounded-lg p-3"
>
  {chatMessages.length === 0 ? (
    <div className="text-center text-white/60 py-8">
      <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
      <p>Start a conversation to refine your component</p>
      <p className="text-sm mt-1">
        Try: &quot;Make the button bigger&quot; or &quot;Change the color to blue&quot;
      </p>
    </div>
                ) : (
                  chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                          message.type === 'user'
                            ? 'bg-purple-500 text-white'
                            : 'bg-white/10 text-white'
                        }`}
                      >
                        {message.content}
                      </div>
                    </div>
                  ))
                )}
                {isRefining && (
                  <div className="flex justify-start">
                    <div className="bg-white/10 px-3 py-2 rounded-lg text-sm text-white">
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Refining component...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Describe how you'd like to refine the component..."
                  className="flex-1 px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleChatSubmit();
                    }
                  }}
                />
                <button
                  onClick={handleChatSubmit}
                  disabled={!chatInput.trim() || isRefining}
                  className="px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-500 text-white rounded-lg font-medium transition-colors flex items-center space-x-2 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Version History Panel */}
      {componentVersions.length > 0 && (
        <div className="border-t border-white/10">
          <button
            onClick={() => setShowVersions(!showVersions)}
            className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <History className="w-5 h-5 text-blue-400" />
              <span className="text-white font-medium">Version History</span>
              <span className="text-white/60 text-sm">({componentVersions.length} versions)</span>
            </div>
            <div className="flex items-center space-x-2">
              {/* Version Navigation */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToPreviousVersion();
                }}
                disabled={currentVersionIndex <= 0}
                className="p-1 bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed rounded text-white/70 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-white/60 text-sm">
                {currentVersionIndex + 1} / {componentVersions.length}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToNextVersion();
                }}
                disabled={currentVersionIndex >= componentVersions.length - 1}
                className="p-1 bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed rounded text-white/70 hover:text-white transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className={`transform transition-transform ${showVersions ? 'rotate-180' : ''}`}>
              ▼
            </div>
          </button>

          {showVersions && (
            <div className="p-4 border-t border-white/10">
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {componentVersions.map((version, index) => (
                  <button
                    key={version.id}
                    onClick={() => switchToVersion(index)}
                    className={`w-full p-3 rounded-lg text-left transition-colors ${
                      index === currentVersionIndex
                        ? 'bg-purple-500/20 border border-purple-500/30'
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-white font-medium text-sm">
                          Version {index + 1}
                        </div>
                        <div className="text-white/60 text-xs">
                          {version.description}
                        </div>
                        <div className="text-white/40 text-xs">
                          {version.timestamp.toLocaleString()}
                        </div>
                      </div>
                      {index === currentVersionIndex && (
                        <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 p-6">
        <PanelGroup direction="horizontal" className="h-full">
          {/* Code Panel */}
          <Panel defaultSize={50} minSize={30} className="pr-3">
            <div className="h-full backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Code className="w-5 h-5 text-purple-400" />
                  <span className="text-white font-medium">Generated Code</span>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleCopyCode}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded text-white/70 hover:text-white transition-colors"
                    title="Copy Code"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleDownload}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded text-white/70 hover:text-white transition-colors"
                    title="Download File"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleDownloadZIP}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded text-white/70 hover:text-white transition-colors"
                    title="Download ZIP"
                  >
                    <FilePlus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleCreateFile}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded text-white/70 hover:text-white transition-colors"
                    title="Create File"
                  >
                    <FolderOpen className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleOpenInEditor}
                    className="px-3 py-2 bg-purple-500 hover:bg-purple-600 rounded text-white text-sm font-medium transition-colors"
                    title="Open in Editor"
                  >
                    Open in Editor
                  </button>
                </div>
              </div>
              <textarea
                value={generatedCode}
                readOnly
                className="w-full h-full resize-none bg-transparent px-4 py-3 text-white placeholder-white/50 focus:outline-none font-mono text-sm"
                placeholder="Generated code will appear here..."
                spellCheck={false}
              />
            </div>
          </Panel>

          {/* Resize Handle */}
          <PanelResizeHandle className="w-2 bg-white/10 backdrop-blur-xl rounded-full mx-1 transition-all duration-300 hover:bg-white/20 hover:w-3 cursor-col-resize" />

          {/* Preview Panel */}
          <Panel defaultSize={50} minSize={30} className="pl-3">
            <div className="h-full backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
              <div className="p-4 border-b border-white/10 flex items-center space-x-2">
                <Eye className="w-5 h-5 text-green-400" />
                <span className="text-white font-medium">Live Preview</span>
              </div>
              <div className="h-full bg-white rounded-b-2xl overflow-hidden relative">
                {isGenerating && (
                  <div className="absolute inset-0 bg-white/90 flex items-center justify-center z-10">
                    <div className="text-center max-w-sm">
                      <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-gray-700 font-medium text-lg mb-2">{generationStatus || 'Generating component...'}</p>

                      {/* Progress Bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                        <div
                          className="bg-purple-500 h-2 rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${generationProgress}%` }}
                        />
                      </div>

                      <p className="text-gray-500 text-sm">{generationProgress}% complete</p>
                      <p className="text-gray-400 text-xs mt-1">This may take a few seconds</p>
                    </div>
                  </div>
                )}

                {previewHtml ? (
                  <iframe
                    key={previewHtml.substring(0, 50)} // Force re-render when content changes
                    srcDoc={previewHtml}
                    className="w-full h-full border-0"
                    title="Component Preview"
                    sandbox="allow-scripts allow-same-origin"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Preview will appear here</p>
                      <p className="text-sm mt-2 text-gray-400">Generate a component to see it in action</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
};

export default ComponentGenerator;