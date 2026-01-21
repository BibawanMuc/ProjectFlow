import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTasks } from '../../services/api/tasks';
import { getProjects } from '../../services/api/projects';
import { Icon } from '../ui/Icon';
import { getDaysInMonth, getFirstDayOfMonth, addDays, isSameDay, getMonthName } from '../../lib/dateUtils';
import type { Task, Project } from '../../types/supabase';

export const CalendarView: React.FC = () => {
    const [currentDate, setCurrentDate] = useState(new Date());

    // Fetch Data
    const { data: tasks = [] } = useQuery({
        queryKey: ['tasks'],
        queryFn: getTasks
    });

    const { data: projects = [] } = useQuery({
        queryKey: ['projects'],
        queryFn: getProjects
    });

    // Navigation
    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    // Grid Generation
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate); // 0 (Mon) to 6 (Sun)
    const totalSlots = daysInMonth + firstDay;
    const days = [];

    // Empty slots for previous month
    for (let i = 0; i < firstDay; i++) {
        days.push(null);
    }

    // Days of current month
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
    }

    // Helper to get Project Color
    const getProjectColor = (projectId: string) => {
        const project = projects.find(p => p.id === projectId);
        return project?.color_code || '#3B82F6';
    };

    // Weekday Headers (German)
    const weekdays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

    return (
        <div className="bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-gray-700 flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-white uppercase tracking-wide">
                        {getMonthName(currentDate)}
                    </h2>
                    <div className="flex bg-gray-700 rounded-lg p-1">
                        <button onClick={prevMonth} className="p-1 hover:bg-gray-600 rounded text-gray-300">
                            <Icon path="M15 19l-7-7 7-7" className="w-5 h-5" />
                        </button>
                        <button onClick={goToToday} className="px-3 py-1 text-sm font-medium text-white hover:bg-gray-600 rounded">
                            Today
                        </button>
                        <button onClick={nextMonth} className="p-1 hover:bg-gray-600 rounded text-gray-300">
                            <Icon path="M9 5l7 7-7 7" className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="flex-1 min-h-0 flex flex-col">
                {/* Weekday Headers */}
                <div className="grid grid-cols-7 border-b border-gray-700 bg-gray-800/50">
                    {weekdays.map(day => (
                        <div key={day} className="py-2 text-center text-sm font-semibold text-gray-400 uppercase tracking-wider">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Days */}
                <div className="flex-1 grid grid-cols-7 auto-rows-fr">
                    {days.map((date, index) => {
                        if (!date) {
                            return <div key={`empty-${index}`} className="bg-gray-900/40 border-r border-b border-gray-700" />;
                        }

                        const dayTasks = tasks.filter(task => {
                            if (!task.due_date) return false;
                            const taskDate = new Date(task.due_date);
                            return isSameDay(taskDate, date);
                        });

                        // Is Today?
                        const isToday = isSameDay(date, new Date());

                        return (
                            <div
                                key={date.toISOString()}
                                className={`border-r border-b border-gray-700 p-2 min-h-[100px] relative transition-colors hover:bg-gray-800/80 ${isToday ? 'bg-blue-900/20' : ''}`}
                            >
                                <div className={`text-sm font-medium mb-2 w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-500 text-white' : 'text-gray-400'}`}>
                                    {date.getDate()}
                                </div>

                                <div className="space-y-1 overflow-y-auto max-h-[100px]">
                                    {dayTasks.map(task => (
                                        <div
                                            key={task.id}
                                            className="text-xs px-2 py-1 rounded truncate border-l-2 text-white/90"
                                            style={{
                                                backgroundColor: `${getProjectColor(task.project_id)}20`, // 20% opacity
                                                borderColor: getProjectColor(task.project_id)
                                            }}
                                            title={task.title}
                                        >
                                            {task.title}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
