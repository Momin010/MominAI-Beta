import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Circle, Plus, X, ChevronDown, ChevronUp } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  created_at: string;
  completed_at?: string;
}

interface TaskManagerProps {
  tasks: Task[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onTaskAdd: (task: Omit<Task, 'id' | 'created_at'>) => void;
  onTaskDelete: (taskId: string) => void;
  isVisible: boolean;
  onToggleVisibility: () => void;
}

const TaskManager: React.FC<TaskManagerProps> = ({
  tasks,
  onTaskUpdate,
  onTaskAdd,
  onTaskDelete,
  isVisible,
  onToggleVisibility
}) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      onTaskAdd({
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim() || undefined,
        status: 'pending'
      });
      setNewTaskTitle('');
      setNewTaskDescription('');
      setShowAddForm(false);
    }
  };

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'in_progress':
        return <Circle className="w-5 h-5 text-yellow-400 fill-current" />;
      default:
        return <Circle className="w-5 h-5 text-white/60" />;
    }
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-400';
      case 'in_progress':
        return 'text-yellow-400';
      default:
        return 'text-white/60';
    }
  };

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="backdrop-blur-xl bg-white/10 rounded-lg border border-white/20 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <h3 className="text-lg font-semibold text-white">Task Manager</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                <Plus className="w-4 h-4 text-white" />
              </button>
              <button
                onClick={onToggleVisibility}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                <ChevronUp className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          {/* Add Task Form */}
          <AnimatePresence>
            {showAddForm && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="border-b border-white/10 overflow-hidden"
              >
                <div className="p-4 space-y-3">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Task title..."
                    className="w-full px-3 py-2 rounded-lg border border-white/20 bg-white/10 backdrop-blur-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                  />
                  <textarea
                    value={newTaskDescription}
                    onChange={(e) => setNewTaskDescription(e.target.value)}
                    placeholder="Task description (optional)..."
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-white/20 bg-white/10 backdrop-blur-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 resize-none"
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddTask}
                      disabled={!newTaskTitle.trim()}
                      className="px-3 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Add Task
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tasks List */}
          <div className="max-h-96 overflow-y-auto">
            {/* In Progress */}
            {inProgressTasks.length > 0 && (
              <div className="p-4 border-b border-white/10">
                <h4 className="text-sm font-medium text-yellow-400 mb-3">In Progress</h4>
                <div className="space-y-2">
                  {inProgressTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onUpdate={onTaskUpdate}
                      onDelete={onTaskDelete}
                      getStatusIcon={getStatusIcon}
                      getStatusColor={getStatusColor}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Pending */}
            {pendingTasks.length > 0 && (
              <div className="p-4 border-b border-white/10">
                <h4 className="text-sm font-medium text-white/60 mb-3">Pending</h4>
                <div className="space-y-2">
                  {pendingTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onUpdate={onTaskUpdate}
                      onDelete={onTaskDelete}
                      getStatusIcon={getStatusIcon}
                      getStatusColor={getStatusColor}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Completed */}
            {completedTasks.length > 0 && (
              <div className="p-4">
                <h4 className="text-sm font-medium text-green-400 mb-3">Completed</h4>
                <div className="space-y-2">
                  {completedTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onUpdate={onTaskUpdate}
                      onDelete={onTaskDelete}
                      getStatusIcon={getStatusIcon}
                      getStatusColor={getStatusColor}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {tasks.length === 0 && (
              <div className="p-8 text-center text-white/60">
                <p>No tasks yet. Add your first task to get started!</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Task Item Component
interface TaskItemProps {
  task: Task;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
  onDelete: (taskId: string) => void;
  getStatusIcon: (status: Task['status']) => React.ReactNode;
  getStatusColor: (status: Task['status']) => string;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onUpdate, onDelete, getStatusIcon, getStatusColor }) => {
  const handleStatusClick = () => {
    const nextStatus = task.status === 'pending' ? 'in_progress' :
                      task.status === 'in_progress' ? 'completed' : 'pending';
    onUpdate(task.id, {
      status: nextStatus,
      completed_at: nextStatus === 'completed' ? new Date().toISOString() : undefined
    });
  };

  return (
    <motion.div
      layout
      className="flex items-start space-x-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
    >
      <button
        onClick={handleStatusClick}
        className="flex-shrink-0 mt-0.5 transition-transform hover:scale-110"
      >
        {getStatusIcon(task.status)}
      </button>

      <div className="flex-1 min-w-0">
        <h5 className={`text-sm font-medium ${getStatusColor(task.status)} ${
          task.status === 'completed' ? 'line-through opacity-75' : ''
        }`}>
          {task.title}
        </h5>
        {task.description && (
          <p className="text-xs text-white/60 mt-1">{task.description}</p>
        )}
      </div>

      <button
        onClick={() => onDelete(task.id)}
        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10"
      >
        <X className="w-3 h-3 text-white/60" />
      </button>
    </motion.div>
  );
};

export default TaskManager;