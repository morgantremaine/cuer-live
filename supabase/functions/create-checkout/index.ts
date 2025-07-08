import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tier configurations with Price IDs
const TIER_CONFIG = {
  'Producer': { 
    maxMembers: 2, 
    monthly: 'price_1RihsRCDuejYEwM0uxW8S9tP', 
    yearly: 'price_1RihtTCDuejYEwM0TSqVGjpG' 
  },
  'Show': { 
    maxMembers: 4, 
    monthly: 'price_1RihugCDuejYEwM0TdzaQlsx', 
    yearly: 'price_1RihvSCDuejYEwM0RykdDCs1' 
  },
  'Studio': { 
    maxMembers: 7, 
    monthly: 'price_1Rii29CDuejYEwM0YgMN0wXc', 
    yearly: 'price_1Rii7LCDuejYEwM07aYUWYm7' 
  },
  'Studio Plus': { 
    maxMembers: 10, 
    monthly: 'price_1Rii7kCDuejYEwM00tOymcu5', 
    yearly: 'price_1RiiGmCDuejYEwM0s0K9pEBQ' 
  },
  'Network': { 
    maxMembers: 25, 
    monthly: 'price_1RiiHzCDuejYEwM0GbBHczqJ', 
    yearly: 'price_1RiiIJCDuejYEwM0CjfEcdls' 
  }
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const { tier, interval } = await req.json();
    
    if (!tier || !interval || !TIER_CONFIG[tier as keyof typeof TIER_CONFIG]) {
      throw new Error("Invalid tier or interval provided");
    }

    if (interval !== 'monthly' && interval !== 'yearly') {
      throw new Error("Interval must be 'monthly' or 'yearly'");
    }

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email, tier, interval });

    const stripeKey = Deno.env.get("Stripe");
    if (!stripeKey) throw new Error("Stripe secret key is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    // Find or create customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id }
      });
      customerId = customer.id;
      logStep("Created new customer", { customerId });
    }

    // Get the correct price ID
    const tierConfig = TIER_CONFIG[tier as keyof typeof TIER_CONFIG];
    const priceId = interval === 'monthly' ? tierConfig.monthly : tierConfig.yearly;
    
    logStep("Creating checkout session", { tier, interval, priceId, maxMembers: tierConfig.maxMembers });

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${req.headers.get("origin")}/dashboard?subscription=success`,
      cancel_url: `${req.headers.get("origin")}/dashboard?subscription=cancelled`,
      metadata: {
        tier,
        max_team_members: tierConfig.maxMembers.toString(),
        user_id: user.id
      }
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-checkout", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});