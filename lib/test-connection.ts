import { supabase } from './supabase';

/**
 * Test Supabase connection and database access
 */
export async function testSupabaseConnection() {
  try {
    console.log('🔍 Testing Supabase connection...');

    // Test 1: Check if client is initialized
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }
    console.log('✓ Supabase client initialized');

    // Test 2: Try to query the clients table
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .limit(5);

    if (clientsError) {
      console.error('✗ Error fetching clients:', clientsError);
      throw clientsError;
    }
    console.log('✓ Successfully fetched clients:', clients?.length || 0, 'records');

    // Test 3: Try to query the projects table
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*, clients(*)')
      .limit(5);

    if (projectsError) {
      console.error('✗ Error fetching projects:', projectsError);
      throw projectsError;
    }
    console.log('✓ Successfully fetched projects:', projects?.length || 0, 'records');

    // Test 4: Check authentication status
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError) {
      console.error('✗ Error checking auth session:', authError);
    } else {
      console.log('✓ Auth check complete:', session ? 'User is logged in' : 'No active session');
    }

    console.log('✅ Supabase connection test completed successfully!');

    return {
      success: true,
      clients,
      projects,
      hasSession: !!session,
    };
  } catch (error) {
    console.error('❌ Supabase connection test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
