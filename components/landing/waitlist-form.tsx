"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Script from "next/script";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: string | HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact" | "invisible";
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

interface WaitlistFormProps {
  source?: string;
  className?: string;
  variant?: "default" | "compact" | "hero";
}

export function WaitlistForm({
  source = "website",
  className = "",
  variant = "default",
}: WaitlistFormProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

  // Render Turnstile widget when the script loads
  const renderTurnstile = () => {
    if (!window.turnstile || !turnstileRef.current || !siteKey) return;
    // Avoid double-rendering
    if (widgetIdRef.current) return;

    widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
      sitekey: siteKey,
      callback: (token: string) => setTurnstileToken(token),
      "expired-callback": () => setTurnstileToken(""),
      "error-callback": () => setTurnstileToken(""),
      theme: "light",
      size: variant === "compact" ? "compact" : "normal",
    });
  };

  // Clean up widget on unmount
  useEffect(() => {
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name,
          source,
          turnstileToken: turnstileToken || undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setStatus("success");
        setMessage(data.message);
        setEmail("");
        setName("");
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong. Give it another go?");
        // Reset Turnstile for retry
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current);
          setTurnstileToken("");
        }
      }
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Give it another go?");
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
        setTurnstileToken("");
      }
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
          </div>
        </div>
      </div>
    );
  }

  const turnstileWidget = siteKey ? (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback"
        strategy="lazyOnload"
        onReady={renderTurnstile}
      />
      <div ref={turnstileRef} className="flex justify-center" />
    </>
  ) : null;

  // Compact variant (for footer, sidebar)
  if (variant === "compact") {
    return (
      <div className={className}>
        <form onSubmit={handleSubmit} suppressHydrationWarning className="space-y-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={status === "loading"}
              suppressHydrationWarning
              className="flex-1 px-4 py-2.5 rounded-lg border border-silver-light focus:border-sage focus:ring-1 focus:ring-sage outline-none text-sm disabled:opacity-50"
            />
            <input
              type="email"
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={status === "loading"}
              suppressHydrationWarning
              className="flex-1 px-4 py-2.5 rounded-lg border border-silver-light focus:border-sage focus:ring-1 focus:ring-sage outline-none text-sm disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full px-5 py-2.5 bg-sage hover:bg-sage-dark text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm whitespace-nowrap"
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
          {turnstileWidget}
          {status === "error" && (
            <p className="text-sm text-blue flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {message}
            </p>
          )}
        </form>
      </div>
    );
  }

  // Default and hero variants
  return (
    <div className={className}>
      <form onSubmit={handleSubmit} suppressHydrationWarning className="space-y-3">
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={status === "loading"}
          suppressHydrationWarning
          className="w-full px-4 py-3 rounded-xl border border-silver-light focus:border-sage focus:ring-2 focus:ring-sage/20 outline-none disabled:opacity-50"
        />
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={status === "loading"}
            suppressHydrationWarning
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
        {turnstileWidget}
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
