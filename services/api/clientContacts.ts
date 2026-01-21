import { supabase } from '../../lib/supabase';
import type { ClientContact } from '../../types/supabase';

/**
 * Get all contacts for a specific client
 */
export async function getClientContacts(clientId: string): Promise<ClientContact[]> {
  const { data, error } = await supabase
    .from('client_contacts')
    .select('*')
    .eq('client_id', clientId)
    .order('is_primary', { ascending: false })
    .order('full_name', { ascending: true });

  if (error) {
    console.error('Error fetching client contacts:', error);
    throw new Error(`Failed to fetch client contacts: ${error.message}`);
  }

  return data || [];
}

/**
 * Get a single contact by ID
 */
export async function getClientContactById(id: string): Promise<ClientContact | null> {
  const { data, error } = await supabase
    .from('client_contacts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching client contact:', error);
    throw new Error(`Failed to fetch client contact: ${error.message}`);
  }

  return data;
}

/**
 * Create a new client contact
 */
export async function createClientContact(
  contactData: Omit<ClientContact, 'id' | 'created_at'>
): Promise<ClientContact> {
  const { data, error } = await supabase
    .from('client_contacts')
    .insert(contactData)
    .select()
    .single();

  if (error) {
    console.error('Error creating client contact:', error);
    throw new Error(`Failed to create client contact: ${error.message}`);
  }

  return data;
}

/**
 * Update an existing client contact
 */
export async function updateClientContact(
  id: string,
  updates: Partial<Omit<ClientContact, 'id' | 'created_at' | 'client_id'>>
): Promise<ClientContact> {
  const { data, error } = await supabase
    .from('client_contacts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating client contact:', error);
    throw new Error(`Failed to update client contact: ${error.message}`);
  }

  return data;
}

/**
 * Delete a client contact
 */
export async function deleteClientContact(id: string): Promise<void> {
  const { error } = await supabase
    .from('client_contacts')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting client contact:', error);
    throw new Error(`Failed to delete client contact: ${error.message}`);
  }
}

/**
 * Set a contact as primary (and unset others)
 */
export async function setPrimaryContact(clientId: string, contactId: string): Promise<void> {
  // First, unset all primary contacts for this client
  const { error: unsetError } = await supabase
    .from('client_contacts')
    .update({ is_primary: false })
    .eq('client_id', clientId);

  if (unsetError) {
    console.error('Error unsetting primary contacts:', unsetError);
    throw new Error(`Failed to unset primary contacts: ${unsetError.message}`);
  }

  // Then, set the new primary contact
  const { error: setError } = await supabase
    .from('client_contacts')
    .update({ is_primary: true })
    .eq('id', contactId);

  if (setError) {
    console.error('Error setting primary contact:', setError);
    throw new Error(`Failed to set primary contact: ${setError.message}`);
  }
}
