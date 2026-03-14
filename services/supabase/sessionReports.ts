import { supabase } from "./client";

export interface SessionReportMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: number;
}

export interface SessionReport {
  id: string;
  user_id: string;
  session_key: string;
  learning_profile_id: string | null;
  scenario_title: string | null;
  scenario_level: string | null;
  target_language: string | null;
  native_language: string | null;
  duration_seconds: number;
  message_count: number;
  transcript: SessionReportMessage[];
  created_at: string;
  completed_at: string;
}

export interface CreateSessionReportInput {
  sessionKey: string;
  learningProfileId?: string | null;
  scenarioTitle?: string | null;
  scenarioLevel?: string | null;
  targetLanguage?: string | null;
  nativeLanguage?: string | null;
  durationSeconds: number;
  transcript: SessionReportMessage[];
  completedAt?: string;
}

export interface SaveSessionReportResult {
  report: SessionReport | null;
  inserted: boolean;
}

const sanitizeTranscript = (
  transcript: SessionReportMessage[],
): SessionReportMessage[] =>
  transcript
    .map((message) => ({
      id: message.id,
      role: message.role,
      text: message.text.trim(),
      timestamp: message.timestamp,
    }))
    .filter((message) => message.text.length > 0);

export const getSessionReports = async (limit = 20): Promise<SessionReport[]> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase
      .from("session_reports")
      .select("*")
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return (data ?? []) as SessionReport[];
  } catch (error) {
    console.error("Error fetching session reports:", error);
    return [];
  }
};

export const saveSessionReport = async (
  input: CreateSessionReportInput,
): Promise<SaveSessionReportResult> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const transcript = sanitizeTranscript(input.transcript);
    const completedAt = input.completedAt || new Date().toISOString();

    const payload = {
      user_id: user.id,
      session_key: input.sessionKey,
      learning_profile_id: input.learningProfileId ?? null,
      scenario_title: input.scenarioTitle ?? null,
      scenario_level: input.scenarioLevel ?? null,
      target_language: input.targetLanguage ?? null,
      native_language: input.nativeLanguage ?? null,
      duration_seconds: Math.max(0, Math.round(input.durationSeconds)),
      message_count: transcript.length,
      transcript,
      completed_at: completedAt,
    };

    const { data, error } = await supabase
      .from("session_reports")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        const { data: existing, error: existingError } = await supabase
          .from("session_reports")
          .select("*")
          .eq("user_id", user.id)
          .eq("session_key", input.sessionKey)
          .single();

        if (existingError) {
          throw existingError;
        }

        return {
          report: existing as SessionReport,
          inserted: false,
        };
      }

      throw error;
    }

    return {
      report: data as SessionReport,
      inserted: true,
    };
  } catch (error) {
    console.error("Error saving session report:", error);
    return {
      report: null,
      inserted: false,
    };
  }
};
