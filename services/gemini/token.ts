import { supabase } from "../supabase/client";

let pendingTokenRequest: Promise<string> | null = null;

export async function getGeminiSessionToken(): Promise<string> {
  const directToken = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (directToken) {
    return directToken;
  }

  if (!pendingTokenRequest) {
    pendingTokenRequest = (async () => {
      const { data, error } = await supabase.functions.invoke(
        "get-gemini-session",
      );

      if (error || !data?.token) {
        throw new Error(error?.message || "No token returned");
      }

      return data.token as string;
    })().finally(() => {
      pendingTokenRequest = null;
    });
  }

  return pendingTokenRequest;
}
