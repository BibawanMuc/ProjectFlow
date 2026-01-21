import { supabase } from '../../lib/supabase';
import type { TaskVariance, ProjectServiceBreakdown } from '../../types/supabase';

/**
 * Calculate variance for a single task (Plan vs Actual)
 * Compares estimated hours/costs with actual tracked time from time_entries
 *
 * @param taskId - The task ID
 * @returns Variance data with planned, actual, and delta (or null if task has no service tracking)
 */
export async function calculateTaskVariance(taskId: string): Promise<TaskVariance | null> {
  // Fetch task with service info
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('id, title, estimated_hours, estimated_rate')
    .eq('id', taskId)
    .single();

  if (taskError) {
    console.error('Error fetching task:', taskError);
    throw new Error(`Failed to fetch task: ${taskError.message}`);
  }

  // If task has no service tracking, return null (no variance to calculate)
  if (!task.estimated_hours || !task.estimated_rate) {
    return null;
  }

  // Fetch time entries for this task with profile billing rates
  const { data: timeEntries, error: timeError } = await supabase
    .from('time_entries')
    .select(`
      duration_minutes,
      billable,
      profile:profiles(billable_hourly_rate)
    `)
    .eq('task_id', taskId)
    .not('end_time', 'is', null); // Only completed entries

  if (timeError) {
    console.error('Error fetching time entries:', timeError);
    throw new Error(`Failed to fetch time entries: ${timeError.message}`);
  }

  // Calculate actual hours and value
  let actualMinutes = 0;
  let actualValue = 0;
  const actualRates: number[] = [];

  timeEntries?.forEach((entry) => {
    actualMinutes += entry.duration_minutes || 0;
    const rate = (entry.profile as any)?.billable_hourly_rate || 0;
    const hours = (entry.duration_minutes || 0) / 60;
    actualValue += hours * rate;

    // Track unique rates used
    if (rate > 0 && !actualRates.includes(rate)) {
      actualRates.push(rate);
    }
  });

  const actualHours = actualMinutes / 60;
  const plannedValue = task.estimated_hours * task.estimated_rate;

  // Calculate variances
  const hoursVariance = actualHours - task.estimated_hours;
  const hoursVariancePercent = task.estimated_hours > 0
    ? (hoursVariance / task.estimated_hours) * 100
    : 0;

  const valueVariance = actualValue - plannedValue;
  const valueVariancePercent = plannedValue > 0
    ? (valueVariance / plannedValue) * 100
    : 0;

  // Determine status (within ±10% tolerance = on_budget)
  let status: 'under_budget' | 'on_budget' | 'over_budget';
  if (valueVariancePercent <= -10) {
    status = 'under_budget';
  } else if (valueVariancePercent >= 10) {
    status = 'over_budget';
  } else {
    status = 'on_budget';
  }

  return {
    task_id: task.id,
    task_title: task.title,
    estimated_hours: task.estimated_hours,
    estimated_rate: task.estimated_rate,
    planned_value: plannedValue,
    actual_hours: actualHours,
    actual_rates: actualRates,
    actual_value: actualValue,
    hours_variance: hoursVariance,
    hours_variance_percent: hoursVariancePercent,
    value_variance: valueVariance,
    value_variance_percent: valueVariancePercent,
    status,
  };
}

/**
 * Calculate variances for all tasks in a project
 * Only includes tasks with service tracking (service_module_id not null)
 *
 * @param projectId - The project ID
 * @returns Array of task variances (only tasks with service tracking)
 */
export async function calculateProjectTaskVariances(
  projectId: string
): Promise<TaskVariance[]> {
  // Fetch all tasks with service tracking
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('id')
    .eq('project_id', projectId)
    .not('service_module_id', 'is', null);

  if (error) {
    console.error('Error fetching project tasks:', error);
    throw new Error(`Failed to fetch project tasks: ${error.message}`);
  }

  const variances: TaskVariance[] = [];

  // Calculate variance for each task
  for (const task of tasks || []) {
    try {
      const variance = await calculateTaskVariance(task.id);
      if (variance) {
        variances.push(variance);
      }
    } catch (err) {
      console.error(`Error calculating variance for task ${task.id}:`, err);
      // Continue with other tasks even if one fails
    }
  }

  return variances;
}

/**
 * Get service breakdown for a project (aggregated by service module + seniority level)
 * Groups tasks by their service and calculates total Plan vs Actual for each service
 *
 * @param projectId - The project ID
 * @returns Service breakdown with Plan vs Actual aggregates
 */
