import { Platform } from "react-native";
import {
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  type ProductSubscriptionAndroid,
  type ProductSubscription,
  type Purchase,
  type PurchaseError,
} from "react-native-iap";

import {
  type VerifyPurchaseResult,
  verifyPlayPurchaseWithBackend,
  verifyPurchaseWithBackend,
} from "./verifyWithBackend";

export const APPLE_PRODUCT_IDS = [
  "ai.speakwithsophie.app.premium.monthly",
  "ai.speakwithsophie.app.premium.semiannual",
] as const;

export const GOOGLE_SUBSCRIPTION_ID = "ai.speakwithsophie.app.premium";
const GOOGLE_MONTHLY_BASE_PLAN_ID = "premium-monthly";
const GOOGLE_SEMIANNUAL_BASE_PLAN_ID = "premium-semiannual";
const GOOGLE_MONTHLY_TRIAL_OFFER_ID = "free-trial-7d";

export const PRODUCT_IDS = APPLE_PRODUCT_IDS;

export type ProductSku = (typeof APPLE_PRODUCT_IDS)[number];

let connectionInitialized = false;
const androidOfferTokensByPlan = new Map<ProductSku, string>();

/**
 * Initialize the IAP connection. Safe to call multiple times.
 */
export async function initIAP(): Promise<boolean> {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return false;
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
  if (Platform.OS !== "ios" && Platform.OS !== "android") return [];
  try {
    const skus =
      Platform.OS === "android" ? [GOOGLE_SUBSCRIPTION_ID] : [...APPLE_PRODUCT_IDS];
    console.log("[IAP] fetchProducts skus:", skus);
    const result = await fetchProducts({
      skus,
      type: "subs",
    });
    const list = (result as ProductSubscription[] | null) ?? [];
    if (Platform.OS === "android") {
      cacheAndroidOfferTokens(list);
    }
    console.log(
      "[IAP] fetchProducts returned",
      list.length,
      "products:",
      list.map((p) => p.id),
    );
    if (list.length === 0) {
      console.warn("[IAP] fetchProducts returned EMPTY — diagnostic:", {
        connectionInitialized,
        skusRequested: skus,
        rawResultType: typeof result,
        rawResultIsArray: Array.isArray(result),
      });
    }
    return list;
  } catch (err: unknown) {
    const detail =
      err instanceof Error
        ? { name: err.name, message: err.message }
        : { value: String(err) };
    console.warn("[IAP] fetchProducts failed:", detail);
    return [];
  }
}

export function getAvailableSubscriptionPlanIds(
  products: ProductSubscription[],
): Set<ProductSku> {
  if (Platform.OS === "android") {
    cacheAndroidOfferTokens(products);
    return new Set(androidOfferTokensByPlan.keys());
  }
  return new Set(
    products
      .map((product) => product.id)
      .filter((id): id is ProductSku =>
        APPLE_PRODUCT_IDS.includes(id as ProductSku),
      ),
  );
}

/**
 * Initiate a subscription purchase. The actual transaction lifecycle is
 * delivered through the listeners registered by `setupPurchaseListeners`.
 */
export async function purchase(sku: ProductSku | string): Promise<void> {
  console.log("[IAP] requestPurchase ->", sku);
  try {
    if (Platform.OS === "android") {
      const planSku = toProductSku(sku);
      const offerToken = planSku ? androidOfferTokensByPlan.get(planSku) : undefined;
      if (!planSku || !offerToken) {
        throw new Error(`Missing Google Play offer token for ${sku}`);
      }
      await requestPurchase({
        request: {
          google: {
            skus: [GOOGLE_SUBSCRIPTION_ID],
            subscriptionOffers: [{ sku: GOOGLE_SUBSCRIPTION_ID, offerToken }],
          },
        },
        type: "subs",
      });
      console.log("[IAP] requestPurchase returned (awaiting listener)", sku);
      return;
    }
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
    console.log("[IAP] requestPurchase returned (awaiting listener)", sku);
  } catch (err) {
    console.warn("[IAP] requestPurchase threw:", err);
    throw err;
  }
}

/**
 * Restore previously-purchased subscriptions. Each available purchase is
 * re-verified server-side and finalized.
 */
export async function restorePurchases(): Promise<VerifyPurchaseResult[]> {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return [];
  const results: VerifyPurchaseResult[] = [];
  const purchases = await getAvailablePurchases();
  for (const p of purchases) {
    const purchaseToken = (p as Purchase).purchaseToken;
    if (!purchaseToken) {
      console.warn("[IAP] restore: missing purchaseToken on purchase", p.id);
      continue;
    }
    try {
      const verified =
        Platform.OS === "android"
          ? await verifyPlayPurchaseWithBackend(purchaseToken)
          : await verifyPurchaseWithBackend(purchaseToken);
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
  if (Platform.OS !== "ios" && Platform.OS !== "android") {
    return () => {
      /* no-op */
    };
  }

  const updateSub = purchaseUpdatedListener(async (p: Purchase) => {
    console.log("[IAP] purchaseUpdated fired:", p.id, p.productId);
    try {
      const purchaseToken = p.purchaseToken;
      if (!purchaseToken) {
        console.warn("[IAP] purchaseUpdated: missing purchaseToken", p.id);
        return;
      }
      const verified =
        Platform.OS === "android"
          ? await verifyPlayPurchaseWithBackend(purchaseToken)
          : await verifyPurchaseWithBackend(purchaseToken);
      console.log("[IAP] verifyPurchase backend ok:", verified);
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
  console.log("[IAP] purchase listeners mounted");

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

function cacheAndroidOfferTokens(products: ProductSubscription[]): void {
  androidOfferTokensByPlan.clear();
  for (const product of products) {
    if (!isAndroidSubscription(product) || product.id !== GOOGLE_SUBSCRIPTION_ID) {
      continue;
    }

    const monthlyOffer =
      product.subscriptionOfferDetailsAndroid.find(
        (offer) =>
          offer.basePlanId === GOOGLE_MONTHLY_BASE_PLAN_ID &&
          offer.offerId === GOOGLE_MONTHLY_TRIAL_OFFER_ID,
      ) ??
      product.subscriptionOfferDetailsAndroid.find(
        (offer) => offer.basePlanId === GOOGLE_MONTHLY_BASE_PLAN_ID,
      );
    const semiannualOffer = product.subscriptionOfferDetailsAndroid.find(
      (offer) => offer.basePlanId === GOOGLE_SEMIANNUAL_BASE_PLAN_ID,
    );

    if (monthlyOffer?.offerToken) {
      androidOfferTokensByPlan.set(APPLE_PRODUCT_IDS[0], monthlyOffer.offerToken);
    }
    if (semiannualOffer?.offerToken) {
      androidOfferTokensByPlan.set(APPLE_PRODUCT_IDS[1], semiannualOffer.offerToken);
    }
  }
}

function isAndroidSubscription(
  product: ProductSubscription,
): product is ProductSubscriptionAndroid {
  return product.platform === "android";
}

function toProductSku(sku: string): ProductSku | null {
  return APPLE_PRODUCT_IDS.includes(sku as ProductSku) ? (sku as ProductSku) : null;
}
