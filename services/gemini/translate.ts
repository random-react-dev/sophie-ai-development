import { supabase } from "../supabase/client";

export interface TranslationResult {
  translation: string;
  romanization: string;
}

interface TranslateFunctionResponse {
  translation?: unknown;
  romanization?: unknown;
  translatedText?: unknown;
}

export const translateText = async (
  text: string,
  targetLanguage: string,
  sourceLanguage?: string,
): Promise<TranslationResult> => {
  try {
    await supabase.auth.refreshSession();

    const { data, error } =
      await supabase.functions.invoke<TranslateFunctionResponse>(
        "translate-text",
        {
          body: {
            text,
            sourceLang: sourceLanguage,
            targetLang: targetLanguage,
          },
        },
      );

    if (error) {
      throw new Error(error.message);
    }

    const translation =
      typeof data?.translation === "string"
        ? data.translation
        : typeof data?.translatedText === "string"
          ? data.translatedText
          : "";
    const romanization =
      typeof data?.romanization === "string" ? data.romanization : "";

    if (!translation) {
      throw new Error("No translation received");
    }

    return { translation, romanization };
  } catch (error) {
    console.error("Translation error:", error);
    throw error;
  }
};
