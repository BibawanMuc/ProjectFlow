import { supabase } from '../../lib/supabase';
import { getCostsByProject } from './costs';

/**
 * Calculate project revenue from approved quotes
 * @param projectId - The project ID
 * @returns Total revenue from approved quotes
 */
export async function calculateProjectRevenue(projectId: string): Promise<number> {
  const { data, error } = await supabase
    .from('financial_documents')
    .select('total_net')
    .eq('project_id', projectId)
    .eq('type', 'quote')
    .eq('status', 'approved');

  if (error) {
    console.error('Error calculating project revenue:', error);
    throw new Error(`Failed to calculate project revenue: ${error.message}`);
  }

  const revenue = data?.reduce((sum, doc) => sum + (doc.total_net || 0), 0) || 0;
  return revenue;
}

/**
 * Calculate project costs (direct costs + billable hours value)
 * @param projectId - The project ID
 * @returns Object with costs breakdown
 */
export async function calculateProjectCosts(projectId: string): Promise<{
  directCosts: number;
  billableHoursValue: number;
  totalCosts: number;
}> {
  // Fetch direct costs using common service
  const costsData = await getCostsByProject(projectId);

  const directCosts = costsData.reduce((sum, cost) => sum + (cost.amount || 0), 0);

  // Fetch billable time entries with employee rates
  const { data: timeEntriesData, error: timeError } = await supabase
    .from('time_entries')
    .select(`
      duration_minutes,
      billable,
      profile:profiles(billable_hourly_rate)
    `)
    .eq('project_id', projectId)
    .not('end_time', 'is', null); // Only completed entries

  if (timeError) {
    console.error('Error fetching project time entries:', timeError);
    throw new Error(`Failed to fetch project time entries: ${timeError.message}`);
  }

  let billableHoursValue = 0;
  timeEntriesData?.forEach((entry) => {
    if (entry.billable) {
      const hours = (entry.duration_minutes || 0) / 60;
      const rate = (entry.profile as any)?.billable_hourly_rate || 0;
      billableHoursValue += hours * rate;
    }
  });

  return {
    directCosts,
    billableHoursValue,
    totalCosts: directCosts + billableHoursValue,
  };
}

/**
 * Calculate project margin
 * @param projectId - The project ID
 * @returns Margin data with revenue, costs, profit, and margin percentage
 */
export async function calculateProjectMargin(projectId: string): Promise<{
  revenue: number;
  costs: {
    directCosts: number;
    billableHoursValue: number;
    totalCosts: number;
  };
  profit: number;
  marginPercentage: number;
  status: 'excellent' | 'good' | 'acceptable' | 'poor' | 'negative';
}> {
  const [revenue, costs] = await Promise.all([
    calculateProjectRevenue(projectId),
    calculateProjectCosts(projectId),
  ]);

  const profit = revenue - costs.totalCosts;
  const marginPercentage = revenue > 0 ? (profit / revenue) * 100 : 0;

  // Determine status based on margin percentage
  let status: 'excellent' | 'good' | 'acceptable' | 'poor' | 'negative';
  if (marginPercentage >= 30) {
    status = 'excellent';
  } else if (marginPercentage >= 20) {
    status = 'good';
  } else if (marginPercentage >= 10) {
    status = 'acceptable';
  } else if (marginPercentage >= 0) {
    status = 'poor';
  } else {
    status = 'negative';
  }

  return {
    revenue,
    costs,
    profit,
    marginPercentage,
    status,
  };
}

/**
 * Calculate margins for multiple projects (for ProjectList display)
 * @param projectIds - Array of project IDs
 * @returns Map of project ID to margin data
 */
export async function calculateProjectsMargins(
  projectIds: string[]
): Promise<Record<string, { profit: number; marginPercentage: number; status: string }>> {
  const margins: Record<string, { profit: number; marginPercentage: number; status: string }> = {};

  // Process in batches to avoid overwhelming the database
  const batchSize = 10;
  for (let i = 0; i < projectIds.length; i += batchSize) {
    const batch = projectIds.slice(i, i + batchSize);
    const marginPromises = batch.map(async (projectId) => {
      try {
        const margin = await calculateProjectMargin(projectId);
        margins[projectId] = {
          profit: margin.profit,
          marginPercentage: margin.marginPercentage,
          status: margin.status,
        };
      } catch (error) {
        console.error(`Error calculating margin for project ${projectId}:`, error);
        margins[projectId] = {
          profit: 0,
          marginPercentage: 0,
          status: 'unknown',
        };
      }
    });

    await Promise.all(marginPromises);
  }

  return margins;
}

/**
 * Sync project budget with total approved revenue
 * @param projectId - The project ID
 */
export async function syncProjectBudget(projectId: string): Promise<void> {
  try {
    const revenue = await calculateProjectRevenue(projectId);

    const { error } = await supabase
      .from('projects')
      .update({ budget_total: revenue })
      .eq('id', projectId);

    if (error) {
      console.error('Error syncing project budget:', error);
      // Non-blocking error, just log it
    }
  } catch (error) {
    console.error('Error syncing project budget:', error);
  }
}
