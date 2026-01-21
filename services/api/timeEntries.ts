import { supabase } from '../../lib/supabase';
import type { TimeEntry } from '../../types/supabase';
import { createNotification } from './notifications';

/**
 * Get all time entries with profile data
 */
export async function getTimeEntries(): Promise<TimeEntry[]> {
  const { data, error } = await supabase
    .from('time_entries')
    .select(`
      *,
      profile:profiles(*)
    `)
    .order('start_time', { ascending: false });

  if (error) {
    console.error('Error fetching time entries:', error);
    throw new Error(`Failed to fetch time entries: ${error.message}`);
  }

  return data || [];
}

/**
 * Get all submitted time entries (for approval)
 */
export async function getSubmittedTimeEntries(): Promise<TimeEntry[]> {
  const { data, error } = await supabase
    .from('time_entries')
    .select(`
      *,
      profile:profiles(*),
      project:projects(*),
      task:tasks(*)
    `)
    .eq('status', 'submitted')
    .order('start_time', { ascending: false });

  if (error) {
    console.error('Error fetching submitted time entries:', error);
    throw new Error(`Failed to fetch submitted time entries: ${error.message}`);
  }

  return data || [];
}

/**
 * Approve multiple time entries
 */
export async function approveTimeEntries(ids: string[]): Promise<void> {
  const { error } = await supabase
    .from('time_entries')
    .update({ status: 'approved', rejection_reason: null })
    .in('id', ids);

  if (error) {
    console.error('Error approving time entries:', error);
    throw new Error(`Failed to approve time entries: ${error.message}`);
  }
}



// ... (existing code)

/**
 * Reject a time entry with reason
 */
export async function rejectTimeEntry(id: string, reason: string): Promise<void> {
  // 1. Get the entry first to know who to notify
  const { data: entry, error: fetchError } = await supabase
    .from('time_entries')
    .select('base:id, profile_id, project:projects(title)')
    .eq('id', id)
    .single();

  // Note: 'base:id' alias is just to select id without conflict if I used *
  // Actually, just selecting * is easier, but let's be specific for performance? 
  // Typescript might complain if I don't cast it. 
  // Let's stick to safe simple select.

  const { error } = await supabase
    .from('time_entries')
    .update({ status: 'rejected', rejection_reason: reason })
    .eq('id', id);

  if (error) {
    console.error('Error rejecting time entry:', error);
    throw new Error(`Failed to reject time entry: ${error.message}`);
  }

  // 2. Notify the user
  if (!fetchError && entry && entry.profile_id) {
    try {
      // Cast entry.project to any or expected type if TS complains about enriched data in simple query
      const projectTitle = (entry.project as any)?.title || 'Project';

      await createNotification({
        user_id: entry.profile_id,
        type: 'error',
        title: 'Time Entry Rejected',
        message: `Your time entry for ${projectTitle} was rejected. Reason: ${reason}`,
        link: 'finances', // View name
        related_entity_id: id,
        related_entity_type: 'time_entry'
      });
    } catch (notifyError) {
      console.error('Failed to send rejection notification', notifyError);
      // Don't fail the operation if notification fails
    }
  }
}

/**
 * Get time entries by project ID
 */
export async function getTimeEntriesByProject(
  projectId: string
): Promise<TimeEntry[]> {
  const { data, error } = await supabase
    .from('time_entries')
    .select(`
      *,
      profile:profiles(*)
    `)
    .eq('project_id', projectId)
    .order('start_time', { ascending: false });

  if (error) {
    console.error('Error fetching time entries by project:', error);
    throw new Error(`Failed to fetch time entries by project: ${error.message}`);
  }

  return data || [];
}

/**
 * Get time entries by profile ID
 */
export async function getTimeEntriesByProfile(
  profileId: string
): Promise<TimeEntry[]> {
  const { data, error } = await supabase
    .from('time_entries')
    .select(`
      *,
      profile:profiles(*),
      project:projects(title),
      task:tasks(title)
    `)
    .eq('profile_id', profileId)
    .order('start_time', { ascending: false });

  if (error) {
    console.error('Error fetching time entries by profile:', error);
    throw new Error(`Failed to fetch time entries by profile: ${error.message}`);
  }

  return data || [];
}

/**
 * Get time entries by task ID
 */
