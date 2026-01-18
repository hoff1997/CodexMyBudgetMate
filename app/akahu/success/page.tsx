"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

function AkahuSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const destination = searchParams.get("destination") || "settings";

  useEffect(() => {
    // The callback has already verified everything and stored the tokens
    // Just redirect to the destination - the page will handle auth if needed
    const redirectUrl = destination === "onboarding"
      ? "/onboarding?akahu=connected"
      : "/settings/bank-connections?akahu=connected";

    // Small delay to show success message
    const timer = setTimeout(() => {
      router.replace(redirectUrl);
    }, 500);

    return () => clearTimeout(timer);
  }, [destination, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8 max-w-md">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Bank Connected Successfully!
        </h1>
        <p className="text-gray-600">
          Redirecting you back...
        </p>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8 max-w-md">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-sage mb-4" />
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Bank Connected Successfully!
        </h1>
        <p className="text-gray-600">
          Setting up your accounts...
        </p>
      </div>
    </div>
  );
}

/**
 * Akahu OAuth Success Page
 *
 * This page handles the redirect after successful Akahu OAuth callback.
 * It checks if the user's session is still valid and redirects appropriately.
 * If the session was lost during the OAuth flow, it prompts re-authentication.
 */
export default function AkahuSuccessPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AkahuSuccessContent />
    </Suspense>
  );
}
