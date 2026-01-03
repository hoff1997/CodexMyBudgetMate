"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { ArrowLeft, Loader2 } from "lucide-react";

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

  // Step 1: Look up family code
  const handleFamilyCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/kids/auth/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ familyCode: familyCode.toUpperCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid family code");
        return;
      }

      setChildren(data.data);
      setStep("select-child");
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
  };

  // Step 3: Enter PIN
  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChild || pin.length !== 4) return;

    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/kids/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId: selectedChild.id, pin }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Incorrect PIN");
        setPin("");
        return;
      }

      // Store kid session in localStorage
      localStorage.setItem("kidSession", JSON.stringify(data.data.session));

      // Redirect to kid dashboard
      router.push(`/kids/${selectedChild.id}/dashboard`);
    } catch {
      setError("Something went wrong. Please try again.");
      setPin("");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle PIN digit press
  const handlePinDigit = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);

      // Auto-submit when 4 digits entered
      if (newPin.length === 4) {
        setTimeout(() => {
          const form = document.getElementById("pin-form") as HTMLFormElement;
          form?.requestSubmit();
        }, 100);
      }
    }
  };

  // Handle PIN backspace
  const handlePinBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  const goBack = () => {
    setError("");
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
            {step === "enter-pin" && "Enter your 4-digit PIN"}
          </p>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-gold-light text-gold-dark rounded-lg text-center text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Family Code */}
          {step === "family-code" && (
            <form onSubmit={handleFamilyCodeSubmit} className="space-y-4">
              <Input
                type="text"
                placeholder="XXXX-2026"
                value={familyCode}
                onChange={(e) => setFamilyCode(e.target.value.toUpperCase())}
                className="text-center text-2xl font-mono tracking-wider h-14"
                maxLength={13}
                autoFocus
              />
              <Button
                type="submit"
                className="w-full h-12 text-lg bg-sage hover:bg-sage-dark"
                disabled={isLoading || familyCode.length < 9}
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
                      <img
                        src={child.avatar_url}
                        alt={child.name}
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
            <form id="pin-form" onSubmit={handlePinSubmit} className="space-y-6">
              {/* PIN Display */}
              <div className="flex justify-center gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-14 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold",
                      pin.length > i
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
                    disabled={isLoading}
                    className={cn(
                      "h-16 rounded-xl text-2xl font-semibold transition-all",
                      "bg-white border border-silver-light",
                      "hover:bg-sage-very-light hover:border-sage",
                      "active:scale-95"
                    )}
                  >
                    {digit}
                  </button>
                ))}
                <div /> {/* Empty cell */}
                <button
                  type="button"
                  onClick={() => handlePinDigit("0")}
                  disabled={isLoading}
                  className={cn(
                    "h-16 rounded-xl text-2xl font-semibold transition-all",
                    "bg-white border border-silver-light",
                    "hover:bg-sage-very-light hover:border-sage",
                    "active:scale-95"
                  )}
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handlePinBackspace}
                  disabled={isLoading || pin.length === 0}
                  className={cn(
                    "h-16 rounded-xl text-xl font-semibold transition-all",
                    "bg-silver-very-light border border-silver-light",
                    "hover:bg-silver-light",
                    "active:scale-95",
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
                <span className="text-sage-dark">Ask your parent to reset it!</span>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
