import { Platform } from "react-native";
import {
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  type ProductSubscription,
  type Purchase,
  type PurchaseError,
} from "react-native-iap";

import {
  type VerifyPurchaseResult,
  verifyPurchaseWithBackend,
} from "./verifyWithBackend";

export const PRODUCT_IDS = [
  "ai.speakwithsophie.app.premium.monthly",
  "ai.speakwithsophie.app.premium.semiannual",
] as const;

export type ProductSku = (typeof PRODUCT_IDS)[number];

let connectionInitialized = false;

/**
 * Initialize the IAP connection. Safe to call multiple times.
 * iOS-only — Android billing is not implemented in v1.
 */
export async function initIAP(): Promise<boolean> {
  if (Platform.OS !== "ios") return false;
  if (connectionInitialized) return true;
  try {
    const result = await initConnection();
    connectionInitialized = !!result;
    console.log("[IAP] initConnection result:", result);
    return connectionInitialized;
  } catch (err) {
    console.warn("[IAP] initConnection failed:", err);
    return false;
  }
}

/**
 * Fetch the auto-renewable subscription product metadata from the App Store
 * (price, localized title, intro offers, etc.).
 */
export async function getSubscriptionProducts(): Promise<ProductSubscription[]> {
  if (Platform.OS !== "ios") return [];
  try {
    const result = await fetchProducts({
      skus: [...PRODUCT_IDS],
      type: "subs",
    });
    // fetchProducts returns FetchProductsResult — array of products or null.
    if (!result) return [];
    return result as ProductSubscription[];
  } catch (err) {
    console.warn("[IAP] fetchProducts failed:", err);
    return [];
  }
}

/**
 * Initiate a subscription purchase. The actual transaction lifecycle is
 * delivered through the listeners registered by `setupPurchaseListeners`.
 */
export async function purchase(sku: ProductSku | string): Promise<void> {
  if (Platform.OS !== "ios") return;
  await requestPurchase({
    request: {
      apple: {
        sku,
        andDangerouslyFinishTransactionAutomatically: false,
      },
    },
    type: "subs",
  });
}

/**
 * Restore previously-purchased subscriptions. Each available purchase is
 * re-verified server-side and finalized.
 */
export async function restorePurchases(): Promise<VerifyPurchaseResult[]> {
  if (Platform.OS !== "ios") return [];
  const results: VerifyPurchaseResult[] = [];
  const purchases = await getAvailablePurchases();
  for (const p of purchases) {
    const jws = (p as Purchase).purchaseToken;
    if (!jws) {
      console.warn("[IAP] restore: missing purchaseToken on purchase", p.id);
      continue;
    }
    try {
      const verified = await verifyPurchaseWithBackend(jws);
      results.push(verified);
      try {
        await finishTransaction({ purchase: p, isConsumable: false });
      } catch (finishErr) {
        console.warn("[IAP] finishTransaction (restore) failed:", finishErr);
      }
    } catch (err) {
      console.warn("[IAP] verify (restore) failed:", err);
    }
  }
  return results;
}

/**
 * Wire up purchase listeners. On every successful transaction we POST the JWS
 * to the verify-purchase edge function; only after the backend confirms
 * authenticity do we finish the transaction and notify the caller.
 *
 * Returns a cleanup function that removes both listeners.
 */
export function setupPurchaseListeners(
  onVerified: (result: VerifyPurchaseResult) => void,
): () => void {
  if (Platform.OS !== "ios") {
    return () => {
      /* no-op */
    };
  }

  const updateSub = purchaseUpdatedListener(async (p: Purchase) => {
    try {
      const jws = p.purchaseToken;
      if (!jws) {
        console.warn("[IAP] purchaseUpdated: missing purchaseToken", p.id);
        return;
      }
      const verified = await verifyPurchaseWithBackend(jws);
      try {
        await finishTransaction({ purchase: p, isConsumable: false });
      } catch (finishErr) {
        console.warn("[IAP] finishTransaction failed:", finishErr);
      }
      onVerified(verified);
    } catch (err) {
      console.warn("[IAP] purchaseUpdated handler error:", err);
    }
  });

  const errorSub = purchaseErrorListener((err: PurchaseError) => {
    console.warn("[IAP] purchaseError:", err.code, err.message);
  });

  return () => {
    try {
      updateSub.remove();
    } catch {
      /* ignore */
    }
    try {
      errorSub.remove();
    } catch {
      /* ignore */
    }
  };
}
