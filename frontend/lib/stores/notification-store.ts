/**
 * Notification Store using Zustand
 * Global state management for notifications and alerts
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;

  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,

      addNotification: (notification) => {
        const newNotification: Notification = {
          ...notification,
          id: crypto.randomUUID(),
          timestamp: new Date(),
          isRead: false,
        };

        set((state) => ({
          notifications: [newNotification, ...state.notifications],
          unreadCount: state.unreadCount + 1,
        }));
      },

      markAsRead: (id) => {
        set((state) => {
          const notification = state.notifications.find((n) => n.id === id);
          if (!notification || notification.isRead) {
            return state;
          }

          return {
            notifications: state.notifications.map((n) =>
              n.id === id ? { ...n, isRead: true } : n
            ),
            unreadCount: Math.max(0, state.unreadCount - 1),
          };
        });
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
          unreadCount: 0,
        }));
      },

      removeNotification: (id) => {
        set((state) => {
          const notification = state.notifications.find((n) => n.id === id);
          return {
            notifications: state.notifications.filter((n) => n.id !== id),
            unreadCount:
              notification && !notification.isRead
                ? Math.max(0, state.unreadCount - 1)
                : state.unreadCount,
          };
        });
      },

      clearAll: () => {
        set({ notifications: [], unreadCount: 0 });
      },
    }),
    {
      name: 'notification-storage',
      // Only persist notifications for 7 days
      partialize: (state) => ({
        notifications: state.notifications.filter((n) => {
          const daysSinceCreation = Math.floor(
            (Date.now() - new Date(n.timestamp).getTime()) / (1000 * 60 * 60 * 24)
          );
          return daysSinceCreation < 7;
        }),
      }),
      storage: createJSONStorage(() => localStorage, {
        reviver: (key, value) => {
          // Convert timestamp strings back to Date objects
          if (key === 'timestamp' && typeof value === 'string') {
            return new Date(value);
          }
          return value;
        },
      }),
    }
  )
);

// Helper function to trigger notifications from anywhere in the app
export const notify = {
  success: (title: string, message: string, actionUrl?: string, actionLabel?: string) => {
    useNotificationStore.getState().addNotification({
      type: 'success',
      title,
      message,
      actionUrl,
      actionLabel,
    });
  },

  error: (title: string, message: string, actionUrl?: string, actionLabel?: string) => {
    useNotificationStore.getState().addNotification({
      type: 'error',
      title,
      message,
      actionUrl,
      actionLabel,
    });
  },

  warning: (title: string, message: string, actionUrl?: string, actionLabel?: string) => {
    useNotificationStore.getState().addNotification({
      type: 'warning',
      title,
      message,
      actionUrl,
      actionLabel,
    });
  },

  info: (title: string, message: string, actionUrl?: string, actionLabel?: string) => {
    useNotificationStore.getState().addNotification({
      type: 'info',
      title,
      message,
      actionUrl,
      actionLabel,
    });
  },
};
