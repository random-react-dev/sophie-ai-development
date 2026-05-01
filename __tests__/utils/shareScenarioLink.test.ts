import {
  DEFAULT_SHARE_BASE_URL,
  getShareScenarioUrl,
} from "@/utils/shareScenarioLink";

const originalShareBaseUrl = process.env.EXPO_PUBLIC_SHARE_BASE_URL;

describe("shareScenarioLink", () => {
  afterEach(() => {
    process.env.EXPO_PUBLIC_SHARE_BASE_URL = originalShareBaseUrl;
  });

  it("uses the configured share base URL when present", () => {
    process.env.EXPO_PUBLIC_SHARE_BASE_URL = "https://example.com/share";

    expect(getShareScenarioUrl("scenario-token")).toBe(
      "https://example.com/share?token=scenario-token",
    );
  });

  it("falls back to the production share URL when env is missing", () => {
    delete process.env.EXPO_PUBLIC_SHARE_BASE_URL;

    expect(getShareScenarioUrl("scenario-token")).toBe(
      `${DEFAULT_SHARE_BASE_URL}?token=scenario-token`,
    );
  });

  it("falls back to the production share URL when env is invalid", () => {
    process.env.EXPO_PUBLIC_SHARE_BASE_URL = "not-a-url";

    expect(getShareScenarioUrl("scenario-token")).toBe(
      `${DEFAULT_SHARE_BASE_URL}?token=scenario-token`,
    );
  });

  it("requires an https share base URL", () => {
    process.env.EXPO_PUBLIC_SHARE_BASE_URL = "http://example.com/share";

    expect(getShareScenarioUrl("scenario-token")).toBe(
      `${DEFAULT_SHARE_BASE_URL}?token=scenario-token`,
    );
  });

  it("encodes token query values safely", () => {
    process.env.EXPO_PUBLIC_SHARE_BASE_URL = "https://example.com/share";

    expect(getShareScenarioUrl("token with spaces & symbols")).toBe(
      "https://example.com/share?token=token+with+spaces+%26+symbols",
    );
  });
});