export async function getTimeEntriesByTask(
  taskId: string
): Promise<TimeEntry[]> {
  const { data, error } = await supabase
    .from('time_entries')
    .select(`
      *,
      profile:profiles(*)
    `)
    .eq('task_id', taskId)
    .order('start_time', { ascending: false });

  if (error) {
    console.error('Error fetching time entries by task:', error);
    throw new Error(`Failed to fetch time entries by task: ${error.message}`);
  }

  return data || [];
}

/**
 * Get a single time entry by ID
 */
export async function getTimeEntryById(id: string): Promise<TimeEntry | null> {
  const { data, error } = await supabase
    .from('time_entries')
    .select(`
      *,
      profile:profiles(*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching time entry:', error);
    throw new Error(`Failed to fetch time entry: ${error.message}`);
  }

  return data;
}

/**
 * Create a new time entry
 */
export async function createTimeEntry(
  timeEntryData: Omit<TimeEntry, 'id' | 'created_at' | 'profile'>
): Promise<TimeEntry> {
  const { data, error } = await supabase
    .from('time_entries')
    .insert(timeEntryData)
    .select(`
      *,
      profile:profiles(*)
    `)
    .single();

  if (error) {
    console.error('Error creating time entry:', error);
    throw new Error(`Failed to create time entry: ${error.message}`);
  }

  return data;
}

/**
 * Update an existing time entry
 */
export async function updateTimeEntry(
  id: string,
  updates: Partial<Omit<TimeEntry, 'id' | 'created_at' | 'profile'>>
): Promise<TimeEntry> {
  const { data, error } = await supabase
    .from('time_entries')
    .update(updates)
    .eq('id', id)
    .select(`
      *,
      profile:profiles(*)
    `)
    .single();

  if (error) {
    console.error('Error updating time entry:', error);
    throw new Error(`Failed to update time entry: ${error.message}`);
  }

  return data;
}

/**
 * Delete a time entry
 */
export async function deleteTimeEntry(id: string): Promise<void> {
  const { error } = await supabase.from('time_entries').delete().eq('id', id);

  if (error) {
    console.error('Error deleting time entry:', error);
    throw new Error(`Failed to delete time entry: ${error.message}`);
  }
}

/**
 * Get total tracked hours for a project
 */
export async function getTotalProjectHours(projectId: string): Promise<number> {
  const { data, error } = await supabase
    .from('time_entries')
    .select('duration_minutes')
    .eq('project_id', projectId)
    .eq('status', 'approved');

  if (error) {
    console.error('Error fetching total project hours:', error);
    throw new Error(`Failed to fetch total project hours: ${error.message}`);
  }

  const totalMinutes = data?.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0) || 0;
  return totalMinutes / 60; // Convert to hours
}

/**
 * Get time entries statistics for dashboard
 */
export async function getTimeEntriesStats() {
  const { data, error } = await supabase
    .from('time_entries')
    .select('duration_minutes, status');

  if (error) {
    console.error('Error fetching time entries stats:', error);
    throw new Error(`Failed to fetch time entries stats: ${error.message}`);
  }

  const totalMinutes = data?.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0) || 0;
  const approvedMinutes = data
    ?.filter((entry) => entry.status === 'approved')
    .reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0) || 0;

  return {
    totalHours: totalMinutes / 60,
    approvedHours: approvedMinutes / 60,
    pendingHours: (totalMinutes - approvedMinutes) / 60,
  };
}

/**
 * Calculate billable hours value for a project
 * Returns total value based on billable hours × hourly rate
 */
export async function calculateProjectBillableValue(projectId: string): Promise<{
  totalHours: number;
  billableHours: number;
  totalValue: number;
}> {
  const { data, error } = await supabase
    .from('time_entries')
    .select(`
      duration_minutes,
      billable,
      profile:profiles(billable_hourly_rate)
    `)
    .eq('project_id', projectId)
    .not('end_time', 'is', null); // Only completed entries

  if (error) {
    console.error('Error calculating billable value:', error);
    throw new Error(`Failed to calculate billable value: ${error.message}`);
  }

  let totalMinutes = 0;
  let billableMinutes = 0;
  let totalValue = 0;

  data?.forEach((entry) => {
    const minutes = entry.duration_minutes || 0;
    totalMinutes += minutes;

    if (entry.billable) {
      billableMinutes += minutes;
      const hours = minutes / 60;
      const rate = (entry.profile as any)?.billable_hourly_rate || 0;
      totalValue += hours * rate;
    }
  });

  return {
    totalHours: totalMinutes / 60,
    billableHours: billableMinutes / 60,
    totalValue: Math.round(totalValue * 100) / 100, // Round to 2 decimals
  };
}
