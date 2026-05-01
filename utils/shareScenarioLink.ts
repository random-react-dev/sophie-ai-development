export const DEFAULT_SHARE_BASE_URL =
  "https://share-scenario.vivekmallik1111.workers.dev";

const getConfiguredShareBaseUrl = (): string => {
  const configuredUrl = process.env.EXPO_PUBLIC_SHARE_BASE_URL?.trim();
  if (!configuredUrl) {
    return DEFAULT_SHARE_BASE_URL;
  }

  try {
    const url = new URL(configuredUrl);
    if (url.protocol !== "https:") {
      return DEFAULT_SHARE_BASE_URL;
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return DEFAULT_SHARE_BASE_URL;
  }
};

export const getShareScenarioUrl = (token: string): string => {
  const url = new URL(getConfiguredShareBaseUrl());
  url.searchParams.set("token", token);
  const href = url.toString();

  if (url.pathname === "/") {
    return href.replace(`${url.origin}/?`, `${url.origin}?`);
  }

  return href;
};
