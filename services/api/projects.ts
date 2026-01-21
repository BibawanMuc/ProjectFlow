import { supabase } from '../../lib/supabase';
import type { Project } from '../../types/supabase';

/**
 * Get all projects with client data and team members
 */
export async function getProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      client:clients(*),
      project_members(profile_id)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching projects:', error);
    throw new Error(`Failed to fetch projects: ${error.message}`);
  }

  return data || [];
}

/**
 * Get a single project by ID with all related data
 */
export async function getProjectById(id: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      client:clients(*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching project:', error);
    throw new Error(`Failed to fetch project: ${error.message}`);
  }

  return data;
}

/**
 * Create a new project
 */
export async function createProject(
  projectData: Omit<Project, 'id' | 'created_at' | 'project_number' | 'client'>
): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert(projectData)
    .select(`
      *,
      client:clients(*)
    `)
    .single();

  if (error) {
    console.error('Error creating project:', error);
    throw new Error(`Failed to create project: ${error.message}`);
  }

  return data;
}

/**
 * Update an existing project
 */
export async function updateProject(
  id: string,
  updates: Partial<Omit<Project, 'id' | 'created_at' | 'project_number' | 'client'>>
): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', id)
    .select(`
      *,
      client:clients(*)
    `)
    .single();

  if (error) {
    console.error('Error updating project:', error);
    throw new Error(`Failed to update project: ${error.message}`);
  }

  return data;
}

/**
 * Delete a project
 */
export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id);

  if (error) {
    console.error('Error deleting project:', error);
    throw new Error(`Failed to delete project: ${error.message}`);
  }
}

/**
 * Get project statistics for dashboard
 */
export async function getProjectStats() {
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, status, budget_total');

  if (error) {
    console.error('Error fetching project stats:', error);
    throw new Error(`Failed to fetch project stats: ${error.message}`);
  }

  const activeProjects = projects?.filter((p) => p.status === 'active').length || 0;
  const totalBudget = projects?.reduce((sum, p) => sum + (p.budget_total || 0), 0) || 0;

  return {
    total: projects?.length || 0,
    active: activeProjects,
    totalBudget,
  };
}

/**
 * Get projects by status
 */
export async function getProjectsByStatus(
  status: 'planned' | 'active' | 'on_hold' | 'completed' | 'cancelled'
): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      client:clients(*)
    `)
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching projects by status:', error);
    throw new Error(`Failed to fetch projects by status: ${error.message}`);
  }

  return data || [];
}

/**
 * Get financial overview for all projects
 * Returns costs and billable value for each project
 */
export async function getProjectsFinancialOverview(): Promise<Record<string, { costs: number; billableValue: number; total: number }>> {
  // Fetch all costs
  const { data: costsData, error: costsError } = await supabase
    .from('costs')
    .select('project_id, amount');

  if (costsError) {
    console.error('Error fetching costs for overview:', costsError);
    throw new Error(`Failed to fetch costs: ${costsError.message}`);
  }

  // Fetch all time entries with profile billable rates
  const { data: timeEntriesData, error: timeError } = await supabase
    .from('time_entries')
    .select(`
      project_id,
      duration_minutes,
      billable,
      profile:profiles(billable_hourly_rate)
    `)
    .not('end_time', 'is', null); // Only completed entries

  if (timeError) {
    console.error('Error fetching time entries for overview:', timeError);
    throw new Error(`Failed to fetch time entries: ${timeError.message}`);
  }

  // Aggregate by project
  const overview: Record<string, { costs: number; billableValue: number; total: number }> = {};

  // Sum costs per project
  costsData?.forEach((cost) => {
    if (!overview[cost.project_id]) {
      overview[cost.project_id] = { costs: 0, billableValue: 0, total: 0 };
    }
    overview[cost.project_id].costs += cost.amount || 0;
  });

  // Sum billable hours value per project
  timeEntriesData?.forEach((entry) => {
    if (!overview[entry.project_id]) {
      overview[entry.project_id] = { costs: 0, billableValue: 0, total: 0 };
    }

    if (entry.billable) {
      const hours = (entry.duration_minutes || 0) / 60;
      const rate = (entry.profile as any)?.billable_hourly_rate || 0;
      overview[entry.project_id].billableValue += hours * rate;
    }
  });

  // Calculate totals
  Object.keys(overview).forEach((projectId) => {
    overview[projectId].total = overview[projectId].costs + overview[projectId].billableValue;
  });

  return overview;
}
