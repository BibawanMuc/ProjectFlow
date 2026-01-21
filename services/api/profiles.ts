import { supabase } from '../../lib/supabase';
import type { Profile } from '../../types/supabase';

/**
 * Get all profiles (users/team members)
 */
export async function getProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name', { ascending: true });

  if (error) {
    console.error('Error fetching profiles:', error);
    throw new Error(`Failed to fetch profiles: ${error.message}`);
  }

  return data || [];
}

/**
 * Get a single profile by ID
 */
export async function getProfileById(id: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    throw new Error(`Failed to fetch profile: ${error.message}`);
  }

  return data;
}

/**
 * Update a profile
 */
export async function updateProfile(
  id: string,
  updates: Partial<Omit<Profile, 'id' | 'created_at'>>
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating profile:', error);
    throw new Error(`Failed to update profile: ${error.message}`);
  }

  return data;
}

/**
 * Get profiles by role
 */
export async function getProfilesByRole(
  role: 'admin' | 'employee' | 'freelancer' | 'client'
): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', role)
    .order('full_name', { ascending: true });

  if (error) {
    console.error('Error fetching profiles by role:', error);
    throw new Error(`Failed to fetch profiles by role: ${error.message}`);
  }

  return data || [];
}

/**
 * Get all internal team members (admin, employee, freelancer)
 * Full access (Admins only via RLS usually)
 */
export async function getInternalProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .in('role', ['admin', 'employee', 'freelancer'])
    .order('full_name', { ascending: true });

  if (error) {
    console.error('Error fetching internal profiles:', error);
    throw new Error(`Failed to fetch internal profiles: ${error.message}`);
  }

  return data || [];
}

/**
 * Get secure team directory (For non-admins)
 * Uses RPC to bypass RLS but selects only safe columns
 */
export async function getTeamDirectory(): Promise<Profile[]> {
  const { data, error } = await supabase.rpc('get_team_directory');

  if (error) {
    console.error('Error fetching team directory:', error);
    // Fallback: Return empty or try fetch if RPC not exists? 
    // Throwing is better so we know setup is missing
    throw new Error(`Failed to fetch team directory: ${error.message}`);
  }

  return data || [];
}
