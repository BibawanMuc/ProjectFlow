export function downloadCSV(data: any[], filename: string) {
    if (!data || !data.length) {
        console.warn('No data to export');
        return;
    }

    // Get headers from first object
    const headers = Object.keys(data[0]);

    // Helper to escape CSV values
    const escape = (val: any) => {
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    // Build CSV String
    const csvContent = [
        headers.join(','), // Header Row
        ...data.map(row => headers.map(header => escape(row[header])).join(',')) // Data Rows
    ].join('\n');

    // Trigger Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

/**
 * Transforms Time Entries into a flat CSV-friendly format
 */
export function exportTimeEntriesToCSV(entries: any[]) { // Using any[] for flexibility with joins
    const flatEntries = entries.map(e => ({
        Date: new Date(e.start_time).toLocaleDateString(),
        Employee: e.profiles?.full_name || 'Unknown',
        Project: e.projects?.title || 'Unknown',
        Task: e.tasks?.title || 'No Task',
        Duration_Minutes: e.duration_minutes,
        Duration_Hours: (e.duration_minutes / 60).toFixed(2),
        Billable: e.billable ? 'Yes' : 'No',
        Status: e.status,
        Description: e.description || ''
    }));

    downloadCSV(flatEntries, `TimeEntries_${new Date().toISOString().slice(0, 10)}.csv`);
}
