import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { batchManager } from '../lib/batch-manager';
import { progressManager } from '../lib/progress-manager';

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  isExpanded?: boolean;
  // Optimistic update properties
  isOptimistic?: boolean;
  operationStatus?: 'pending' | 'success' | 'error';
  operationId?: string;
}

interface FileTreeProps {
  files: FileNode[];
  onFileSelect: (filePath: string) => void;
  selectedFile?: string;
  className?: string;
  onOptimisticUpdate?: (operationId: string, node: FileNode) => void;
  onOperationComplete?: (operationId: string, success: boolean) => void;
}

const FileTreeItem: React.FC<{
  node: FileNode;
  onFileSelect: (filePath: string) => void;
  selectedFile?: string;
  level: number;
  onOperationComplete?: (operationId: string, success: boolean) => void;
}> = ({ node, onFileSelect, selectedFile, level, onOperationComplete }) => {
  const [isExpanded, setIsExpanded] = useState(node.isExpanded || false);

  const handleToggle = () => {
    if (node.type === 'folder') {
      setIsExpanded(!isExpanded);
    }
  };

  const handleClick = () => {
    if (node.type === 'file') {
      onFileSelect(node.path);
    } else {
      handleToggle();
    }
  };

  const isSelected = selectedFile === node.path;

  const getStatusIcon = () => {
    if (!node.isOptimistic) return null;

    switch (node.operationStatus) {
      case 'pending':
        return <Loader2 className="w-3 h-3 animate-spin text-yellow-400" />;
      case 'success':
        return <CheckCircle className="w-3 h-3 text-green-400" />;
      case 'error':
        return <XCircle className="w-3 h-3 text-red-400" />;
      default:
        return null;
    }
  };

  return (
    <div>
      <div
        className={`flex items-center py-1 px-2 hover:bg-white/10 cursor-pointer rounded transition-colors ${
          isSelected ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white'
        } ${node.isOptimistic ? 'opacity-75' : ''}`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
      >
        {node.type === 'folder' ? (
          <>
            <div className="w-4 h-4 flex items-center justify-center mr-1">
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </div>
            {isExpanded ? (
              <FolderOpen className="w-4 h-4 mr-2 text-blue-400" />
            ) : (
              <Folder className="w-4 h-4 mr-2 text-blue-400" />
            )}
          </>
        ) : (
          <>
            <div className="w-4 h-4 mr-1" />
            <File className="w-4 h-4 mr-2 text-gray-400" />
          </>
        )}
        <span className="text-sm truncate flex-1">{node.name}</span>
        {getStatusIcon()}
      </div>

      {node.type === 'folder' && isExpanded && node.children && (
        <div>
          {node.children.map((child, index) => (
            <FileTreeItem
              key={`${child.path}-${index}`}
              node={child}
              onFileSelect={onFileSelect}
              selectedFile={selectedFile}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FileTree: React.FC<FileTreeProps> = ({
  files,
  onFileSelect,
  selectedFile,
  className = '',
  onOptimisticUpdate,
  onOperationComplete
}) => {
  const [optimisticFiles, setOptimisticFiles] = useState<FileNode[]>(files);

  // Update optimistic files when files prop changes
  useEffect(() => {
    setOptimisticFiles(files);
  }, [files]);

  // Handle operation completion
  const handleOperationComplete = (operationId: string, success: boolean) => {
    setOptimisticFiles(prevFiles => {
      const updateNodeStatus = (nodes: FileNode[]): FileNode[] => {
        return nodes.map(node => {
          if (node.operationId === operationId) {
            const updatedNode = {
              ...node,
              isOptimistic: false,
              operationStatus: success ? 'success' as const : 'error' as const,
              operationId: undefined
            };

            // Call the completion callback
            if (onOperationComplete) {
              onOperationComplete(operationId, success);
            }

            return updatedNode;
          }

          if (node.children) {
            return {
              ...node,
              children: updateNodeStatus(node.children)
            };
          }

          return node;
        });
      };

      return updateNodeStatus(prevFiles);
    });
  };

  // Add optimistic node
  const addOptimisticNode = (parentPath: string, node: FileNode) => {
    setOptimisticFiles(prevFiles => {
      const addNodeRecursive = (nodes: FileNode[]): FileNode[] => {
        return nodes.map(existingNode => {
          if (existingNode.path === parentPath && existingNode.type === 'folder') {
            return {
              ...existingNode,
              children: [...(existingNode.children || []), node],
              isExpanded: true // Auto-expand when adding children
            };
          }

          if (existingNode.children) {
            return {
              ...existingNode,
              children: addNodeRecursive(existingNode.children)
            };
          }

          return existingNode;
        });
      };

      // If no parent path, add to root
      if (!parentPath) {
        return [...prevFiles, node];
      }

      return addNodeRecursive(prevFiles);
    });

    if (onOptimisticUpdate) {
      onOptimisticUpdate(node.operationId!, node);
    }
  };

  return (
    <div className={`h-full overflow-y-auto ${className}`}>
      <div className="p-2">
        <h3 className="text-white/80 text-sm font-medium mb-2">Project Files</h3>
        <div className="space-y-1">
          {optimisticFiles.map((file, index) => (
            <FileTreeItem
              key={`${file.path}-${index}`}
              node={file}
              onFileSelect={onFileSelect}
              selectedFile={selectedFile}
              level={0}
              onOperationComplete={handleOperationComplete}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default FileTree;