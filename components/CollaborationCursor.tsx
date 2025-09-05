/**
 * Real-time Collaboration Cursor
 * Shows other users' cursors and selections in the editor
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface Cursor {
  userId: string;
  position: { line: number; column: number };
  filePath: string;
}

interface User {
  id: string;
  name: string;
  color: string;
}

interface CollaborationCursorProps {
  cursors: Cursor[];
  users: User[];
  editorRef: React.RefObject<any>;
  currentFile: string;
}

export const CollaborationCursor: React.FC<CollaborationCursorProps> = ({
  cursors,
  users,
  editorRef,
  currentFile
}) => {
  const [cursorPositions, setCursorPositions] = useState<Map<string, { x: number; y: number; user: User }>>(new Map());

  useEffect(() => {
    const updateCursorPositions = () => {
      if (!editorRef.current) return;

      const newPositions = new Map<string, { x: number; y: number; user: User }>();

      cursors
        .filter(cursor => cursor.filePath === currentFile)
        .forEach(cursor => {
          const user = users.find(u => u.id === cursor.userId);
          if (!user) return;

          // Convert line/column to pixel coordinates
          const position = getCursorPixelPosition(cursor.position.line, cursor.position.column);
          if (position) {
            newPositions.set(cursor.userId, { ...position, user });
          }
        });

      setCursorPositions(newPositions);
    };

    updateCursorPositions();

    // Update positions on window resize
    window.addEventListener('resize', updateCursorPositions);
    return () => window.removeEventListener('resize', updateCursorPositions);
  }, [cursors, users, currentFile, editorRef]);

  const getCursorPixelPosition = (line: number, column: number) => {
    if (!editorRef.current) return null;

    try {
      // This is a simplified implementation - in a real editor integration,
      // you'd use the editor's API to convert line/column to pixel coordinates
      const lineHeight = 20; // Approximate line height
      const charWidth = 8; // Approximate character width

      return {
        x: column * charWidth,
        y: line * lineHeight
      };
    } catch (error) {
      console.warn('Failed to calculate cursor position:', error);
      return null;
    }
  };

  return (
    <>
      {Array.from(cursorPositions.entries()).map(([userId, { x, y, user }]) => (
        <motion.div
          key={userId}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute pointer-events-none z-50"
          style={{
            left: x,
            top: y,
            transform: 'translate(-2px, -2px)'
          }}
        >
          {/* Cursor */}
          <div
            className="w-0.5 h-5 shadow-lg"
            style={{ backgroundColor: user.color }}
          />

          {/* User label */}
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-6 left-0 px-2 py-1 rounded text-xs font-medium text-white whitespace-nowrap shadow-lg"
            style={{ backgroundColor: user.color }}
          >
            {user.name}
          </motion.div>
        </motion.div>
      ))}
    </>
  );
};

export default CollaborationCursor;