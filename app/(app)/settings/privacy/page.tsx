"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Cookie, Shield, BarChart3, Megaphone, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CookiePreferences,
  DEFAULT_COOKIE_PREFERENCES,
  COOKIE_CONSENT_KEY,
  COOKIE_CATEGORY_INFO,
} from "@/lib/types/cookie-consent";
import { cn } from "@/lib/utils";

const categoryIcons = {
  strictly_necessary: Shield,
  analytics: BarChart3,
  marketing: Megaphone,
};

export default function PrivacySettingsPage() {
  const [preferences, setPreferences] = useState<CookiePreferences>(
    DEFAULT_COOKIE_PREFERENCES
  );
  const [hasConsent, setHasConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as CookiePreferences;
        setPreferences(parsed);
        setHasConsent(true);
      } catch {
        // Invalid data
      }
    }
  }, []);

  const handleToggle = (key: keyof CookiePreferences) => {
    if (key === "strictly_necessary") return;
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);

    // Save to localStorage
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(preferences));
    setHasConsent(true);

    // Try to save to database
    try {
      await fetch("/api/user/cookie-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });
    } catch {
      // Silently fail
    }

    setSaving(false);
    setSaved(true);

    // Reset saved indicator after 3 seconds
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    localStorage.removeItem(COOKIE_CONSENT_KEY);
    setPreferences(DEFAULT_COOKIE_PREFERENCES);
    setHasConsent(false);
    setSaved(false);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/settings"
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-dark">Privacy Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your privacy preferences and cookie settings
          </p>
        </div>
      </div>

      {/* Cookie Preferences Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sage-very-light rounded-lg">
              <Cookie className="w-5 h-5 text-sage" />
            </div>
            <div>
              <CardTitle>Cookie Preferences</CardTitle>
              <CardDescription>
                Choose which types of cookies you allow
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasConsent && (
            <div className="bg-gold-light border border-gold rounded-lg p-4 text-sm">
              <p className="text-text-dark font-medium">No consent recorded</p>
              <p className="text-text-medium mt-1">
                You haven&apos;t set your cookie preferences yet. Configure your
                preferences below and save.
              </p>
            </div>
          )}

          {(
            Object.keys(COOKIE_CATEGORY_INFO) as Array<keyof CookiePreferences>
          ).map((key) => {
            const info = COOKIE_CATEGORY_INFO[key];
            const Icon = categoryIcons[key];

            return (
              <div
                key={key}
                className={cn(
                  "flex items-start gap-4 p-4 rounded-lg border",
                  info.required
                    ? "bg-muted/30 border-muted"
                    : "border-silver-light"
                )}
              >
                <Icon className="w-5 h-5 text-sage mt-0.5 shrink-0" />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor={`privacy-${key}`}
                      className="font-medium text-text-dark cursor-pointer"
                    >
                      {info.name}
                    </Label>
                    {info.required && (
                      <span className="text-xs bg-sage-very-light text-sage px-2 py-0.5 rounded">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-text-medium">{info.description}</p>
                </div>
                <Switch
                  id={`privacy-${key}`}
                  checked={preferences[key]}
                  onCheckedChange={() => handleToggle(key)}
                  disabled={info.required}
                  className="shrink-0"
                />
              </div>
            );
          })}

          <div className="flex items-center justify-between pt-4 border-t border-silver-light">
            <Button variant="ghost" size="sm" onClick={handleReset}>
              Reset Preferences
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-sage hover:bg-sage-dark"
            >
              {saving ? (
                "Saving..."
              ) : saved ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Saved
                </>
              ) : (
                "Save Preferences"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Links Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Privacy Policies</CardTitle>
          <CardDescription>
            Learn more about how we handle your data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Link
            href="/privacy"
            className="flex items-center justify-between p-3 rounded-lg border border-silver-light hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-sage" />
              <div>
                <p className="font-medium text-text-dark">Privacy Policy</p>
                <p className="text-sm text-text-medium">
                  How we protect your budgeting data
                </p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </Link>

          <Link
            href="/privacy/cookies"
            className="flex items-center justify-between p-3 rounded-lg border border-silver-light hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Cookie className="w-5 h-5 text-sage" />
              <div>
                <p className="font-medium text-text-dark">Cookie Policy</p>
                <p className="text-sm text-text-medium">
                  Details about cookies we use
                </p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </Link>
        </CardContent>
      </Card>

      {/* Data Management Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Data Management</CardTitle>
          <CardDescription>
            Manage your personal data and account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 rounded-lg border border-silver-light">
            <p className="font-medium text-text-dark">Export Your Data</p>
            <p className="text-sm text-text-medium mt-1">
              Request a copy of all your budgeting data by contacting{" "}
              <a
                href="mailto:privacy@mybudgetmate.nz"
                className="text-sage hover:text-sage-dark underline"
              >
                privacy@mybudgetmate.nz
              </a>
            </p>
          </div>

          <div className="p-3 rounded-lg border border-silver-light">
            <p className="font-medium text-text-dark">Delete Your Account</p>
            <p className="text-sm text-text-medium mt-1">
              To delete your account and all associated data, visit the{" "}
              <Link
                href="/settings"
                className="text-sage hover:text-sage-dark underline"
              >
                Account Settings
              </Link>{" "}
              page or contact support.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
