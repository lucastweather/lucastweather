import { supabase } from "@/integrations/supabase/client";

type CheckoutInput = {
  tier: string;
  successUrl: string;
  cancelUrl: string;
};

type PortalInput = {
  returnUrl: string;
};

async function getAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Please sign in first.");
  }

  return session.access_token;
}

async function authedPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      typeof json?.error === "string" ? json.error : "Request failed.",
    );
  }

  return json as T;
}

export function createCheckout(data: { data: CheckoutInput }) {
  return authedPost<{ url: string | null }>("/api/checkout", data.data);
}

export function checkSubscription() {
  return authedPost<{ subscribed: boolean; tier: string | null; endsAt: string | null }>(
    "/api/subscription-check",
    {},
  );
}

export function customerPortal(data: { data: PortalInput }) {
  return authedPost<{ url: string | null }>("/api/billing-portal", data.data);
}
