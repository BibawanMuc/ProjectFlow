import { supabase } from '../../lib/supabase';
import type { Task } from '../../types/supabase';

/**
 * Get all tasks with assignee and project data
 */
export async function getTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      assignee:profiles(*),
      service_module:service_modules(*),
      seniority_level:seniority_levels(*)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tasks:', error);
    throw new Error(`Failed to fetch tasks: ${error.message}`);
  }

  return data || [];
}

/**
 * Get tasks by project ID
 */
export async function getTasksByProject(projectId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      assignee:profiles(*),
      service_module:service_modules(*),
      seniority_level:seniority_levels(*)
    `)
    .eq('project_id', projectId)
    .order('position', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tasks by project:', error);
    throw new Error(`Failed to fetch tasks by project: ${error.message}`);
  }

  return data || [];
}

/**
 * Get a single task by ID
 */
export async function getTaskById(id: string): Promise<Task | null> {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      assignee:profiles(*),
      service_module:service_modules(*),
      seniority_level:seniority_levels(*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching task:', error);
    throw new Error(`Failed to fetch task: ${error.message}`);
  }

  return data;
}

/**
 * Create a new task
 */
export async function createTask(
  taskData: Omit<Task, 'id' | 'created_at' | 'assignee'>
): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert(taskData)
    .select(`
      *,
      assignee:profiles(*),
      service_module:service_modules(*),
      seniority_level:seniority_levels(*)
    `)
    .single();

  if (error) {
    console.error('Error creating task:', error);
    throw new Error(`Failed to create task: ${error.message}`);
  }

  return data;
}

/**
 * Update an existing task
 */
export async function updateTask(
  id: string,
  updates: Partial<Omit<Task, 'id' | 'created_at' | 'assignee'>>
): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select(`
      *,
      assignee:profiles(*),
      service_module:service_modules(*),
      seniority_level:seniority_levels(*)
    `)
    .single();

  if (error) {
    console.error('Error updating task:', error);
    throw new Error(`Failed to update task: ${error.message}`);
  }

  return data;
}

/**
 * Delete a task
 */
export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id);

  if (error) {
    console.error('Error deleting task:', error);
    throw new Error(`Failed to delete task: ${error.message}`);
  }
}

/**
 * Update task status (useful for Kanban board)
 */
export async function updateTaskStatus(
  id: string,
  status: 'todo' | 'in_progress' | 'review' | 'done'
): Promise<Task> {
  return updateTask(id, { status });
}

/**
 * Get tasks by status
 */
export async function getTasksByStatus(
  projectId: string,
  status: 'todo' | 'in_progress' | 'review' | 'done'
): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      assignee:profiles(*),
      service_module:service_modules(*),
      seniority_level:seniority_levels(*)
    `)
    .eq('project_id', projectId)
    .eq('status', status)
    .order('position', { ascending: true, nullsFirst: false });

  if (error) {
    console.error('Error fetching tasks by status:', error);
    throw new Error(`Failed to fetch tasks by status: ${error.message}`);
  }

  return data || [];
}
