"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GoalProgressWidget } from "@/components/goals/goal-progress-widget";
import type { GoalEnvelope } from "@/lib/types/goals";

export default function GoalsWidget() {
  const router = useRouter();
  const [goals, setGoals] = useState<GoalEnvelope[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        const response = await fetch("/api/goals");
        if (!response.ok) throw new Error("Failed to fetch goals");
        const data = await response.json();
        setGoals(data);
      } catch (error) {
        console.error("Failed to load goals:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGoals();
  }, []);

  if (loading) {
    return (
      <div className="border rounded-lg p-6 bg-white">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3" />
          <div className="h-24 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return <GoalProgressWidget goals={goals} />;
}
