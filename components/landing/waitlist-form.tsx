"use client";

import { useState } from "react";
import Image from "next/image";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface WaitlistFormProps {
  source?: string;
  showName?: boolean;
  className?: string;
  variant?: "default" | "compact" | "hero";
}

export function WaitlistForm({
  source = "website",
  showName = false,
  className = "",
  variant = "default",
}: WaitlistFormProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [referralCode, setReferralCode] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, source }),
      });

      const data = await res.json();

      if (data.success) {
        setStatus("success");
        setMessage(data.message);
        setReferralCode(data.referralCode || "");
        setEmail("");
        setName("");
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong. Give it another go?");
      }
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Give it another go?");
    }
  };

  // Success state with Remy celebrating
  if (status === "success") {
    return (
      <div className={`rounded-2xl bg-sage-very-light border border-sage-light p-6 ${className}`}>
        <div className="flex items-start gap-4">
          <div className="relative w-16 h-16 flex-shrink-0">
            <Image
              src="/Images/remy-celebrating.png"
              alt="Remy celebrating"
              fill
              className="object-contain"
              quality={100}
              unoptimized
            />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-sage" />
              <h3 className="font-semibold text-text-dark">You legend!</h3>
            </div>
            <p className="text-sage-dark text-sm mb-3">{message}</p>
            <p className="text-text-medium text-sm">
              Grab a cuppa and relax - I&apos;ll send you an email as soon as we&apos;re ready for you.
            </p>
            {referralCode && (
              <div className="mt-4 p-3 bg-white rounded-lg border border-sage-light">
                <p className="text-xs text-text-medium mb-1">Your referral code:</p>
                <p className="font-mono font-semibold text-sage-dark">{referralCode}</p>
                <p className="text-xs text-text-light mt-1">
                  Share this with mates to move up the list!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Compact variant (for footer, sidebar)
  if (variant === "compact") {
    return (
      <form onSubmit={handleSubmit} className={`flex flex-col sm:flex-row gap-2 ${className}`}>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={status === "loading"}
          className="flex-1 px-4 py-2.5 rounded-lg border border-silver-light focus:border-sage focus:ring-1 focus:ring-sage outline-none text-sm disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="px-5 py-2.5 bg-sage hover:bg-sage-dark text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm whitespace-nowrap"
        >
          {status === "loading" ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Joining...
            </>
          ) : (
            "Join Waitlist"
          )}
        </button>
        {status === "error" && (
          <p className="text-sm text-blue flex items-center gap-1 sm:col-span-2">
            <AlertCircle className="w-4 h-4" />
            {message}
          </p>
        )}
      </form>
    );
  }

  // Default and hero variants
  return (
    <div className={className}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {showName && (
          <input
            type="text"
            placeholder="Your name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={status === "loading"}
            className="w-full px-4 py-3 rounded-xl border border-silver-light focus:border-sage focus:ring-2 focus:ring-sage/20 outline-none disabled:opacity-50"
          />
        )}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={status === "loading"}
            className="flex-1 px-4 py-3 rounded-xl border border-silver-light focus:border-sage focus:ring-2 focus:ring-sage/20 outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className={`px-6 py-3 bg-sage hover:bg-sage-dark text-white font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap ${
              variant === "hero" ? "text-lg px-8" : ""
            }`}
          >
            {status === "loading" ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Joining...
              </>
            ) : (
              "Join the Waitlist"
            )}
          </button>
        </div>
        {status === "error" && (
          <div className="flex items-center gap-2 text-blue text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p>{message}</p>
          </div>
        )}
      </form>
      <p className="text-text-light text-sm mt-3">
        No spam. Just a heads up when we&apos;re ready.
      </p>
    </div>
  );
}
