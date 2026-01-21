import { supabase } from '../../lib/supabase';
import type { ServicePricing } from '../../types/supabase';

/**
 * Fetch all service pricing entries
 */
export async function getServicePricing(): Promise<ServicePricing[]> {
  const { data, error } = await supabase
    .from('service_pricing')
    .select(`
      *,
      service_module:service_modules(*),
      seniority_level:seniority_levels(*)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch service pricing: ${error.message}`);
  }

  return data || [];
}

/**
 * Fetch pricing entries for a specific service module
 */
export async function getPricingByServiceModule(serviceModuleId: string): Promise<ServicePricing[]> {
  const { data, error } = await supabase
    .from('service_pricing')
    .select(`
      *,
      service_module:service_modules(*),
      seniority_level:seniority_levels(*)
    `)
    .eq('service_module_id', serviceModuleId)
    .order('seniority_level.level_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch pricing for service module: ${error.message}`);
  }

  return data || [];
}

/**
 * Fetch a single pricing entry by ID
 */
export async function getPricingById(id: string): Promise<ServicePricing | null> {
  const { data, error } = await supabase
    .from('service_pricing')
    .select(`
      *,
      service_module:service_modules(*),
      seniority_level:seniority_levels(*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(`Failed to fetch pricing entry: ${error.message}`);
  }

  return data;
}

/**
 * Create a new pricing entry
 */
export async function createServicePricing(
  data: Omit<ServicePricing, 'id' | 'created_at' | 'margin_percentage'>
): Promise<ServicePricing> {
  const { data: newPricing, error } = await supabase
    .from('service_pricing')
    .insert([data])
    .select(`
      *,
      service_module:service_modules(*),
      seniority_level:seniority_levels(*)
    `)
    .single();

  if (error) {
    throw new Error(`Failed to create pricing entry: ${error.message}`);
  }

  return newPricing;
}

/**
 * Update a pricing entry
 */
export async function updateServicePricing(
  id: string,
  updates: Partial<Omit<ServicePricing, 'margin_percentage'>>
): Promise<ServicePricing> {
  const { data, error } = await supabase
    .from('service_pricing')
    .update(updates)
    .eq('id', id)
    .select(`
      *,
      service_module:service_modules(*),
      seniority_level:seniority_levels(*)
    `)
    .single();

  if (error) {
    throw new Error(`Failed to update pricing entry: ${error.message}`);
  }

  return data;
}

/**
 * Delete a pricing entry
 */
export async function deleteServicePricing(id: string): Promise<void> {
  const { error } = await supabase
    .from('service_pricing')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to delete pricing entry: ${error.message}`);
  }
}

/**
 * Batch create multiple pricing entries
 */
export async function createMultiplePricings(
  pricings: Omit<ServicePricing, 'id' | 'created_at' | 'margin_percentage'>[]
): Promise<ServicePricing[]> {
  const { data, error } = await supabase
    .from('service_pricing')
    .insert(pricings)
    .select(`
      *,
      service_module:service_modules(*),
      seniority_level:seniority_levels(*)
    `);

  if (error) {
    throw new Error(`Failed to create multiple pricing entries: ${error.message}`);
  }

  return data || [];
}

/**
 * Batch update multiple pricing entries
 */
export async function updateMultiplePricings(
  updates: { id: string; data: Partial<Omit<ServicePricing, 'margin_percentage'>> }[]
): Promise<ServicePricing[]> {
  const results: ServicePricing[] = [];

  for (const update of updates) {
    const result = await updateServicePricing(update.id, update.data);
    results.push(result);
  }

  return results;
}

/**
 * Delete all pricing entries for a service module
 */
export async function deletePricingByServiceModule(serviceModuleId: string): Promise<void> {
  const { error } = await supabase
    .from('service_pricing')
    .delete()
    .eq('service_module_id', serviceModuleId);

  if (error) {
    throw new Error(`Failed to delete pricing for service module: ${error.message}`);
  }
}
