"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import Link from "next/link";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { markUserAsReturning } from "@/components/landing/returning-user-cta";

export function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState("/dashboard");

  // Check for redirect parameter or sessionStorage (from Akahu OAuth flow)
  useEffect(() => {
    const redirectParam = searchParams.get("redirect");
    const storedRedirect = typeof window !== "undefined" ? sessionStorage.getItem("akahu_redirect") : null;

    if (redirectParam) {
      setRedirectUrl(redirectParam);
    } else if (storedRedirect) {
      setRedirectUrl(storedRedirect);
      sessionStorage.removeItem("akahu_redirect");
    }
  }, [searchParams]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Reset errors
    setEmailError("");
    setPasswordError("");

    // Validate
    if (!email || !email.includes("@")) {
      setEmailError("Please enter your email");
      return;
    }
    if (!password) {
      setPasswordError("Please enter your password");
      return;
    }

    try {
      setIsLoading(true);

      // Call Route Handler which properly sets cookies
      const response = await fetch("/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        // Show generic error for security
        setEmailError("Invalid email or password");
        setIsLoading(false);
        return;
      }

      // Success! Cookies are now set by the Route Handler
      toast.success("Successfully signed in!");

      // Try to fetch user profile to get their name for personalization
      let userName: string | undefined;
      try {
        const profileResponse = await fetch("/api/user");
        if (profileResponse.ok) {
          const profile = await profileResponse.json();
          userName = profile.preferred_name || profile.full_name?.split(" ")[0];
        }
      } catch {
        // Ignore errors - name is optional
      }

      // Mark user as returning for personalized landing page
      markUserAsReturning(userName);

      // Wait a bit for cookies to be stored, then redirect client-side
      setTimeout(() => {
        router.push(redirectUrl);
        router.refresh();
      }, 100);
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit} suppressHydrationWarning>
      <div className="space-y-1" suppressHydrationWarning>
        <Input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border-[#E5E7EB] focus:border-[#7A9E9A] focus:ring-[#7A9E9A]"
          suppressHydrationWarning
        />
        {emailError && (
          <p className="text-xs text-[#6B9ECE]">{emailError}</p>
        )}
      </div>
      <div className="space-y-1" suppressHydrationWarning>
        <div className="relative">
          <Input
            placeholder="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border-[#E5E7EB] focus:border-[#7A9E9A] focus:ring-[#7A9E9A] pr-10"
            suppressHydrationWarning
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6B6B] hover:text-[#3D3D3D]"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {passwordError && (
          <p className="text-xs text-[#6B9ECE]">{passwordError}</p>
        )}
      </div>
      <Button className="w-full bg-[#7A9E9A] hover:bg-[#6B8E8A] text-white" type="submit" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : (
          "Sign In"
        )}
      </Button>
      <div className="text-center">
        <Link
          href={searchParams.get("bypass") ? `/forgot-password?bypass=${searchParams.get("bypass")}` : "/forgot-password"}
          className="text-sm text-[#5A7E7A] hover:underline"
        >
          Forgot password?
        </Link>
      </div>
    </form>
  );
}
