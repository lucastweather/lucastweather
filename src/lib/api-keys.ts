import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Generate a fresh developer API key. We hand the user a `lwk_live_<random>`
 * string they can paste into curl/SDKs. We only ever store a SHA-256 hash —
 * the raw key cannot be recovered after creation.
 */
async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomToken(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const createApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ label: z.string().min(1).max(64).default("Default") })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // Cap free users to 3 keys total
    const { count } = await supabaseAdmin
      .from("api_keys")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("revoked_at", null);

    if ((count ?? 0) >= 3) {
      throw new Error("Maximum 3 active API keys per account.");
    }

    const raw = `lwk_live_${randomToken(24)}`;
    const prefix = raw.slice(0, 16); // lwk_live_xxxxxxx (visible)
    const hash = await sha256Hex(raw);

    const { data: row, error } = await supabaseAdmin
      .from("api_keys")
      .insert({
        user_id: userId,
        label: data.label,
        key_prefix: prefix,
        key_hash: hash,
        monthly_limit: 20,
      })
      .select("id, label, key_prefix, monthly_limit, monthly_usage, created_at")
      .single();

    if (error) throw new Error(error.message);

    // Return raw key ONCE — the user must copy it now.
    return { key: row, rawKey: raw };
  });

export const listApiKeys = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("api_keys")
      .select(
        "id, label, key_prefix, monthly_limit, monthly_usage, period_start, last_used_at, created_at, revoked_at",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { keys: data ?? [] };
  });

export const revokeApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
