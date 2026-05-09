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
  const buildFreeSpeakingConfig = () =>
    buildTalkSessionConfig({
      targetLanguage,
      nativeLanguage,
      accentDesc: "Andalusian Spanish from Seville",
      currentCefrLevel: "S1",
      hasSeenIntro: false,
      practicePhrase: "Hola mundo",
      selectedScenario: scenario,
      talkMode: "free_speaking",
    });

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

  it("builds free speaking configuration without tutor or scenario flow", () => {
    const result = buildFreeSpeakingConfig();

    expect(result.instruction).toContain(
      "You are Sophie AI, a casual warm friend",
    );
    expect(result.instruction).not.toContain("Scenario: Ordering Coffee");
    expect(result.instruction).not.toContain("The user wants to practice the phrase");
  });

  it("does not put selected target, native, or accent language instructions into free speaking", () => {
    const result = buildFreeSpeakingConfig();

    expect(result.instruction).not.toContain("Spanish");
    expect(result.instruction).not.toContain("English");
    expect(result.instruction).not.toContain("Andalusian");
    expect(result.instruction).not.toContain("Seville");
    expect(result.instruction).not.toContain("support language");
    expect(result.instruction).not.toContain("target language");
  });

  it("adds same-language and language-switching rules for free speaking", () => {
    const result = buildFreeSpeakingConfig();

    expect(result.instruction).toContain(
      "Detect the user's current spoken language from each turn.",
    );
    expect(result.instruction).toContain("Reply in that same language.");
    expect(result.instruction).toContain(
      "If the user switches language, switch with them.",
    );
  });

  it("adds no-correction and no-tutor rules for free speaking", () => {
    const result = buildFreeSpeakingConfig();

    expect(result.instruction).toContain(
      "Do not correct grammar, pronunciation, or word choice.",
    );
    expect(result.instruction).toContain(
      "Do not give feedback, scores, drills, lessons, vocabulary highlights, homework",
    );
    expect(result.instruction).toContain(
      "Do not act like a teacher, tutor, examiner, coach, or roleplay character.",
    );
  });

  it("does not auto-greet in free speaking", () => {
    const result = buildFreeSpeakingConfig();

    expect(result.initialPrompt).toBeUndefined();
  });
});
