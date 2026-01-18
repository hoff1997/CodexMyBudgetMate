"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

function AkahuSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"checking" | "redirecting" | "needs_auth">("checking");

  const destination = searchParams.get("destination") || "settings";

  useEffect(() => {
    async function checkSessionAndRedirect() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Session is valid, redirect to destination
        setStatus("redirecting");
        if (destination === "onboarding") {
          router.replace("/onboarding?akahu=connected");
        } else {
          router.replace("/settings/bank-connections?akahu=connected");
        }
      } else {
        // Session was lost, need to re-authenticate
        setStatus("needs_auth");
        // Store the destination for after login
        sessionStorage.setItem("akahu_redirect", destination === "onboarding" ? "/onboarding?akahu=connected" : "/settings/bank-connections?akahu=connected");
        // Redirect to login with a return URL
        setTimeout(() => {
          router.replace(`/login?redirect=${encodeURIComponent(destination === "onboarding" ? "/onboarding?akahu=connected" : "/settings/bank-connections?akahu=connected")}`);
        }, 2000);
      }
    }

    checkSessionAndRedirect();
  }, [destination, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8 max-w-md">
        {status === "checking" && (
          <>
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-sage mb-4" />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Bank Connected Successfully!
            </h1>
            <p className="text-gray-600">
              Setting up your accounts...
            </p>
          </>
        )}

        {status === "redirecting" && (
          <>
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-sage mb-4" />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Bank Connected Successfully!
            </h1>
            <p className="text-gray-600">
              Redirecting you back...
            </p>
          </>
        )}

        {status === "needs_auth" && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Bank Connected Successfully!
            </h1>
            <p className="text-gray-600 mb-4">
              Your bank accounts have been linked. Please log in again to continue.
            </p>
            <p className="text-sm text-gray-500">
              Redirecting to login...
            </p>
          </>
        )}
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
