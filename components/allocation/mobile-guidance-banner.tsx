"use client";

import { useState, useEffect } from "react";
import { Smartphone, Monitor, X, HelpCircle } from "lucide-react";
import { cn } from "@/lib/cn";

const STORAGE_KEY = "mobile-guidance-banner-dismissed";
const DISMISS_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface MobileGuidanceBannerProps {
  className?: string;
}

export function MobileGuidanceBanner({ className }: MobileGuidanceBannerProps) {
  const [orientation, setOrientation] = useState<"portrait" | "landscape" | null>(null);
  const [isDismissed, setIsDismissed] = useState(true);
  const [showHelpIcon, setShowHelpIcon] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect if mobile device and orientation
  useEffect(() => {
    const checkDevice = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);

      if (mobile) {
        const isPortrait = window.innerHeight > window.innerWidth;
        setOrientation(isPortrait ? "portrait" : "landscape");
      } else {
        setOrientation(null);
      }
    };

    // Check localStorage for dismissal
    const checkDismissal = () => {
      const dismissedAt = localStorage.getItem(STORAGE_KEY);
      if (dismissedAt) {
        const dismissedTime = parseInt(dismissedAt, 10);
        const now = Date.now();
        if (now - dismissedTime < DISMISS_DURATION_MS) {
          setIsDismissed(true);
          setShowHelpIcon(true);
          return;
        }
        // Expired, remove from storage
        localStorage.removeItem(STORAGE_KEY);
      }
      setIsDismissed(false);
    };

    checkDevice();
    checkDismissal();

    window.addEventListener("resize", checkDevice);
    window.addEventListener("orientationchange", checkDevice);

    return () => {
      window.removeEventListener("resize", checkDevice);
      window.removeEventListener("orientationchange", checkDevice);
    };
  }, []);

  // Auto-dismiss landscape banner after 5 seconds
  useEffect(() => {
    if (orientation === "landscape" && !isDismissed) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [orientation, isDismissed]);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    setIsDismissed(true);
    setShowHelpIcon(true);
  };

  const handleShowBanner = () => {
    localStorage.removeItem(STORAGE_KEY);
    setIsDismissed(false);
    setShowHelpIcon(false);
  };

  // Don't render on desktop
  if (!isMobile) {
    return null;
  }

  // Show help icon if dismissed
  if (isDismissed && showHelpIcon) {
    return (
      <button
        onClick={handleShowBanner}
        className={cn(
          "fixed bottom-4 right-4 z-50 p-2 rounded-full bg-sage text-white shadow-lg",
          "hover:bg-sage-dark transition-colors",
          className
        )}
        aria-label="Show mobile guidance"
      >
        <HelpCircle className="h-5 w-5" />
      </button>
    );
  }

  // Don't show if dismissed or no orientation detected
  if (isDismissed || !orientation) {
    return null;
  }

  const isPortrait = orientation === "portrait";

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-50 px-4 py-3 flex items-center justify-between gap-3",
        isPortrait
          ? "bg-blue-light border-b border-blue text-blue"
          : "bg-sage-very-light border-b border-sage-light text-sage-dark",
        className
      )}
    >
      <div className="flex items-center gap-3">
        {isPortrait ? (
          <Smartphone className="h-5 w-5 flex-shrink-0" />
        ) : (
          <Monitor className="h-5 w-5 flex-shrink-0" />
        )}
        <div className="text-sm">
          {isPortrait ? (
            <>
              <span className="font-medium">Rotate your device</span>
              <span className="hidden sm:inline"> for the best experience with this page.</span>
            </>
          ) : (
            <>
              <span className="font-medium">Tip:</span> This page is optimized for desktop.
              <span className="hidden sm:inline"> Some features may be limited on mobile.</span>
            </>
          )}
        </div>
      </div>
      <button
        onClick={handleDismiss}
        className={cn(
          "p-1 rounded-full flex-shrink-0 transition-colors",
          isPortrait
            ? "hover:bg-blue/10"
            : "hover:bg-sage/10"
        )}
        aria-label="Dismiss banner"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
