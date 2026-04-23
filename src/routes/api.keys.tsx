import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const createKeySchema = z.object({
  label: z.string().trim().min(1).max(64).default("Default"),
});

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomToken(bytes = 24): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function getUserFromAuthHeader(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: json({ error: "Unauthorized" }, 401), user: null };
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    return { error: json({ error: "Auth is not configured correctly." }, 500), user: null };
  }

  const authClient = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error,
  } = await authClient.auth.getUser(token);

  if (error || !user) {
    return {
      error: json({ error: "Your session expired. Please sign in again." }, 401),
      user: null,
    };
  }

  return { error: null, user };
}

export const Route = createFileRoute("/api/keys")({
  component: () => null,
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const { error, user } = await getUserFromAuthHeader(request);
          if (error || !user) return error;

          const { data, error: listError } = await supabaseAdmin
            .from("api_keys")
            .select(
              "id, label, key_prefix, monthly_limit, monthly_usage, period_start, last_used_at, created_at, revoked_at",
            )
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

          if (listError) return json({ error: listError.message }, 500);

          return json({ keys: data ?? [] }, 200);
        } catch (error) {
          console.error("API keys load failed", error);
          return json({ error: "Failed to load keys." }, 500);
        }
      },
      POST: async ({ request }) => {
        try {
          const { error, user } = await getUserFromAuthHeader(request);
          if (error || !user) return error;

          const body = await request.json().catch(() => ({}));
          const { label } = createKeySchema.parse(body);

          const { count, error: countError } = await supabaseAdmin
            .from("api_keys")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .is("revoked_at", null);

          if (countError) return json({ error: countError.message }, 500);
          if ((count ?? 0) >= 3) {
            return json({ error: "Maximum 3 active API keys per account." }, 400);
          }

          const rawKey = `lwk_live_${randomToken()}`;
          const keyPrefix = rawKey.slice(0, 16);
          const keyHash = await sha256Hex(rawKey);

          const { data, error: insertError } = await supabaseAdmin
            .from("api_keys")
            .insert({
              user_id: user.id,
              label,
              key_prefix: keyPrefix,
              key_hash: keyHash,
              monthly_limit: 20,
            })
            .select("id, label, key_prefix, monthly_limit, monthly_usage, period_start, last_used_at, created_at, revoked_at")
            .single();

          if (insertError) return json({ error: insertError.message }, 500);

          return json({ key: data, rawKey }, 200);
        } catch (error) {
          if (error instanceof z.ZodError) {
            return json({ error: error.issues[0]?.message ?? "Invalid key label." }, 400);
          }
          console.error("API key creation failed", error);
          return json({ error: "Failed to create key." }, 500);
        }
      },
    },
  },
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}