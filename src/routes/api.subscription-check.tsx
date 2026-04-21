import { createFileRoute } from "@tanstack/react-router";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/subscription-check")({
  component: () => null,
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authHeader = request.headers.get("authorization");
          if (!authHeader?.startsWith("Bearer ")) {
            return json({ error: "Unauthorized" }, 401);
          }

          const supabaseUrl = process.env.SUPABASE_URL;
          const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
          const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
          const stripeKey = process.env.STRIPE_SECRET_KEY;

          if (!supabaseUrl || !publishableKey || !serviceRoleKey || !stripeKey) {
            return json({ error: "Billing is not configured correctly." }, 500);
          }

          const authClient = createClient(supabaseUrl, publishableKey, {
            auth: { persistSession: false, autoRefreshToken: false },
          });
          const admin = createClient(supabaseUrl, serviceRoleKey, {
            auth: { persistSession: false, autoRefreshToken: false },
          });

          const token = authHeader.replace("Bearer ", "");
          const {
            data: { user },
            error: userError,
          } = await authClient.auth.getUser(token);

          if (userError || !user?.email) {
            return json({ error: "Your session expired. Please sign in again." }, 401);
          }

          const stripe = new Stripe(stripeKey);
          const customers = await stripe.customers.list({ email: user.email, limit: 1 });

          if (customers.data.length === 0) {
            await admin.from("subscribers").upsert(
              {
                user_id: user.id,
                email: user.email,
                subscribed: false,
                subscription_tier: null,
                subscription_end: null,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "user_id" },
            );

            return json({ subscribed: false, tier: null, endsAt: null }, 200);
          }

          const customerId = customers.data[0].id;
          const subs = await stripe.subscriptions.list({
            customer: customerId,
            status: "active",
            limit: 1,
          });

          const active = subs.data[0];
          const tier = active?.metadata?.tier ?? null;
          const endsAt = active
            ? new Date(active.items.data[0].current_period_end * 1000).toISOString()
            : null;

          await admin.from("subscribers").upsert(
            {
              user_id: user.id,
              email: user.email,
              stripe_customer_id: customerId,
              subscribed: !!active,
              subscription_tier: tier,
              subscription_end: endsAt,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" },
          );

          return json({ subscribed: !!active, tier, endsAt }, 200);
        } catch (error) {
          console.error("Subscription refresh failed", error);
          return json({ error: "Could not refresh subscription." }, 500);
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
