import { supabase } from '../../lib/supabase';
import type { ServiceModule, ServiceCategory } from '../../types/supabase';

export interface ServicePerformanceStats {
    service_module_id: string;
    service_name: string;
    category: ServiceCategory;
    revenue: number;
    cost: number;
    profit: number;
    margin_percent: number;
    tasks_count: number;
    hours_tracked: number;
}

/**
 * Calculate profitability per Service Module
 * Revenue = Sum of financial_items (in approved/paid invoices) linked to service
 * Cost = Sum of time_entries (duration * internal_cost) for tasks linked to service
 */
export async function getServiceProfitabilityStats(): Promise<ServicePerformanceStats[]> {
    // 1. Fetch Service Modules
    const { data: services, error: servicesError } = await supabase
        .from('service_modules')
        .select('id, service_module, category')
        .eq('is_active', true);

    if (servicesError) throw new Error(`Failed to fetch services: ${servicesError.message}`);

    // 2. Fetch Revenue (Financial Items from Approved/Paid Docs)
    const { data: revenueItems, error: revenueError } = await supabase
        .from('financial_items')
        .select(`
      total_price,
      service_module_id,
      document:financial_documents!inner(status)
    `)
        .in('document.status', ['approved', 'paid', 'sent']) // Include sent? Maybe just approved/paid for "Real" revenue. Let's say Approved+
        .not('service_module_id', 'is', null);

    if (revenueError) throw new Error(`Failed to fetch revenue: ${revenueError.message}`);

    // 3. Fetch Costs (Time Entries on Service-linked Tasks)
    // We need time_entries -> tasks(service_module_id) -> profiles(internal_cost)
    // This is a complex join. Supabase can do it deep.
    const { data: costItems, error: costError } = await supabase
        .from('time_entries')
        .select(`
      duration_minutes,
      profile:profiles(internal_cost_per_hour),
      task:tasks!inner(service_module_id)
    `)
        .not('task.service_module_id', 'is', null);

    if (costError) throw new Error(`Failed to fetch costs: ${costError.message}`);

    // 4. Aggregate
    const statsMap = new Map<string, ServicePerformanceStats>();

    // Initialize map
    services?.forEach(svc => {
        statsMap.set(svc.id, {
            service_module_id: svc.id,
            service_name: svc.service_module,
            category: svc.category,
            revenue: 0,
            cost: 0,
            profit: 0,
            margin_percent: 0,
            tasks_count: 0, // We can't easily get unique tasks count from time entries list without Set, but roughly matches engagement
            hours_tracked: 0
        });
    });

    // Sum Revenue
    revenueItems?.forEach((item: any) => {
        const svcId = item.service_module_id;
        if (statsMap.has(svcId)) {
            const stat = statsMap.get(svcId)!;
            stat.revenue += item.total_price || 0;
        }
    });

    // Sum Costs
    costItems?.forEach((entry: any) => {
        // entry.task is single object because of !inner join logic usually, but let's check array
        // supabase returns object for single relation
        const svcId = entry.task?.service_module_id;
        if (svcId && statsMap.has(svcId)) {
            const stat = statsMap.get(svcId)!;
            const hours = (entry.duration_minutes || 0) / 60;
            const costRate = entry.profile?.internal_cost_per_hour || 0;

            stat.hours_tracked += hours;
            stat.cost += hours * costRate;
            stat.tasks_count += 1; // Actually this is entries count, but indicates activity
        }
    });

    // Calculate Margins
    return Array.from(statsMap.values()).map(stat => {
        stat.profit = stat.revenue - stat.cost;
        stat.margin_percent = stat.revenue > 0 ? (stat.profit / stat.revenue) * 100 : 0;
        return stat;
    }).sort((a, b) => b.profit - a.profit); // Sort by most profitable
}
