import {
  getUserMetadataCefrLevel,
  isCefrLevel,
  resolveEffectiveCefrLevel,
} from "@/utils/learningLevel";

describe("learningLevel helpers", () => {
  it("recognizes valid CEFR levels", () => {
    expect(isCefrLevel("S1")).toBe(true);
    expect(isCefrLevel("S6")).toBe(true);
  });

  it("rejects invalid CEFR levels", () => {
    expect(isCefrLevel("A1")).toBe(false);
    expect(isCefrLevel("zero")).toBe(false);
    expect(isCefrLevel(undefined)).toBe(false);
  });

  it("reads CEFR level from user onboarding metadata", () => {
    expect(
      getUserMetadataCefrLevel({
        user_metadata: {
          onboarding_data: {
            cefr_level: "S4",
          },
        },
      }),
    ).toBe("S4");
  });

  it("returns null when metadata level is invalid", () => {
    expect(
      getUserMetadataCefrLevel({
        user_metadata: {
          onboarding_data: {
            cefr_level: "phrases",
          },
        },
      }),
    ).toBeNull();
  });

  it("prefers user metadata CEFR over the fallback level", () => {
    expect(
      resolveEffectiveCefrLevel("S1", {
        user_metadata: {
          onboarding_data: {
            cefr_level: "S5",
          },
        },
      }),
    ).toBe("S5");
  });

  it("falls back to the provided level when metadata is missing", () => {
    expect(resolveEffectiveCefrLevel("S3", null)).toBe("S3");
  });
});
