import { useEffect, useRef, useState } from "react";
import { Bell, LogOut, Menu } from "lucide-react";
import { ROLE_LABELS } from "../../types/models";
import { useAuth } from "../../hooks/useAuth";
import { useNotificationStore } from "../../stores/notifications.store";
import { NotificationPanel } from "./NotificationPanel";

interface TopbarProps {
  onMenuClick: () => void;
}

export const Topbar = ({ onMenuClick }: TopbarProps) => {
  const { user, logout } = useAuth();
  const unreadCount = useNotificationStore((s) => s.getUnreadCount());
  const loadNotifications = useNotificationStore((s) => s.loadNotifications);
  const clearNotifications = useNotificationStore((s) => s.clear);
  const [showPanel, setShowPanel] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      clearNotifications();
      return;
    }

    void loadNotifications();
  }, [clearNotifications, loadNotifications, user?.id]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowPanel(false);
      }
    };
    if (showPanel) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPanel]);

  if (!user) return null;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
        >
          <Menu size={24} />
        </button>
        <div className="hidden md:block">
          <h1 className="text-lg font-semibold text-slate-800">
            Portal Corporativo
          </h1>
          <p className="text-xs text-slate-500">
            Sesión activa: {ROLE_LABELS[user.role]}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative" ref={panelRef}>
          <button
            onClick={() => setShowPanel(!showPanel)}
            className="relative rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-50"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white ring-2 ring-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          {showPanel && (
            <NotificationPanel onClose={() => setShowPanel(false)} />
          )}
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <LogOut size={16} />
          Salir
        </button>
      </div>
    </header>
  );
};
