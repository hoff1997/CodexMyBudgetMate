"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { ArrowLeft, Loader2, Lock, AlertTriangle } from "lucide-react";

type LoginStep = "family-code" | "select-child" | "enter-pin";

interface ChildProfile {
  id: string;
  name: string;
  avatar_url: string | null;
}

export default function KidsLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<LoginStep>("family-code");
  const [familyCode, setFamilyCode] = useState("");
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [selectedChild, setSelectedChild] = useState<ChildProfile | null>(null);
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // CSRF token state
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  // Rate limiting state
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(
    null
  );

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

  // Step 1: Look up family code
  const handleFamilyCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/kids/auth/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyCode: familyCode.toUpperCase(),
          csrfToken,
        }),
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        // Handle rate limiting
        if (res.status === 429) {
          setIsLocked(true);
          setLockoutSeconds(data.remainingSeconds || 60);
        }
        // Handle CSRF error - refresh token
        if (res.status === 403) {
          const tokenRes = await fetch("/api/kids/auth/csrf", {
            credentials: "include",
          });
          if (tokenRes.ok) {
            const tokenData = await tokenRes.json();
            setCsrfToken(tokenData.csrfToken);
          }
        }
        setError(data.error || "Invalid family code");
        return;
      }

      setChildren(data.data);
      setStep("select-child");
      // Reset rate limit state when moving to next step
      setIsLocked(false);
      setLockoutSeconds(0);
      setAttemptsRemaining(null);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Select child
  const handleChildSelect = (child: ChildProfile) => {
    setSelectedChild(child);
    setStep("enter-pin");
    setPin("");
    setError("");
    // Reset rate limit state for new child
    setIsLocked(false);
    setLockoutSeconds(0);
    setAttemptsRemaining(null);
  };

  // Handle form submit (keyboard Enter key)
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length === 4) {
      submitPin(pin);
    }
  };

  // Handle PIN digit press
  const handlePinDigit = (digit: string) => {
    if (isLocked || isLoading || pin.length >= 4) return;

    const newPin = pin + digit;
    setPin(newPin);

    // Auto-submit when 4 digits entered
    if (newPin.length === 4 && selectedChild) {
      // Use a small delay to let the UI update, then submit
      setTimeout(() => {
        submitPin(newPin);
      }, 150);
    }
  };

  // Direct PIN submission function (avoids stale closure issues)
  const submitPin = async (submittedPin: string) => {
    if (!selectedChild || submittedPin.length !== 4 || isLoading) return;

    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/kids/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId: selectedChild.id,
          pin: submittedPin,
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
        if (res.status === 403) {
          const tokenRes = await fetch("/api/kids/auth/csrf", {
            credentials: "include",
          });
          if (tokenRes.ok) {
            const tokenData = await tokenRes.json();
            setCsrfToken(tokenData.csrfToken);
          }
        }

        setError(data.error || "Incorrect PIN");
        setPin("");
        return;
      }

      // Session is now stored in HttpOnly cookie automatically
      // Hard redirect to kid dashboard (ensures cookie is sent with new request)
      window.location.href = `/kids/${selectedChild.id}/dashboard`;
      return; // Don't setIsLoading(false) - we're navigating away
    } catch {
      setError("Something went wrong. Please try again.");
      setPin("");
      setIsLoading(false);
    }
  };

  // Handle PIN backspace
  const handlePinBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  const goBack = () => {
    setError("");
    setIsLocked(false);
    setLockoutSeconds(0);
    setAttemptsRemaining(null);

    if (step === "enter-pin") {
      setStep("select-child");
      setPin("");
    } else if (step === "select-child") {
      setStep("family-code");
      setChildren([]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sage-very-light to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {step !== "family-code" && (
            <button
              onClick={goBack}
              className="absolute left-4 top-4 p-2 rounded-lg hover:bg-silver-very-light transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-text-medium" />
            </button>
          )}
          <div className="flex justify-center mb-4">
            <span className="text-6xl">🦜</span>
          </div>
          <CardTitle className="text-2xl font-bold text-text-dark">
            {step === "family-code" && "Hi there!"}
            {step === "select-child" && "Who's logging in?"}
            {step === "enter-pin" && `Hi ${selectedChild?.name}!`}
          </CardTitle>
          <p className="text-text-medium mt-2">
            {step === "family-code" && "Enter your family code to get started"}
            {step === "select-child" && "Tap your picture to continue"}
            {step === "enter-pin" &&
              (isLocked
                ? "Too many tries - please wait"
                : "Enter your 4-digit PIN")}
          </p>
        </CardHeader>

        <CardContent>
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

          {/* Step 1: Family Code */}
          {step === "family-code" && (
            <form onSubmit={handleFamilyCodeSubmit} className="space-y-4">
              <Input
                type="text"
                placeholder="XXXX-XXXX"
                value={familyCode}
                onChange={(e) => {
                  let value = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
                  // Auto-insert hyphen after 4 characters
                  if (value.length === 4 && !value.includes("-")) {
                    value = value + "-";
                  }
                  // Remove extra hyphens if user types one manually at wrong position
                  if (value.length > 0 && value[4] !== "-" && value.includes("-")) {
                    value = value.replace(/-/g, "");
                    if (value.length >= 4) {
                      value = value.slice(0, 4) + "-" + value.slice(4);
                    }
                  }
                  setFamilyCode(value);
                }}
                className="text-center text-2xl font-mono tracking-wider h-14"
                maxLength={9}
                autoFocus
                disabled={isLocked}
              />
              <Button
                type="submit"
                className="w-full h-12 text-lg bg-sage hover:bg-sage-dark"
                disabled={isLoading || familyCode.length < 9 || isLocked}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Continue"
                )}
              </Button>

              <p className="text-center text-sm text-text-light mt-4">
                Forgot your family code?{" "}
                <span className="text-sage-dark">Ask your parent!</span>
              </p>
            </form>
          )}

          {/* Step 2: Select Child */}
          {step === "select-child" && (
            <div className="grid grid-cols-2 gap-4">
              {children.map((child) => (
                <button
                  key={child.id}
                  onClick={() => handleChildSelect(child)}
                  className={cn(
                    "flex flex-col items-center p-4 rounded-xl border-2 transition-all",
                    "hover:border-sage hover:bg-sage-very-light",
                    "border-silver-light bg-white"
                  )}
                >
                  <div className="w-20 h-20 rounded-full bg-sage-light flex items-center justify-center text-4xl mb-2">
                    {child.avatar_url ? (
                      <Image
                        src={child.avatar_url}
                        alt={child.name}
                        width={80}
                        height={80}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      "👤"
                    )}
                  </div>
                  <span className="font-semibold text-text-dark">
                    {child.name}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Step 3: Enter PIN */}
          {step === "enter-pin" && (
            <form
              id="pin-form"
              onSubmit={handleFormSubmit}
              className="space-y-6"
            >
              {/* PIN Display */}
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

              {/* Number Pad */}
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handlePinDigit(String(digit))}
                    disabled={isLoading || isLocked}
                    className={cn(
                      "h-16 rounded-xl text-2xl font-semibold transition-all",
                      "bg-white border border-silver-light",
                      isLocked
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
                  disabled={isLoading || isLocked}
                  className={cn(
                    "h-16 rounded-xl text-2xl font-semibold transition-all",
                    "bg-white border border-silver-light",
                    isLocked
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

              {isLoading && (
                <div className="flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-sage" />
                </div>
              )}

              <p className="text-center text-sm text-text-light">
                Forgot your PIN?{" "}
                <span className="text-sage-dark">
                  Ask your parent to reset it!
                </span>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
