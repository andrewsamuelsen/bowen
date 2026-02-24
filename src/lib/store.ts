import { create } from 'zustand';

interface AppStore {
  isChatOpen: boolean;
  setIsChatOpen: (isOpen: boolean) => void;
  hasCompletedDailyCard: boolean | null;
  setHasCompletedDailyCard: (completed: boolean) => void;
  hasReports: boolean | null;
  setHasReports: (hasReports: boolean) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  isChatOpen: false,
  setIsChatOpen: (isOpen) => set({ isChatOpen: isOpen }),
  hasCompletedDailyCard: null,
  setHasCompletedDailyCard: (completed) => set({ hasCompletedDailyCard: completed }),
  hasReports: null,
  setHasReports: (hasReports) => set({ hasReports }),
}));
