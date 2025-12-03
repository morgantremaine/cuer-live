
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Delete team member function called');
    
    const { memberId, teamId } = await req.json()
    console.log('Request body:', { memberId, teamId });

    if (!memberId || !teamId) {
      console.error('Missing required fields:', { memberId, teamId });
      return new Response(
        JSON.stringify({ error: 'Missing required fields: memberId and teamId' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Create Supabase client with service role key for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get the current user from the auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('No authorization header found');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }

    // Create a client with user's auth token to verify they're admin
    const userSupabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: userError } = await userSupabase.auth.getUser()
    
    if (userError || !user) {
      console.error('Error getting user:', userError);
      return new Response(
        JSON.stringify({ error: 'Failed to get user information' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }

    console.log('Current user:', user.id);

    // Verify user is admin or manager of the team
    const { data: adminCheck, error: adminError } = await supabase.rpc(
      'is_team_admin_or_manager',
      { user_uuid: user.id, team_uuid: teamId }
    );

    if (adminError || !adminCheck) {
      console.error('User is not admin:', { adminError, adminCheck });
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        }
      )
    }

    // Call the database function to transfer data and clean up
    const { data: transferResult, error: transferError } = await supabase.rpc(
      'remove_team_member_with_transfer',
      {
        member_id: memberId,
        admin_id: user.id,
        team_id_param: teamId
      }
    );

    if (transferError) {
      console.error('Error in transfer function:', transferError);
      return new Response(
        JSON.stringify({ error: 'Failed to transfer data and remove member' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    if (transferResult?.error) {
      console.error('Transfer function returned error:', transferResult.error);
      return new Response(
        JSON.stringify({ error: transferResult.error }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    console.log('Transfer completed:', transferResult);

    // NOTE: We do NOT delete the user's auth account anymore
    // Users retain their personal team and can still access the system
    return new Response(
      JSON.stringify({
        success: true,
        rundownsTransferred: transferResult.rundowns_transferred || 0,
        blueprintsTransferred: transferResult.blueprints_transferred || 0,
        layoutsTransferred: transferResult.layouts_transferred || 0,
        customColumnsTransferred: transferResult.custom_columns_transferred || 0,
        userDeleted: false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in delete team member function:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: 'Failed to delete team member', details: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
