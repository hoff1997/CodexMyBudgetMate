"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface ReturningUserCTAProps {
  variant: "header" | "hero" | "footer";
}

const RETURNING_USER_KEY = "mbm_returning_user";
const USER_NAME_KEY = "mbm_user_name";

export function ReturningUserCTA({ variant }: ReturningUserCTAProps) {
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check if user has visited before
    const returning = localStorage.getItem(RETURNING_USER_KEY);
    const name = localStorage.getItem(USER_NAME_KEY);

    if (returning === "true") {
      setIsReturningUser(true);
      if (name) {
        setUserName(name);
      }
    }
  }, []);

  // Show nothing until mounted to prevent hydration mismatch
  if (!mounted) {
    // Return placeholder that matches server render
    if (variant === "header") {
      return (
        <div className="flex gap-2 sm:gap-3">
          <Button asChild variant="outline" size="sm" className="border-[#7A9E9A] text-[#5A7E7A] hover:bg-[#E2EEEC] sm:size-default">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm" className="bg-[#7A9E9A] hover:bg-[#6B8E8A] text-white sm:size-default">
            <Link href="/signup">Get Started</Link>
          </Button>
        </div>
      );
    }
    if (variant === "hero") {
      return (
        <Button asChild size="lg" className="bg-[#7A9E9A] hover:bg-[#6B8E8A] text-white w-auto">
          <Link href="/signup">Get Started Free</Link>
        </Button>
      );
    }
    if (variant === "footer") {
      return (
        <div className="flex flex-col items-center justify-center gap-3 md:flex-row">
          <Button asChild size="lg" className="bg-[#7A9E9A] hover:bg-[#6B8E8A] text-white w-full sm:w-auto">
            <Link href="/signup">Start your free account</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-[#7A9E9A] hover:bg-[#E2EEEC] text-[#5A7E7A] bg-white w-full sm:w-auto min-h-[44px] px-4 py-2">
            <Link href="/login" className="whitespace-normal text-center leading-tight">
              Already have an account? Sign in
            </Link>
          </Button>
        </div>
      );
    }
    return null;
  }

  if (variant === "header") {
    if (isReturningUser) {
      return (
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-sm text-[#6B6B6B] hidden sm:inline">
            Welcome back{userName ? `, ${userName}` : ""}!
          </span>
          <Button asChild size="sm" className="bg-[#7A9E9A] hover:bg-[#6B8E8A] text-white sm:size-default">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      );
    }
    return (
      <div className="flex gap-2 sm:gap-3">
        <Button asChild variant="outline" size="sm" className="border-[#7A9E9A] text-[#5A7E7A] hover:bg-[#E2EEEC] sm:size-default">
          <Link href="/login">Sign in</Link>
        </Button>
        <Button asChild size="sm" className="bg-[#7A9E9A] hover:bg-[#6B8E8A] text-white sm:size-default">
          <Link href="/signup">Get Started</Link>
        </Button>
      </div>
    );
  }

  if (variant === "hero") {
    if (isReturningUser) {
      return (
        <Button asChild size="lg" className="bg-[#7A9E9A] hover:bg-[#6B8E8A] text-white w-auto">
          <Link href="/login">Continue to My Budget</Link>
        </Button>
      );
    }
    return (
      <Button asChild size="lg" className="bg-[#7A9E9A] hover:bg-[#6B8E8A] text-white w-auto">
        <Link href="/signup">Get Started Free</Link>
      </Button>
    );
  }

  if (variant === "footer") {
    if (isReturningUser) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 md:flex-row">
          <Button asChild size="lg" className="bg-[#7A9E9A] hover:bg-[#6B8E8A] text-white w-full sm:w-auto">
            <Link href="/login">
              {userName ? `Continue as ${userName}` : "Continue to My Budget"}
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-[#7A9E9A] hover:bg-[#E2EEEC] text-[#5A7E7A] bg-white w-full sm:w-auto min-h-[44px] px-4 py-2">
            <Link href="/signup" className="whitespace-normal text-center leading-tight">
              New here? Create an account
            </Link>
          </Button>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center gap-3 md:flex-row">
        <Button asChild size="lg" className="bg-[#7A9E9A] hover:bg-[#6B8E8A] text-white w-full sm:w-auto">
          <Link href="/signup">Start your free account</Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="border-[#7A9E9A] hover:bg-[#E2EEEC] text-[#5A7E7A] bg-white w-full sm:w-auto min-h-[44px] px-4 py-2">
          <Link href="/login" className="whitespace-normal text-center leading-tight">
            Already have an account? Sign in
          </Link>
        </Button>
      </div>
    );
  }

  return null;
}

// Utility to mark user as returning (call this after successful login)
export function markUserAsReturning(name?: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(RETURNING_USER_KEY, "true");
    if (name) {
      localStorage.setItem(USER_NAME_KEY, name);
    }
  }
}

// Utility to clear returning user status (call this after account deletion)
export function clearReturningUserStatus() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(RETURNING_USER_KEY);
    localStorage.removeItem(USER_NAME_KEY);
  }
}
