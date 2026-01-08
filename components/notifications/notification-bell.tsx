"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Check, X, Loader2, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  icon: string | null;
  priority: string;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/notifications?limit=10");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    // Poll for new notifications every 60 seconds
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notification_ids: [notificationId] }),
      });

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const dismissNotification = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: "DELETE",
      });

      const notification = notifications.find((n) => n.id === notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      if (notification && !notification.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Failed to dismiss:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mark_all: true }),
      });

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const getIcon = (notification: Notification) => {
    if (notification.icon) return notification.icon;

    // Default icons by type
    const typeIcons: Record<string, string> = {
      chore_completed: "✅",
      chore_approved: "👏",
      chore_rejected: "❌",
      allowance_paid: "💰",
      savings_goal_reached: "🎯",
      birthday_reminder: "🎂",
      bill_due_soon: "📅",
      envelope_low: "⚠️",
      achievement_unlocked: "🏆",
      system_announcement: "📢",
    };

    return typeIcons[notification.type] || "📬";
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "border-l-red-500";
      case "high":
        return "border-l-amber-500";
      case "medium":
        return "border-l-blue-500";
      default:
        return "border-l-gray-300";
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs font-bold text-white bg-red-500 rounded-full">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-text-dark">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs text-sage hover:text-sage-dark"
            >
              Mark all read
            </Button>
          )}
        </div>

        {/* Notifications list */}
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-sage" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-text-medium text-sm">No notifications yet</p>
              <p className="text-text-light text-xs mt-1">
                We&apos;ll let you know when something happens
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`px-4 py-3 hover:bg-gray-50 transition-colors border-l-4 ${getPriorityColor(notification.priority)} ${
                    !notification.is_read ? "bg-blue-50/50" : ""
                  }`}
                >
                  <div className="flex gap-3">
                    <span className="text-xl flex-shrink-0">
                      {getIcon(notification)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm text-text-dark line-clamp-1">
                          {notification.title}
                        </p>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {!notification.is_read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="p-1 hover:bg-gray-200 rounded"
                              title="Mark as read"
                            >
                              <Check className="h-3 w-3 text-sage" />
                            </button>
                          )}
                          <button
                            onClick={() => dismissNotification(notification.id)}
                            className="p-1 hover:bg-gray-200 rounded"
                            title="Dismiss"
                          >
                            <X className="h-3 w-3 text-gray-400" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-text-medium mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-text-light">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                        {notification.action_url && (
                          <Link
                            href={notification.action_url}
                            onClick={() => {
                              markAsRead(notification.id);
                              setIsOpen(false);
                            }}
                            className="text-xs text-sage hover:text-sage-dark flex items-center gap-1"
                          >
                            View
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="px-4 py-2 border-t bg-gray-50">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs text-sage hover:text-sage-dark font-medium"
            >
              View all notifications →
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
