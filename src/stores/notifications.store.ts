import { create } from "zustand";
import { NotificacionesService } from "../services/notificaciones.service";

export interface Notification {
  id: string;
  type: "venta_nueva" | "cotizacion_convertida" | "permiso_solicitado" | "system" | "mencion" | "cambio_status";
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  linkTo?: string;
}

const MAX_NOTIFICATIONS = 50;

interface NotificationStore {
  notifications: Notification[];
  loading: boolean;
  loadNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: Notification) => void;
  clear: () => void;
  getUnreadCount: () => number;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  loading: false,

  loadNotifications: async () => {
    set({ loading: true });
    try {
      const notifications = await NotificacionesService.getAll();
      set({
        notifications: notifications.slice(0, MAX_NOTIFICATIONS),
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },

  markAsRead: async (id) => {
    await NotificacionesService.markAsRead(id);
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      );
      return { notifications: updated };
    });
  },

  markAllAsRead: async () => {
    await NotificacionesService.markAllAsRead();
    set((state) => {
      const updated = state.notifications.map((n) => ({ ...n, read: true }));
      return { notifications: updated };
    });
  },

  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications].slice(
        0,
        MAX_NOTIFICATIONS,
      ),
    })),

  clear: () => set({ notifications: [], loading: false }),

  getUnreadCount: () => {
    return get().notifications.filter((n) => !n.read).length;
  },
}));
