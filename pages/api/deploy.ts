import { NextApiRequest, NextApiResponse } from 'next';
import { DeploymentService, DeploymentConfig } from '../../lib/deployment-service';

const deploymentService = new DeploymentService();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { projectId, platform, buildCommand, outputDir, environment, domains } = req.body;

  if (!projectId || !platform) {
    return res.status(400).json({ error: 'Project ID and platform are required' });
  }

  const config: DeploymentConfig = {
    platform,
    buildCommand: buildCommand || 'npm run build',
    outputDir: outputDir || '.next',
    environment: environment || {},
    domains: domains || []
  };

  try {
    console.log(`🚀 Starting deployment for project ${projectId} to ${platform}`);
    const result = await deploymentService.deploy(projectId, config);

    if (result.success) {
      res.status(200).json({
        success: true,
        url: result.url,
        deploymentId: result.deploymentId,
        logs: result.logs
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        logs: result.logs
      });
    }
  } catch (error) {
    console.error('Deployment API error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown deployment error'
    });
  }
}