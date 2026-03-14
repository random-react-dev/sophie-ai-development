type AuthStateChangeCallback = (event: string, session: unknown) => void;

const mockResetConversation = jest.fn();
const mockResetGame = jest.fn();
const mockResetLearning = jest.fn();
const mockResetProfile = jest.fn();
const mockResetStats = jest.fn();
const mockResetTranslationHistory = jest.fn();
const mockSetHasSeenIntro = jest.fn();
const mockSetVocabularyState = jest.fn();

const mockChangePassword = jest.fn();
const mockGetSession = jest.fn();
const mockOnAuthStateChange = jest.fn();
const mockRefreshSession = jest.fn();
const mockResetPasswordForEmail = jest.fn();
const mockRpc = jest.fn();
const mockSend2FACode = jest.fn();
const mockSignInWithGoogle = jest.fn();
const mockSignInWithPassword = jest.fn();
const mockSignOut = jest.fn();
const mockSignUp = jest.fn();
const mockUpdateUserProfile = jest.fn();
const mockVerifyOtp = jest.fn();

let authStateChangeCallback: AuthStateChangeCallback | undefined;
let useAuthStore: typeof import("@/stores/authStore").useAuthStore;

jest.mock("expo-linking", () => ({
  createURL: jest.fn(() => "sophie://forgot-password"),
}));

jest.mock("@/services/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
      refreshSession: mockRefreshSession,
      resetPasswordForEmail: mockResetPasswordForEmail,
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
      signUp: mockSignUp,
      verifyOtp: mockVerifyOtp,
    },
    rpc: mockRpc,
  },
}));

jest.mock("@/services/supabase/auth", () => ({
  changePassword: mockChangePassword,
  send2FACode: mockSend2FACode,
  signInWithGoogle: mockSignInWithGoogle,
  updateUserProfile: mockUpdateUserProfile,
}));

jest.mock("@/stores/translationHistoryStore", () => ({
  useTranslationHistoryStore: {
    getState: () => ({ reset: mockResetTranslationHistory }),
  },
}));

jest.mock("@/stores/profileStore", () => ({
  useProfileStore: {
    getState: () => ({ reset: mockResetProfile }),
  },
}));

jest.mock("@/stores/learningStore", () => ({
  useLearningStore: {
    getState: () => ({ reset: mockResetLearning }),
  },
}));

jest.mock("@/stores/vocabularyStore", () => ({
  useVocabularyStore: {
    setState: mockSetVocabularyState,
  },
}));

jest.mock("@/stores/statsStore", () => ({
  useStatsStore: {
    getState: () => ({ reset: mockResetStats }),
  },
}));

jest.mock("@/stores/conversationStore", () => ({
  useConversationStore: {
    getState: () => ({ reset: mockResetConversation }),
  },
  useIntroStore: {
    getState: () => ({ setHasSeenIntro: mockSetHasSeenIntro }),
  },
}));

jest.mock("@/stores/gameStore", () => ({
  useGameStore: {
    getState: () => ({ reset: mockResetGame }),
  },
}));

const makeUser = (overrides: Record<string, unknown> = {}) =>
  ({
    id: "user-1",
    email: "learner@example.com",
    created_at: "2026-03-01T00:00:00.000Z",
    user_metadata: {
      onboarding_data: {
        completed_at: "2026-03-02T00:00:00.000Z",
      },
    },
    ...overrides,
  }) as any;

const makeSession = (overrides: Record<string, unknown> = {}) => {
  const user = (overrides.user as ReturnType<typeof makeUser>) ?? makeUser();

  return {
    access_token: "access-token",
    expires_at: 1_900_000_000,
    expires_in: 3600,
    refresh_token: "refresh-token",
    token_type: "bearer",
    user,
    ...overrides,
  } as any;
};

const flushMicrotasks = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

const getAsyncStorageMock = () =>
  require("@react-native-async-storage/async-storage").default;

const loadStore = () => {
  jest.resetModules();
  useAuthStore = require("@/stores/authStore").useAuthStore;
  return useAuthStore;
};

const initializeStore = async (session: Record<string, unknown> | null = null) => {
  loadStore();

  mockGetSession.mockResolvedValueOnce({
    data: { session },
    error: null,
  });

  if (session) {
    mockRefreshSession.mockResolvedValueOnce({
      data: { session },
      error: null,
    });
  }

  await useAuthStore.getState().initialize();
  expect(authStateChangeCallback).toBeDefined();
};

