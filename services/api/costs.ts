import { supabase } from '../../lib/supabase';
import type { Cost } from '../../types/supabase';

/**
 * Get all costs for a project
 */
export async function getCostsByProject(projectId: string): Promise<Cost[]> {
  const { data, error } = await supabase
    .from('costs')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching costs:', error);
    throw new Error(`Failed to fetch costs: ${error.message}`);
  }

  return data || [];
}

/**
 * Get a single cost by ID
 */
export async function getCostById(id: string): Promise<Cost | null> {
  const { data, error } = await supabase
    .from('costs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching cost:', error);
    throw new Error(`Failed to fetch cost: ${error.message}`);
  }

  return data;
}

/**
 * Create a new cost
 */
export async function createCost(
  costData: Omit<Cost, 'id' | 'created_at'>
): Promise<Cost> {
  const { data, error } = await supabase
    .from('costs')
    .insert(costData)
    .select()
    .single();

  if (error) {
    console.error('Error creating cost:', error);
    throw new Error(`Failed to create cost: ${error.message}`);
  }

  return data;
}

/**
 * Update an existing cost
 */
export async function updateCost(
  id: string,
  updates: Partial<Omit<Cost, 'id' | 'created_at'>>
): Promise<Cost> {
  const { data, error } = await supabase
    .from('costs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating cost:', error);
    throw new Error(`Failed to update cost: ${error.message}`);
  }

  return data;
}

/**
 * Delete a cost
 */
export async function deleteCost(id: string): Promise<void> {
  const { error } = await supabase.from('costs').delete().eq('id', id);

  if (error) {
    console.error('Error deleting cost:', error);
    throw new Error(`Failed to delete cost: ${error.message}`);
  }
}

/**
 * Upload cost invoice/receipt to storage
 * Returns the storage path (not URL)
 */
export async function uploadCostDocument(projectId: string, file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `cost-${Date.now()}.${fileExt}`;
  const filePath = `project-${projectId}/costs/${fileName}`;

  const { error } = await supabase.storage
    .from('AgencyStorage')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Error uploading cost document:', error);
    throw new Error(`Failed to upload document: ${error.message}`);
  }

  return filePath;
}

/**
 * Get signed URL for cost document
 */
export async function getCostDocumentSignedUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('AgencyStorage')
    .createSignedUrl(storagePath, 3600); // 1 hour expiry

  if (error || !data?.signedUrl) {
    console.error('Error getting signed URL for cost document:', error);
    throw new Error(`Failed to get document URL: ${error?.message || 'Unknown error'}`);
  }

  return data.signedUrl;
}

/**
 * Delete cost document from storage
 */
export async function deleteCostDocument(storagePath: string): Promise<void> {
  const { error } = await supabase.storage
    .from('AgencyStorage')
    .remove([storagePath]);

  if (error) {
    console.error('Error deleting cost document:', error);
    // Don't throw - document deletion is not critical
  }
}

/**
 * Calculate total costs for a project
 */
export async function calculateProjectCosts(projectId: string): Promise<number> {
  const costs = await getCostsByProject(projectId);
  return costs.reduce((sum, cost) => sum + (cost.amount || 0), 0);
}
