// Deploy: `supabase functions deploy translate-text --no-verify-jwt`
// (`verify_jwt = false` is set in supabase/config.toml because the new 2026
// sb_publishable_ key format breaks the platform-level JWT gateway —
// see https://github.com/orgs/supabase/discussions/41834. Authentication is
// still enforced internally below via `supabaseClient.auth.getUser()`.)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_MODEL = 'models/gemini-2.5-flash';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TranslationResult {
    translation: string;
    romanization: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function readStringField(source: Record<string, unknown>, key: string): string | null {
    const value = source[key];
    return typeof value === 'string' ? value : null;
}

function extractGeminiText(data: unknown): string | null {
    if (!isRecord(data) || !Array.isArray(data.candidates)) {
        return null;
    }

    const candidate = data.candidates[0];
    if (!isRecord(candidate) || !isRecord(candidate.content)) {
        return null;
    }

    const parts = candidate.content.parts;
    if (!Array.isArray(parts)) {
        return null;
    }

    const firstPart = parts[0];
    if (!isRecord(firstPart)) {
        return null;
    }

    return readStringField(firstPart, 'text')?.trim() || null;
}

function parseTranslation(rawText: string): TranslationResult {
    const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
        const parsed: unknown = JSON.parse(cleanedText);
        if (isRecord(parsed)) {
            const translation = readStringField(parsed, 'translation') || cleanedText;
            const romanization = readStringField(parsed, 'romanization') || '';
            return { translation, romanization };
        }
    } catch {
        // Gemini occasionally returns plain text. Keep that as the translation.
    }

    return { translation: cleanedText, romanization: '' };
}

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error occurred';
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        );

        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401,
            });
        }

        const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
        if (!GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY is not configured');
        }

        const body: unknown = await req.json();
        if (!isRecord(body)) {
            return new Response(JSON.stringify({ error: 'Invalid request body' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            });
        }

        const text = readStringField(body, 'text')?.trim();
        const sourceLang = readStringField(body, 'sourceLang');
        const targetLang = readStringField(body, 'targetLang')?.trim();

        if (!text || !targetLang) {
            return new Response(JSON.stringify({ error: 'Missing required fields: text and targetLang' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            });
        }

        const sourceInfo = sourceLang ? `from ${sourceLang} ` : '';
        const prompt = `Translate the following text ${sourceInfo}to ${targetLang}.

Return a JSON object with exactly two fields:
1. "translation": the translated text
2. "romanization": the pronunciation in English letters

Ensure the response is raw valid JSON without markdown code blocks.

Text to translate: "${text}"`;

        const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/${GEMINI_MODEL}:generateContent`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': GEMINI_API_KEY,
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 1024,
                    }
                })
            }
        );

        if (!geminiResponse.ok) {
            const errorData = await geminiResponse.text();
            console.error('Gemini API error:', errorData);
            throw new Error(`Gemini API error: ${geminiResponse.status}`);
        }

        const rawText = extractGeminiText(await geminiResponse.json());
        if (!rawText) {
            throw new Error('No translation received from Gemini');
        }

        const result = parseTranslation(rawText);

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: unknown) {
        const errorMessage = getErrorMessage(error);
        console.error('Translation error:', errorMessage);

        return new Response(JSON.stringify({ error: errorMessage }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});
