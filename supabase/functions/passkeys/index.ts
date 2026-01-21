import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "npm:@simplewebauthn/server@8.4.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("SUPABASE_PROJECT_URL") || "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const rpId = Deno.env.get("PASSKEY_RP_ID") || new URL(supabaseUrl).hostname;
const origin = Deno.env.get("PASSKEY_ORIGIN") || `https://${rpId}`;
const rpName = Deno.env.get("PASSKEY_RP_NAME") || "Hometasks";
const challengeTtlMs = 10 * 60 * 1000;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const base64Url = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

const toArrayBuffer = (b64url: string): Uint8Array => {
  const base64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

async function getUserFromAuth(header: string) {
  const { data, error } = await supabaseAdmin.auth.getUser(header.replace("Bearer ", ""));
  if (error || !data?.user) throw new Error("Auth error");
  return data.user;
}

async function saveChallenge(userId: string, challenge: string, type: "registration" | "auth") {
  const expiresAt = new Date(Date.now() + challengeTtlMs).toISOString();
  await supabaseAdmin.from("user_passkey_challenges").upsert({
    user_id: userId,
    challenge,
    type,
    expires_at: expiresAt,
  });
}

async function getChallenge(userId: string, type: "registration" | "auth"): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("user_passkey_challenges")
    .select("challenge, expires_at")
    .eq("user_id", userId)
    .eq("type", type)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("challenge fetch error", error);
    return null;
  }
  if (!data) return null;
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) return null;
  return data.challenge as string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  try {
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ message: "Config error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ message: "No auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user = await getUserFromAuth(authHeader);
    const body = await req.json();
    const action = body?.action;

    if (action === "start-registration") {
      const { data: existingCreds } = await supabaseAdmin
        .from("user_passkeys")
        .select("cred_id")
        .eq("user_id", user.id);

      const options = await generateRegistrationOptions({
        rpName,
        rpID: rpId,
        userName: user.email || user.id,
        userDisplayName: user.email || user.id,
        userID: new TextEncoder().encode(user.id),
        attestationType: "none",
        authenticatorSelection: {
          residentKey: "preferred",
          userVerification: "preferred",
          authenticatorAttachment: "platform",
        },
        excludeCredentials: (existingCreds || []).map((c) => ({
          id: toArrayBuffer(c.cred_id),
          type: "public-key" as const,
        })),
      });

      await saveChallenge(user.id, options.challenge, "registration");

      // Convert buffers to base64url for the client
      const responseOptions = {
        ...options,
        challenge: options.challenge,
        user: {
          ...options.user,
          id: base64Url(options.user.id as ArrayBuffer),
        },
        excludeCredentials: options.excludeCredentials?.map((c) => ({
          ...c,
          id: base64Url(c.id as ArrayBuffer),
        })),
      };

      return new Response(JSON.stringify({ options: responseOptions }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "finish-registration") {
      const expectedChallenge = await getChallenge(user.id, "registration");
      if (!expectedChallenge) {
        return new Response(JSON.stringify({ message: "Challenge caducado" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const verification = await verifyRegistrationResponse({
        response: body.credential,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpId,
      });

      if (!verification.verified || !verification.registrationInfo) {
        return new Response(JSON.stringify({ success: false, message: "Registro no verificado" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;
      const nickname = body.credential?.nickname || "device";

      const { error } = await supabaseAdmin.from("user_passkeys").upsert({
        user_id: user.id,
        cred_id: base64Url(credentialID),
        public_key: base64Url(credentialPublicKey),
        counter,
        transports: body.credential?.transports || null,
        nickname,
      });
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "start-auth") {
      const { data: creds } = await supabaseAdmin
        .from("user_passkeys")
        .select("cred_id, transports")
        .eq("user_id", user.id);

      if (!creds || creds.length === 0) {
        return new Response(JSON.stringify({ message: "Sin passkeys" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const options = await generateAuthenticationOptions({
        rpID: rpId,
        userVerification: "preferred",
        allowCredentials: creds.map((c) => ({
          id: toArrayBuffer(c.cred_id),
          type: "public-key" as const,
          transports: c.transports || undefined,
        })),
      });

      await saveChallenge(user.id, options.challenge, "auth");

      const responseOptions = {
        ...options,
        challenge: options.challenge,
        allowCredentials: options.allowCredentials?.map((c) => ({
          ...c,
          id: base64Url(c.id as ArrayBuffer),
        })),
      };

      return new Response(JSON.stringify({ options: responseOptions }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "finish-auth") {
      const expectedChallenge = await getChallenge(user.id, "auth");
      if (!expectedChallenge) {
        return new Response(JSON.stringify({ message: "Challenge caducado" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const credId = body?.credential?.id;
      if (!credId) {
        return new Response(JSON.stringify({ message: "Credencial faltante" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: cred, error: credError } = await supabaseAdmin
        .from("user_passkeys")
        .select("*")
        .eq("user_id", user.id)
        .eq("cred_id", credId)
        .maybeSingle();
      if (credError || !cred) {
        return new Response(JSON.stringify({ message: "Credencial no encontrada" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const verification = await verifyAuthenticationResponse({
        response: body.credential,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpId,
        authenticator: {
          credentialID: toArrayBuffer(cred.cred_id),
          credentialPublicKey: toArrayBuffer(cred.public_key),
          counter: cred.counter || 0,
          transports: cred.transports || undefined,
        },
      });

      if (!verification.verified || !verification.authenticationInfo) {
        return new Response(JSON.stringify({ success: false, message: "Autenticación no verificada" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { newCounter } = verification.authenticationInfo;
      const { error } = await supabaseAdmin
        .from("user_passkeys")
        .update({ counter: newCounter })
        .eq("user_id", user.id)
        .eq("cred_id", cred.cred_id);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ message: "Acción no soportada" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("passkeys error", err);
    return new Response(JSON.stringify({ message: "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

