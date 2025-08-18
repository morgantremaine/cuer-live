import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key for elevated permissions
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { memberId, teamId } = await req.json();

    if (!memberId || !teamId) {
      return new Response(
        JSON.stringify({ error: 'memberId and teamId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the current user from the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a client with the user's token to get user info
    const userToken = authHeader.replace('Bearer ', '');
    const userSupabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });

    // Get current user
    const { data: { user }, error: userError } = await userSupabase.auth.getUser(userToken);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid user token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin of the team
    const { data: adminMembership, error: adminError } = await supabase
      .from('team_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('team_id', teamId)
      .single();

    if (adminError || adminMembership?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Only team admins can remove members' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the member to be removed
    const { data: memberToRemove, error: memberError } = await supabase
      .from('team_members')
      .select('user_id, role')
      .eq('id', memberId)
      .eq('team_id', teamId)
      .single();

    if (memberError || !memberToRemove) {
      return new Response(
        JSON.stringify({ error: 'Team member not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent removing yourself
    if (memberToRemove.user_id === user.id) {
      return new Response(
        JSON.stringify({ error: 'You cannot remove yourself from the team' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use the database function for safe member removal with transfer
    const { data: result, error: removalError } = await supabase
      .rpc('remove_team_member_with_transfer', {
        member_id: memberId,
        admin_id: user.id,
        team_id_param: teamId
      });

    if (removalError) {
      console.error('Error removing team member:', removalError);
      return new Response(
        JSON.stringify({ error: 'Failed to remove team member' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (result?.error) {
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Team member removed successfully:', result);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Team member removed successfully',
        result
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in delete-team-member:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});