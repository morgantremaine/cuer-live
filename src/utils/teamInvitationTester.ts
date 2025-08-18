import { supabase } from '@/integrations/supabase/client';

export interface InvitationTestResult {
  step: string;
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

/**
 * Comprehensive test of the team invitation workflow
 */
export const testTeamInvitationWorkflow = async (
  testEmail: string,
  teamId: string
): Promise<InvitationTestResult[]> => {
  const results: InvitationTestResult[] = [];
  
  const addResult = (step: string, success: boolean, data?: any, error?: string) => {
    results.push({
      step,
      success,
      data,
      error,
      timestamp: new Date().toISOString()
    });
  };

  try {
    // Test 1: Check if team exists and user has admin access
    addResult('Starting workflow test', true);
    
    const { data: teamData, error: teamError } = await supabase
      .from('team_members')
      .select('team_id, role, teams!inner(name)')
      .eq('team_id', teamId)
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    if (teamError || !teamData) {
      addResult('Team access check', false, null, teamError?.message || 'No team access found');
      return results;
    }

    if (teamData.role !== 'admin') {
      addResult('Admin permission check', false, null, 'User is not an admin of this team');
      return results;
    }

    addResult('Team access verified', true, { teamName: (teamData.teams as any).name, role: teamData.role });

    // Test 2: Check subscription limits
    const { data: members } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', teamId);

    const { data: pendingInvites } = await supabase
      .from('team_invitations')
      .select('id')
      .eq('team_id', teamId)
      .eq('accepted', false)
      .gt('expires_at', new Date().toISOString());

    const currentUsage = (members?.length || 0) + (pendingInvites?.length || 0);
    addResult('Current team usage calculated', true, { 
      members: members?.length || 0, 
      pendingInvites: pendingInvites?.length || 0, 
      total: currentUsage 
    });

    // Test 3: Validate email
    const { validateInvitationEmail } = await import('./teamInvitationValidator');
    const emailValidation = validateInvitationEmail(testEmail);
    
    if (!emailValidation.isValid) {
      addResult('Email validation', false, null, emailValidation.error);
      return results;
    }
    
    addResult('Email validation', true);

    // Test 4: Check for existing membership
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', testEmail.toLowerCase())
      .maybeSingle();

    if (existingProfile) {
      const { data: existingMember } = await supabase
        .from('team_members')
        .select('id')
        .eq('user_id', existingProfile.id)
        .eq('team_id', teamId)
        .maybeSingle();

      if (existingMember) {
        addResult('Existing membership check', false, null, 'User is already a team member');
        return results;
      }
    }

    addResult('Membership duplication check', true);

    // Test 5: Check for pending invitations
    const { data: existingInvite } = await supabase
      .from('team_invitations')
      .select('id, expires_at')
      .eq('email', testEmail.toLowerCase())
      .eq('team_id', teamId)
      .eq('accepted', false)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (existingInvite) {
      addResult('Pending invitation check', false, null, 'Pending invitation already exists');
      return results;
    }

    addResult('Pending invitation check', true);

    // Test 6: Test edge function accessibility
    try {
      const { data: functionResponse, error: functionError } = await supabase.functions.invoke(
        'send-team-invitation',
        {
          body: {
            email: testEmail,
            teamId: teamId,
            inviterName: 'Test User',
            teamName: (teamData.teams as any).name,
            testMode: true // Add test mode to prevent actual email sending
          }
        }
      );

      if (functionError) {
        addResult('Edge function test', false, null, functionError.message);
      } else if (functionResponse?.error) {
        addResult('Edge function test', false, null, functionResponse.error);
      } else {
        addResult('Edge function test', true, functionResponse);
      }
    } catch (error) {
      addResult('Edge function test', false, null, `Function invocation failed: ${error}`);
    }

    // Test 7: Database function accessibility
    try {
      const { data: dbFunctionResult, error: dbFunctionError } = await supabase.rpc(
        'get_invitation_details_safe',
        { invitation_token: 'test-token-validation' }
      );

      if (dbFunctionError) {
        addResult('Database function test', false, null, dbFunctionError.message);
      } else {
        // Should return an error for invalid token, which is expected
        addResult('Database function test', true, { expectedError: dbFunctionResult?.error });
      }
    } catch (error) {
      addResult('Database function test', false, null, `DB function failed: ${error}`);
    }

    addResult('Workflow test completed', true);

  } catch (error) {
    addResult('Workflow test error', false, null, `Unexpected error: ${error}`);
  }

  return results;
};

/**
 * Test invitation token validation
 */
export const testInvitationTokenValidation = async (token: string): Promise<InvitationTestResult[]> => {
  const results: InvitationTestResult[] = [];
  
  const addResult = (step: string, success: boolean, data?: any, error?: string) => {
    results.push({
      step,
      success,
      data,
      error,
      timestamp: new Date().toISOString()
    });
  };

  try {
    addResult('Starting token validation test', true);

    // Test token format
    const { validateInvitationToken } = await import('./teamInvitationValidator');
    const tokenValidation = validateInvitationToken(token);
    
    addResult('Token format validation', tokenValidation.isValid, null, tokenValidation.error);

    if (!tokenValidation.isValid) {
      return results;
    }

    // Test database lookup
    const { data: invitationData, error: invitationError } = await supabase.rpc(
      'get_invitation_details_safe',
      { invitation_token: token }
    );

    if (invitationError) {
      addResult('Database token lookup', false, null, invitationError.message);
      return results;
    }

    if (invitationData?.error) {
      addResult('Token validity check', false, null, invitationData.error);
      return results;
    }

    addResult('Token validation successful', true, {
      email: invitationData?.invitation?.email,
      teamName: invitationData?.team?.name,
      inviterName: invitationData?.inviter?.full_name || invitationData?.inviter?.email
    });

  } catch (error) {
    addResult('Token validation error', false, null, `Unexpected error: ${error}`);
  }

  return results;
};

/**
 * Generate a detailed test report
 */
export const generateTestReport = (results: InvitationTestResult[]): string => {
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  let report = `Team Invitation Workflow Test Report\n`;
  report += `=====================================\n`;
  report += `Overall Success Rate: ${successCount}/${totalCount} (${Math.round(successCount/totalCount*100)}%)\n`;
  report += `Test Date: ${new Date().toISOString()}\n\n`;

  results.forEach((result, index) => {
    report += `${index + 1}. ${result.step}\n`;
    report += `   Status: ${result.success ? '✅ PASS' : '❌ FAIL'}\n`;
    
    if (result.error) {
      report += `   Error: ${result.error}\n`;
    }
    
    if (result.data) {
      report += `   Data: ${JSON.stringify(result.data, null, 2)}\n`;
    }
    
    report += `   Time: ${result.timestamp}\n\n`;
  });

  return report;
};