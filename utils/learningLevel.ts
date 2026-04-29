import { CEFRLevel, CEFR_LEVELS } from "@/constants/scenarios";

interface UserMetadataLike {
  onboarding_data?: {
    cefr_level?: unknown;
  };
}

interface UserLike {
  user_metadata?: UserMetadataLike;
}

export function isCefrLevel(value: unknown): value is CEFRLevel {
  return (
    typeof value === "string" &&
    CEFR_LEVELS.includes(value as CEFRLevel)
  );
}

export function getUserMetadataCefrLevel(
  user: UserLike | null | undefined,
): CEFRLevel | null {
  const level = user?.user_metadata?.onboarding_data?.cefr_level;
  return isCefrLevel(level) ? level : null;
}

export function resolveEffectiveCefrLevel(
  fallbackLevel: CEFRLevel,
  user: UserLike | null | undefined,
): CEFRLevel {
  return getUserMetadataCefrLevel(user) ?? fallbackLevel;
}
