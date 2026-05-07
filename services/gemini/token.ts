import { supabase } from "../supabase/client";

let pendingTokenRequest: Promise<string> | null = null;

interface GeminiSessionResponse {
  token?: unknown;
}

export async function getGeminiSessionToken(): Promise<string> {
  if (!pendingTokenRequest) {
    pendingTokenRequest = (async () => {
      await supabase.auth.refreshSession();

      const { data, error } =
        await supabase.functions.invoke<GeminiSessionResponse>(
          "get-gemini-session",
        );

      if (error) {
        throw new Error(error?.message || "No token returned");
      }

      if (typeof data?.token !== "string" || data.token.length === 0) {
        throw new Error("No Gemini token returned");
      }

      return data.token;
    })().finally(() => {
      pendingTokenRequest = null;
    });
  }

  return pendingTokenRequest;
}
