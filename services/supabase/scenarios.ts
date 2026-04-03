import { CEFRLevel, Scenario } from "@/constants/scenarios";
import { supabase } from "./client";

interface SharedScenarioRow {
  id: string;
  user_id: string;
  title: string;
  category: string;
  description: string;
  sophie_role: string;
  user_role: string;
  topic: string;
  level: string;
  context: string;
  icon: string;
  created_at: string;
}

/**
 * Upload a custom scenario to Supabase so it can be shared via link.
 * Returns the UUID (share token) on success, or null on failure.
 */
export const shareScenario = async (
  scenario: Scenario
): Promise<string | null> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from("shared_scenarios")
      .insert({
        user_id: user.id,
        title: scenario.title,
        category: scenario.category,
        description: scenario.description,
        sophie_role: scenario.sophieRole,
        user_role: scenario.userRole,
        topic: scenario.topic,
        level: scenario.level,
        context: scenario.context,
        icon: scenario.icon,
      })
      .select("id")
      .single();

    if (error) throw error;
    return (data as { id: string }).id;
  } catch (error) {
    console.error("Error sharing scenario:", error);
    return null;
  }
};

/**
 * Fetch a shared scenario by its token (UUID from shared_scenarios.id).
 * Returns a Scenario object or null if not found.
 */
export const getSharedScenario = async (
  token: string
): Promise<Scenario | null> => {
  try {
    const { data, error } = await supabase
      .from("shared_scenarios")
      .select("*")
      .eq("id", token)
      .single();

    if (error) throw error;
    const row = data as SharedScenarioRow;

    return {
      id: `shared-${row.id}`,
      title: row.title,
      category: row.category,
      description: row.description,
      sophieRole: row.sophie_role,
      userRole: row.user_role,
      topic: row.topic,
      level: row.level as CEFRLevel,
      context: row.context,
      icon: row.icon,
      isCustom: true,
      shareToken: row.id,
    };
  } catch (error) {
    console.error("Error fetching shared scenario:", error);
    return null;
  }
};
