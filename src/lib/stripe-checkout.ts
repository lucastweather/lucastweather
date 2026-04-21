import { createServerFn } from "@tanstack/react-start";
import Stripe from "stripe";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const createCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      tier: string;
      amountCents: number;
      successUrl: string;
      cancelUrl: string;
    }) => {
      if (!input.tier) throw new Error("tier required");
      if (!Number.isFinite(input.amountCents) || input.amountCents < 50)
        throw new Error("amountCents must be >= 50");
      if (!input.successUrl?.startsWith("http")) throw new Error("invalid successUrl");
      if (!input.cancelUrl?.startsWith("http")) throw new Error("invalid cancelUrl");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not configured.");
    }
    const stripe = new Stripe(key);
    const { userId } = context;
    const { data: userRes } = await context.supabase.auth.getUser();
    const email = userRes.user?.email;
    if (!email) throw new Error("user email unavailable");

    // Reuse existing customer if any
    const existing = await stripe.customers.list({ email, limit: 1 });
    const customerId = existing.data[0]?.id;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : email,
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: "usd",
            recurring: { interval: "month" },
            product_data: { name: `Lucast Weather ${data.tier}` },
            unit_amount: data.amountCents,
          },
          quantity: 1,
        },
      ],
      metadata: { user_id: userId, tier: data.tier },
      subscription_data: { metadata: { user_id: userId, tier: data.tier } },
      success_url: data.successUrl,
      cancel_url: data.cancelUrl,
      allow_promotion_codes: true,
    });
    return { url: session.url };
  });

export const checkSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return { subscribed: false, tier: null, endsAt: null };

    const stripe = new Stripe(key);
    const { userId } = context;
    const { data: userRes } = await context.supabase.auth.getUser();
    const email = userRes.user?.email;
    if (!email) return { subscribed: false, tier: null, endsAt: null };

    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length === 0) {
      await supabaseAdmin.from("subscribers").upsert(
        {
          user_id: userId,
          email,
          subscribed: false,
          subscription_tier: null,
          subscription_end: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      return { subscribed: false, tier: null, endsAt: null };
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

    await supabaseAdmin.from("subscribers").upsert(
      {
        user_id: userId,
        email,
        stripe_customer_id: customerId,
        subscribed: !!active,
        subscription_tier: tier,
        subscription_end: endsAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    return { subscribed: !!active, tier, endsAt };
  });

export const customerPortal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { returnUrl: string }) => {
    if (!input.returnUrl?.startsWith("http")) throw new Error("invalid returnUrl");
    return input;
  })
  .handler(async ({ data, context }) => {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not configured.");
    const stripe = new Stripe(key);
    const { data: userRes } = await context.supabase.auth.getUser();
    const email = userRes.user?.email;
    if (!email) throw new Error("user email unavailable");
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length === 0) throw new Error("No Stripe customer found");
    const portal = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: data.returnUrl,
    });
    return { url: portal.url };
  });
