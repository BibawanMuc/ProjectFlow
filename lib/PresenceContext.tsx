import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from './AuthContext';

interface PresenceState {
    onlineUsers: Set<string>; // Set of User IDs (profile id)
}

const PresenceContext = createContext<PresenceState>({
    onlineUsers: new Set(),
});

export const usePresence = () => useContext(PresenceContext);

export const PresenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, profile } = useAuth();
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!user) {
            setOnlineUsers(new Set());
            return;
        }

        // Unique channel for presence
        const channel = supabase.channel('global_presence', {
            config: {
                presence: {
                    key: user.id, // Use auth user ID as presence key
                },
            },
        });

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState<{ user_id: string; online_at: string }>();
                const userIds = new Set<string>();

                // State is an object where keys are presence keys (user.id in our case)
                // Values are arrays of presence objects (in case of multiple tabs)
                Object.keys(state).forEach((key) => {
                    userIds.add(key);
                });

                setOnlineUsers(userIds);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    // Track current user
                    await channel.track({
                        user_id: user.id,
                        online_at: new Date().toISOString(),
                        full_name: profile?.full_name, // Optional: share name
                    });
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, profile]);

    return (
        <PresenceContext.Provider value={{ onlineUsers }}>
            {children}
        </PresenceContext.Provider>
    );
};
