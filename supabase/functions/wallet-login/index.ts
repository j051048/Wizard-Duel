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
    let isValid = false;
    try {
      // Validate signature using viem
      // If message is provided, verify against it.
      // If not provided (legacy call), we might fail or assume a default message if agreed upon.
      // Ideally, the frontend sends the message it signed.
      const msgToVerify = message || `Welcome to Wizard Duel!

Verify your wallet to enter the arena.

Timestamp: ${Date.now()}`; // WARNING: Timestamp check needs the exact string. If frontend uses dynamic timestamp, it MUST pass the message.
      
      // Since we updated frontend to pass 'message', we should use it.
      if (!message) {
         // If no message passed, we can't strictly verify if the content varies.
         // But for now, we'll try to verify.
         // If verification fails below, it throws.
      }

      isValid = await verifyMessage({
        address: address as `0x${string}`,
        message: msgToVerify, 
        signature: signature as `0x${string}`,
      });
    } catch (e) {
      console.error("Verification error:", e);
      throw new Error("Signature verification failed");
    }

    if (!isValid) {
      throw new Error("Invalid signature");
    }

    // 2. Initialize Supabase Admin Client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 3. User Management
    const email = `${address.toLowerCase()}@wizardduel.game`;
    const tempPassword = crypto.randomUUID() + crypto.randomUUID(); // Secure random password for this session
    
    let userId: string;

    // Check if profile exists with this wallet address
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('wallet_address', address.toLowerCase())
      .single();

    if (profile) {
      // User likely exists. Update password to allow sign-in.
      userId = profile.id;
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, { 
        password: tempPassword,
        user_metadata: { wallet_address: address.toLowerCase() } // Ensure metadata is synced
      });
      
      if (updateError) {
        // If update fails (e.g. user deleted but profile stuck?), we might need to handle edge cases.
        // But usually this works.
        console.error("Update user error:", updateError);
        throw new Error("Failed to update user credentials");
      }
    } else {
       // Profile not found via wallet_address.
       // Attempt to create new Auth User.
       const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
         email,
         password: tempPassword,
         email_confirm: true, // Auto confirm
         user_metadata: { wallet_address: address.toLowerCase() }
       });
       
       if (createError) {
         // If "Email already registered", it means the Auth User exists but Profile was not found by wallet_address.
         // This implies the Profile might exist but `wallet_address` column is null.
         // We need to find the user ID to link them.
         
         // Since we can't query Auth by email easily via API without `listUsers` (which is slow),
         // we might try to sign in with the OLD password? No, we don't know it.
         
         // Fallback strategy: 
         // If createUser fails, we can't easily recover the ID in this script without listUsers.
         // Let's assume for this MVP that if createUser fails, we try to find via listUsers (acceptable for low volume).
         
         const { data: usersResponse } = await supabaseAdmin.auth.admin.listUsers();
         const existingUser = usersResponse.users.find(u => u.email === email);
         
         if (existingUser) {
           userId = existingUser.id;
           // Update password
           await supabaseAdmin.auth.admin.updateUserById(userId, { password: tempPassword });
           
           // Create/Link Profile
           // Check if profile has ID
           const { data: p2 } = await supabaseAdmin.from('profiles').select('id').eq('id', userId).single();
           if (!p2) {
             await supabaseAdmin.from('profiles').insert({
                id: userId,
                wallet_address: address.toLowerCase(),
                username: `Wizard_${address.slice(0, 6)}`,
                gold: 100
             });
           } else {
             // Profile exists but wallet_address was null or wrong
             await supabaseAdmin.from('profiles').update({ wallet_address: address.toLowerCase() }).eq('id', userId);
           }
         } else {
            throw new Error("User creation failed and user not found");
         }
       } else {
         // New User Created Successfully
         userId = newUser.user.id;
         
         // Create Profile (if not handled by Database Trigger)
         // Ideally triggers handle this, but we explicitly set wallet_address
         const { error: profileError } = await supabaseAdmin.from('profiles').insert({
            id: userId,
            wallet_address: address.toLowerCase(),
            username: `Wizard_${address.slice(0, 6)}`,
            gold: 100
         });
         
         if (profileError) {
             // If trigger already created it, update it
             if (profileError.code === '23505') { // Unique violation on ID
                 await supabaseAdmin.from('profiles').update({ wallet_address: address.toLowerCase() }).eq('id', userId);
             } else {
                 console.error("Profile creation error:", profileError);
             }
         }
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
