import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "../supabase/client";

export type QuotaAllowed = {
  allowed: true;
  isPro: boolean;
  used: number;
  cap: number;
};

export type QuotaBlocked = {
  allowed: false;
  reason: "free_quota_exhausted";
  used: number;
  cap: number;
};

export type QuotaResult = QuotaAllowed | QuotaBlocked;

export class TalkQuotaExhaustedError extends Error {
  used: number;
  cap: number;
  constructor(used: number, cap: number) {
    super("free_quota_exhausted");
    this.name = "TalkQuotaExhaustedError";
    this.used = used;
    this.cap = cap;
  }
}

async function readErrorBody(error: FunctionsHttpError): Promise<unknown> {
  try {
    return await error.context.json();
  } catch {
    return null;
  }
}

export async function checkTalkQuota(): Promise<QuotaAllowed> {
  const { data, error } = await supabase.functions.invoke("check-talk-quota");

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const status = error.context.status;
      const body = await readErrorBody(error);

      console.error("[checkTalkQuota] edge function returned non-2xx", {
        status,
        body,
      });

      if (status === 402) {
        const blocked = body as Partial<QuotaBlocked> | null;
        throw new TalkQuotaExhaustedError(
          blocked?.used ?? 0,
          blocked?.cap ?? 15 * 60,
        );
      }
    } else {
      console.error("[checkTalkQuota] non-HTTP error", error);
    }
    throw error;
  }

  if (!data || data.allowed !== true) {
    throw new TalkQuotaExhaustedError(
      (data as QuotaBlocked | undefined)?.used ?? 0,
      (data as QuotaBlocked | undefined)?.cap ?? 15 * 60,
    );
  }

  return data as QuotaAllowed;
}
