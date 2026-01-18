"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { Loader2, Lock, AlertTriangle, Shield } from "lucide-react";

/**
 * Secure Kid Login Page
 *
 * Key security improvements over the old family code system:
 * 1. Unique login key per child (not shared family code)
 * 2. Single-step login (key + PIN) - no child selection step
 * 3. Supports browser credential saving via proper form structure
 * 4. Uses autocomplete attributes for password managers
 *
 * Browser Credential Saving:
 * - Form uses autocomplete="username" for login key field
 * - Form uses autocomplete="current-password" for PIN field
 * - Hidden submit button triggers browser's save prompt
 * - Form has proper name and action attributes
 */

export function SecureKidLogin() {
  const formRef = useRef<HTMLFormElement>(null);

  const [loginKey, setLoginKey] = useState("");
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [childName, setChildName] = useState<string | null>(null);

  // CSRF token state
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  // Rate limiting state
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);

  // Fetch CSRF token on mount
  useEffect(() => {
    async function fetchCsrfToken() {
      try {
        const res = await fetch("/api/kids/auth/csrf", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setCsrfToken(data.csrfToken);
        }
      } catch (err) {
        console.error("Failed to fetch CSRF token:", err);
      }
    }
    fetchCsrfToken();
  }, []);

  // Countdown timer for lockout
  useEffect(() => {
    if (lockoutSeconds <= 0) {
      setIsLocked(false);
      return;
    }

    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          setIsLocked(false);
          setError("");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  // Format lockout time as mm:ss
  const formatLockoutTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Format login key input (auto-insert dashes)
  const formatLoginKey = (value: string): string => {
    // Remove all non-alphanumeric characters
    let clean = value.toUpperCase().replace(/[^A-Z0-9]/g, "");

    // Insert dashes at positions 4 and 9
    if (clean.length > 4) {
      clean = clean.slice(0, 4) + "-" + clean.slice(4);
    }
    if (clean.length > 9) {
      clean = clean.slice(0, 9) + "-" + clean.slice(9);
    }

    return clean.slice(0, 14); // Max: XXXX-XXXX-XXXX
  };

  // Handle login key input
  const handleLoginKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatLoginKey(e.target.value);
    setLoginKey(formatted);
  };

  // Handle PIN digit press
  const handlePinDigit = (digit: string) => {
    if (isLocked || isLoading || pin.length >= 4) return;

    const newPin = pin + digit;
    setPin(newPin);

    // Auto-submit when 4 digits entered and login key is complete
    if (newPin.length === 4 && loginKey.length === 14) {
      setTimeout(() => {
        handleSubmit(undefined, newPin);
      }, 150);
    }
  };

  // Handle PIN backspace
  const handlePinBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  // Handle form submission
  const handleSubmit = async (e?: React.FormEvent, submittedPin?: string) => {
    e?.preventDefault();

    const pinToUse = submittedPin || pin;

    if (loginKey.length !== 14 || pinToUse.length !== 4 || isLoading) {
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/kids/auth/login-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loginKey: loginKey,
          pin: pinToUse,
          csrfToken,
        }),
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        // Handle rate limiting / lockout
        if (res.status === 429 || data.locked) {
          setIsLocked(true);
          setLockoutSeconds(data.remainingSeconds || 60);
          setAttemptsRemaining(0);
        } else if (data.attemptsRemaining !== undefined) {
          setAttemptsRemaining(data.attemptsRemaining);
        }

        // Handle CSRF error - refresh token
        if (res.status === 403 && data.error?.includes("security token")) {
          const tokenRes = await fetch("/api/kids/auth/csrf", {
            credentials: "include",
          });
          if (tokenRes.ok) {
            const tokenData = await tokenRes.json();
            setCsrfToken(tokenData.csrfToken);
          }
        }

        setError(data.error || "Invalid login key or PIN");
        setPin("");
        setIsLoading(false);
        return;
      }

      // Success! Store child name for redirect message
      setChildName(data.data.session.name);

      // Hard redirect to kid dashboard
      // The session cookie is already set by the API
      window.location.href = `/kids/${data.data.session.childId}/dashboard`;
    } catch {
      setError("Something went wrong. Please try again.");
      setPin("");
      setIsLoading(false);
    }
  };

  const isLoginKeyComplete = loginKey.length === 14;
  const isPinComplete = pin.length === 4;
  const canSubmit = isLoginKeyComplete && isPinComplete && !isLoading && !isLocked;

  return (
    <div className="min-h-screen bg-gradient-to-b from-sage-very-light to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <span className="text-6xl">🦜</span>
          </div>
          <CardTitle className="text-2xl font-bold text-text-dark">
            {childName ? `Welcome, ${childName}!` : "Kid Login"}
          </CardTitle>
          <p className="text-text-medium mt-2">
            {isLocked
              ? "Too many tries - please wait"
              : "Enter your login key and PIN"}
          </p>
        </CardHeader>

        <CardContent>
          {/* Security badge */}
          <div className="flex items-center justify-center gap-2 mb-4 text-xs text-muted-foreground">
            <Shield className="h-3 w-3" />
            <span>Secure login with saved credentials</span>
          </div>

          {/* Lockout Warning */}
          {isLocked && (
            <div className="mb-4 p-4 bg-gold-light rounded-lg flex items-center gap-3">
              <Lock className="h-6 w-6 text-gold-dark flex-shrink-0" />
              <div>
                <p className="font-semibold text-gold-dark">Account Locked</p>
                <p className="text-sm text-gold-dark">
                  Try again in{" "}
                  <span className="font-mono font-bold">
                    {formatLockoutTime(lockoutSeconds)}
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Low Attempts Warning */}
          {!isLocked &&
            attemptsRemaining !== null &&
            attemptsRemaining <= 2 &&
            attemptsRemaining > 0 && (
              <div className="mb-4 p-3 bg-gold-light rounded-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-gold-dark flex-shrink-0" />
                <p className="text-sm text-gold-dark">
                  {attemptsRemaining === 1
                    ? "Last attempt before lockout!"
                    : `${attemptsRemaining} attempts remaining`}
                </p>
              </div>
            )}

          {/* Regular Error */}
          {error && !isLocked && (
            <div className="mb-4 p-3 bg-gold-light text-gold-dark rounded-lg text-center text-sm">
              {error}
            </div>
          )}

          {/* Login Form - structured for browser credential saving */}
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            name="kid-login"
            className="space-y-6"
            autoComplete="on"
          >
            {/* Login Key Field */}
            <div className="space-y-2">
              <label htmlFor="login-key" className="text-sm font-medium text-text-dark">
                Login Key
              </label>
              <Input
                id="login-key"
                name="username"
                type="text"
                autoComplete="username"
                placeholder="XXXX-XXXX-XXXX"
                value={loginKey}
                onChange={handleLoginKeyChange}
                className={cn(
                  "text-center text-xl font-mono tracking-wider h-14",
                  isLoginKeyComplete && "border-sage bg-sage-very-light"
                )}
                maxLength={14}
                autoFocus
                disabled={isLocked}
                aria-describedby="login-key-hint"
              />
              <p id="login-key-hint" className="text-xs text-muted-foreground text-center">
                Your parent gave you this unique code
              </p>
            </div>

            {/* PIN Field - hidden input for browser credential saving */}
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={pin}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
                setPin(digits);
                if (digits.length === 4 && loginKey.length === 14) {
                  handleSubmit(undefined, digits);
                }
              }}
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
            />

            {/* PIN Display */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-dark block text-center">
                PIN
              </label>
              <div className="flex justify-center gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-14 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold",
                      isLocked
                        ? "border-silver-light bg-silver-very-light text-silver"
                        : pin.length > i
                          ? "border-sage bg-sage-very-light text-sage-dark"
                          : "border-silver-light bg-white text-transparent"
                    )}
                  >
                    {pin[i] ? "●" : "○"}
                  </div>
                ))}
              </div>
            </div>

            {/* Number Pad */}
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handlePinDigit(String(digit))}
                  disabled={isLoading || isLocked || !isLoginKeyComplete}
                  className={cn(
                    "h-16 rounded-xl text-2xl font-semibold transition-all",
                    "bg-white border border-silver-light",
                    isLocked || !isLoginKeyComplete
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-sage-very-light hover:border-sage active:scale-95"
                  )}
                >
                  {digit}
                </button>
              ))}
              <div /> {/* Empty cell */}
              <button
                type="button"
                onClick={() => handlePinDigit("0")}
                disabled={isLoading || isLocked || !isLoginKeyComplete}
                className={cn(
                  "h-16 rounded-xl text-2xl font-semibold transition-all",
                  "bg-white border border-silver-light",
                  isLocked || !isLoginKeyComplete
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-sage-very-light hover:border-sage active:scale-95"
                )}
              >
                0
              </button>
              <button
                type="button"
                onClick={handlePinBackspace}
                disabled={isLoading || pin.length === 0 || isLocked}
                className={cn(
                  "h-16 rounded-xl text-xl font-semibold transition-all",
                  "bg-silver-very-light border border-silver-light",
                  isLocked
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-silver-light active:scale-95",
                  pin.length === 0 && "opacity-50"
                )}
              >
                ⌫
              </button>
            </div>

            {/* Submit button - visible for manual submit and credential saving */}
            <Button
              type="submit"
              className="w-full h-12 text-lg bg-sage hover:bg-sage-dark"
              disabled={!canSubmit}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Log In"
              )}
            </Button>

            <p className="text-center text-sm text-text-light">
              Forgot your login key or PIN?{" "}
              <span className="text-sage-dark">Ask your parent!</span>
            </p>

            {/* Tip about saving password */}
            <div className="text-center text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
              <p className="font-medium mb-1">Tip: Save your login</p>
              <p>
                When your browser asks to save your password, click &quot;Save&quot; so you
                don&apos;t have to type it next time!
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
