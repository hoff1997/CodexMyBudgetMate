"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CalendarConnectionCard } from "@/components/calendar/calendar-connection-card";
import { TodayWidget, QuickLinksWidget } from "@/components/hub/today-widget";
import {
  Home,
  Calendar,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface CalendarConnection {
  id: string;
  calendar_name: string;
  owner_name: string;
  color_hex: string;
  is_visible: boolean;
  google_calendar_id: string;
}

interface DashboardData {
  today: {
    date: string;
    day_name: string;
    events: any[];
    meals: any[];
    chores: any[];
  };
  shopping: any[];
  todos: any[];
}

interface HouseholdHubClientProps {
  initialConnections: CalendarConnection[];
  initialDashboard: DashboardData | null;
}

export function HouseholdHubClient({
  initialConnections,
  initialDashboard,
}: HouseholdHubClientProps) {
  const [connections, setConnections] =
    useState<CalendarConnection[]>(initialConnections);
  const [dashboard, setDashboard] = useState<DashboardData | null>(
    initialDashboard
  );
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const searchParams = useSearchParams();

  // Handle OAuth callback notifications
  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success === "true") {
      setNotification({
        type: "success",
        message: "Google Calendar connected successfully! Syncing events...",
      });
      // Auto-sync after connecting
      handleSync();
      // Clear URL params
      window.history.replaceState({}, "", "/life/hub");
    } else if (error) {
      let message = "Failed to connect calendar";
      if (error === "access_denied") {
        message = "Calendar access was denied";
      } else if (error === "no_code") {
        message = "No authorization code received";
      } else if (error === "connection_failed") {
        message = "Failed to connect to Google Calendar";
      }
      setNotification({ type: "error", message });
      window.history.replaceState({}, "", "/life/hub");
    }

    // Clear notification after 5 seconds
    if (success || error) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  const handleConnectCalendar = async () => {
    setConnecting(true);
    try {
      const res = await fetch("/api/calendar/auth-url");
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setNotification({
          type: "error",
          message: "Failed to get authorization URL",
        });
      }
    } catch (error) {
      setNotification({
        type: "error",
        message: "Failed to connect to Google Calendar",
      });
    } finally {
      setConnecting(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/calendar/sync", { method: "POST" });
      const data = await res.json();

      if (data.success) {
        setNotification({
          type: "success",
          message: `Synced ${data.events_synced} events from ${data.calendars_synced} calendars`,
        });
        // Refresh dashboard data
        await refreshDashboard();
      } else if (data.errors) {
        setNotification({
          type: "error",
          message: data.errors[0] || "Some calendars failed to sync",
        });
      }
    } catch (error) {
      setNotification({
        type: "error",
        message: "Failed to sync calendars",
      });
    } finally {
      setSyncing(false);
    }
  };

  const refreshDashboard = async () => {
    try {
      const res = await fetch("/api/household-hub/dashboard");
      if (res.ok) {
        const data = await res.json();
        setDashboard(data);
      }
    } catch (error) {
      console.error("Failed to refresh dashboard:", error);
    }
  };

  const refreshConnections = async () => {
    try {
      const res = await fetch("/api/calendar/connections");
      if (res.ok) {
        const data = await res.json();
        setConnections(data.connections || []);
      }
    } catch (error) {
      console.error("Failed to refresh connections:", error);
    }
  };

  const handleToggleVisibility = async (id: string, visible: boolean) => {
    try {
      const res = await fetch(`/api/calendar/connections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_visible: visible }),
      });

      if (res.ok) {
        setConnections((prev) =>
          prev.map((conn) =>
            conn.id === id ? { ...conn, is_visible: visible } : conn
          )
        );
        // Refresh dashboard to update visible events
        await refreshDashboard();
      }
    } catch (error) {
      setNotification({
        type: "error",
        message: "Failed to update calendar visibility",
      });
    }
  };

  const handleDeleteConnection = async (id: string) => {
    try {
      const res = await fetch(`/api/calendar/connections/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setConnections((prev) => prev.filter((conn) => conn.id !== id));
        await refreshDashboard();
        setNotification({
          type: "success",
          message: "Calendar disconnected",
        });
      }
    } catch (error) {
      setNotification({
        type: "error",
        message: "Failed to disconnect calendar",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-sage-light flex items-center justify-center">
              <Home className="h-6 w-6 text-sage-dark" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-dark">
                Household Hub
              </h1>
              <p className="text-text-medium">Your family command center</p>
            </div>
          </div>
          <div className="flex gap-2">
            {connections.length > 0 && (
              <Button
                variant="outline"
                onClick={handleSync}
                disabled={syncing}
                className="gap-2"
              >
                {syncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {syncing ? "Syncing..." : "Sync Calendars"}
              </Button>
            )}
            <Button
              onClick={handleConnectCalendar}
              disabled={connecting}
              className="bg-sage hover:bg-sage-dark gap-2"
            >
              {connecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Calendar className="h-4 w-4" />
              )}
              Connect Google Calendar
            </Button>
          </div>
        </div>

        {/* Notification */}
        {notification && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
              notification.type === "success"
                ? "bg-sage-very-light border border-sage-light"
                : "bg-red-50 border border-red-200"
            }`}
          >
            {notification.type === "success" ? (
              <CheckCircle className="h-5 w-5 text-sage" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500" />
            )}
            <span
              className={
                notification.type === "success"
                  ? "text-sage-dark"
                  : "text-red-700"
              }
            >
              {notification.message}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Overview - Main Column */}
          <div className="lg:col-span-2">
            {dashboard?.today && <TodayWidget data={dashboard.today} />}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Calendar Connections */}
            <div>
              <h2 className="text-lg font-semibold text-text-dark mb-3">
                Connected Calendars
              </h2>
              {connections.length > 0 ? (
                <div className="space-y-3">
                  {connections.map((conn) => (
                    <CalendarConnectionCard
                      key={conn.id}
                      connection={conn}
                      onToggleVisibility={handleToggleVisibility}
                      onDelete={handleDeleteConnection}
                    />
                  ))}
                </div>
              ) : (
                <Card className="p-6 text-center">
                  <Calendar className="h-8 w-8 text-text-light mx-auto mb-3" />
                  <p className="text-text-medium text-sm">
                    No calendars connected yet. Connect your Google Calendar to
                    see events here.
                  </p>
                </Card>
              )}
            </div>

            {/* Quick Links */}
            {dashboard && (
              <div>
                <h2 className="text-lg font-semibold text-text-dark mb-3">
                  Quick Access
                </h2>
                <Card className="p-4">
                  <QuickLinksWidget
                    shopping={dashboard.shopping}
                    todos={dashboard.todos}
                  />
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
