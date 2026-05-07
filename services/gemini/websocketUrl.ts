const GEMINI_LIVE_WS_BASE =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService";

export function buildGeminiLiveWebSocketUrl(token: string): string {
  const encodedToken = encodeURIComponent(token);

  if (token.startsWith("auth_tokens/")) {
    return `${GEMINI_LIVE_WS_BASE}.BidiGenerateContentConstrained?access_token=${encodedToken}`;
  }

  return `${GEMINI_LIVE_WS_BASE}.BidiGenerateContent?key=${encodedToken}`;
}
