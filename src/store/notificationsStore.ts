import { create } from 'zustand';

interface NotificationsState {
  /** Global unread count for the header badge */
  unreadCount: number;
  /** Whether the notification panel is open */
  isPanelOpen: boolean;

  setUnreadCount: (count: number) => void;
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;
}

export const useNotificationsStore = create<NotificationsState>()((set) => ({
  unreadCount: 0,
  isPanelOpen: false,

  setUnreadCount: (count: number) => set({ unreadCount: count }),
  togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),
  openPanel: () => set({ isPanelOpen: true }),
  closePanel: () => set({ isPanelOpen: false }),
}));