export async function getProjectServiceBreakdown(
  projectId: string
): Promise<ProjectServiceBreakdown[]> {
  // Fetch all tasks with service tracking (enriched with service info)
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select(`
      id,
      service_module_id,
      seniority_level_id,
      estimated_hours,
      estimated_rate,
      service_module:service_modules(service_module),
      seniority_level:seniority_levels(level_name)
    `)
    .eq('project_id', projectId)
    .not('service_module_id', 'is', null);

  if (tasksError) {
    console.error('Error fetching tasks:', tasksError);
    throw new Error(`Failed to fetch tasks: ${tasksError.message}`);
  }

  if (!tasks || tasks.length === 0) {
    return [];
  }

  // Group by service_module_id + seniority_level_id
  const serviceMap = new Map<string, {
    service_module_id: string;
    service_module_name: string;
    seniority_level_id: string | null;
    seniority_level_name: string | null;
    task_ids: string[];
    total_estimated_hours: number;
    total_planned_value: number;
  }>();

  tasks.forEach((task) => {
    const key = `${task.service_module_id}_${task.seniority_level_id || 'none'}`;

    if (!serviceMap.has(key)) {
      serviceMap.set(key, {
        service_module_id: task.service_module_id!,
        service_module_name: (task.service_module as any)?.service_module || 'Unknown',
        seniority_level_id: task.seniority_level_id || null,
        seniority_level_name: (task.seniority_level as any)?.level_name || null,
        task_ids: [],
        total_estimated_hours: 0,
        total_planned_value: 0,
      });
    }

    const group = serviceMap.get(key)!;
    group.task_ids.push(task.id);
    group.total_estimated_hours += task.estimated_hours || 0;
    group.total_planned_value += (task.estimated_hours || 0) * (task.estimated_rate || 0);
  });

  // Fetch actual time entries for all tasks
  const taskIds = tasks.map(t => t.id);
  const { data: timeEntries, error: timeError } = await supabase
    .from('time_entries')
    .select(`
      task_id,
      duration_minutes,
      profile:profiles(billable_hourly_rate)
    `)
    .in('task_id', taskIds)
    .not('end_time', 'is', null); // Only completed entries

  if (timeError) {
    console.error('Error fetching time entries:', timeError);
    throw new Error(`Failed to fetch time entries: ${timeError.message}`);
  }

  // Calculate actual values per task
  const taskActuals = new Map<string, { hours: number; value: number }>();
  timeEntries?.forEach((entry) => {
    const existing = taskActuals.get(entry.task_id) || { hours: 0, value: 0 };
    const hours = (entry.duration_minutes || 0) / 60;
    const rate = (entry.profile as any)?.billable_hourly_rate || 0;
    existing.hours += hours;
    existing.value += hours * rate;
    taskActuals.set(entry.task_id, existing);
  });

  // Aggregate actuals back to service groups
  const breakdown: ProjectServiceBreakdown[] = [];

  serviceMap.forEach((group) => {
    let totalActualHours = 0;
    let totalActualValue = 0;

    // Sum up actuals from all tasks in this service group
    group.task_ids.forEach((taskId) => {
      const actual = taskActuals.get(taskId);
      if (actual) {
        totalActualHours += actual.hours;
        totalActualValue += actual.value;
      }
    });

    // Calculate variances
    const hoursVariance = totalActualHours - group.total_estimated_hours;
    const valueVariance = totalActualValue - group.total_planned_value;

    // Determine variance status (within ±10% tolerance = on_track)
    let varianceStatus: 'under' | 'on_track' | 'over';
    const variancePercent = group.total_planned_value > 0
      ? (valueVariance / group.total_planned_value) * 100
      : 0;

    if (variancePercent <= -10) {
      varianceStatus = 'under';
    } else if (variancePercent >= 10) {
      varianceStatus = 'over';
    } else {
      varianceStatus = 'on_track';
    }

    breakdown.push({
      service_module_id: group.service_module_id,
      service_module_name: group.service_module_name,
      seniority_level_id: group.seniority_level_id,
      seniority_level_name: group.seniority_level_name,
      total_estimated_hours: group.total_estimated_hours,
      total_planned_value: group.total_planned_value,
      total_actual_hours: totalActualHours,
      total_actual_value: totalActualValue,
      hours_variance: hoursVariance,
      value_variance: valueVariance,
      variance_status: varianceStatus,
      task_count: group.task_ids.length,
    });
  });

  // Sort by planned value (descending) - most expensive services first
  return breakdown.sort((a, b) => b.total_planned_value - a.total_planned_value);
}

/**
 * Get pricing rate for a specific service module + seniority level combination
 * Helper function for auto-filling estimated_rate in UI
 *
 * @param serviceModuleId - The service module ID
 * @param seniorityLevelId - The seniority level ID
 * @returns The rate (€/hour) or null if not found
 */
export async function getServicePricingRate(
  serviceModuleId: string,
  seniorityLevelId: string
): Promise<number | null> {
  const { data, error } = await supabase
    .from('service_pricing')
    .select('rate')
    .eq('service_module_id', serviceModuleId)
    .eq('seniority_level_id', seniorityLevelId)
    .eq('is_active', true)
    .maybeSingle(); // Use maybeSingle to avoid error if no rows found

  if (error) {
    console.error('Error fetching service pricing rate:', error);
    return null;
  }

  return data?.rate || null;
}
