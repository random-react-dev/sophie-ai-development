import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// No JWT verification — this is a public web page for sharing links

type Platform = "ios" | "android" | "unknown";

function detectPlatform(userAgent: string): Platform {
  const ua = userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "unknown";
}

interface SharedScenarioRow {
  id: string;
  title: string;
  description: string;
  sophie_role: string;
  user_role: string;
  category: string;
  level: string;
}

serve(async (req: Request) => {
  // Only GET requests
  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  const platform = detectPlatform(req.headers.get("user-agent") ?? "");

  if (!token) {
    return renderPage(null, "Missing token parameter", platform);
  }

  // Use service role to bypass RLS for public sharing page
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const { data, error } = await supabase
    .from("shared_scenarios")
    .select("id, title, description, sophie_role, user_role, category, level")
    .eq("id", token)
    .single();

  if (error || !data) {
    return renderPage(null, "Scenario not found or link is no longer valid.", platform);
  }

  return renderPage(data as SharedScenarioRow, null, platform);
});

function renderPage(
  scenario: SharedScenarioRow | null,
  errorMessage: string | null,
  platform: Platform,
): Response {
  const appSchemeLink = scenario
    ? `sophie://scenario/${scenario.id}`
    : "";

  const playStoreLink =
    "https://play.google.com/store/apps/details?id=ai.speakwithsophie.app";
  const appStoreLink =
    "https://apps.apple.com/us/app/speak-with-sophie/id6759192122";

  // Show one store button for known platforms, both for desktop/unknown
  const storeButtons =
    platform === "ios"
      ? `<a class="btn btn-secondary" href="${escapeHtml(appStoreLink)}" target="_blank" rel="noopener">Download on the App Store</a>`
      : platform === "android"
      ? `<a class="btn btn-secondary" href="${escapeHtml(playStoreLink)}" target="_blank" rel="noopener">Get it on Google Play</a>`
      : `<a class="btn btn-secondary" href="${escapeHtml(appStoreLink)}" target="_blank" rel="noopener">Download on the App Store</a>
         <a class="btn btn-secondary" href="${escapeHtml(playStoreLink)}" target="_blank" rel="noopener">Get it on Google Play</a>`;

  // Build intent URL for Android (Chrome blocks sophie:// custom schemes, but supports intent://)
  const intentUrl = scenario
    ? `intent://scenario/${scenario.id}#Intent;scheme=sophie;package=ai.speakwithsophie.app;S.browser_fallback_url=${encodeURIComponent(playStoreLink)};end`
    : "";

  // Platform-aware open script:
  // - Android: intent:// URL (Chrome-supported, auto-falls back to Play Store if not installed)
  // - iOS: custom scheme + timeout fallback (Safari supports sophie://)
  // - Desktop/unknown: no script needed (no "Open" button shown)
  const openInAppScript = scenario && platform !== "unknown"
    ? platform === "android"
      ? `
<script>
  function openApp() {
    window.location.href = "${intentUrl}";
  }
</script>
      `
      : `
<script>
  function openApp() {
    var start = Date.now();
    window.location.href = "${escapeHtml(appSchemeLink)}";
    setTimeout(function() {
      if (Date.now() - start < 2000) {
        document.getElementById("store-buttons").style.display = "flex";
        document.getElementById("open-btn").style.display = "none";
      }
    }, 1500);
  }
</script>
      `
    : "";

  // On mobile: show "Open in App" button (hidden store buttons shown as fallback)
  // On desktop: skip "Open in App" (no app to open), show store buttons directly
  const openButton = scenario && platform !== "unknown"
    ? `<button id="open-btn" class="btn btn-primary" onclick="openApp()">Open in Sophie AI</button>`
    : "";

  const storeButtonsStyle = platform === "unknown"
    ? "display:flex; flex-direction:column; gap:12px;"
    : "display:none; flex-direction:column; gap:12px;";

  const content = scenario
    ? `
      ${openInAppScript}
      <div class="card">
        <div class="badge">${escapeHtml(scenario.category)} · ${escapeHtml(scenario.level)}</div>
        <h1>${escapeHtml(scenario.title)}</h1>
        <p class="desc">${escapeHtml(scenario.description)}</p>
        <div class="roles">
          <div class="role">
            <span class="role-label">Sophie's Role</span>
            <span class="role-value">${escapeHtml(scenario.sophie_role)}</span>
          </div>
          <div class="role">
            <span class="role-label">Your Role</span>
            <span class="role-value">${escapeHtml(scenario.user_role)}</span>
          </div>
        </div>
        ${openButton}
        <div id="store-buttons" style="${storeButtonsStyle}">
          ${storeButtons}
        </div>
      </div>
    `
    : `
      <div class="card">
        <h1>Scenario Not Found</h1>
        <p class="desc">${escapeHtml(errorMessage ?? "This link is invalid or has expired.")}</p>
        ${storeButtons}
      </div>
    `;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${scenario ? escapeHtml(scenario.title) + " — Sophie AI" : "Sophie AI"}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #f8f8f8;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: #fff;
      border-radius: 24px;
      padding: 32px 24px;
      max-width: 420px;
      width: 100%;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
    }
    .badge {
      display: inline-block;
      background: #eff6ff;
      color: #3b82f6;
      font-size: 13px;
      font-weight: 600;
      border-radius: 99px;
      padding: 4px 12px;
      margin-bottom: 16px;
    }
    h1 {
      font-size: 22px;
      font-weight: 800;
      color: #111;
      margin-bottom: 8px;
    }
    .desc {
      color: #6b7280;
      font-size: 15px;
      line-height: 1.5;
      margin-bottom: 20px;
    }
    .roles {
      background: #f9fafb;
      border-radius: 16px;
      padding: 16px;
      margin-bottom: 24px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .role { display: flex; flex-direction: column; gap: 2px; }
    .role-label { font-size: 11px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; }
    .role-value { font-size: 14px; font-weight: 500; color: #111; }
    .btn {
      display: block;
      width: 100%;
      padding: 16px;
      border-radius: 99px;
      font-size: 16px;
      font-weight: 700;
      text-align: center;
      text-decoration: none;
      margin-bottom: 12px;
      cursor: pointer;
    }
    .btn-primary {
      background: linear-gradient(135deg, #f472b6, #a855f7, #3b82f6);
      color: #fff;
      border: none;
      outline: none;
    }
    .btn-secondary {
      background: #f3f4f6;
      color: #374151;
    }
  </style>
</head>
<body>
  ${content}
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
