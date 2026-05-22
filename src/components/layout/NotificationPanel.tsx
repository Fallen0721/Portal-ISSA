import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Bell } from "lucide-react";
import {
  useNotificationStore,
  Notification,
} from "../../stores/notifications.store";

interface NotificationPanelProps {
  onClose: () => void;
}

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${Math.floor(hours / 24)}d`;
};

const NotificationItem = ({
  notification,
  onClick,
}: {
  notification: Notification;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`w-full border-b border-slate-100 px-4 py-3 text-left transition-colors last:border-none hover:bg-slate-50 ${
      notification.read ? "opacity-60" : ""
    }`}
  >
    <div className="flex items-start gap-2">
      {!notification.read && (
        <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-accent" />
      )}
      <div className={notification.read ? "pl-4" : ""}>
        <p className="text-sm font-medium text-slate-800">
          {notification.title}
        </p>
        <p className="text-xs text-slate-500">{notification.message}</p>
        <p className="mt-1 text-[10px] text-slate-400">
          {timeAgo(notification.createdAt)}
        </p>
      </div>
    </div>
  </button>
);

export const NotificationPanel = ({ onClose }: NotificationPanelProps) => {
  const navigate = useNavigate();
  const { notifications, loadNotifications, markAsRead, markAllAsRead, getUnreadCount } =
    useNotificationStore();

  const displayed = notifications.slice(0, 20);
  const unread = getUnreadCount();

  const handleClick = async (n: Notification) => {
    await markAsRead(n.id);
    if (n.linkTo) {
      navigate(n.linkTo);
    }
    onClose();
  };

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h4 className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <Bell size={14} />
          Notificaciones
          {unread > 0 && (
            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent">
              {unread}
            </span>
          )}
        </h4>
        {unread > 0 && (
          <button
            onClick={() => void markAllAsRead()}
            className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
          >
            <Check size={12} />
            Marcar todas
          </button>
        )}
      </div>

      <div className="max-h-80 overflow-y-auto">
        {displayed.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-400">
            Sin notificaciones
          </div>
        ) : (
          displayed.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onClick={() => void handleClick(n)}
            />
          ))
        )}
      </div>
    </div>
  );
};
