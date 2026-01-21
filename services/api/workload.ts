import { supabase } from '../../lib/supabase';
import type { Profile, Task, Project } from '../../types/supabase';

export interface WorkloadData {
  profile_id: string;
  profile: Profile;
  total_planned_minutes: number;
  total_planned_hours: number;
  weekly_capacity_hours: number;
  utilization_percentage: number;
  assigned_projects: number;
  assigned_tasks: number;
}

/**
 * Calculate workload for a specific user based on assigned tasks
 */
export async function getUserWorkload(userId: string): Promise<WorkloadData | null> {
  try {
    // Get user profile with weekly hours
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      throw new Error(`Failed to fetch profile: ${profileError?.message}`);
    }

    // Get all tasks assigned to this user
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*, project:projects(*)')
      .eq('assigned_to', userId);

    if (tasksError) {
      throw new Error(`Failed to fetch tasks: ${tasksError.message}`);
    }

    // Calculate total planned time
    const totalPlannedMinutes = (tasks || []).reduce(
      (sum, task) => sum + (task.planned_minutes || 0),
      0
    );

    // Get unique projects this user is assigned to
    const uniqueProjects = new Set((tasks || []).map(t => t.project_id));

    // Weekly capacity in hours (default 40 if not set)
    const weeklyCapacityHours = profile.weekly_hours || 40;

    // Calculate utilization percentage
    // Assuming we're looking at workload per week
    const totalPlannedHours = totalPlannedMinutes / 60;
    const utilizationPercentage = (totalPlannedHours / weeklyCapacityHours) * 100;

    return {
      profile_id: userId,
      profile,
      total_planned_minutes: totalPlannedMinutes,
      total_planned_hours: totalPlannedHours,
      weekly_capacity_hours: weeklyCapacityHours,
      utilization_percentage: utilizationPercentage,
      assigned_projects: uniqueProjects.size,
      assigned_tasks: (tasks || []).length,
    };
  } catch (error: any) {
    console.error('Error calculating user workload:', error);
    throw error;
  }
}

/**
 * Calculate workload for multiple users at once
 */
export async function getMultipleUsersWorkload(
  userIds: string[]
): Promise<Map<string, WorkloadData>> {
  const workloadMap = new Map<string, WorkloadData>();

  // Fetch workload for each user
  const promises = userIds.map(async (userId) => {
    try {
      const workload = await getUserWorkload(userId);
      if (workload) {
        workloadMap.set(userId, workload);
      }
    } catch (error) {
      console.error(`Failed to get workload for user ${userId}:`, error);
    }
  });

  await Promise.all(promises);
  return workloadMap;
}

/**
 * Calculate project workload - total planned hours for a project
 */
export async function getProjectWorkload(projectId: string): Promise<{
  total_planned_minutes: number;
  total_planned_hours: number;
  project_duration_weeks: number;
  weekly_effort_required: number;
}> {
  try {
    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError) {
      throw new Error(`Failed to fetch project: ${projectError.message}`);
    }

    // Get all tasks for this project
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId);

    if (tasksError) {
      throw new Error(`Failed to fetch tasks: ${tasksError.message}`);
    }

    // Calculate total planned time
    const totalPlannedMinutes = (tasks || []).reduce(
      (sum, task) => sum + (task.planned_minutes || 0),
      0
    );
    const totalPlannedHours = totalPlannedMinutes / 60;

    // Calculate project duration in weeks
    let projectDurationWeeks = 4; // Default to 4 weeks if no dates set
    if (project.start_date && project.deadline) {
      const startDate = new Date(project.start_date);
      const endDate = new Date(project.deadline);
      const durationDays = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      projectDurationWeeks = Math.ceil(durationDays / 7);
    }

    // Calculate weekly effort required
    const weeklyEffortRequired =
      projectDurationWeeks > 0 ? totalPlannedHours / projectDurationWeeks : totalPlannedHours;

    return {
      total_planned_minutes: totalPlannedMinutes,
      total_planned_hours: totalPlannedHours,
      project_duration_weeks: projectDurationWeeks,
      weekly_effort_required: weeklyEffortRequired,
    };
  } catch (error: any) {
    console.error('Error calculating project workload:', error);
    throw error;
  }
}

/**
 * Check if a user can be assigned to a project based on their current workload
 * Returns { canAssign: boolean, reason?: string }
 */
export async function canAssignUserToProject(
  userId: string,
  projectId: string,
  maxUtilizationPercent: number = 100
): Promise<{ canAssign: boolean; reason?: string; currentUtilization: number }> {
  try {
    const workload = await getUserWorkload(userId);
    const projectWorkload = await getProjectWorkload(projectId);

    if (!workload) {
      return {
        canAssign: false,
        reason: 'Could not calculate user workload',
        currentUtilization: 0,
      };
    }

    // Calculate potential new utilization if assigned to this project
    const additionalHoursPerWeek = projectWorkload.weekly_effort_required;
    const newTotalHours = workload.total_planned_hours + additionalHoursPerWeek;
    const newUtilizationPercentage = (newTotalHours / workload.weekly_capacity_hours) * 100;

    if (newUtilizationPercentage > maxUtilizationPercent) {
      return {
        canAssign: false,
        reason: `Would exceed capacity (${newUtilizationPercentage.toFixed(0)}% utilization)`,
        currentUtilization: workload.utilization_percentage,
      };
    }

    return {
      canAssign: true,
      currentUtilization: workload.utilization_percentage,
    };
  } catch (error: any) {
    console.error('Error checking if user can be assigned:', error);
    return {
      canAssign: false,
      reason: 'Error calculating workload',
      currentUtilization: 0,
    };
  }
}
