import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface LoadingIndicatorProps {
  isLoading: boolean;
  message?: string;
  type?: 'spinner' | 'success' | 'error';
  progress?: number;
  className?: string;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  isLoading,
  message = 'Loading...',
  type = 'spinner',
  progress,
  className = ''
}) => {
  if (!isLoading && type !== 'success' && type !== 'error') {
    return null;
  }

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500/20 border-green-500/30';
      case 'error':
        return 'bg-red-500/20 border-red-500/30';
      default:
        return 'bg-blue-500/20 border-blue-500/30';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`fixed top-4 right-4 z-50 backdrop-blur-xl bg-white/10 rounded-lg border p-4 shadow-lg ${getBgColor()} ${className}`}
    >
      <div className="flex items-center gap-3">
        {getIcon()}
        <div className="flex-1">
          <p className="text-white text-sm font-medium">{message}</p>
          {progress !== undefined && (
            <div className="mt-2 w-full bg-white/20 rounded-full h-2">
              <motion.div
                className="bg-blue-400 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default LoadingIndicator;