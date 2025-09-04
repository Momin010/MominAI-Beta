#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('===========================================');
console.log('   MominAI Hybrid Sandbox - Direct Node.js Start');
console.log('===========================================\n');

console.log('Starting Next.js development server on port 3001...\n');

// Get the path to the Next.js CLI
const nextCliPath = path.join(__dirname, 'node_modules', 'next', 'dist', 'bin', 'next');

console.log('Next.js CLI path:', nextCliPath);

// Get the full path to the local Node.js executable
const nodePath = path.join(__dirname, 'node-v22.19.0-win-x64', 'node.exe');
console.log('Node.js path:', nodePath);

// Spawn the Next.js process
const nextProcess = spawn(nodePath, [nextCliPath, 'dev', '-p', '3001'], {
  stdio: 'inherit',
  cwd: __dirname,
  env: { ...process.env, NODE_ENV: 'development' }
});

nextProcess.on('error', (error) => {
  console.error('Failed to start Next.js:', error.message);
  console.log('\nTroubleshooting:');
  console.log('1. Make sure all dependencies are installed');
  console.log('2. Check if port 3001 is available');
  console.log('3. Try running: npm install');
  process.exit(1);
});

nextProcess.on('close', (code) => {
  if (code !== 0) {
    console.log(`\nNext.js process exited with code ${code}`);
  }
});

console.log('If successful, you should see:');
console.log('- ready started server on 0.0.0.0:3001');
console.log('- event compiled client and server successfully\n');

console.log('Then visit: http://localhost:3001\n');

// Keep the process running
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  nextProcess.kill('SIGTERM');
  process.exit(0);
});