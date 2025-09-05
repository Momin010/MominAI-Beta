import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  user_id?: string;
  created_at: string;
}

interface ChatAreaProps {
  roomId?: string;
  messages: Message[];
  loading?: boolean;
  submitting?: boolean;
  currentUserId?: string;
  onNewMessage?: (message: Message) => void;
  backgroundProcessing?: boolean;
}


const ChatArea: React.FC<ChatAreaProps> = ({ roomId, messages, loading = false, submitting = false, currentUserId, onNewMessage, backgroundProcessing = false }) => {
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [userScrolledUp, setUserScrolledUp] = useState(false);

  // Enhanced scrolling logic
  const scrollToBottom = (smooth = true) => {
    if (chatContainerRef.current) {
      const container = chatContainerRef.current;
      const scrollOptions: ScrollToOptions = {
        top: container.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      };
      container.scrollTo(scrollOptions);
    }
  };

  // Handle scroll events
  const handleScroll = useCallback(() => {
    if (chatContainerRef.current) {
      const container = chatContainerRef.current;
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      const nearBottom = distanceFromBottom < 100;

      setIsNearBottom(nearBottom);
      setShowScrollButton(!nearBottom);

      // Track if user manually scrolled up
      if (!nearBottom && !userScrolledUp) {
        setUserScrolledUp(true);
      } else if (nearBottom) {
        setUserScrolledUp(false);
      }
    }
  }, [userScrolledUp]);

  // Auto-scroll on new messages (only if user hasn't scrolled up)
  useEffect(() => {
    if (!userScrolledUp && messages.length > 0) {
      // Small delay to ensure DOM has updated
      setTimeout(() => scrollToBottom(true), 100);
    }
  }, [messages, userScrolledUp]);

  // Set up scroll listener
  useEffect(() => {
    const container = chatContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // Polling fallback for realtime (since Supabase replication is not available yet)
  useEffect(() => {
    if (!roomId) return;

    const pollForMessages = async () => {
      try {
        const { data: newMessages, error } = await supabase
          .from('room_messages')
          .select('*')
          .eq('room_id', roomId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) {
          console.error('Error polling messages:', error);
          return;
        }

        // Only add messages that aren't already in our state
        const existingIds = new Set(messages.map(m => m.id));
        const newMessageObjects = newMessages
          .filter(msg => !existingIds.has(msg.id))
          .map(msg => ({
            id: msg.id,
            type: msg.message_type as 'user' | 'ai',
            content: msg.content,
            user_id: msg.user_id,
            created_at: msg.created_at,
          }))
          .reverse(); // Reverse to maintain chronological order

        newMessageObjects.forEach(msg => onNewMessage?.(msg));
      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    // Initial poll
    pollForMessages();

    // Set up polling interval (every 2 seconds)
    const interval = setInterval(pollForMessages, 2000);

    return () => clearInterval(interval);
  }, [roomId, messages, onNewMessage]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const renderContent = (content: string) => {
    return <span>{content}</span>;
  };

  return (
    <div className="flex-1 relative overflow-hidden min-h-0">
      <div
        ref={chatContainerRef}
        className="overflow-y-auto p-6 space-y-4 flex-1 min-h-0"
        style={{ scrollBehavior: 'smooth' }}
      >
        {loading && messages.length === 0 && (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}
        {messages.map((message, index) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className="flex flex-col">
              {message.type === 'user' && message.user_id && (
                <span className="text-xs text-white/70 mb-1 px-2">
                  {message.user_id === currentUserId ? 'You' : `User ${message.user_id.slice(0, 8)}`}
                </span>
              )}
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg backdrop-blur-xl ${
                  message.type === 'user'
                    ? 'bg-white/20 text-white border border-white/20'
                    : 'bg-white/10 text-white border border-white/10'
                }`}
              >
                {message.type === 'ai' ? renderContent(message.content) : <p>{message.content}</p>}
                {message.type === 'ai' && (
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-white/70">AI Assistant</span>
                    <button
                      onClick={() => copyToClipboard(message.content)}
                      className="text-xs text-white/70 hover:text-white transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
        {submitting && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg backdrop-blur-xl bg-white/10 text-white border border-white/10">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-white/70 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-white/70 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-white/70 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm text-white/70">AI is thinking...</span>
              </div>
            </div>
          </motion.div>
        )}
        {backgroundProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg backdrop-blur-xl bg-blue-500/20 text-white border border-blue-500/30">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                <span className="text-sm text-blue-300">Creating files in background...</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-4 right-4 p-3 bg-white/20 hover:bg-white/30 backdrop-blur-xl rounded-full border border-white/20 transition-all duration-200 shadow-lg"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <ChevronDown className="w-5 h-5 text-white" />
        </motion.button>
      )}
    </div>
  );
};

export default ChatArea;