import { supabase } from '../../lib/supabase';
import type { Notification } from '../../types/supabase';

/**
 * Get notifications for the current user
 * Returns all unread notifications + last 20 read ones
 */
export async function getNotifications(): Promise<Notification[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50); // Hard limit for now

    if (error) {
        console.error('Error fetching notifications:', error);
        throw new Error(`Failed to fetch notifications: ${error.message}`);
    }

    return data || [];
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(id: string): Promise<void> {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

    if (error) {
        console.error('Error marking notification as read:', error);
        throw new Error(`Failed to update notification: ${error.message}`);
    }
}

/**
 * Mark all notifications as read for current user
 */
export async function markAllNotificationsAsRead(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

    if (error) {
        console.error('Error marking all notifications as read:', error);
        throw new Error(`Failed to update notifications: ${error.message}`);
    }
}

/**
 * Create a notification (Internal use)
 */
export async function createNotification(
    notification: Omit<Notification, 'id' | 'created_at' | 'is_read'>
): Promise<Notification> {
    const { data, error } = await supabase
        .from('notifications')
        .insert(notification)
        .select()
        .single();

    if (error) {
        console.error('Error creating notification:', error);
        throw new Error(`Failed to create notification: ${error.message}`);
    }

    return data;
}
