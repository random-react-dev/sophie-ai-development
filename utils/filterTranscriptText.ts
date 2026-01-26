/**
 * Filters out internal reasoning/thinking text from AI transcription.
 * Removes text that starts with bold markdown headers (**...**) and
 * internal monologue patterns before the actual spoken content.
 */
export function filterTranscriptText(text: string): string {
  // Remove bold markdown sections (internal thinking headers)
  // Pattern: **text** at start of content or after newlines
  const filtered = text.replace(/^\*\*[^*]+\*\*\s*/gm, "");

  // Split by double newlines (paragraphs)
  const paragraphs = filtered.split(/\n\s*\n/).filter((p) => p.trim());

  // If multiple paragraphs, internal reasoning is typically first
  // Keep only paragraphs that don't look like meta-commentary
  const contentParagraphs = paragraphs.filter((p) => {
    const trimmed = p.trim();
    // Skip if starts with "I've", "I am", "I'm" (internal monologue patterns)
    if (/^I(?:'ve|'m| am| have)\s/i.test(trimmed)) return false;
    return true;
  });

  // Return filtered content or original if filtering removed everything
  const result = contentParagraphs.join("\n\n").trim();
  return result || text.trim();
}
