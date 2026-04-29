import { supabase } from "@/services/supabase/client";

export interface VerifyPurchaseResult {
  state: "active" | "expired" | "billing_retry" | "revoked";
  expiresDate: string;
  productId: string;
}

/**
 * Verifies a StoreKit 2 JWS transaction with the Supabase
 * `verify-purchase` edge function. The function performs JWS
 * signature verification and upserts into the `subscriptions` table.
 */
export async function verifyPurchaseWithBackend(
  jwsRepresentation: string,
): Promise<VerifyPurchaseResult> {
  const { data, error } = await supabase.functions.invoke("verify-purchase", {
    body: { jwsRepresentation },
  });

  if (error) {
    throw error;
  }
  return data as VerifyPurchaseResult;
}

export async function verifyPlayPurchaseWithBackend(
  purchaseToken: string,
): Promise<VerifyPurchaseResult> {
  const { data, error } = await supabase.functions.invoke("verify-play-purchase", {
    body: { purchaseToken },
  });

  if (error) {
    throw error;
  }
  return data as VerifyPurchaseResult;
}
