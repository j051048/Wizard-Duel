// @ts-nocheck -- Deno imports cannot be resolved by the project's TypeScript config
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0";
import { verifyMessage } from "npm:viem";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { address, signature, message } = await req.json();

    if (!address || !signature) {
      throw new Error("Missing address or signature");
    }

    // 1. Verify signature
    const msgToVerify = message || `Welcome to Wizard Duel!\n\nVerify your wallet to enter the arena.\n\nTimestamp: ${Date.now()}`;

    const isValid = await verifyMessage({
      address: address as `0x${string}`,
      message: msgToVerify,
      signature: signature as `0x${string}`,
    });

    if (!isValid) {
      throw new Error("Invalid signature");
    }

    // 2. Init admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const email = `${address.toLowerCase()}@wizardduel.game`;
    const tempPassword = crypto.randomUUID() + crypto.randomUUID();
    let userId: string;

    // 3. Check if profile exists (fast path — O(1) lookup)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('wallet_address', address.toLowerCase())
      .single();

    if (profile) {
      // ── Returning user: fast path ──
      // Profile exists → we know the auth user ID → skip expensive operations
      userId = profile.id;
    } else {
      // ── New user or orphaned auth account ──
      // Try creating auth user. If email is taken, use listUsers with page_size=1 filter.
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { wallet_address: address.toLowerCase() },
      });

      if (newUser?.user) {
        // Brand new user created
        userId = newUser.user.id;
      } else {
        // Email already registered — find existing user ID
        // Use listUsers with page_size to minimize payload (still O(n) internally,
        // but returns only 1 page). For projects with <10k users this is acceptable.
        let foundUserId: string | null = null;
        let page = 1;
        const perPage = 1000;

        while (!foundUserId && page <= 10) {
          const { data: usersPage } = await supabaseAdmin.auth.admin.listUsers({
            page,
            perPage,
          });
          if (!usersPage?.users?.length) break;
          const match = usersPage.users.find(u => u.email === email);
          if (match) {
            foundUserId = match.id;
            break;
          }
          if (usersPage.users.length < perPage) break; // last page
          page++;
        }

        if (!foundUserId) {
          throw new Error("Could not create or find user account");
        }
        userId = foundUserId;
      }

      // Ensure profile row exists
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

    // 4. Rotate password + sign in (needed to get a fresh session token)
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: tempPassword,
      user_metadata: { wallet_address: address.toLowerCase() },
    });

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
