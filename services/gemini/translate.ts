// Gemini API translation service - direct API call
// Based on working reference: /Users/niravramani/dyad-apps/sparkling-lynx-roll/realtalk/src/lib/gemini.ts

const GEMINI_MODEL = 'models/gemini-2.0-flash-exp';

export interface TranslationResult {
    translation: string;
    romanization: string;
}

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
): Promise<TranslationResult> => {
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error('Gemini API key not configured');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

    const sourceInfo = sourceLanguage ? `from ${sourceLanguage} ` : '';
    const prompt = `Translate the following text ${sourceInfo}to ${targetLanguage}. 
    
    Return a JSON object with exactly two fields:
    1. "translation": the translated text
    2. "romanization": the pronunciation in English letters (e.g., for Hindi "नमस्ते" -> "Namaste", for Spanish "Hola" -> "Hola")
    
    Ensure the response is raw valid JSON without markdown code blocks.
    
    Text to translate: "${text}"`;

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

        let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        if (!rawText) {
            throw new Error('No translation received');
        }

        // Clean up markdown code blocks if present
        rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

        try {
            const result = JSON.parse(rawText) as TranslationResult;
            return {
                translation: result.translation || rawText, // Fallback if parsing fails structure but is valid json
                romanization: result.romanization || ''
            };
        } catch (parseError) {
            console.warn('Failed to parse JSON response, falling back to raw text', rawText);
            // Fallback: assume the whole text is the translation if JSON parsing fails
            return {
                translation: rawText,
                romanization: ''
            };
        }
    } catch (error) {
        console.error('Translation error:', error);
        throw error;
    }
};
