import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const revokeSchema = z.object({ id: z.string().uuid() });

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

export const Route = createFileRoute("/api/keys/revoke")({
  component: () => null,
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { error, user } = await getUserFromAuthHeader(request);
          if (error || !user) return error;

          const body = await request.json().catch(() => ({}));
          const { id } = revokeSchema.parse(body);

          const { error: revokeError } = await supabaseAdmin
            .from("api_keys")
            .update({ revoked_at: new Date().toISOString() })
            .eq("id", id)
            .eq("user_id", user.id);

          if (revokeError) return json({ error: revokeError.message }, 500);

          return json({ ok: true }, 200);
        } catch (error) {
          if (error instanceof z.ZodError) {
            return json({ error: error.issues[0]?.message ?? "Invalid key id." }, 400);
          }
          console.error("API key revoke failed", error);
          return json({ error: "Failed to revoke key." }, 500);
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