import { supabase } from '../../lib/supabase';
import type { Asset } from '../../types/supabase';

/**
 * Get all assets with uploader and project data
 */
export async function getAssets(): Promise<Asset[]> {
  const { data, error } = await supabase
    .from('assets')
    .select(`
      *,
      uploader:profiles(*)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching assets:', error);
    throw new Error(`Failed to fetch assets: ${error.message}`);
  }

  return data || [];
}

/**
 * Get assets by project ID
 */
export async function getAssetsByProject(projectId: string): Promise<Asset[]> {
  const { data, error } = await supabase
    .from('assets')
    .select(`
      *,
      uploader:profiles(*)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching assets by project:', error);
    throw new Error(`Failed to fetch assets by project: ${error.message}`);
  }

  return data || [];
}

/**
 * Get a single asset by ID
 */
export async function getAssetById(id: string): Promise<Asset | null> {
  const { data, error } = await supabase
    .from('assets')
    .select(`
      *,
      uploader:profiles(*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching asset:', error);
    throw new Error(`Failed to fetch asset: ${error.message}`);
  }

  return data;
}

/**
 * Upload a file to Supabase Storage and create asset record
 */
export async function uploadAsset(
  file: File,
  metadata: Omit<Asset, 'id' | 'created_at' | 'uploader' | 'storage_path' | 'file_size' | 'file_type'>
): Promise<Asset> {
  try {
    // 1. Upload file to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${metadata.project_id}/${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}.${fileExt}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('AgencyStorage')
      .upload(fileName, file);

    if (uploadError) {
      throw new Error(`Failed to upload file: ${uploadError.message}`);
    }

    // 2. Create asset record in database
    const assetData = {
      ...metadata,
      storage_path: uploadData.path,
      file_size: file.size,
      file_type: file.type,
    };

    const { data, error } = await supabase
      .from('assets')
      .insert(assetData)
      .select(`
        *,
        uploader:profiles(*)
      `)
      .single();

    if (error) {
      // If database insert fails, try to clean up uploaded file
      await supabase.storage.from('AgencyStorage').remove([fileName]);
      throw new Error(`Failed to create asset record: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error uploading asset:', error);
    throw error;
  }
}

/**
 * Update asset metadata
 */
export async function updateAsset(
  id: string,
  updates: Partial<Omit<Asset, 'id' | 'created_at' | 'uploader' | 'storage_path' | 'file_size' | 'file_type'>>
): Promise<Asset> {
  const { data, error } = await supabase
    .from('assets')
    .update(updates)
    .eq('id', id)
    .select(`
      *,
      uploader:profiles(*)
    `)
    .single();

  if (error) {
    console.error('Error updating asset:', error);
    throw new Error(`Failed to update asset: ${error.message}`);
  }

  return data;
}

/**
 * Delete an asset (removes file from storage and database record)
 */
export async function deleteAsset(id: string): Promise<void> {
  try {
    // 1. Get asset to find storage path
    const { data: asset, error: fetchError } = await supabase
      .from('assets')
      .select('storage_path')
      .eq('id', id)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch asset: ${fetchError.message}`);
    }

    // 2. Delete file from storage if it exists
    if (asset.storage_path) {
      const { error: storageError } = await supabase.storage
        .from('AgencyStorage')
        .remove([asset.storage_path]);

      if (storageError) {
        console.warn('Failed to delete file from storage:', storageError);
        // Continue with database deletion even if storage deletion fails
      }
    }

    // 3. Delete database record
    const { error } = await supabase.from('assets').delete().eq('id', id);

    if (error) {
      throw new Error(`Failed to delete asset: ${error.message}`);
    }
  } catch (error) {
    console.error('Error deleting asset:', error);
    throw error;
  }
}

/**
 * Get public URL for an asset file
 * Note: Returns a public URL. If the bucket is not public, use getAssetSignedUrl instead.
 */
export function getAssetUrl(storagePath: string): string {
  const { data } = supabase.storage
    .from('AgencyStorage')
    .getPublicUrl(storagePath);

  return data.publicUrl;
}

/**
 * Get a signed URL for an asset file (works even if bucket is not public)
 * URL is valid for 1 hour
 */
export async function getAssetSignedUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('AgencyStorage')
    .createSignedUrl(storagePath, 3600); // 1 hour expiry

  if (error) {
    console.error('Error creating signed URL:', error);
    throw new Error(`Failed to create signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * Download an asset file
 */
export async function downloadAsset(storagePath: string, fileName: string): Promise<void> {
  const { data, error } = await supabase.storage
    .from('AgencyStorage')
    .download(storagePath);

  if (error) {
    throw new Error(`Failed to download asset: ${error.message}`);
  }

  // Create download link
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
