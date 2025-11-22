import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Helper logging function for enhanced debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Tier configurations with team member limits - Updated for new structure  
const TIER_CONFIG = {
  'Pro': { maxMembers: 3, monthly: 'price_1S73RiCDuejYEwM0nEisV7YU', yearly: 'price_1S73SBCDuejYEwM07oTh5oDW' },
  'Premium': { maxMembers: 15, monthly: 'price_1S73MoCDuejYEwM0MqlcIpEc', yearly: 'price_1S73OnCDuejYEwM0AEykNo4T' },
  'Enterprise': { maxMembers: 25 }
  // Enterprise is contact-only, no Stripe pricing
};

// Get tier from price ID
const getTierFromPriceId = (priceId: string): string | null => {
  for (const [tierName, config] of Object.entries(TIER_CONFIG)) {
    if (config.monthly === priceId || config.yearly === priceId) {
      return tierName;
    }
  }
  return null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Use the service role key to perform writes (upsert) in Supabase
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    logStep("Authenticating user with token");
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) {
      logStep("Authentication error", { error: userError.message });
      // Return 401 for authentication errors instead of 500
      return new Response(JSON.stringify({ error: "Invalid or expired session" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    const user = userData.user;
    if (!user?.email) {
      logStep("User not authenticated or email not available");
      return new Response(JSON.stringify({ error: "Invalid or expired session" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check for existing grandfathered subscription first
    const { data: existingSubscriber } = await supabaseClient
      .from('subscribers')
      .select('*')
      .eq('email', user.email)
      .eq('grandfathered', true)
      .maybeSingle();

    if (existingSubscriber) {
      logStep("Found grandfathered subscription", { 
        tier: existingSubscriber.subscription_tier, 
        maxMembers: existingSubscriber.max_team_members 
      });
      return new Response(JSON.stringify({
        subscribed: true,
        subscription_tier: existingSubscriber.subscription_tier,
        max_team_members: existingSubscriber.max_team_members,
        subscription_end: null, // Grandfathered accounts don't expire
        grandfathered: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripeKey = Deno.env.get("Stripe");
    if (!stripeKey) throw new Error("Stripe secret key is not set");
    logStep("Stripe key verified");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, updating unsubscribed state");
      await supabaseClient.from("subscribers").upsert({
        email: user.email,
        user_id: user.id,
        stripe_customer_id: null,
        subscribed: false,
        subscription_tier: null,
        max_team_members: 1,
        subscription_end: null,
        grandfathered: false,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'email' });
      return new Response(JSON.stringify({ 
        subscribed: false, 
        subscription_tier: null,
        max_team_members: 1,
        subscription_end: null,
        grandfathered: false
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    const hasActiveSub = subscriptions.data.length > 0;
    let subscriptionTier = null;
    let maxTeamMembers = 1;
    let subscriptionEnd = null;
    let stripeSubscriptionId = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      stripeSubscriptionId = subscription.id;
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      logStep("Active subscription found", { subscriptionId: subscription.id, endDate: subscriptionEnd });
      
      // Get tier from price ID
      const priceId = subscription.items.data[0].price.id;
      subscriptionTier = getTierFromPriceId(priceId);
      
      if (subscriptionTier && TIER_CONFIG[subscriptionTier as keyof typeof TIER_CONFIG]) {
        maxTeamMembers = TIER_CONFIG[subscriptionTier as keyof typeof TIER_CONFIG].maxMembers;
      }
      
      logStep("Determined subscription tier", { priceId, subscriptionTier, maxTeamMembers });
    } else {
      logStep("No active subscription found");
    }

    await supabaseClient.from("subscribers").upsert({
      email: user.email,
      user_id: user.id,
      stripe_customer_id: customerId,
      subscribed: hasActiveSub,
      subscription_tier: subscriptionTier,
      max_team_members: maxTeamMembers,
      subscription_end: subscriptionEnd,
      stripe_subscription_id: stripeSubscriptionId,
      grandfathered: false,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'email' });

    logStep("Updated database with subscription info", { 
      subscribed: hasActiveSub, 
      subscriptionTier, 
      maxTeamMembers,
      grandfathered: false
    });
    
    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      subscription_tier: subscriptionTier,
      max_team_members: maxTeamMembers,
      subscription_end: subscriptionEnd,
      grandfathered: false
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});