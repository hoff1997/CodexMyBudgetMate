"use client";

/**
 * Dashboard Summary Header
 *
 * Hero section at the top of the dashboard showing:
 * - Greeting with user name
 * - Remy help button
 */

import Image from "next/image";
import { useMemo, type ReactNode } from "react";

interface DashboardSummaryHeaderProps {
  userName?: string;
  availableBalance?: number;
  incomeThisMonth?: number;
  nextPayday?: Date | null;
  budgetHealthStatus?: "healthy" | "attention" | "critical";
  notifications?: ReactNode;
  remyHelp?: ReactNode;
}

export function DashboardSummaryHeader({
  userName,
  notifications,
  remyHelp,
}: DashboardSummaryHeaderProps) {
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  return (
    <header className="rounded-xl bg-gradient-to-br from-silver-light/50 to-white border border-silver/30 p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Left: Logo + Greeting */}
        <div className="flex items-center gap-3">
          <Image
            src="/Images/My Budget Mate Evevelope Logo Icon.jpeg"
            alt="My Budget Mate Logo"
            width={40}
            height={40}
            className="rounded-md hidden lg:block"
          />
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl font-semibold text-text-dark">
              {greeting}{userName ? `, ${userName}` : ""}
            </h1>
            <p className="text-sm text-text-medium">
              Here&apos;s your financial snapshot
            </p>
          </div>
        </div>

        {/* Right: Notifications + Remy Help */}
        <div className="flex items-center gap-2">
          {notifications}
          {remyHelp}
        </div>
      </div>
    </header>
  );
}
