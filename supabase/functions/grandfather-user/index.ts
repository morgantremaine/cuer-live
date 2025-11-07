import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Verify request has authorization (anon key or service role)
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { email, tier = 'Premium' } = await req.json()

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user by email
    const { data: { users }, error: userError } = await supabaseAdmin.auth.admin.listUsers()
    const user = users?.find(u => u.email === email)

    if (!user || userError) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Determine max team members based on tier
    const maxTeamMembers = tier === 'Network' ? 25 : tier === 'Premium' ? 15 : 5

    // Update or insert subscriber record with service role
    const { data, error } = await supabaseAdmin
      .from('subscribers')
      .upsert({
        user_id: user.id,
        email: user.email,
        grandfathered: true,
        subscribed: true,
        subscription_tier: tier,
        max_team_members: maxTeamMembers,
        subscription_end: null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'email'
      })
      .select()
      .single()

    if (error) {
      console.error('Error updating subscriber:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully grandfathered ${email} to ${tier} tier`,
        subscriber: data
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in grandfather-user function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
