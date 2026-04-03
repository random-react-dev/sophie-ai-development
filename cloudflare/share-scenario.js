// Cloudflare Workers — Share Scenario Web Page
// Paste this in the Cloudflare Workers dashboard editor (JavaScript, no TypeScript)
// Set environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

export default {
  async fetch(request, env) {
    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405 });
    }

    const url = new URL(request.url);
    const token = url.searchParams.get("token");
    const platform = detectPlatform(request.headers.get("user-agent") ?? "");

    if (!token) {
      return renderPage(null, "Missing token parameter", platform);
    }

    try {
      const res = await fetch(
        `${env.SUPABASE_URL}/rest/v1/shared_scenarios?id=eq.${encodeURIComponent(token)}&select=id,title,description,sophie_role,user_role,category,level`,
        {
          headers: {
            apikey: env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
        }
      );

      const rows = await res.json();
      const data = rows[0] ?? null;

      if (!data) {
        return renderPage(null, "Scenario not found or link is no longer valid.", platform);
      }

      return renderPage(data, null, platform);
    } catch (_e) {
      return renderPage(null, "Something went wrong. Please try again.", platform);
    }
  },
};

function detectPlatform(userAgent) {
  const ua = userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "unknown";
}

function renderPage(scenario, errorMessage, platform) {
  const playStoreLink =
    "https://play.google.com/store/apps/details?id=ai.speakwithsophie.app";
  const appStoreLink =
    "https://apps.apple.com/us/app/speak-with-sophie/id6759192122";

  // App's exact 7-color rainbow gradient
  const RAINBOW = "linear-gradient(135deg, #E81416, #FFA500, #FAEB36, #79C314, #487DE7, #4B369D, #70369D)";

  const storeButtons =
    platform === "ios"
      ? `<a class="btn btn-store" href="${escapeHtml(appStoreLink)}" target="_blank" rel="noopener">
           <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
           Download on the App Store
         </a>`
      : platform === "android"
      ? `<a class="btn btn-store" href="${escapeHtml(playStoreLink)}" target="_blank" rel="noopener">
           <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 20.5v-17c0-.83.94-1.3 1.6-.8l15 8.5c.6.34.6 1.26 0 1.6l-15 8.5c-.66.5-1.6.03-1.6-.8z"/></svg>
           Get it on Google Play
         </a>`
      : `<a class="btn btn-store" href="${escapeHtml(appStoreLink)}" target="_blank" rel="noopener">
           <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
           Download on the App Store
         </a>
         <a class="btn btn-store" href="${escapeHtml(playStoreLink)}" target="_blank" rel="noopener">
           <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 20.5v-17c0-.83.94-1.3 1.6-.8l15 8.5c.6.34.6 1.26 0 1.6l-15 8.5c-.66.5-1.6.03-1.6-.8z"/></svg>
           Get it on Google Play
         </a>`;

  const intentUrl = scenario
    ? `intent://scenario/${scenario.id}#Intent;scheme=sophie;package=ai.speakwithsophie.app;S.browser_fallback_url=${encodeURIComponent(playStoreLink)};end`
    : "";

  const appSchemeLink = scenario ? `sophie://scenario/${scenario.id}` : "";

  const openInAppScript =
    scenario && platform !== "unknown"
      ? platform === "android"
        ? `<script>
  function openApp() {
    window.location.href = "${intentUrl}";
  }
</script>`
        : `<script>
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
</script>`
      : "";

  const openButton =
    scenario && platform !== "unknown"
      ? `<div class="btn-rainbow-wrap">
           <button id="open-btn" class="btn btn-primary" onclick="openApp()">Open in Sophie AI</button>
         </div>`
      : "";

  const storeButtonsStyle =
    platform === "unknown"
      ? "display:flex; flex-direction:column; gap:12px;"
      : "display:none; flex-direction:column; gap:12px;";

  const content = scenario
    ? `
      ${openInAppScript}
      <div class="brand">
        <div class="brand-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>
        </div>
        <span class="brand-name">Sophie AI</span>
      </div>
      <p class="brand-sub">Someone shared a conversation scenario with you</p>

      <div class="card-rainbow-wrap">
        <div class="card">
          <div class="badge">${escapeHtml(scenario.category)} · ${escapeHtml(scenario.level)}</div>
          <h1>${escapeHtml(scenario.title)}</h1>
          <p class="desc">${escapeHtml(scenario.description)}</p>
          <div class="roles">
            <div class="role">
              <div class="role-icon role-icon-sophie">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#9333ea"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
              </div>
              <div>
                <span class="role-label">Sophie's Role</span>
                <span class="role-value">${escapeHtml(scenario.sophie_role)}</span>
              </div>
            </div>
            <div class="role">
              <div class="role-icon role-icon-user">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#3b82f6"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>
              </div>
              <div>
                <span class="role-label">Your Role</span>
                <span class="role-value">${escapeHtml(scenario.user_role)}</span>
              </div>
            </div>
          </div>
          ${openButton}
          <div id="store-buttons" style="${storeButtonsStyle}">
            ${storeButtons}
          </div>
        </div>
      </div>`
    : `
      <div class="brand">
        <div class="brand-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>
        </div>
        <span class="brand-name">Sophie AI</span>
      </div>
      <div class="card-rainbow-wrap">
        <div class="card card-error">
          <div class="error-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="#9ca3af"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
          </div>
          <h1>Scenario Not Found</h1>
          <p class="desc">${escapeHtml(errorMessage ?? "This link is invalid or has expired.")}</p>
          <div style="display:flex; flex-direction:column; gap:12px;">
            ${storeButtons}
          </div>
        </div>
      </div>`;

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
      background: #f4f4f8;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px 20px;
    }

    /* Brand header */
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
    }
    .brand-icon {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: linear-gradient(135deg, #E81416, #FFA500, #FAEB36, #79C314, #487DE7, #4B369D, #70369D);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .brand-name {
      font-size: 22px;
      font-weight: 800;
      background: linear-gradient(135deg, #E81416, #FFA500, #FAEB36, #79C314, #487DE7, #4B369D, #70369D);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .brand-sub {
      font-size: 14px;
      color: #9ca3af;
      font-weight: 500;
      margin-bottom: 24px;
      text-align: center;
    }

    /* Rainbow border card */
    .card-rainbow-wrap {
      background: linear-gradient(135deg, #E81416, #FFA500, #FAEB36, #79C314, #487DE7, #4B369D, #70369D);
      border-radius: 26px;
      padding: 2px;
      width: 100%;
      max-width: 400px;
    }
    .card {
      background: #fff;
      border-radius: 24px;
      padding: 28px 22px;
      width: 100%;
    }
    .card-error {
      text-align: center;
    }
    .error-icon {
      margin-bottom: 16px;
    }

    /* Badge */
    .badge {
      display: inline-block;
      background: linear-gradient(135deg, #E81416, #FFA500, #FAEB36, #79C314, #487DE7, #4B369D, #70369D);
      color: #fff;
      font-size: 12px;
      font-weight: 700;
      border-radius: 99px;
      padding: 4px 14px;
      margin-bottom: 14px;
      letter-spacing: 0.3px;
    }

    h1 {
      font-size: 21px;
      font-weight: 800;
      color: #111;
      margin-bottom: 6px;
      line-height: 1.25;
    }
    .desc {
      color: #6b7280;
      font-size: 14px;
      line-height: 1.55;
      margin-bottom: 20px;
    }

    /* Roles */
    .roles {
      background: #f9fafb;
      border-radius: 16px;
      padding: 14px 16px;
      margin-bottom: 22px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .role {
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }
    .role-icon {
      width: 30px;
      height: 30px;
      border-radius: 99px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .role-icon-sophie { background: #f3e8ff; }
    .role-icon-user   { background: #eff6ff; }
    .role > div {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .role-label {
      font-size: 10px;
      font-weight: 700;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }
    .role-value {
      font-size: 14px;
      font-weight: 600;
      color: #111;
    }

    /* Primary button — rainbow border (2px) + white fill + black text, matches RainbowBorder in app */
    .btn-rainbow-wrap {
      background: linear-gradient(135deg, #E81416, #FFA500, #FAEB36, #79C314, #487DE7, #4B369D, #70369D);
      border-radius: 99px;
      padding: 2px;
      margin-bottom: 12px;
    }
    .btn { border-radius: 99px; cursor: pointer; font-weight: 700; font-size: 16px; text-align: center; }
    .btn-primary {
      display: block;
      width: 100%;
      padding: 15px;
      background: #ffffff;
      color: #111;
      border: none;
      outline: none;
      font-size: 16px;
      font-weight: 700;
      border-radius: 97px;
      cursor: pointer;
    }

    /* Store buttons */
    .btn-store {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 14px;
      border-radius: 99px;
      background: #f3f4f6;
      color: #374151;
      text-decoration: none;
      font-size: 15px;
      font-weight: 600;
      margin-bottom: 10px;
    }
    .btn-store:last-child { margin-bottom: 0; }
  </style>
</head>
<body>
  ${content}
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
