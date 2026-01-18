"use client";

import { useState, useEffect } from "react";

/**
 * HydrationSafe - Wrapper component that suppresses hydration warnings
 *
 * Use this to wrap content that may be affected by browser extensions
 * injecting elements before React hydrates (password managers, ad blockers, etc.)
 */
export function HydrationSafe({
  children,
  className = ""
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className} suppressHydrationWarning>
      {children}
    </div>
  );
}

/**
 * ClientOnly - Renders children only on the client after hydration
 *
 * Use this to completely avoid hydration mismatches for content that
 * browser extensions heavily modify (like password input fields).
 * The fallback is shown during SSR and initial hydration.
 */
export function ClientOnly({
  children,
  fallback = null,
  className = ""
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return fallback ? <div className={className}>{fallback}</div> : null;
  }

  return <div className={className}>{children}</div>;
}
