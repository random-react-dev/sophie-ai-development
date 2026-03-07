import { useTranslation } from "@/hooks/useTranslation";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "expo-router";

/**
 * A hook to enforce subscription trial limits across the app.
 */
export const useTrialGuard = () => {
  const router = useRouter();
  const { checkTrialStatus, setShowTrialPopup } = useAuthStore();
  const { t } = useTranslation();

  /**
   * Checks if the user's trial has expired and they don't have a subscription.
   * If they are blocked, it redirects them to the subscription page and shows the trial modal.
   *
   * @returns {boolean} true if the user is allowed to proceed, false if they were blocked and redirected.
   */
  const requireActiveSubscription = (): boolean => {
    const status = checkTrialStatus();

    if (status.isTrialExpired) {
      // Show the trial popup which is now hard-locked (no close button) in expired state
      setShowTrialPopup(true);

      return false; // Blocked
    }

    return true; // Allowed
  };

  return { requireActiveSubscription };
};
