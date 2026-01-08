"use client";

import Link from "next/link";
import { Cookie } from "lucide-react";
import { COOKIE_CONSENT_KEY } from "@/lib/types/cookie-consent";

interface SiteFooterProps {
  className?: string;
}

export function SiteFooter({ className }: SiteFooterProps) {
  const handleManageCookies = () => {
    // Remove consent to show the banner again
    localStorage.removeItem(COOKIE_CONSENT_KEY);
    window.location.reload();
  };

  return (
    <footer className={className}>
      <div className="max-w-7xl mx-auto px-6 py-8 md:px-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Copyright */}
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} My Budget Mate. All rights
            reserved.
          </p>

          {/* Links */}
          <nav className="flex flex-wrap justify-center gap-4 md:gap-6">
            <Link
              href="/privacy"
              className="text-sm text-muted-foreground hover:text-sage transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/privacy/cookies"
              className="text-sm text-muted-foreground hover:text-sage transition-colors"
            >
              Cookie Policy
            </Link>
            <button
              onClick={handleManageCookies}
              className="text-sm text-muted-foreground hover:text-sage transition-colors flex items-center gap-1.5"
            >
              <Cookie className="w-3.5 h-3.5" />
              Cookie Settings
            </button>
          </nav>
        </div>
      </div>
    </footer>
  );
}
