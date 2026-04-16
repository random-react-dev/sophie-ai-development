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

      const { data, error } = await supabase
        .from("apple_subscriptions")
        .select("product_id, state, expires_date")
        .eq("user_id", user.id)
        .order("expires_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn("[entitlement] refresh error:", error.message);
        set({ isInitialized: true });
        return;
      }

      if (!data) {
        set({ ...initial, isInitialized: true });
        return;
      }

      set({
        productId: data.product_id ?? null,
        state: (data.state as EntitlementState) ?? "none",
        expiresAt: data.expires_date ? new Date(data.expires_date) : null,
        isInitialized: true,
      });
    } catch (err) {
      console.warn("[entitlement] refresh threw:", err);
      set({ isInitialized: true });
    }
  },
  reset: () => set({ ...initial }),
}));

// Atomic selectors
export const useIsPro = (): boolean =>
  useEntitlementStore((s) => s.state === "active" && !!s.expiresAt && s.expiresAt > new Date());
export const useEntitlementExpiresAt = (): Date | null =>
  useEntitlementStore((s) => s.expiresAt);
export const useEntitlementProductId = (): string | null =>
  useEntitlementStore((s) => s.productId);
export const useEntitlementState = (): EntitlementState =>
  useEntitlementStore((s) => s.state);
