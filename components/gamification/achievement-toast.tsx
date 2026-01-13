"use client";

import { useEffect, useState, useCallback } from "react";
import { X, Share2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAchievement } from "@/lib/gamification/achievements";
import { cn } from "@/lib/cn";

interface AchievementToastProps {
  achievementKey: string;
  points: number;
  onShare?: () => void;
  onDismiss?: () => void;
  autoHide?: boolean;
  autoHideDelay?: number;
}

/**
 * Achievement Toast Component
 *
 * Celebrates earning a new badge with empowering, positive messaging
 * Appears as an animated toast notification
 */
export function AchievementToast({
  achievementKey,
  points,
  onShare,
  onDismiss,
  autoHide = true,
  autoHideDelay = 5000,
}: AchievementToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const achievement = getAchievement(achievementKey);

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onDismiss?.();
    }, 300);
  }, [onDismiss]);

  useEffect(() => {
    // Animate in
    setTimeout(() => setIsVisible(true), 100);

    // Auto-hide
    if (autoHide) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [autoHide, autoHideDelay, handleDismiss]);

  if (!achievement) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 max-w-md transition-all duration-300 transform",
        isVisible && !isExiting
          ? "translate-y-0 opacity-100"
          : "translate-y-4 opacity-0"
      )}
    >
      <div className="bg-gradient-to-r from-emerald-500 to-blue-500 text-white rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-white/20">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            <span className="font-semibold">Achievement Unlocked!</span>
          </div>
          <button
            onClick={handleDismiss}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-4 flex items-start gap-4">
          {/* Icon with animation */}
          <div className="text-5xl animate-bounce">
            {achievement.icon}
          </div>

          {/* Text */}
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">{achievement.title}</h3>
            <p className="text-white/90 text-sm mb-2">
              {achievement.description}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full font-medium">
                +{points} points
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        {onShare && (
          <div className="px-4 py-3 bg-black/10 flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onShare}
              className="flex-1 bg-white/20 hover:bg-white/30 text-white border-none"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share Achievement
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Achievement Toast Manager
 *
 * Queues and displays multiple achievement toasts
 */
export function AchievementToastManager() {
  const [queue, setQueue] = useState<Array<{
    key: string;
    achievementKey: string;
    points: number;
  }>>([]);

  const [current, setCurrent] = useState<{
    achievementKey: string;
    points: number;
  } | null>(null);

  useEffect(() => {
    if (!current && queue.length > 0) {
      const [next, ...rest] = queue;
      setCurrent({ achievementKey: next.achievementKey, points: next.points });
      setQueue(rest);
    }
  }, [current, queue]);

  const addToQueue = (achievementKey: string, points: number) => {
    setQueue(prev => [
      ...prev,
      { key: `${achievementKey}-${Date.now()}`, achievementKey, points }
    ]);
  };

  const handleDismiss = () => {
    setCurrent(null);
  };

  const handleShare = () => {
    if (!current) return;

    const achievement = getAchievement(current.achievementKey);
    if (!achievement) return;

    // Copy to clipboard
    const text = `🎉 I just earned the "${achievement.title}" achievement in My Budget Mate! ${achievement.description}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }

    // Could also integrate with Discord API here
    console.log('Share achievement:', current.achievementKey);
  };

  // This would be called from a context or hook
  // For now, we expose it via window for testing
  useEffect(() => {
    (window as any).__showAchievement = addToQueue;
  }, []);

  if (!current) return null;

  return (
    <AchievementToast
      achievementKey={current.achievementKey}
      points={current.points}
      onShare={handleShare}
      onDismiss={handleDismiss}
    />
  );
}

/**
 * Achievement Toast Queue Hook
 *
 * Provides a simple way to queue and display achievement toasts
 * Use the returned addToQueue function to add achievements
 * Render the ToastRenderer component to display the toasts
 */
export function useAchievementToastQueue() {
  const [queue, setQueue] = useState<Array<{
    key: string;
    achievementKey: string;
    points: number;
  }>>([]);

  const [current, setCurrent] = useState<{
    achievementKey: string;
    points: number;
  } | null>(null);

  useEffect(() => {
    if (!current && queue.length > 0) {
      const [next, ...rest] = queue;
      setCurrent({ achievementKey: next.achievementKey, points: next.points });
      setQueue(rest);
    }
  }, [current, queue]);

  const addToQueue = useCallback((achievementKey: string, points: number = 0) => {
    setQueue(prev => [
      ...prev,
      { key: `${achievementKey}-${Date.now()}`, achievementKey, points }
    ]);
  }, []);

  const handleDismiss = useCallback(() => {
    setCurrent(null);
  }, []);

  const handleShare = useCallback(() => {
    if (!current) return;

    const achievement = getAchievement(current.achievementKey);
    if (!achievement) return;

    const text = `🎉 I just earned the "${achievement.title}" achievement in My Budget Mate! ${achievement.description}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
  }, [current]);

  // Return a component function, not a useCallback wrapped function
  const ToastRenderer = function AchievementToastRenderer() {
    if (!current) return null;

    return (
      <AchievementToast
        achievementKey={current.achievementKey}
        points={current.points}
        onShare={handleShare}
        onDismiss={handleDismiss}
      />
    );
  };

  return {
    addToQueue,
    ToastRenderer,
    queueLength: queue.length,
    currentAchievement: current?.achievementKey ?? null,
  };
}
