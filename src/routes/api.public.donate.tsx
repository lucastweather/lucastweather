import { createFileRoute } from "@tanstack/react-router";
import Stripe from "stripe";

/**
 * POST /api/public/donate — creates a one-time Stripe Checkout session for a
 * supporter donation. Public by design (donations don't require an account);
 * the amount is validated and clamped server-side.
 */
export const Route = createFileRoute("/api/public/donate")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }),
      POST: async ({ request }) => {
        try {
          const body = (await request.json().catch(() => null)) as {
            amount?: unknown;
            name?: unknown;
            message?: unknown;
            successUrl?: unknown;
            cancelUrl?: unknown;
            recurring?: unknown;
          } | null;

          const amount = Number(body?.amount);
          if (!Number.isFinite(amount) || amount < 1 || amount > 5000) {
            return json({ error: "Enter a donation amount between $1 and $5,000." }, 400);
          }

          const successUrl = typeof body?.successUrl === "string" ? body.successUrl : "";
          const cancelUrl = typeof body?.cancelUrl === "string" ? body.cancelUrl : "";
          if (!successUrl.startsWith("http") || !cancelUrl.startsWith("http")) {
            return json({ error: "Invalid return URLs." }, 400);
          }

          const name =
            typeof body?.name === "string" ? body.name.trim().slice(0, 80) : "";
          const message =
            typeof body?.message === "string" ? body.message.trim().slice(0, 300) : "";
          const recurring = body?.recurring === true;

          const stripeKey = process.env['STRIPE_SECRET_KEY'];
          if (!stripeKey) {
            return json({ error: "Donations are not configured yet." }, 500);
          }

          const stripe = new Stripe(stripeKey);
          const unitAmount = Math.round(amount * 100);

          const session = await stripe.checkout.sessions.create({
            mode: recurring ? "subscription" : "payment",
            line_items: [
              {
                price_data: {
                  currency: "usd",
                  ...(recurring ? { recurring: { interval: "month" as const } } : {}),
                  product_data: {
                    name: recurring
                      ? "Monthly support for Lucast Weather"
                      : "Donation to Lucast Weather",
                    description: "Helps keep Lucast Weather free, fast, and ad-light.",
                  },
                  unit_amount: unitAmount,
                },
                quantity: 1,
              },
            ],
            metadata: {
              kind: "donation",
              donor_name: name,
              donor_message: message,
            },
            success_url: successUrl,
            cancel_url: cancelUrl,
            submit_type: recurring ? undefined : "donate",
          });

          return json({ url: session.url ?? null }, 200);
        } catch (error) {
          console.error("Donation checkout failed", error);
          return json({ error: "Could not start the donation checkout." }, 500);
        }
      },
    },
  },
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
