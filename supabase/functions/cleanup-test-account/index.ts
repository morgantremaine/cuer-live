import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { email } = await req.json()
    
    console.log(`Starting cleanup for email: ${email}`)

    if (!email || email !== 'cuertest@gmail.com') {
      return new Response(
        JSON.stringify({ error: 'Only cuertest@gmail.com can be cleaned up' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // First, find the user in auth.users
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (authError) {
      console.error('Error listing auth users:', authError)
      throw authError
    }

    const targetUser = authUsers.users.find(user => user.email === email)
    
    if (!targetUser) {
      console.log(`No user found with email: ${email}`)
      return new Response(
        JSON.stringify({ message: 'No user found with that email' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found user with ID: ${targetUser.id}`)

    const userId = targetUser.id

    // Get user's teams to clean up team data
    const { data: userTeams, error: teamsError } = await supabaseAdmin
      .from('team_members')
      .select('team_id, teams!inner(id, name)')
      .eq('user_id', userId)

    if (teamsError) {
      console.error('Error getting user teams:', teamsError)
    }

    let deletionSummary = {
      user_id: userId,
      email: email,
      teams_found: userTeams?.length || 0,
      rundowns_deleted: 0,
      blueprints_deleted: 0,
      teams_deleted: 0,
      subscriptions_deleted: 0,
      invitations_deleted: 0,
      other_data_deleted: 0
    }

    // 1. Delete rundowns
    const { data: deletedRundowns, error: rundownsError } = await supabaseAdmin
      .from('rundowns')
      .delete()
      .eq('user_id', userId)
      .select('id')

    if (rundownsError) {
      console.error('Error deleting rundowns:', rundownsError)
    } else {
      deletionSummary.rundowns_deleted = deletedRundowns?.length || 0
      console.log(`Deleted ${deletionSummary.rundowns_deleted} rundowns`)
    }

    // 2. Delete blueprints
    const { data: deletedBlueprints, error: blueprintsError } = await supabaseAdmin
      .from('blueprints')
      .delete()
      .eq('user_id', userId)
      .select('id')

    if (blueprintsError) {
      console.error('Error deleting blueprints:', blueprintsError)
    } else {
      deletionSummary.blueprints_deleted = deletedBlueprints?.length || 0
      console.log(`Deleted ${deletionSummary.blueprints_deleted} blueprints`)
    }

    // 3. Delete team invitations (both sent and received)
    const { data: deletedInvitations, error: invitationsError } = await supabaseAdmin
      .from('team_invitations')
      .delete()
      .or(`email.eq.${email},invited_by.eq.${userId}`)
      .select('id')

    if (invitationsError) {
      console.error('Error deleting invitations:', invitationsError)
    } else {
      deletionSummary.invitations_deleted = deletedInvitations?.length || 0
      console.log(`Deleted ${deletionSummary.invitations_deleted} invitations`)
    }

    // 4. Clean up other user-specific data
    const tablesToClean = [
      'user_column_preferences',
      'rundown_presence', 
      'user_rundown_zoom_preferences',
      'team_conversations',
      'app_notification_dismissals'
    ]

    for (const table of tablesToClean) {
      try {
        const { data, error } = await supabaseAdmin
          .from(table)
          .delete()
          .eq('user_id', userId)
          .select('id')

        if (error) {
          console.error(`Error deleting from ${table}:`, error)
        } else {
          const count = data?.length || 0
          deletionSummary.other_data_deleted += count
          if (count > 0) {
            console.log(`Deleted ${count} records from ${table}`)
          }
        }
      } catch (error) {
        console.error(`Error cleaning ${table}:`, error)
      }
    }

    // 5. Remove from team memberships
    const { error: membershipError } = await supabaseAdmin
      .from('team_members')
      .delete()
      .eq('user_id', userId)

    if (membershipError) {
      console.error('Error removing team memberships:', membershipError)
    } else {
      console.log('Removed team memberships')
    }

    // 6. Delete teams where user is the only member (personal teams)
    if (userTeams) {
      for (const teamMember of userTeams) {
        const teamId = teamMember.team_id
        
        // Check if there are other members in this team
        const { data: otherMembers, error: membersError } = await supabaseAdmin
          .from('team_members')
          .select('id')
          .eq('team_id', teamId)

        if (membersError) {
          console.error(`Error checking team ${teamId} members:`, membersError)
          continue
        }

        // If no other members, delete the team
        if (!otherMembers || otherMembers.length === 0) {
          const { error: teamDeleteError } = await supabaseAdmin
            .from('teams')
            .delete()
            .eq('id', teamId)

          if (teamDeleteError) {
            console.error(`Error deleting team ${teamId}:`, teamDeleteError)
          } else {
            deletionSummary.teams_deleted++
            console.log(`Deleted team ${teamId}`)
          }
        }
      }
    }

    // 7. Delete subscription data
    const { data: deletedSubscriptions, error: subscriptionError } = await supabaseAdmin
      .from('subscribers')
      .delete()
      .eq('email', email)
      .select('id')

    if (subscriptionError) {
      console.error('Error deleting subscription:', subscriptionError)
    } else {
      deletionSummary.subscriptions_deleted = deletedSubscriptions?.length || 0
      console.log(`Deleted ${deletionSummary.subscriptions_deleted} subscriptions`)
    }

    // 8. Delete profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (profileError) {
      console.error('Error deleting profile:', profileError)
    } else {
      console.log('Deleted profile')
    }

    // 9. Finally, delete the auth user
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authDeleteError) {
      console.error('Error deleting auth user:', authDeleteError)
      throw authDeleteError
    }

    console.log('Successfully deleted auth user')
    console.log('Cleanup summary:', deletionSummary)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully cleaned up account for ${email}`,
        summary: deletionSummary
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in cleanup-test-account:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})