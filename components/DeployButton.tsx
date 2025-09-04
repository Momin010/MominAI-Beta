import React, { useState } from 'react';
import toast from 'react-hot-toast';

interface DeployButtonProps {
  code: string;
  language: string;
}

interface VercelFile {
  file: string;
  data: string;
}

const DeployButton: React.FC<DeployButtonProps> = ({ code, language }) => {
  const [deploying, setDeploying] = useState(false);
  const [deploymentUrl, setDeploymentUrl] = useState<string | null>(null);

  const deployToVercel = async () => {
    const token = localStorage.getItem('vercel_token');
    if (!token) {
      toast.error('Please set your Vercel token in settings');
      return;
    }

    setDeploying(true);
    try {
      const files = generateFiles(code, language);
      const response = await fetch('https://api.vercel.com/v13/deployments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `mominai-${Date.now()}`,
          files,
          projectSettings: {
            framework: null,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Deployment failed: ${response.statusText}`);
      }

      const data = await response.json();
      setDeploymentUrl(data.url);
      toast.success('Deployment successful!');
    } catch (error) {
      console.error('Deployment error:', error);
      toast.error('Deployment failed. Please check your token and try again.');
    } finally {
      setDeploying(false);
    }
  };

  const generateFiles = (code: string, language: string): VercelFile[] => {
    const files: VercelFile[] = [];

    if (language === 'html') {
      files.push({
        file: 'index.html',
        data: btoa(code),
      });
    } else if (language === 'javascript' || language === 'js') {
      const html = `<html><body><script>${code}</script></body></html>`;
      files.push({
        file: 'index.html',
        data: btoa(html),
      });
    } else if (language === 'css') {
      const html = `<html><head><style>${code}</style></head><body></body></html>`;
      files.push({
        file: 'index.html',
        data: btoa(html),
      });
    } else {
      // Default to HTML
      files.push({
        file: 'index.html',
        data: btoa(code),
      });
    }

    return files;
  };

  return (
    <div className="flex items-center space-x-2 mt-2">
      <button
        onClick={deployToVercel}
        disabled={deploying}
        className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 disabled:opacity-50"
      >
        {deploying ? 'Deploying...' : 'Deploy to Vercel'}
      </button>
      {deploymentUrl && (
        <a
          href={`https://${deploymentUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-500 hover:underline"
        >
          View Deployment
        </a>
      )}
    </div>
  );
};

export default DeployButton;