import { createFileRoute } from "@tanstack/react-router";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/checkout")({
  component: () => null,
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authHeader = request.headers.get("authorization");
          if (!authHeader?.startsWith("Bearer ")) {
            return json({ error: "Unauthorized" }, 401);
          }

          const body = await request.json().catch(() => null);
          const tier = typeof body?.tier === "string" ? body.tier : "";
          const successUrl = typeof body?.successUrl === "string" ? body.successUrl : "";
          const cancelUrl = typeof body?.cancelUrl === "string" ? body.cancelUrl : "";

          if (!tier || !successUrl.startsWith("http") || !cancelUrl.startsWith("http")) {
            return json({ error: "Invalid checkout payload." }, 400);
          }

          const PRICES: Record<string, number> = {
            Pro: 300,
            "Pro+": 900,
            Enterprise: 9900,
          };
          const amountCents = PRICES[tier];
          if (!amountCents) {
            return json({ error: "Unknown subscription tier." }, 400);
          }

          const supabaseUrl = process.env.SUPABASE_URL;
          const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
          const stripeKey = process.env.STRIPE_SECRET_KEY;

          if (!supabaseUrl || !publishableKey || !stripeKey) {
            return json({ error: "Billing is not configured correctly." }, 500);
          }

          const supabase = createClient(supabaseUrl, publishableKey, {
            auth: { persistSession: false, autoRefreshToken: false },
          });
          const token = authHeader.replace("Bearer ", "");
          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser(token);

          if (userError || !user?.email) {
            return json({ error: "Your session expired. Please sign in again." }, 401);
          }

          const stripe = new Stripe(stripeKey);
          const existing = await stripe.customers.list({ email: user.email, limit: 1 });
          const customerId = existing.data[0]?.id;

          const session = await stripe.checkout.sessions.create({
            customer: customerId,
            customer_email: customerId ? undefined : user.email,
            mode: "subscription",
            line_items: [
              {
                price_data: {
                  currency: "usd",
                  recurring: { interval: "month" },
                  product_data: { name: `Lucast Weather ${tier}` },
                  unit_amount: amountCents,
                },
                quantity: 1,
              },
            ],
            metadata: { user_id: user.id, tier },
            subscription_data: { metadata: { user_id: user.id, tier } },
            success_url: successUrl,
            cancel_url: cancelUrl,
            allow_promotion_codes: true,
          });

          return json({ url: session.url ?? null }, 200);
        } catch (error) {
          console.error("Checkout session creation failed", error);
          return json({ error: "Could not start checkout." }, 500);
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
