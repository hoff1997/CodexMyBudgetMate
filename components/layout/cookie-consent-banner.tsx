"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, Settings, Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CookiePreferences,
  DEFAULT_COOKIE_PREFERENCES,
  COOKIE_CONSENT_KEY,
  COOKIE_CATEGORY_INFO,
} from "@/lib/types/cookie-consent";
import { cn } from "@/lib/utils";

interface CookieConsentBannerProps {
  className?: string;
}

export function CookieConsentBanner({ className }: CookieConsentBannerProps) {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(
    DEFAULT_COOKIE_PREFERENCES
  );

  // Check if consent has been given on mount
  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!stored) {
      // No consent given yet - show banner
      setShowBanner(true);
    } else {
      try {
        const parsed = JSON.parse(stored) as CookiePreferences;
        setPreferences(parsed);
      } catch {
        // Invalid stored data - show banner
        setShowBanner(true);
      }
    }
  }, []);

  const savePreferences = async (prefs: CookiePreferences) => {
    // Save to localStorage for immediate effect
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(prefs));
    setPreferences(prefs);
    setShowBanner(false);
    setShowSettings(false);

    // Try to save to database if user is logged in
    try {
      await fetch("/api/user/cookie-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
    } catch {
      // Silently fail - localStorage is the primary storage
    }
  };

  const handleAcceptAll = () => {
    savePreferences({
      strictly_necessary: true,
      analytics: true,
      marketing: true,
    });
  };

  const handleAcceptNecessary = () => {
    savePreferences(DEFAULT_COOKIE_PREFERENCES);
  };

  const handleSaveSettings = () => {
    savePreferences(preferences);
  };

  const handleToggle = (key: keyof CookiePreferences) => {
    if (key === "strictly_necessary") return; // Cannot toggle
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Main Banner */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-silver-light shadow-lg",
          "animate-in slide-in-from-bottom duration-300",
          className
        )}
      >
        <div className="max-w-7xl mx-auto p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* Icon and Text */}
            <div className="flex items-start gap-3 flex-1">
              <div className="p-2 bg-sage-very-light rounded-lg shrink-0">
                <Cookie className="w-5 h-5 text-sage" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-text-dark">
                  Your privacy matters to us
                </h3>
                <p className="text-sm text-text-medium">
                  We use cookies to make your experience better and understand
                  how the site is used. By clicking &quot;Accept All&quot;, you
                  agree to our use of cookies.{" "}
                  <Link
                    href="/privacy/cookies"
                    className="text-sage hover:text-sage-dark underline"
                  >
                    Find out more
                  </Link>
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(true)}
                className="order-3 sm:order-1"
              >
                <Settings className="w-4 h-4 mr-2" />
                Customise
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAcceptNecessary}
                className="order-2"
              >
                Necessary Only
              </Button>
              <Button
                size="sm"
                onClick={handleAcceptAll}
                className="bg-sage hover:bg-sage-dark order-1 sm:order-3"
              >
                Accept All
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cookie className="w-5 h-5 text-sage" />
              Cookie Preferences
            </DialogTitle>
            <DialogDescription>
              Manage your cookie preferences. You can enable or disable
              different types of cookies below.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {(
              Object.keys(COOKIE_CATEGORY_INFO) as Array<
                keyof CookiePreferences
              >
            ).map((key) => {
              const info = COOKIE_CATEGORY_INFO[key];
              return (
                <div
                  key={key}
                  className="flex items-start gap-4 p-3 rounded-lg border border-silver-light"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Label
                        htmlFor={`cookie-${key}`}
                        className="font-medium text-text-dark"
                      >
                        {info.name}
                      </Label>
                      {info.required && (
                        <span className="text-xs bg-sage-very-light text-sage px-2 py-0.5 rounded">
                          Required
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-text-medium">
                      {info.description}
                    </p>
                  </div>
                  <Switch
                    id={`cookie-${key}`}
                    checked={preferences[key]}
                    onCheckedChange={() => handleToggle(key)}
                    disabled={info.required}
                    className="shrink-0"
                  />
                </div>
              );
            })}
          </div>

          <div className="flex justify-between gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(false)}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveSettings}
              className="bg-sage hover:bg-sage-dark"
            >
              Save Preferences
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
