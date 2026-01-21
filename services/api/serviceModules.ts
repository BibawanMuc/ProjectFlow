import { supabase } from '../../lib/supabase';
import type { ServiceModule } from '../../types/supabase';

/**
 * Fetch all service modules
 */
export async function getServiceModules(): Promise<ServiceModule[]> {
  const { data, error } = await supabase
    .from('service_modules')
    .select('*')
    .order('category', { ascending: true })
    .order('service_module', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch service modules: ${error.message}`);
  }

  return data || [];
}

/**
 * Fetch a single service module by ID
 */
export async function getServiceModuleById(id: string): Promise<ServiceModule | null> {
  const { data, error } = await supabase
    .from('service_modules')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(`Failed to fetch service module: ${error.message}`);
  }

  return data;
}

/**
 * Fetch a service module with all its pricing entries (enriched)
 */
export async function getServiceModuleWithPricing(id: string): Promise<ServiceModule> {
  const { data, error } = await supabase
    .from('service_modules')
    .select(`
      *,
      pricing:service_pricing(
        *,
        seniority_level:seniority_levels(*)
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(`Failed to fetch service module with pricing: ${error.message}`);
  }

  return data;
}

/**
 * Fetch all service modules with their pricing (enriched)
 */
export async function getServiceModulesWithPricing(): Promise<ServiceModule[]> {
  const { data, error } = await supabase
    .from('service_modules')
    .select(`
      *,
      pricing:service_pricing(
        *,
        seniority_level:seniority_levels(*)
      )
    `)
    .order('category', { ascending: true })
    .order('service_module', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch service modules with pricing: ${error.message}`);
  }

  return data || [];
}

/**
 * Create a new service module
 */
export async function createServiceModule(
  data: Omit<ServiceModule, 'id' | 'created_at'>
): Promise<ServiceModule> {
  const { data: newModule, error } = await supabase
    .from('service_modules')
    .insert([data])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create service module: ${error.message}`);
  }

  return newModule;
}

/**
 * Update a service module
 */
export async function updateServiceModule(
  id: string,
  updates: Partial<ServiceModule>
): Promise<ServiceModule> {
  const { data, error } = await supabase
    .from('service_modules')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update service module: ${error.message}`);
  }

  return data;
}

/**
 * Delete a service module (CASCADE deletes pricing entries)
 */
export async function deleteServiceModule(id: string): Promise<void> {
  const { error } = await supabase
    .from('service_modules')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to delete service module: ${error.message}`);
  }
}
