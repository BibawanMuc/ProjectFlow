import React from 'react';
import type { Task, Project } from '../types/supabase';
import { TaskStatus } from '../types/supabase';
import { Icon } from './ui/Icon';
import { Avatar } from './ui/Avatar';
import { Card } from './ui/Card';

export const taskStatusStyles: { [key in TaskStatus]: string } = {
  [TaskStatus.Todo]: 'bg-gray-500/20 text-gray-300',
  [TaskStatus.InProgress]: 'bg-blue-500/20 text-blue-400',
  [TaskStatus.Review]: 'bg-purple-500/20 text-purple-400',
  [TaskStatus.Done]: 'bg-green-500/20 text-green-400',
};

interface TaskCardProps {
  task: Task;
  project?: Project;
  onEdit: (task: Task) => void;
  onTimeTrack: (task: Task) => void;
  onSelectProject?: (project: Project) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  project,
  onEdit,
  onTimeTrack,
  onSelectProject
}) => {
  const isOverdue = task.due_date &&
    new Date(task.due_date) < new Date() &&
    task.status !== TaskStatus.Done;

  return (
    <Card className="hover:border-blue-500 transition-all duration-200 flex flex-col h-full bg-gray-800 border-gray-700">
      <div className="flex-1">
        {/* Header: Title + Status Badge */}
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-bold text-white pr-2 line-clamp-2">
            {task.title}
          </h3>
          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${taskStatusStyles[task.status!] || 'bg-gray-700 text-gray-400'}`}>
            {task.status?.replace('_', ' ')}
          </span>
        </div>

        {/* Project Badge */}
        {project && onSelectProject && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectProject(project);
            }}
            className="inline-flex items-center gap-1.5 mb-3 text-sm hover:underline"
            style={{ color: project.color_code || '#ffffff' }}
          >
            <Icon path="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" className="w-4 h-4" />
            {project.title}
          </button>
        )}
        {project && !onSelectProject && (
          <div
            className="inline-flex items-center gap-1.5 mb-3 text-sm"
            style={{ color: project.color_code || '#ffffff' }}
          >
            <Icon path="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" className="w-4 h-4" />
            {project.title}
          </div>
        )}

        {/* Service Badge */}
        {task.service_module && (
          <div className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-900/20 border border-blue-700 rounded text-blue-400 inline-flex mb-3">
            <Icon path="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" className="w-3 h-3" />
            <span>{(task.service_module as any).service_module}</span>
            {task.estimated_hours && (
              <span className="text-gray-500">• {task.estimated_hours}h</span>
            )}
          </div>
        )}

        {/* Description Preview */}
        {task.description && (
          <p className="text-sm text-gray-400 mb-3 line-clamp-2">
            {task.description}
          </p>
        )}

        {/* Assignee */}
        <div className="flex items-center gap-2 mb-3">
          <Icon path="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" className="w-4 h-4 text-gray-500" />
          {task.assignee ? (
            <div className="flex items-center gap-2">
              <Avatar
                avatarPath={task.assignee.avatar_url}
                alt={task.assignee.full_name || ''}
                className="w-6 h-6 rounded-full"
              />
              <span className="text-sm text-gray-300">{task.assignee.full_name}</span>
            </div>
          ) : (
            <span className="text-sm text-gray-500">Unassigned</span>
          )}
        </div>

        {/* Due Date */}
        <div className="flex items-center gap-2">
          <Icon path="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" className="w-4 h-4 text-gray-500" />
          <span className={`text-sm ${isOverdue ? 'text-red-400 font-medium' : 'text-gray-400'}`}>
            {task.due_date ? new Date(task.due_date).toLocaleDateString('de-DE') : 'No due date'}
            {isOverdue && ' (Overdue)'}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-700">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTimeTrack(task);
          }}
          className="flex-1 p-2 text-green-400 hover:text-green-300 hover:bg-gray-700 rounded-lg transition-colors flex items-center justify-center gap-2"
          title="Track time"
        >
          <Icon path="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" className="w-5 h-5" />
          <span className="text-sm font-medium">Track Time</span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(task);
          }}
          className="p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded-lg transition-colors"
          title="Edit task"
        >
          <Icon path="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" className="w-5 h-5" />
        </button>
      </div>
    </Card>
  );
};
