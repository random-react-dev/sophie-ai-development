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

export async function checkTalkQuota(): Promise<QuotaAllowed> {
  const { data, error } = await supabase.functions.invoke("check-talk-quota");

  if (error) {
    const ctx = (error as { context?: { status?: number; json?: () => Promise<unknown> } }).context;
    if (ctx?.status === 402) {
      try {
        const body = (await ctx.json?.()) as QuotaBlocked | undefined;
        throw new TalkQuotaExhaustedError(
          body?.used ?? 0,
          body?.cap ?? 15 * 60,
        );
      } catch (e) {
        if (e instanceof TalkQuotaExhaustedError) throw e;
        throw new TalkQuotaExhaustedError(0, 15 * 60);
      }
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
