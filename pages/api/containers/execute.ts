import { NextApiRequest, NextApiResponse } from 'next';
import Docker from 'dockerode';

const docker = new Docker();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { containerId, command, files } = req.body;

  try {
    console.log(`🚀 Executing command in container ${containerId}: ${command}`);

    const container = docker.getContainer(containerId);

    // Copy any additional files if provided
    if (files && Object.keys(files).length > 0) {
      for (const [filePath, content] of Object.entries(files)) {
        await copyFileToContainer(container, filePath, content as string);
      }
    }

    // Execute the command
    const exec = await container.exec({
      Cmd: ['sh', '-c', command],
      AttachStdout: true,
      AttachStderr: true,
      Tty: false
    });

    const stream = await exec.start();

    let output = '';
    let errorOutput = '';

    // Collect output
    stream.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });

    stream.on('error', (chunk: Buffer) => {
      errorOutput += chunk.toString();
    });

    // Wait for execution to complete
    await new Promise((resolve, reject) => {
      stream.on('end', resolve);
      stream.on('error', reject);
    });

    const execResult = await exec.inspect();

    const success = execResult.ExitCode === 0;
    const finalOutput = success ? output : errorOutput;

    console.log(`✅ Command execution ${success ? 'successful' : 'failed'}`);

    res.status(200).json({
      success,
      output: finalOutput,
      exitCode: execResult.ExitCode,
      containerId
    });

  } catch (error) {
    console.error('❌ Container execution failed:', error);
    res.status(500).json({
      success: false,
      error: `Failed to execute command: ${error}`,
      output: ''
    });
  }
}

async function copyFileToContainer(container: Docker.Container, filePath: string, content: string) {
  const tar = require('tar-stream');
  const pack = tar.pack();

  pack.entry({ name: filePath }, content);
  pack.finalize();

  await container.putArchive(pack, { path: '/app' });
}