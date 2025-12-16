"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { CelebrationModal } from "./CelebrationModal";
import {
  AchievementDefinition,
  getAchievement,
} from "@/lib/achievements/definitions";

interface CelebrationContextType {
  celebrate: (achievementId: string) => void;
  queueCelebration: (achievementId: string) => void;
}

const CelebrationContext = createContext<CelebrationContextType | null>(null);

export function useCelebration() {
  const context = useContext(CelebrationContext);
  if (!context) {
    throw new Error("useCelebration must be used within a CelebrationProvider");
  }
  return context;
}

interface CelebrationProviderProps {
  children: ReactNode;
}

export function CelebrationProvider({ children }: CelebrationProviderProps) {
  const [currentAchievement, setCurrentAchievement] =
    useState<AchievementDefinition | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [queue, setQueue] = useState<string[]>([]);

  const showNextFromQueue = useCallback(() => {
    setQueue((currentQueue) => {
      if (currentQueue.length === 0) return currentQueue;

      const [nextId, ...rest] = currentQueue;
      const achievement = getAchievement(nextId);

      if (achievement) {
        setCurrentAchievement(achievement);
        setIsOpen(true);
      }

      return rest;
    });
  }, []);

  const celebrate = useCallback((achievementId: string) => {
    const achievement = getAchievement(achievementId);
    if (achievement) {
      setCurrentAchievement(achievement);
      setIsOpen(true);
    }
  }, []);

  const queueCelebration = useCallback(
    (achievementId: string) => {
      if (isOpen) {
        // Modal is showing, add to queue
        setQueue((prev) => [...prev, achievementId]);
      } else {
        // Show immediately
        celebrate(achievementId);
      }
    },
    [isOpen, celebrate]
  );

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setCurrentAchievement(null);

    // Show next in queue after a short delay
    setTimeout(() => {
      showNextFromQueue();
    }, 300);
  }, [showNextFromQueue]);

  return (
    <CelebrationContext.Provider value={{ celebrate, queueCelebration }}>
      {children}
      <CelebrationModal
        achievement={currentAchievement}
        isOpen={isOpen}
        onClose={handleClose}
      />
    </CelebrationContext.Provider>
  );
}
