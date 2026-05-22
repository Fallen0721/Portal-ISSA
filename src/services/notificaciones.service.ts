import { apiRequest } from "./api.service";
import type { Notification } from "../stores/notifications.store";

export const NotificacionesService = {
  getAll: () => apiRequest<Notification[]>("/api/notificaciones"),

  markAsRead: (id: string) =>
    apiRequest<{ ok: boolean }>(`/api/notificaciones/${id}/leida`, {
      method: "POST",
    }),

  markAllAsRead: () =>
    apiRequest<{ ok: boolean }>("/api/notificaciones/leidas", {
      method: "POST",
    }),
};
