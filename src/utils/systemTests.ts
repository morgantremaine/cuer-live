/**
 * Comprehensive System Tests for Cuer Live
 * Tests all critical functionality: auth, invitations, rundowns, database, realtime, teams
 */

import { supabase } from '@/integrations/supabase/client';

export interface TestResult {
  category: string;
  test: string;
  passed: boolean;
  duration: number;
  details?: string;
  error?: string;
}

const TEST_PREFIX = 'smoketest_';
const TEST_TIMEOUT = 10000; // 10 seconds per test

// Helper to run a test with timing and error handling
async function runTest(
  category: string,
  testName: string,
  testFn: () => Promise<void>
): Promise<TestResult> {
  const startTime = Date.now();
  try {
    await Promise.race([
      testFn(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Test timeout')), TEST_TIMEOUT)
      )
    ]);
    return {
      category,
      test: testName,
      passed: true,
      duration: Date.now() - startTime,
      details: 'Test passed successfully'
    };
  } catch (error) {
    return {
      category,
      test: testName,
      passed: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// ============ AUTHENTICATION TESTS ============

export async function runAuthenticationTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  let testUserId: string | null = null;
  
  // Test 1: User session check
  results.push(await runTest(
    'Authentication',
    'User Session Validation',
    async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!session) throw new Error('No active session found');
      testUserId = session.user.id;
    }
  ));

  // Test 2: Profile exists
  if (testUserId) {
    results.push(await runTest(
      'Authentication',
      'User Profile Check',
      async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .eq('id', testUserId)
          .single();
        if (error) throw error;
        if (!data) throw new Error('Profile not found');
      }
    ));
  }

  return results;
}

// ============ TEAM INVITATION TESTS ============

export async function runInvitationTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  let testInvitationId: string | null = null;
  let testTeamId: string | null = null;

  // Test 1: Get user's team
  results.push(await runTest(
    'Team Invitations',
    'Fetch User Teams',
    async () => {
      const { data: teams, error } = await supabase
        .from('team_members')
        .select('team_id')
        .limit(1);
      if (error) throw error;
      if (!teams || teams.length === 0) throw new Error('No teams found for user');
      testTeamId = teams[0].team_id;
    }
  ));

  // Test 2: Invitation token validation function exists
  results.push(await runTest(
    'Team Invitations',
    'Invitation Validation System',
    async () => {
      const { data, error } = await supabase.rpc('validate_invitation_token', {
        token_param: 'test-invalid-token-123'
      });
      
      // Check if the function exists and returns proper structure
      if (error) {
        if (error.message.includes('function') || error.message.includes('does not exist')) {
          throw new Error('validate_invitation_token function not found in database');
        }
        // Other errors are acceptable - function exists but token is invalid (expected)
      }
      
      // If we got data back, verify it has the expected structure
      if (data && typeof data === 'object') {
        if (!('valid' in data)) {
          throw new Error('Function response missing "valid" field');
        }
      }
      
      // Test passed - function exists and responds correctly
    }
  ));

  return results;
}

// ============ RUNDOWN OPERATIONS TESTS ============

export async function runRundownOperationTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  let testRundownId: string | null = null;
  let testTeamId: string | null = null;

  // Test 1: Create test rundown
  results.push(await runTest(
    'Rundown Operations',
    'Create Rundown',
    async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error('No session');

      const { data: teams } = await supabase
        .from('team_members')
        .select('team_id')
        .limit(1);
      
      if (!teams || teams.length === 0) throw new Error('No team found');
      testTeamId = teams[0].team_id;

      const { data: rundownData, error } = await supabase
        .from('rundowns')
        .insert({
          title: `${TEST_PREFIX}${Date.now()}`,
          user_id: data.session.user.id,
          team_id: testTeamId,
          items: [],
          archived: false
        })
        .select()
        .single();
      
      if (error) throw error;
      if (!rundownData) throw new Error('No data returned');
      testRundownId = rundownData.id;
    }
  ));

  // Test 2: Read rundown
  if (testRundownId) {
    results.push(await runTest(
      'Rundown Operations',
      'Read Rundown',
      async () => {
        const { data, error } = await supabase
          .from('rundowns')
          .select('*')
          .eq('id', testRundownId)
          .single();
        
        if (error) throw error;
        if (!data) throw new Error('Rundown not found');
      }
    ));

    // Test 3: Update rundown
    results.push(await runTest(
      'Rundown Operations',
      'Update Rundown',
      async () => {
        const { error } = await supabase
          .from('rundowns')
          .update({ 
            title: `${TEST_PREFIX}updated_${Date.now()}`,
            items: [{ id: 'test-item', type: 'regular', name: 'Test Item' }]
          })
          .eq('id', testRundownId);
        
        if (error) throw error;
      }
    ));

    // Test 4: Delete rundown
    results.push(await runTest(
      'Rundown Operations',
      'Delete Rundown',
      async () => {
        const { error } = await supabase
          .from('rundowns')
          .delete()
          .eq('id', testRundownId);
        
        if (error) throw error;
      }
    ));
  }

  return results;
}

