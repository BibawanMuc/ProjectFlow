import { supabase } from '../../lib/supabase';
import type { SeniorityLevel } from '../../types/supabase';

/**
 * Fetch all seniority levels, ordered by level_order
 */
export async function getSeniorityLevels(): Promise<SeniorityLevel[]> {
  const { data, error } = await supabase
    .from('seniority_levels')
    .select('*')
    .order('level_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch seniority levels: ${error.message}`);
  }

  return data || [];
}

/**
 * Fetch a single seniority level by ID
 */
export async function getSeniorityLevelById(id: string): Promise<SeniorityLevel | null> {
  const { data, error } = await supabase
    .from('seniority_levels')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(`Failed to fetch seniority level: ${error.message}`);
  }

  return data;
}

/**
 * Create a new seniority level
 */
export async function createSeniorityLevel(
  data: Omit<SeniorityLevel, 'id' | 'created_at'>
): Promise<SeniorityLevel> {
  const { data: newLevel, error } = await supabase
    .from('seniority_levels')
    .insert([data])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create seniority level: ${error.message}`);
  }

  return newLevel;
}

/**
 * Update a seniority level
 */
export async function updateSeniorityLevel(
  id: string,
  updates: Partial<SeniorityLevel>
): Promise<SeniorityLevel> {
  const { data, error } = await supabase
    .from('seniority_levels')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update seniority level: ${error.message}`);
  }

  return data;
}

/**
 * Delete a seniority level (CASCADE deletes pricing entries)
 */
export async function deleteSeniorityLevel(id: string): Promise<void> {
  const { error } = await supabase
    .from('seniority_levels')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to delete seniority level: ${error.message}`);
  }
}
