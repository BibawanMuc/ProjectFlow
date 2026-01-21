import { supabase } from '../../lib/supabase';
import type { Client } from '../../types/supabase';

/**
 * Get all clients with their contacts
 */
export async function getClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from('clients')
    .select(`
      *,
      contacts:client_contacts(*)
    `)
    .order('company_name', { ascending: true });

  if (error) {
    console.error('Error fetching clients:', error);
    throw new Error(`Failed to fetch clients: ${error.message}`);
  }

  return data || [];
}

/**
 * Get a single client by ID
 */
export async function getClientById(id: string): Promise<Client | null> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching client:', error);
    throw new Error(`Failed to fetch client: ${error.message}`);
  }

  return data;
}

/**
 * Create a new client
 */
export async function createClient(
  clientData: Omit<Client, 'id' | 'created_at'>
): Promise<Client> {
  const { data, error } = await supabase
    .from('clients')
    .insert(clientData)
    .select()
    .single();

  if (error) {
    console.error('Error creating client:', error);
    throw new Error(`Failed to create client: ${error.message}`);
  }

  return data;
}

/**
 * Update an existing client
 */
export async function updateClient(
  id: string,
  updates: Partial<Omit<Client, 'id' | 'created_at'>>
): Promise<Client> {
  const { data, error } = await supabase
    .from('clients')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating client:', error);
    throw new Error(`Failed to update client: ${error.message}`);
  }

  return data;
}

/**
 * Delete a client
 */
export async function deleteClient(id: string): Promise<void> {
  const { error } = await supabase.from('clients').delete().eq('id', id);

  if (error) {
    console.error('Error deleting client:', error);
    throw new Error(`Failed to delete client: ${error.message}`);
  }
}

/**
 * Upload client logo to storage
 * Returns the storage path (not URL)
 */
export async function uploadClientLogo(clientId: string, file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `client-${clientId}-${Date.now()}.${fileExt}`;
  const filePath = `client-logos/${fileName}`;

  const { error } = await supabase.storage
    .from('AgencyStorage')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    console.error('Error uploading client logo:', error);
    throw new Error(`Failed to upload logo: ${error.message}`);
  }

  return filePath;
}

/**
 * Get signed URL for client logo
 */
export async function getClientLogoSignedUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('AgencyStorage')
    .createSignedUrl(storagePath, 3600); // 1 hour expiry

  if (error || !data?.signedUrl) {
    console.error('Error getting signed URL for client logo:', error);
    throw new Error(`Failed to get logo URL: ${error?.message || 'Unknown error'}`);
  }

  return data.signedUrl;
}

/**
 * Update client logo_url in database
 */
export async function updateClientLogo(clientId: string, logoPath: string): Promise<Client> {
  const { data, error } = await supabase
    .from('clients')
    .update({ logo_url: logoPath })
    .eq('id', clientId)
    .select()
    .single();

  if (error) {
    console.error('Error updating client logo:', error);
    throw new Error(`Failed to update client logo: ${error.message}`);
  }

  return data;
}

/**
 * Delete old client logo from storage
 */
export async function deleteClientLogo(storagePath: string): Promise<void> {
  const { error } = await supabase.storage
    .from('AgencyStorage')
    .remove([storagePath]);

  if (error) {
    console.error('Error deleting old client logo:', error);
    // Don't throw - old logo deletion is not critical
  }
}