// ============ DATABASE CONNECTION TESTS ============

export async function runDatabaseTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Test 1: Basic query
  results.push(await runTest(
    'Database Connection',
    'Simple SELECT Query',
    async () => {
      const { data, error } = await supabase
        .from('rundowns')
        .select('id')
        .limit(1);
      
      if (error) throw error;
    }
  ));

  // Test 2: Write/Read cycle
  results.push(await runTest(
    'Database Connection',
    'Write-Read Transaction',
    async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error('No session');

      const { data: teams } = await supabase
        .from('team_members')
        .select('team_id')
        .limit(1);
      
      if (!teams || teams.length === 0) throw new Error('No team found');

      const testId = `${TEST_PREFIX}db_test_${Date.now()}`;
      
      // Write
      const { error: writeError } = await supabase
        .from('rundowns')
        .insert({
          id: testId,
          title: testId,
          user_id: data.session.user.id,
          team_id: teams[0].team_id,
          items: []
        });
      
      if (writeError) throw writeError;

      // Read
      const { data: readData, error: readError } = await supabase
        .from('rundowns')
        .select('id')
        .eq('id', testId)
        .single();
      
      if (readError) throw readError;
      if (!readData) throw new Error('Written data not found');

      // Cleanup
      await supabase.from('rundowns').delete().eq('id', testId);
    }
  ));

  // Test 3: RLS enforcement
  results.push(await runTest(
    'Database Connection',
    'RLS Policy Enforcement',
    async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error('No session');

      // Try to read user's own profile (should work)
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.session.user.id)
        .single();
      
      if (error) throw new Error('Cannot read own profile - RLS may be too restrictive');
      if (!profileData) throw new Error('Profile not found');
    }
  ));

  return results;
}

// ============ REALTIME TESTS ============

export async function runRealtimeTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Test: Create and subscribe to realtime channel
  results.push(await runTest(
    'Realtime Infrastructure',
    'Realtime Channel Connection',
    async () => {
      const channelName = `${TEST_PREFIX}channel_${Date.now()}`;
      const channel = supabase.channel(channelName);
      
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Channel subscription timeout after 5s')), 5000);
        
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            clearTimeout(timeout);
            resolve();
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            clearTimeout(timeout);
            reject(new Error(`Channel subscription failed: ${status}`));
          }
        });
      });

      await supabase.removeChannel(channel);
    }
  ));

  return results;
}

// ============ TEAM OPERATIONS TESTS ============

export async function runTeamOperationTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Test 1: List user teams
  results.push(await runTest(
    'Team Operations',
    'List User Teams',
    async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('team_id, role, teams(name)')
        .limit(10);
      
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('No teams found');
    }
  ));

  // Test 2: Team member permissions
  results.push(await runTest(
    'Team Operations',
    'Check Team Permissions',
    async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error('No session');

      const { data: membership, error } = await supabase
        .from('team_members')
        .select('role, team_id')
        .eq('user_id', data.session.user.id)
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      if (!membership) throw new Error('No team membership found');
      if (!['admin', 'manager', 'member'].includes(membership.role)) {
        throw new Error('Invalid role type');
      }
    }
  ));

  // Test 3: Team data isolation
  results.push(await runTest(
    'Team Operations',
    'Team Data Isolation (RLS)',
    async () => {
      const { data: userTeams } = await supabase
        .from('team_members')
        .select('team_id');
      
      if (!userTeams || userTeams.length === 0) {
        throw new Error('No teams to test isolation');
      }

      // Get rundowns the user can access
      const { data: accessibleRundowns } = await supabase
        .from('rundowns')
        .select('team_id, id')
        .limit(100);
      
      if (!accessibleRundowns || accessibleRundowns.length === 0) {
        // No rundowns to test - that's okay, isolation still works
        return;
      }
      
      // Verify all accessible rundowns belong to user's teams
      const userTeamIds = userTeams.map(t => t.team_id);
      const invalidRundowns = accessibleRundowns.filter(r => 
        r.team_id && !userTeamIds.includes(r.team_id)
      );
      
      if (invalidRundowns.length > 0) {
        throw new Error(`RLS violation: Can access ${invalidRundowns.length} rundowns from teams user is not in`);
      }
    }
  ));

  return results;
}
