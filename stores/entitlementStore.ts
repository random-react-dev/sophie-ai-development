import { create } from "zustand";

import { supabase } from "@/services/supabase/client";

export type EntitlementState =
  | "active"
  | "expired"
  | "billing_retry"
  | "revoked"
  | "none";

interface EntitlementStoreState {
  productId: string | null;
  state: EntitlementState;
  expiresAt: Date | null;
  isInitialized: boolean;
  isPro: () => boolean;
  refresh: () => Promise<void>;
  reset: () => void;
}

type SubscriptionRow = {
  product_id: string | null;
  state: string | null;
  expires_date: string | null;
};

const initial = {
  productId: null as string | null,
  state: "none" as EntitlementState,
  expiresAt: null as Date | null,
  isInitialized: false,
};

export const useEntitlementStore = create<EntitlementStoreState>((set, get) => ({
  ...initial,
  isPro: () => {
    const { state, expiresAt } = get();
    return state === "active" && !!expiresAt && expiresAt > new Date();
  },
  refresh: async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        set({ ...initial, isInitialized: true });
        return;
      }

      const { data: appleData, error: appleError } = await supabase
        .from("apple_subscriptions")
        .select("product_id, state, expires_date")
        .eq("user_id", user.id)
        .order("expires_date", { ascending: false })
        .limit(1);

      const { data: googleData, error: googleError } = await supabase
        .from("google_subscriptions")
        .select("product_id, state, expires_date")
        .eq("user_id", user.id)
        .order("expires_date", { ascending: false })
        .limit(1);

      if (appleError || googleError) {
        console.warn(
          "[entitlement] refresh error:",
          appleError?.message ?? googleError?.message,
        );
        set({ isInitialized: true });
        return;
      }

      const latest = pickLatestSubscription([
        ...((appleData ?? []) as SubscriptionRow[]),
        ...((googleData ?? []) as SubscriptionRow[]),
      ]);

      if (!latest) {
        set({ ...initial, isInitialized: true });
        return;
      }

      set({
        productId: latest.product_id ?? null,
        state: toEntitlementState(latest.state),
        expiresAt: latest.expires_date ? new Date(latest.expires_date) : null,
        isInitialized: true,
      });
    } catch (err) {
      console.warn("[entitlement] refresh threw:", err);
      set({ isInitialized: true });
    }
  },
  reset: () => set({ ...initial }),
}));

function pickLatestSubscription(rows: SubscriptionRow[]): SubscriptionRow | null {
  return (
    rows
      .filter((row) => row.expires_date)
      .sort(
        (a, b) =>
          new Date(b.expires_date ?? 0).getTime() -
          new Date(a.expires_date ?? 0).getTime(),
      )[0] ?? null
  );
}

function toEntitlementState(state: string | null): EntitlementState {
  switch (state) {
    case "active":
    case "expired":
    case "billing_retry":
    case "revoked":
      return state;
    default:
      return "none";
  }
}

// Atomic selectors
export const useIsPro = (): boolean =>
  useEntitlementStore((s) => s.state === "active" && !!s.expiresAt && s.expiresAt > new Date());
export const useEntitlementExpiresAt = (): Date | null =>
  useEntitlementStore((s) => s.expiresAt);
export const useEntitlementProductId = (): string | null =>
  useEntitlementStore((s) => s.productId);
export const useEntitlementState = (): EntitlementState =>
  useEntitlementStore((s) => s.state);
