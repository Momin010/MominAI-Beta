import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import toast from 'react-hot-toast';
import { Trash2, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  clearHistory?: () => void;
  selectedModel?: string;
  onModelChange?: (model: string) => void;
}

const Header: React.FC<HeaderProps> = ({ clearHistory, selectedModel, onModelChange }) => {
  const { theme, setTheme } = useTheme();

  const handleClearHistory = () => {
    clearHistory?.();
    toast.success('History cleared successfully');
  };

  return (
    <motion.header
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="backdrop-blur-xl bg-white/10 border-b border-white/20 px-6 py-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">MominAI Sandbox</h1>
          <p className="text-sm text-white/70">Experiment with AI in a safe environment</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleClearHistory}
            className="p-2 rounded-lg backdrop-blur-xl bg-white/10 hover:bg-white/20 transition-colors border border-white/20"
            title="Clear History"
          >
            <Trash2 className="w-6 h-6 text-white/70" />
          </button>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-lg backdrop-blur-xl bg-white/10 hover:bg-white/20 transition-colors border border-white/20"
            title="Toggle Theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-6 h-6 text-white/70" />
            ) : (
              <Moon className="w-6 h-6 text-white/70" />
            )}
          </button>
        </div>
      </div>
    </motion.header>
  );
};

export default Header;