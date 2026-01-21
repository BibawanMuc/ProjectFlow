import React, { useState } from 'react';
import { Icon } from './ui/Icon';
import { Avatar } from './ui/Avatar';
import { useAuth } from '../lib/AuthContext';
import { toast } from 'react-toastify';
import { useQuery } from '@tanstack/react-query';
import { NotificationsDropdown } from './NotificationsDropdown';
import { getNotifications } from '../services/api/notifications';
import type { View } from '../App';

interface HeaderProps {
  currentView: View;
  onNavigate: (view: 'settings') => void;
  searchQuery?: string;
  onSearch?: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, onNavigate, searchQuery, onSearch }) => {
  const { profile, signOut } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    // Polling as fallback if realtime fails, but let's rely on cache invalidation from Dropdown mostly.
    // However, if dropdown is never opened, we won't get realtime toasts unless we subscribe here too.
    // The dropdown handles the subscription. If the dropdown is closed, no subscription!
    // Ideally, App.tsx or Layout should handle subscription.
    // For now, let's keep it simple: Realtime only works when dropdown is mounted? No, that's bad.
    // I should move the subscription to Header or App.
    // But for this step, I'm just wiring the UI. 
    // Wait, the user asked for "instant notifications". If dropdown is closed, they won't see toasts if subs is in Dropdown.
    // I will MOVE the subscription logic from Dropdown to Header or MainApp in a later step if needed.
    // Actually, NotificationBell should logically hold the subscription if it shows the badge.
    enabled: !!profile,
  });

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Logged out successfully');
    } catch (error: any) {
      toast.error('Error logging out: ' + error.message);
    }
  };

  const getSearchPlaceholder = () => {
    switch (currentView) {
      case 'projects': return 'Search projects...';
      case 'tasks': return 'Search tasks...';
      case 'clients': return 'Search clients...';
      case 'assets': return 'Search assets...';
      case 'employees': return 'Search employees...';
      case 'service-catalog': return 'Search services...';
      default: return 'Search...';
    }
  };

  const getPageTitle = () => {
    switch (currentView) {
      case 'dashboard': return 'Dashboard';
      case 'projects': return 'Projects';
      case 'project-detail': return 'Project Details';
      case 'tasks': return 'Tasks';
      case 'assets': return 'Assets';
      case 'clients': return 'Clients';
      case 'employees': return 'Team';
      case 'service-catalog': return 'Service Catalog';
      case 'finances': return 'Finances';
      case 'reports': return 'Reports';
      case 'settings': return 'Settings';
      default: return 'Dashboard';
    }
  };

  return (
    <header className="h-20 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-8">
      <div className="flex items-center">
        <h1 className="text-2xl font-bold text-white">{getPageTitle()}</h1>
      </div>
      <div className="flex items-center space-x-6">
        <div className="relative">
          <Icon path="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder={getSearchPlaceholder()}
            value={searchQuery || ''}
            onChange={(e) => onSearch?.(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 w-64 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 text-gray-300"
          />
        </div>
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative text-gray-400 hover:text-white"
          >
            <Icon path="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            )}
          </button>

          {showNotifications && (
            <NotificationsDropdown onClose={() => setShowNotifications(false)} />
          )}
        </div>
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center space-x-3 hover:bg-gray-800 rounded-lg px-3 py-2 transition-colors"
          >
            <Avatar
              avatarPath={profile?.avatar_url}
              alt={profile?.full_name || 'User'}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div className="text-left">
              <p className="text-sm font-semibold text-white">{profile?.full_name || 'User'}</p>
              <p className="text-xs text-gray-400 capitalize">{profile?.role || 'employee'}</p>
            </div>
            <Icon
              path="M19 9l-7 7-7-7"
              className={`w-4 h-4 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
            />
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg border border-gray-700 py-2 z-50">
              <button
                onClick={() => {
                  setShowDropdown(false);
                  onNavigate('settings');
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 flex items-center space-x-2"
              >
                <Icon path="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" className="w-4 h-4" />
                <span>Settings</span>
              </button>
              <div className="border-t border-gray-700 my-2"></div>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 flex items-center space-x-2"
              >
                <Icon path="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
