"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export function AuthForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

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

      // Wait a bit for cookies to be stored, then redirect client-side
      setTimeout(() => {
        router.push("/dashboard");
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
      <div className="space-y-1">
        <Input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border-[#E5E7EB] focus:border-[#7A9E9A] focus:ring-[#7A9E9A]"
        />
        {emailError && (
          <p className="text-xs text-[#6B9ECE]">{emailError}</p>
        )}
      </div>
      <div className="space-y-1">
        <Input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border-[#E5E7EB] focus:border-[#7A9E9A] focus:ring-[#7A9E9A]"
        />
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
        <Link href="/forgot-password" className="text-sm text-[#5A7E7A] hover:underline">
          Forgot password?
        </Link>
      </div>
    </form>
  );
}
