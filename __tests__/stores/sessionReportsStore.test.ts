const mockGetSessionReports = jest.fn();
const mockSaveSessionReport = jest.fn();

jest.mock("@/services/supabase/sessionReports", () => ({
  getSessionReports: mockGetSessionReports,
  saveSessionReport: mockSaveSessionReport,
}));

describe("sessionReportsStore", () => {
  let useSessionReportsStore: typeof import("@/stores/sessionReportsStore").useSessionReportsStore;

  const makeReport = (overrides: Record<string, unknown> = {}) =>
    ({
      id: "report-1",
      user_id: "user-1",
      session_key: "session-1",
      learning_profile_id: "profile-1",
      scenario_title: "Coffee Shop",
      scenario_level: "S2",
      target_language: "Spanish",
      native_language: "English",
      duration_seconds: 95,
      message_count: 4,
      transcript: [
        {
          id: "m1",
          role: "user",
          text: "Hola",
          timestamp: 1,
        },
        {
          id: "m2",
          role: "model",
          text: "Hola, ¿cómo estás?",
          timestamp: 2,
        },
      ],
      created_at: "2026-03-14T10:00:00.000Z",
      completed_at: "2026-03-14T10:01:35.000Z",
      ...overrides,
    }) as any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    mockGetSessionReports.mockResolvedValue([]);
    mockSaveSessionReport.mockResolvedValue({
      report: null,
      inserted: false,
    });

    useSessionReportsStore =
      require("@/stores/sessionReportsStore").useSessionReportsStore;
  });

  it("starts empty", () => {
    const state = useSessionReportsStore.getState();

    expect(state.items).toEqual([]);
    expect(state.isLoading).toBe(false);
  });

  it("fetches and sorts reports by completed_at descending", async () => {
    const older = makeReport({
      id: "report-older",
      session_key: "session-older",
      completed_at: "2026-03-10T09:00:00.000Z",
    });
    const newer = makeReport({
      id: "report-newer",
      session_key: "session-newer",
      completed_at: "2026-03-12T09:00:00.000Z",
    });

    mockGetSessionReports.mockResolvedValue([older, newer]);

    await useSessionReportsStore.getState().fetchReports();

    expect(mockGetSessionReports).toHaveBeenCalledWith(20);
    expect(useSessionReportsStore.getState().items).toEqual([newer, older]);
  });

  it("prepends a newly inserted report", async () => {
    const report = makeReport();

    mockSaveSessionReport.mockResolvedValue({
      report,
      inserted: true,
    });

    const result = await useSessionReportsStore.getState().saveReport({
      sessionKey: "session-1",
      durationSeconds: 95,
      transcript: report.transcript,
    });

    expect(result).toEqual({
      report,
      inserted: true,
    });
    expect(useSessionReportsStore.getState().items).toEqual([report]);
  });

  it("upserts duplicate saves instead of duplicating the list", async () => {
    const existing = makeReport();

    useSessionReportsStore.setState({ items: [existing], isLoading: false });
    mockSaveSessionReport.mockResolvedValue({
      report: existing,
      inserted: false,
    });

    await useSessionReportsStore.getState().saveReport({
      sessionKey: "session-1",
      durationSeconds: 95,
      transcript: existing.transcript,
    });

    expect(useSessionReportsStore.getState().items).toEqual([existing]);
  });

  it("resets back to the initial state", () => {
    useSessionReportsStore.setState({
      items: [makeReport()],
      isLoading: true,
    });

    useSessionReportsStore.getState().reset();

    expect(useSessionReportsStore.getState().items).toEqual([]);
    expect(useSessionReportsStore.getState().isLoading).toBe(false);
  });
});
