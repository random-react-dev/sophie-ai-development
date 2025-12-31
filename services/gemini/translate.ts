// Gemini API translation service - direct API call
// Based on working reference: /Users/niravramani/dyad-apps/sparkling-lynx-roll/realtalk/src/lib/gemini.ts

const GEMINI_MODEL = 'models/gemini-2.0-flash-exp';

interface GeminiResponse {
    candidates?: Array<{
        content?: {
            parts?: Array<{
                text?: string;
            }>;
        };
    }>;
    error?: {
        message?: string;
    };
}

export const translateText = async (
    text: string,
    targetLanguage: string,
    sourceLanguage?: string
): Promise<string> => {
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error('Gemini API key not configured');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

    const sourceInfo = sourceLanguage ? `from ${sourceLanguage} ` : '';
    const prompt = `Translate the following text ${sourceInfo}to ${targetLanguage}. Return only the translated text, nothing else.\n\n"${text}"`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Gemini API HTTP error:', response.status, errorText);
            throw new Error(`API error: ${response.status}`);
        }

        const data: GeminiResponse = await response.json();

        const translatedText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        if (!translatedText) {
            throw new Error('No translation received');
        }

        return translatedText;
    } catch (error) {
        console.error('Translation error:', error);
        throw error;
    }
};
