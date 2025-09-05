/**
 * One-Click Deployment Panel
 * Deploy projects to Vercel, Netlify, AWS, GCP, Docker
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Rocket, Globe, CheckCircle, XCircle, Loader } from 'lucide-react';

interface DeploymentPanelProps {
  projectId: string;
  isVisible: boolean;
  onToggle: () => void;
}

export const DeploymentPanel: React.FC<DeploymentPanelProps> = ({
  projectId,
  isVisible,
  onToggle
}) => {
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState<'idle' | 'deploying' | 'success' | 'error'>('idle');
  const [deploymentUrl, setDeploymentUrl] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('vercel');

  const platforms = [
    { id: 'vercel', name: 'Vercel', icon: '▲', color: 'bg-black' },
    { id: 'netlify', name: 'Netlify', icon: 'N', color: 'bg-teal-500' },
    { id: 'aws', name: 'AWS Amplify', icon: 'AWS', color: 'bg-orange-500' },
    { id: 'gcp', name: 'Google Cloud', icon: 'GCP', color: 'bg-blue-500' },
    { id: 'docker', name: 'Docker', icon: '🐳', color: 'bg-blue-600' }
  ];

  const handleDeploy = async () => {
    setIsDeploying(true);
    setDeploymentStatus('deploying');
    setLogs([]);

    try {
      const response = await fetch('/api/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          platform: selectedPlatform,
          buildCommand: 'npm run build',
          outputDir: '.next',
          environment: {
            NODE_ENV: 'production'
          }
        }),
      });

      const data = await response.json();

      if (data.success) {
        setDeploymentStatus('success');
        setDeploymentUrl(data.url);
        setLogs(data.logs);
      } else {
        setDeploymentStatus('error');
        setLogs(data.logs);
      }
    } catch (error) {
      setDeploymentStatus('error');
      setLogs([`Deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed right-0 top-16 h-[calc(100vh-4rem)] w-96 bg-black/95 backdrop-blur-xl border-l border-white/10 shadow-2xl z-40"
    >
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Rocket className="w-5 h-5 text-white" />
            <h3 className="text-white font-semibold">Deploy</h3>
          </div>
          <button
            onClick={onToggle}
            className="text-white/60 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Platform Selection */}
      <div className="p-4 border-b border-white/10">
        <h4 className="text-white/80 text-sm font-medium mb-3">Choose Platform</h4>
        <div className="grid grid-cols-2 gap-2">
          {platforms.map((platform) => (
            <button
              key={platform.id}
              onClick={() => setSelectedPlatform(platform.id)}
              className={`p-3 rounded-lg border transition-all ${
                selectedPlatform === platform.id
                  ? 'border-white/50 bg-white/10'
                  : 'border-white/20 hover:border-white/30'
              }`}
            >
              <div className={`w-8 h-8 ${platform.color} rounded flex items-center justify-center text-white font-bold text-sm mb-2`}>
                {platform.icon}
              </div>
              <div className="text-white text-xs font-medium">{platform.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Deployment Status */}
      <div className="p-4 border-b border-white/10">
        {deploymentStatus === 'idle' && (
          <div className="text-center py-4">
            <Globe className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/60 text-sm">Ready to deploy your project</p>
          </div>
        )}

        {deploymentStatus === 'deploying' && (
          <div className="text-center py-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full mx-auto mb-3"
            />
            <p className="text-white text-sm">Deploying to {platforms.find(p => p.id === selectedPlatform)?.name}...</p>
          </div>
        )}

        {deploymentStatus === 'success' && (
          <div className="text-center py-4">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-white text-sm mb-2">Deployment successful!</p>
            {deploymentUrl && (
              <a
                href={deploymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-sm underline"
              >
                {deploymentUrl}
              </a>
            )}
          </div>
        )}

        {deploymentStatus === 'error' && (
          <div className="text-center py-4">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <p className="text-white text-sm">Deployment failed</p>
          </div>
        )}
      </div>

      {/* Deploy Button */}
      <div className="p-4">
        <button
          onClick={handleDeploy}
          disabled={isDeploying}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-all flex items-center justify-center space-x-2"
        >
          {isDeploying ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              <span>Deploying...</span>
            </>
          ) : (
            <>
              <Rocket className="w-4 h-4" />
              <span>Deploy to {platforms.find(p => p.id === selectedPlatform)?.name}</span>
            </>
          )}
        </button>
      </div>

      {/* Logs */}
      {logs.length > 0 && (
        <div className="flex-1 p-4 overflow-y-auto">
          <h4 className="text-white/80 text-sm font-medium mb-2">Deployment Logs</h4>
          <div className="bg-black/50 rounded-lg p-3 max-h-48 overflow-y-auto">
            {logs.map((log, index) => (
              <div key={index} className="text-white/60 text-xs font-mono mb-1">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default DeploymentPanel;