import { buildTalkSessionConfig } from "@/utils/talkSessionConfig";

const targetLanguage = {
  code: "es",
  name: "Spanish",
  nativeName: "Español",
  countryCode: "ES",
  flag: "ES",
} as const;

const nativeLanguage = {
  code: "en",
  name: "English",
  nativeName: "English",
  countryCode: "US",
  flag: "EN",
} as const;

const scenario = {
  id: "ordering-coffee",
  title: "Ordering Coffee",
  category: "Food & Drink",
  description: "Order coffee at a cafe.",
  sophieRole: "Friendly barista",
  userRole: "Customer",
  topic: "Daily Life",
  level: "S1",
  context: "A busy morning cafe with a breakfast crowd.",
  icon: "coffee",
} as const;

describe("buildTalkSessionConfig", () => {
  it("builds scenario-first configuration when a scenario is selected", () => {
    const result = buildTalkSessionConfig({
      targetLanguage,
      nativeLanguage,
      accentDesc: null,
      currentCefrLevel: "S1",
      hasSeenIntro: false,
      practicePhrase: null,
      selectedScenario: scenario,
    });

    expect(result.instruction).toContain("Scenario: Ordering Coffee");
    expect(result.instruction).toContain("You are: Friendly barista");
    expect(result.instruction).toContain(
      "Setting & situation: A busy morning cafe with a breakfast crowd.",
    );
    expect(result.instruction).not.toContain(
      "teach them 'hello' in Spanish ('Hola') and ask them to try saying it",
    );
    expect(result.initialPrompt).toContain(
      "Set the scene and speak your opening line as Friendly barista.",
    );
  });

  it("builds generic tutor introduction only when no scenario or practice phrase is active", () => {
    const result = buildTalkSessionConfig({
      targetLanguage,
      nativeLanguage,
      accentDesc: null,
      currentCefrLevel: "S1",
      hasSeenIntro: false,
      practicePhrase: null,
      selectedScenario: null,
    });

    expect(result.instruction).toContain(
      "teach them 'hello' in Spanish ('Hola') and ask them to try saying it",
    );
    expect(result.initialPrompt).toContain('Introduce yourself briefly: "Hi, I am Sophie!"');
  });
});
