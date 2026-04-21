import { createServerFn } from "@tanstack/react-start";
import Stripe from "stripe";

export const createCheckout = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      name: string;
      amountCents: number;
      successUrl: string;
      cancelUrl: string;
    }) => {
      if (!input.name || typeof input.name !== "string") throw new Error("name required");
      if (!Number.isFinite(input.amountCents) || input.amountCents < 50)
        throw new Error("amountCents must be >= 50");
      if (!input.successUrl?.startsWith("http")) throw new Error("invalid successUrl");
      if (!input.cancelUrl?.startsWith("http")) throw new Error("invalid cancelUrl");
      return input;
    },
  )
  .handler(async ({ data }) => {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error(
        "STRIPE_SECRET_KEY is not configured. Add it via the Stripe integration settings.",
      );
    }
    const stripe = new Stripe(key);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: "usd",
            recurring: { interval: "month" },
            product_data: { name: data.name },
            unit_amount: data.amountCents,
          },
          quantity: 1,
        },
      ],
      success_url: data.successUrl,
      cancel_url: data.cancelUrl,
      allow_promotion_codes: true,
    });
    return { url: session.url };
  });
