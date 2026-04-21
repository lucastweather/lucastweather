import { createFileRoute } from "@tanstack/react-router";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/billing-portal")({
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
          const returnUrl = typeof body?.returnUrl === "string" ? body.returnUrl : "";
          if (!returnUrl.startsWith("http")) {
            return json({ error: "Invalid return URL." }, 400);
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
          const customers = await stripe.customers.list({ email: user.email, limit: 1 });
          if (customers.data.length === 0) {
            return json({ error: "No billing account found yet." }, 404);
          }

          const portal = await stripe.billingPortal.sessions.create({
            customer: customers.data[0].id,
            return_url: returnUrl,
          });

          return json({ url: portal.url ?? null }, 200);
        } catch (error) {
          console.error("Billing portal session failed", error);
          return json({ error: "Could not open billing portal." }, 500);
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