describe("authStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();

    authStateChangeCallback = undefined;

    mockChangePassword.mockResolvedValue({ error: null });
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockOnAuthStateChange.mockImplementation((callback: AuthStateChangeCallback) => {
      authStateChangeCallback = callback;
      return {
        data: {
          subscription: {
            unsubscribe: jest.fn(),
          },
        },
      };
    });
    mockRefreshSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    mockResetPasswordForEmail.mockResolvedValue({ error: null });
    mockRpc.mockResolvedValue({ error: null });
    mockSend2FACode.mockResolvedValue({ error: null });
    mockSignInWithGoogle.mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    });
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    });
    mockSignOut.mockImplementation(async () => {
      authStateChangeCallback?.("SIGNED_OUT", null);
      return { error: null };
    });
    mockSignUp.mockResolvedValue({ error: null });
    mockUpdateUserProfile.mockResolvedValue({ error: null });
    mockVerifyOtp.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("logs out without re-querying Supabase inside SIGNED_OUT", async () => {
    const session = makeSession();
    await initializeStore(session);

    jest.clearAllMocks();
    useAuthStore.setState({ session, user: session.user });

    await useAuthStore.getState().signOut();

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockGetSession).not.toHaveBeenCalled();
    expect(getAsyncStorageMock().multiRemove).toHaveBeenCalledTimes(1);
    expect(mockResetTranslationHistory).toHaveBeenCalledTimes(1);
    expect(mockResetProfile).toHaveBeenCalledTimes(1);
    expect(mockResetLearning).toHaveBeenCalledTimes(1);
    expect(mockSetVocabularyState).toHaveBeenCalledWith({
      items: [],
      folders: [],
      isLoading: false,
    });
    expect(mockResetStats).toHaveBeenCalledTimes(1);
    expect(mockResetConversation).toHaveBeenCalledTimes(1);
    expect(mockSetHasSeenIntro).toHaveBeenCalledWith(false);
    expect(mockResetGame).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("restores the session after an unexpected SIGNED_OUT if Supabase still has one", async () => {
    jest.useFakeTimers();

    const session = makeSession();
    const restoredSession = makeSession({
      access_token: "restored-access-token",
      user: makeUser({ id: "user-2", email: "restored@example.com" }),
    });

    await initializeStore(session);

    jest.clearAllMocks();
    useAuthStore.setState({ session, user: session.user });
    mockGetSession.mockResolvedValueOnce({
      data: { session: restoredSession },
      error: null,
    });

    authStateChangeCallback?.("SIGNED_OUT", null);

    expect(mockGetSession).not.toHaveBeenCalled();
    jest.runOnlyPendingTimers();
    await flushMicrotasks();

    expect(mockGetSession).toHaveBeenCalledTimes(1);
    expect(getAsyncStorageMock().multiRemove).not.toHaveBeenCalled();
    expect(useAuthStore.getState().session).toEqual(restoredSession);
    expect(useAuthStore.getState().user).toEqual(restoredSession.user);
  });

  it("clears user data after an unexpected SIGNED_OUT when no session remains", async () => {
    jest.useFakeTimers();

    const session = makeSession();
    await initializeStore(session);

    jest.clearAllMocks();
    useAuthStore.setState({ session, user: session.user });
    mockGetSession.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });

    authStateChangeCallback?.("SIGNED_OUT", null);

    jest.runOnlyPendingTimers();
    await flushMicrotasks();

    expect(mockGetSession).toHaveBeenCalledTimes(1);
    expect(getAsyncStorageMock().multiRemove).toHaveBeenCalledTimes(1);
    expect(mockResetTranslationHistory).toHaveBeenCalledTimes(1);
    expect(mockResetProfile).toHaveBeenCalledTimes(1);
    expect(mockResetLearning).toHaveBeenCalledTimes(1);
    expect(mockResetStats).toHaveBeenCalledTimes(1);
    expect(mockResetConversation).toHaveBeenCalledTimes(1);
    expect(mockResetGame).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("keeps the temporary 2FA sign-out path from clearing user data", async () => {
    const session = makeSession();
    await initializeStore(session);

    jest.clearAllMocks();
    useAuthStore.setState({
      pending2FA: true,
      pending2FAEmail: "learner@example.com",
      session,
      user: session.user,
    });

    authStateChangeCallback?.("SIGNED_OUT", null);

    expect(mockGetSession).not.toHaveBeenCalled();
    expect(getAsyncStorageMock().multiRemove).not.toHaveBeenCalled();
    expect(useAuthStore.getState().pending2FA).toBe(true);
    expect(useAuthStore.getState().pending2FAEmail).toBe("learner@example.com");
    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("uses the expected sign-out path for deleteAccount without a session retry", async () => {
    const session = makeSession();
    await initializeStore(session);

    jest.clearAllMocks();
    useAuthStore.setState({ session, user: session.user });

    await useAuthStore.getState().deleteAccount();

    expect(mockRpc).toHaveBeenCalledWith("delete_user");
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockGetSession).not.toHaveBeenCalled();
    expect(getAsyncStorageMock().multiRemove).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("keeps the expected sign-out marker through intermediate auth events", async () => {
    jest.useFakeTimers();

    const session = makeSession();
    const refreshedSession = makeSession({
      access_token: "refreshed-access-token",
      expires_at: 1_900_000_100,
    });

    await initializeStore(session);

    jest.clearAllMocks();
    useAuthStore.setState({ session, user: session.user });
    mockSignOut.mockImplementation(async () => {
      authStateChangeCallback?.("TOKEN_REFRESHED", refreshedSession);
      authStateChangeCallback?.("SIGNED_OUT", null);
      return { error: null };
    });

    await useAuthStore.getState().signOut();
    jest.runOnlyPendingTimers();
    await flushMicrotasks();

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockGetSession).not.toHaveBeenCalled();
    expect(getAsyncStorageMock().multiRemove).toHaveBeenCalledTimes(1);
    expect(mockResetTranslationHistory).toHaveBeenCalledTimes(1);
    expect(mockResetProfile).toHaveBeenCalledTimes(1);
    expect(mockResetLearning).toHaveBeenCalledTimes(1);
    expect(mockResetStats).toHaveBeenCalledTimes(1);
    expect(mockResetConversation).toHaveBeenCalledTimes(1);
    expect(mockResetGame).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });
});
