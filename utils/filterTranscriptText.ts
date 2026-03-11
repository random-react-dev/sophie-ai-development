/**
 * Filters out internal reasoning/thinking text from AI transcription.
 * Removes text that starts with bold markdown headers (**...**) and
 * internal monologue patterns before the actual spoken content.
 */
export function filterTranscriptText(text: string): string {
  // Remove <thinking>...</thinking> XML blocks (common Gemini leak format)
  let filtered = text.replace(/<thinking>[\s\S]*?<\/thinking>/gi, "");

  // Unwrap markdown bold/italic (keep content, strip asterisks)
  // **Namaste** → Namaste, *laughs* → laughs, ***bold italic*** → bold italic
  filtered = filtered.replace(/\*{1,3}(.+?)\*{1,3}/g, "$1");

  // Remove bracket/paren markers ([thinking], (internal monologue), etc.)
  filtered = filtered.replace(/\[(?:thinking|internal)[^\]]*\]/gi, "");
  filtered = filtered.replace(/\((?:thinking|internal)[^)]*\)/gi, "");

  // Split by double newlines (paragraphs)
  const paragraphs = filtered.split(/\n\s*\n/).filter((p) => p.trim());

  // If multiple paragraphs, internal reasoning is typically first
  // Keep only paragraphs that don't look like meta-commentary
  const contentParagraphs = paragraphs.filter((p) => {
    const trimmed = p.trim();

    // 1. Skip if starts with "I've", "I am", "I'm" (internal monologue patterns)
    if (/^I(?:'ve|'m| am| have)\s/i.test(trimmed)) return false;

    // 2. Skip conversational planning/confirmation (e.g., "Okay, I've got it.", "My plan is...")
    // Catches: "Okay, I...", "Understood, I...", "Right, I...", "My focus...", "I will..."
    if (/^(?:Okay|Right|Understood|Got it|Sure|Alright)[,.]\s*I/i.test(trimmed))
      return false;
    if (
      /^(?:My|The)\s+(?:initial\s+)?(?:focus|plan|goal|aim)\s+is/i.test(trimmed)
    )
      return false;
    if (
      /^I\s+(?:will|ll)\s+(?:start|begin|introduce|ask|greet|proceed)/i.test(
        trimmed,
      )
    )
      return false;
    if (/^I\s+am\s+set\s+to\s+proceed/i.test(trimmed)) return false;

    return true;
  });

  // Return filtered content or original if filtering removed everything
  const result = contentParagraphs.join("\n\n").trim();
  return result;
}
