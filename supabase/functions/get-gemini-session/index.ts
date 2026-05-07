// Deploy: `supabase functions deploy get-gemini-session --no-verify-jwt`
// (`verify_jwt = false` is set in supabase/config.toml because the new 2026
// sb_publishable_ key format breaks the platform-level JWT gateway —
// see https://github.com/orgs/supabase/discussions/41834. Authentication is
// still enforced internally below via `supabaseClient.auth.getUser()`.)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { GoogleGenAI } from 'npm:@google/genai@1.52.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TOKEN_TTL_MS = 2 * 60 * 60 * 1000;
const TOKEN_USES = 10;

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

        const {
            data: { user },
        } = await supabaseClient.auth.getUser();

        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401,
            });
        }

        const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
        if (!GEMINI_API_KEY) {
            throw new Error('Missing GEMINI_API_KEY');
        }

        const client = new GoogleGenAI({
            apiKey: GEMINI_API_KEY,
            httpOptions: { apiVersion: 'v1alpha' },
        });
        const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

        const token = await client.authTokens.create({
            config: {
                uses: TOKEN_USES,
                expireTime: expiresAt,
                newSessionExpireTime: expiresAt,
                httpOptions: { apiVersion: 'v1alpha' },
            },
        });

        if (!token.name) {
            throw new Error('Gemini did not return an auth token');
        }

        return new Response(JSON.stringify({ token: token.name, expiresAt }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    } catch (error: unknown) {
        return new Response(JSON.stringify({ error: getErrorMessage(error) }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
