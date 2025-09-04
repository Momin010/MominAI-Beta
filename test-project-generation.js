// Test script for project generation workflow
const { ProjectManager } = require('./lib/project-manager');

console.log('🧪 Testing Project Generation Workflow...\n');

// Test 1: Get available templates
console.log('📋 Available Templates:');
const templates = ProjectManager.getTemplates();
templates.forEach(template => {
  console.log(`  • ${template.name} - ${template.description}`);
});

console.log('\n');

// Test 2: Create a React + Vite project
console.log('⚛️ Creating React + Vite project...');
const reactTemplate = templates.find(t => t.name === 'React + Vite');
if (reactTemplate) {
  const projectFiles = ProjectManager.createProject(reactTemplate, 'test-react-app');
  console.log(`✅ Created project with ${projectFiles.length} files:`);

  projectFiles.forEach(file => {
    console.log(`  📄 ${file.path}`);
  });

  // Test 3: Convert to file nodes
  console.log('\n🌳 Converting to file tree structure...');
  const fileNodes = ProjectManager.filesToFileNodes(projectFiles);
  console.log(`✅ Generated ${fileNodes.length} root nodes:`);

  const printNode = (node, indent = 0) => {
    const prefix = '  '.repeat(indent);
    const icon = node.type === 'folder' ? '📁' : '📄';
    console.log(`${prefix}${icon} ${node.name}`);
    if (node.children) {
      node.children.forEach(child => printNode(child, indent + 1));
    }
  };

  fileNodes.forEach(node => printNode(node));
}

console.log('\n🎉 Project generation workflow test completed successfully!');
console.log('\n💡 To test in the browser:');
console.log('   1. Start the development server: npm run dev');
console.log('   2. Open the application in your browser');
console.log('   3. Try creating a project using the AI chat');
console.log('   4. Use commands like: "Create a React + Vite project called my-app"');