// Test script for filesystem API
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Filesystem API Integration...\n');

// Simulate the filesystem API call for creating a project
async function testProjectCreation() {
  const projectsDir = path.join(process.cwd(), 'projects');
  const projectName = 'test-car-dealership';
  const templateName = 'Car Dealership Website';

  console.log(`📁 Creating project: ${projectName}`);
  console.log(`📋 Using template: ${templateName}`);

  // Ensure projects directory exists
  if (!fs.existsSync(projectsDir)) {
    fs.mkdirSync(projectsDir, { recursive: true });
    console.log('✅ Created projects directory');
  }

  // Read the project-manager.ts to get template data
  const projectManagerPath = path.join(__dirname, 'lib', 'project-manager.ts');
  const content = fs.readFileSync(projectManagerPath, 'utf-8');

  // Extract the Car Dealership Website template
  const templateStart = content.indexOf("name: 'Car Dealership Website'");
  if (templateStart === -1) {
    console.log('❌ Car Dealership Website template not found');
    return;
  }

  // Find the files array for this template
  const filesStart = content.indexOf('files: [', templateStart);
  const filesEnd = content.indexOf(']', filesStart) + 1;

  if (filesStart === -1 || filesEnd === -1) {
    console.log('❌ Could not extract template files');
    return;
  }

  const filesContent = content.substring(filesStart, filesEnd);
  console.log('📄 Template files extracted');

  // Create project directory
  const projectPath = path.join(projectsDir, projectName);
  if (!fs.existsSync(projectPath)) {
    fs.mkdirSync(projectPath, { recursive: true });
    console.log(`✅ Created project directory: ${projectPath}`);
  }

  // For this test, just create a simple index.html file
  const indexPath = path.join(projectPath, 'index.html');
  const indexContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Car Dealership</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { color: #333; }
    </style>
</head>
<body>
    <h1>Welcome to Test Car Dealership</h1>
    <p>This is a test project created by the filesystem API.</p>
</body>
</html>`;

  fs.writeFileSync(indexPath, indexContent, 'utf-8');
  console.log(`✅ Created file: ${indexPath}`);

  console.log('\n🎉 Test project creation completed successfully!');
  console.log(`📂 Project location: ${projectPath}`);
}

testProjectCreation().catch(console.error);