import { useEffect, useState, useCallback } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type SubState = {
  subscribed: boolean;
  tier: string | null;
  endsAt: string | null;
  loading: boolean;
};

const subListeners = new Set<(s: SubState) => void>();
let subState: SubState = { subscribed: false, tier: null, endsAt: null, loading: false };

function setSubState(next: SubState) {
  subState = next;
  subListeners.forEach((l) => l(next));
}

async function refreshSubscription() {
  let session: Session | null = null;
  try {
    session = (await supabase.auth.getSession()).data.session;
  } catch {
    setSubState({ subscribed: false, tier: null, endsAt: null, loading: false });
    return;
  }

  if (!session) {
    setSubState({ subscribed: false, tier: null, endsAt: null, loading: false });
    return;
  }
  setSubState({ ...subState, loading: true });
  try {
    const { data, error } = await supabase
      .from("subscribers")
      .select("subscribed, subscription_tier, subscription_end")
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (error) throw error;
    const now = Date.now();
    const ends = data?.subscription_end ? new Date(data.subscription_end).getTime() : 0;
    const active = !!data?.subscribed && (ends === 0 || ends > now);
    setSubState({
      subscribed: active,
      tier: data?.subscription_tier ?? null,
      endsAt: data?.subscription_end ?? null,
      loading: false,
    });
  } catch {
    setSubState({ subscribed: false, tier: null, endsAt: null, loading: false });
  }
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setTimeout(() => refreshSubscription(), 0);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setReady(true);
      refreshSubscription();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return { session, user, ready, signOut };
}

export function useSubscription() {
  const [s, setS] = useState<SubState>(subState);
  useEffect(() => {
    subListeners.add(setS);
    return () => {
      subListeners.delete(setS);
    };
  }, []);
  return { ...s, refresh: refreshSubscription };
}
