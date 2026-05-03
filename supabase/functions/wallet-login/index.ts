// @ts-nocheck -- Deno imports cannot be resolved by the project's TypeScript config
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0";
import { verifyMessage } from "npm:viem";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { address, signature, message } = await req.json();

    if (!address || !signature) {
      throw new Error("Missing address or signature");
    }

    // 1. Verify the signature
    const msgToVerify = message || `Welcome to Wizard Duel!\n\nVerify your wallet to enter the arena.\n\nTimestamp: ${Date.now()}`;

    const isValid = await verifyMessage({
      address: address as `0x${string}`,
      message: msgToVerify,
      signature: signature as `0x${string}`,
    });

    if (!isValid) {
      throw new Error("Invalid signature");
    }

    // 2. Initialize Supabase Admin Client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 3. User Management
    //    Email is deterministic from wallet address, so we can use it
    //    as the single source of truth instead of the slow listUsers() fallback.
    const email = `${address.toLowerCase()}@wizardduel.game`;
    const tempPassword = crypto.randomUUID() + crypto.randomUUID();

    let userId: string;

    // Try to find existing profile by wallet_address (fast path)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('wallet_address', address.toLowerCase())
      .single();

    if (profile) {
      // ── Returning user: profile found by wallet ──
      userId = profile.id;
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: tempPassword,
        user_metadata: { wallet_address: address.toLowerCase() },
      });
    } else {
      // ── New user OR returning user with null wallet_address ──
      //    Use generateLink to atomically create-or-find the Auth user.
      //    This replaces the old createUser + listUsers() fallback.
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'signup',
        email,
        password: tempPassword,
      });

      if (linkError) {
        // generateLink with type 'signup' returns the existing user if email is taken
        // but also returns an error. We can still use the user from the response.
        console.warn('generateLink warning (expected for existing users):', linkError.message);
      }

      if (linkData?.user) {
        userId = linkData.user.id;
      } else {
        // Extremely rare: generateLink completely failed.
        // Last resort: try signInWithPassword with a known password won't work.
        // Throw a clear error so the client can retry.
        throw new Error("Could not create or find user account");
      }

      // Update password (in case the user already existed with a different password)
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: tempPassword,
        user_metadata: { wallet_address: address.toLowerCase() },
      });

      // Ensure profile row exists and wallet_address is set
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();

      if (!existingProfile) {
        await supabaseAdmin.from('profiles').insert({
          id: userId,
          wallet_address: address.toLowerCase(),
          username: `Wizard_${address.slice(0, 6)}`,
          gold: 100,
        });
      } else {
        await supabaseAdmin
          .from('profiles')
          .update({ wallet_address: address.toLowerCase() })
          .eq('id', userId);
      }
    }

    // 4. Sign In to get Session
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password: tempPassword,
    });

    if (sessionError) throw sessionError;

    return new Response(
      JSON.stringify(sessionData),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (error) {
    console.error("Login Handler Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
