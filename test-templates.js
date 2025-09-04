// Simple test to check if templates are working
const fs = require('fs');
const path = require('path');

// Read the project-manager.ts file and extract template names
const projectManagerPath = path.join(__dirname, 'lib', 'project-manager.ts');
const content = fs.readFileSync(projectManagerPath, 'utf-8');

// Extract template names using regex
const templateRegex = /name: '([^']+)'/g;
const templates = [];
let match;

console.log('🧪 Testing Template Extraction...\n');

while ((match = templateRegex.exec(content)) !== null) {
  templates.push(match[1]);
}

console.log('📋 Available Templates:');
templates.forEach((template, index) => {
  console.log(`  ${index + 1}. ${template}`);
});

console.log('\n✅ Template extraction test completed successfully!');
console.log(`Found ${templates.length} templates.`);

// Check if our new templates are included
const expectedTemplates = [
  'Car Dealership Website',
  'E-commerce Site',
  'React Auth App',
  'React + Vite',
  'Vue + Vite',
  'Next.js App'
];

console.log('\n🔍 Checking for expected templates:');
expectedTemplates.forEach(template => {
  if (templates.includes(template)) {
    console.log(`  ✅ ${template}`);
  } else {
    console.log(`  ❌ ${template} - NOT FOUND`);
  }
});