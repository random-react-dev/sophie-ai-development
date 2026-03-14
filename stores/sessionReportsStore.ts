import {
  CreateSessionReportInput,
  SessionReport,
  SaveSessionReportResult,
  getSessionReports,
  saveSessionReport,
} from "@/services/supabase/sessionReports";
import { create } from "zustand";

interface SessionReportsState {
  items: SessionReport[];
  isLoading: boolean;
  fetchReports: (limit?: number) => Promise<void>;
  saveReport: (
    input: CreateSessionReportInput,
  ) => Promise<SaveSessionReportResult>;
  reset: () => void;
}

const initialState = {
  items: [] as SessionReport[],
  isLoading: false,
};

const sortReports = (reports: SessionReport[]): SessionReport[] =>
  [...reports].sort(
    (left, right) =>
      new Date(right.completed_at).getTime() -
      new Date(left.completed_at).getTime(),
  );

export const useSessionReportsStore = create<SessionReportsState>((set) => ({
  ...initialState,

  fetchReports: async (limit = 20) => {
    set({ isLoading: true });
    try {
      const reports = await getSessionReports(limit);
      set({ items: sortReports(reports) });
    } finally {
      set({ isLoading: false });
    }
  },

  saveReport: async (input) => {
    const result = await saveSessionReport(input);

    if (result.report) {
      const savedReport = result.report;
      set((state) => {
        const nextItems = state.items.filter(
          (report) =>
            report.id !== savedReport.id &&
            report.session_key !== savedReport.session_key,
        );

        return {
          items: sortReports([savedReport, ...nextItems]),
        };
      });
    }

    return result;
  },

  reset: () => set(initialState),
}));

export const useSessionReports = (): SessionReport[] =>
  useSessionReportsStore((state) => state.items);

export const useSessionReportsLoading = (): boolean =>
  useSessionReportsStore((state) => state.isLoading);
