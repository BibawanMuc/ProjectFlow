import { supabase } from '../../lib/supabase';
import type { ProjectMember, Profile } from '../../types/supabase';

/**
 * Get all team members for a specific project
 */
export async function getProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const { data, error } = await supabase
    .from('project_members')
    .select(`
      *,
      profile:profiles (*)
    `)
    .eq('project_id', projectId)
    .order('role', { ascending: true });

  if (error) {
    console.error('Error fetching project members:', error);
    throw new Error(`Failed to fetch project members: ${error.message}`);
  }

  return data || [];
}

/**
 * Get all internal users (admin, employee, freelancer) - not clients
 */
export async function getInternalUsers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .in('role', ['admin', 'employee', 'freelancer'])
    .order('full_name', { ascending: true });

  if (error) {
    console.error('Error fetching internal users:', error);
    throw new Error(`Failed to fetch internal users: ${error.message}`);
  }

  return data || [];
}

/**
 * Add a team member to a project
 */
export async function addProjectMember(
  memberData: Omit<ProjectMember, 'profile'>
): Promise<ProjectMember> {
  const { data, error } = await supabase
    .from('project_members')
    .insert(memberData)
    .select(`
      *,
      profile:profiles (*)
    `)
    .single();

  if (error) {
    console.error('Error adding project member:', error);
    throw new Error(`Failed to add project member: ${error.message}`);
  }

  return data;
}

/**
 * Update a project member's role
 */
export async function updateProjectMember(
  projectId: string,
  profileId: string,
  role: string
): Promise<ProjectMember> {
  const { data, error } = await supabase
    .from('project_members')
    .update({ role })
    .eq('project_id', projectId)
    .eq('profile_id', profileId)
    .select(`
      *,
      profile:profiles (*)
    `)
    .single();

  if (error) {
    console.error('Error updating project member:', error);
    throw new Error(`Failed to update project member: ${error.message}`);
  }

  return data;
}

/**
 * Remove a team member from a project
 */
export async function removeProjectMember(
  projectId: string,
  profileId: string
): Promise<void> {
  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('profile_id', profileId);

  if (error) {
    console.error('Error removing project member:', error);
    throw new Error(`Failed to remove project member: ${error.message}`);
  }
}
