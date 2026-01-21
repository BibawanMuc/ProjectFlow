import { supabase } from '../../lib/supabase';
import type { Profile } from '../../types/supabase';

/**
 * Upload avatar image to Supabase Storage
 */
export async function uploadAvatar(
  userId: string,
  file: File
): Promise<string> {
  try {
    // Create a unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    // Upload file to storage
    const { error: uploadError } = await supabase.storage
      .from('AgencyStorage')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload avatar: ${uploadError.message}`);
    }

    // Just return the storage path, not a URL
    // We'll generate signed URLs on-demand when displaying
    return filePath;
  } catch (error: any) {
    console.error('Error uploading avatar:', error);
    throw error;
  }
}

/**
 * Update user profile with new avatar storage path
 */
export async function updateAvatarPath(
  userId: string,
  storagePath: string
): Promise<Profile> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ avatar_url: storagePath })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update avatar: ${error.message}`);
    }

    return data;
  } catch (error: any) {
    console.error('Error updating avatar:', error);
    throw error;
  }
}

/**
 * Change user password
 */
export async function changePassword(
  newPassword: string
): Promise<void> {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw new Error(`Failed to change password: ${error.message}`);
    }
  } catch (error: any) {
    console.error('Error changing password:', error);
    throw error;
  }
}

/**
 * Update user profile information
 */
export async function updateUserProfile(
  userId: string,
  updates: {
    full_name?: string;
    email?: string;
  }
): Promise<Profile> {
  try {
    // Update profile in database
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update profile: ${error.message}`);
    }

    // If email changed, update auth email
    if (updates.email) {
      const { error: authError } = await supabase.auth.updateUser({
        email: updates.email,
      });

      if (authError) {
        throw new Error(`Failed to update auth email: ${authError.message}`);
      }
    }

    return data;
  } catch (error: any) {
    console.error('Error updating profile:', error);
    throw error;
  }
}

/**
 * Delete old avatar from storage
 */
export async function deleteOldAvatar(storagePath: string): Promise<void> {
  try {
    const { error } = await supabase.storage
      .from('AgencyStorage')
      .remove([storagePath]);

    if (error) {
      console.warn('Failed to delete old avatar:', error.message);
      // Don't throw - this is not critical
    }
  } catch (error) {
    console.warn('Error deleting old avatar:', error);
    // Don't throw - this is not critical
  }
}

/**
 * Get signed URL for avatar (valid for 1 hour)
 */
export async function getAvatarSignedUrl(storagePath: string): Promise<string> {
  try {
    const { data, error } = await supabase.storage
      .from('AgencyStorage')
      .createSignedUrl(storagePath, 3600); // 1 hour

    if (error) {
      throw new Error(`Failed to create signed URL: ${error.message}`);
    }

    return data.signedUrl;
  } catch (error: any) {
    console.error('Error creating avatar signed URL:', error);
    throw error;
  }
}
