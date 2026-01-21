import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { supabase } from './supabase';
import { useAuth } from './AuthContext';
import { Notification } from '../types/supabase';

/**
 * Hook to subscribe to Supabase Realtime events and invalidate generic Query Keys.
 * This ensures that when data changes in the database (via any client),
 * the UI automatically refreshes to show the latest data.
 */
export function useRealtime() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    console.log('🔄 Setting up Supabase Realtime subscriptions...');

    const channel = supabase.channel('global-db-changes')
      // Notifications:      // 6. Notifications
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          const newNotification = payload.new as Notification;
          // Show toast for new notifications
          toast.info(newNotification.title);
        }
      )
      // Tasks: Invalidate task lists
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          console.log('🔔 Realtime update: tasks', payload);
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
        }
      )
      // Costs: Invalidate costs and project financials (budget/margin)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'costs' },
        (payload) => {
          console.log('🔔 Realtime update: costs', payload);
          queryClient.invalidateQueries({ queryKey: ['costs'] });
          queryClient.invalidateQueries({ queryKey: ['project-financials'] });
        }
      )
      // Financial Documents (Quotes/Invoices): Invalidate list and project financials
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'financial_documents' },
        (payload) => {
          console.log('🔔 Realtime update: financial_documents', payload);
          queryClient.invalidateQueries({ queryKey: ['financial-documents'] });
          queryClient.invalidateQueries({ queryKey: ['project-financials'] });
          queryClient.invalidateQueries({ queryKey: ['projects'] }); // Budget total might update
        }
      )
      // Time Entries: Invalidate time entries and project financials (billable hours)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'time_entries' },
        (payload) => {
          console.log('🔔 Realtime update: time_entries', payload);
          queryClient.invalidateQueries({ queryKey: ['time-entries'] });
          queryClient.invalidateQueries({ queryKey: ['project-financials'] });
        }
      )
      // Projects: Invalidate project lists and details
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects' },
        (payload) => {
          console.log('🔔 Realtime update: projects', payload);
          queryClient.invalidateQueries({ queryKey: ['projects'] });
          queryClient.invalidateQueries({ queryKey: ['project-details'] });
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 Cleaning up Supabase Realtime subscriptions...');
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);
}
