import { useEffect } from "react";
import { useAuth } from "./useAuth";
import { useToast } from "./useToast";
import {
  Notification,
  useNotificationStore,
} from "../stores/notifications.store";

const apiBaseUrl = (
  (import.meta as unknown as { env: Record<string, string> }).env
    .VITE_API_BASE_URL ?? ""
)
  .trim()
  .replace(/\/+$/, "");

export function useSseNotifications() {
  const { user } = useAuth();
  const addNotification = useNotificationStore((s) => s.addNotification);
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    const url = apiBaseUrl ? `${apiBaseUrl}/api/sse` : "/api/sse";
    const es = new EventSource(url, { withCredentials: true });

    es.onmessage = (e) => {
      try {
        const notification = JSON.parse(e.data as string) as Notification;
        addNotification(notification);
        toast(notification.title, "info");
      } catch {
        // ignorar mensajes malformados
      }
    };

    es.onerror = () => {
      // El browser reconecta automáticamente; no hay que hacer nada
    };

    return () => {
      es.close();
    };
  }, [user?.id]);
}
