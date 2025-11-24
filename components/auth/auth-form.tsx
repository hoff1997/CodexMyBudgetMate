"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import Link from "next/link";
import { login } from "@/app/(auth)/login/actions";

export function AuthForm() {
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
      setEmailError("Enter a valid email");
      return;
    }
    if (!password || password.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }

    try {
      setIsLoading(true);

      // Use Server Action for proper cookie handling
      const formData = new FormData();
      formData.append("email", email);
      formData.append("password", password);

      const result = await login(formData);

      if (result?.error) {
        toast.error(result.error);
        setIsLoading(false);
        return;
      }

      // Server action will handle redirect
      toast.success("Successfully signed in!");
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong. Please try again shortly.");
      setIsLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-1">
        <Input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {emailError && (
          <p className="text-xs text-destructive">{emailError}</p>
        )}
      </div>
      <div className="space-y-1">
        <Input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {passwordError && (
          <p className="text-xs text-destructive">{passwordError}</p>
        )}
      </div>
      <Button className="w-full" type="submit" disabled={isLoading}>
        {isLoading ? "Signing in…" : "Sign in"}
      </Button>
      <div className="text-center text-sm text-muted-foreground">
        <Link href="/auth/forgot-password" className="text-primary hover:underline">
          Forgot password?
        </Link>
      </div>
    </form>
  );
}
