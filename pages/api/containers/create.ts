import { NextApiRequest, NextApiResponse } from 'next';
import Docker from 'dockerode';

const docker = new Docker();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id, runtime, files, dependencies } = req.body;

  try {
    console.log(`🐳 Creating backend container for ${runtime}...`);

    // Create container configuration
    const containerConfig = {
      Image: getRuntimeImage(runtime),
      name: `mominai-${id}`,
      Cmd: ['sleep', 'infinity'], // Keep container running
      WorkingDir: '/app',
      HostConfig: {
        Memory: 512 * 1024 * 1024, // 512MB
        CpuQuota: 50000, // 50% CPU
        CpuPeriod: 100000
      }
    };

    // Create and start container
    const container = await docker.createContainer(containerConfig);
    await container.start();

    // Copy files to container
    if (files && Object.keys(files).length > 0) {
      for (const [filePath, content] of Object.entries(files)) {
        await copyFileToContainer(container, filePath, content as string);
      }
    }

    // Install dependencies
    if (dependencies && dependencies.length > 0) {
      await installDependencies(container, runtime, dependencies);
    }

    console.log(`✅ Backend container ${container.id} ready`);

    res.status(200).json({
      success: true,
      containerId: container.id,
      message: 'Backend container created successfully'
    });

  } catch (error) {
    console.error('❌ Container creation failed:', error);
    res.status(500).json({
      success: false,
      error: `Failed to create container: ${error}`
    });
  }
}

function getRuntimeImage(runtime: string): string {
  switch (runtime) {
    case 'python':
      return 'python:3.11-slim';
    case 'node':
      return 'node:18-alpine';
    case 'rust':
      return 'rust:1.70-slim';
    case 'go':
      return 'golang:1.20-alpine';
    case 'java':
      return 'openjdk:17-slim';
    default:
      return 'ubuntu:20.04';
  }
}

async function copyFileToContainer(container: Docker.Container, filePath: string, content: string) {
  const tarStream = require('tar-stream').pack();
  tarStream.entry({ name: filePath }, content);
  tarStream.finalize();

  await container.putArchive(tarStream, { path: '/app' });
}

async function installDependencies(container: Docker.Container, runtime: string, dependencies: string[]) {
  let installCommand: string[];

  switch (runtime) {
    case 'python':
      installCommand = ['pip', 'install', ...dependencies];
      break;
    case 'node':
      installCommand = ['npm', 'install', ...dependencies];
      break;
    case 'rust':
      // For Rust, we'll assume cargo add commands
      installCommand = ['cargo', 'add', ...dependencies];
      break;
    case 'go':
      installCommand = ['go', 'get', ...dependencies];
      break;
    default:
      return; // Skip for unknown runtimes
  }

  const exec = await container.exec({
    Cmd: installCommand,
    AttachStdout: true,
    AttachStderr: true
  });

  await exec.start();
}