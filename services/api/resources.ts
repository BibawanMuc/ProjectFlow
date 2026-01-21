import { supabase } from '../../lib/supabase';
import type { Profile, Task } from '../../types/supabase';

// Helper for native date manipulation
const addDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

const getDaysArray = (start: Date, end: Date) => {
    const arr = [];
    const dt = new Date(start);
    while (dt <= end) {
        arr.push(new Date(dt));
        dt.setDate(dt.getDate() + 1);
    }
    return arr;
};

const isWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6; // 0=Sun, 6=Sat
};

const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
};

// Define local type for Task with joined project relation
type TaskWithProject = Task & {
    project?: {
        title: string;
        color_code?: string;
    };
};

export interface ResourceAllocation {
    date: string; // YYYY-MM-DD
    hours: number;
    tasks: {
        id: string;
        title: string;
        projectTitle: string;
        projectColor: string;
        hours: number;
        status: string;
    }[];
}

export interface ResourceData {
    profile: Profile;
    allocations: { [date: string]: ResourceAllocation }; // Keyed by YYYY-MM-DD
    capacityPerDay: number;
}

/**
 * Fetches all internal resources (employees) and their task allocations for a given date range.
 */
export async function getResourceAvailability(
    startDate: Date,
    endDate: Date
): Promise<ResourceData[]> {
    console.log('Fetching resource availability for:', startDate, endDate);

    // 1. Fetch all internal profiles
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['admin', 'employee', 'freelancer'])
        .order('full_name');

    if (profileError) throw new Error(`Error fetching profiles: ${profileError.message}`);

    // 2. Fetch all active tasks within (or overlapping) the date range
    const { data: tasks, error: taskError } = await supabase
        .from('tasks')
        .select(`
      *,
      project:projects(title, color_code)
    `)
        .neq('status', 'done')
        .not('assigned_to', 'is', null)
        .lte('start_date', endDate.toISOString())
        .gte('due_date', startDate.toISOString());

    if (taskError) throw new Error(`Error fetching tasks: ${taskError.message}`);

    // 3. Process Data
    const resources: ResourceData[] = (profiles as Profile[]).map(profile => {
        const allocations: { [date: string]: ResourceAllocation } = {};
        const capacityPerDay = (profile.weekly_hours || 40) / 5;

        return {
            profile,
            allocations,
            capacityPerDay
        };
    });

    // Helper to find resource by ID
    const getResource = (id: string) => resources.find(r => r.profile.id === id);

    // 4. Distribute Task Hours
    (tasks as unknown as TaskWithProject[])?.forEach((task) => {
        if (!task.assigned_to) return;
        const resource = getResource(task.assigned_to);
        if (!resource) return;

        if (!task.start_date || !task.due_date) return;

        const taskStart = new Date(task.start_date);
        const taskDue = new Date(task.due_date);

        // Calculate business days in task duration
        const daysInTask = getDaysArray(taskStart, taskDue).filter(d => !isWeekend(d));
        const businessDays = daysInTask.length;
        const totalHours = task.estimated_hours || 0;

        if (businessDays <= 0 || totalHours === 0) return;

        const hoursPerDay = totalHours / businessDays;

        daysInTask.forEach(day => {
            const dateKey = formatDate(day);

            // Only record if it's within our requested view range
            if (day < startDate || day > endDate) return;

            if (!resource.allocations[dateKey]) {
                resource.allocations[dateKey] = {
                    date: dateKey,
                    hours: 0,
                    tasks: []
                };
            }

            resource.allocations[dateKey].hours += hoursPerDay;
            resource.allocations[dateKey].tasks.push({
                id: task.id,
                title: task.title,
                projectTitle: task.project?.title || 'Unknown Project',
                projectColor: task.project?.color_code || '#ccc',
                hours: hoursPerDay,
                status: task.status || 'todo'
            });
        });
    });

    return resources;
}
