"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { markUserAsReturning } from "@/components/landing/returning-user-cta";

export default function SignupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    general?: string;
  }>({});
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});

    // Validate email
    if (!email || !email.includes("@")) {
      setErrors((prev) => ({ ...prev, email: "Please enter a valid email address" }));
      return;
    }

    // Validate password
    if (!password || password.length < 8) {
      setErrors((prev) => ({ ...prev, password: "Password must be at least 8 characters" }));
      return;
    }

    // Validate confirm password
    if (password !== confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: "Passwords don't match" }));
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch("/auth/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        setErrors({ general: data.error || "Something went wrong" });
        setIsLoading(false);
        return;
      }

      // Mark user as returning for personalized landing page
      markUserAsReturning();

      if (data.needsEmailConfirmation) {
        setSuccess(true);
      } else {
        // Auto-signed in, redirect to dashboard
        router.push("/dashboard");
        router.refresh();
      }
    } catch (error) {
      console.error(error);
      setErrors({ general: "Something went wrong. Please try again." });
      setIsLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#E2EEEC] via-white to-[#F3F4F6]">
        <header className="border-b border-[#E5E7EB] bg-white/80 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center">
              <span className="text-xl font-semibold text-[#3D3D3D]">My Budget Mate</span>
            </Link>
          </div>
        </header>

        <main className="mx-auto flex min-h-[calc(100vh-80px)] max-w-md items-center justify-center px-6 py-12">
          <Card className="w-full border-[#E5E7EB] shadow-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-xl text-[#3D3D3D]">Check your email</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-sm text-[#6B6B6B]">
                We've sent a confirmation link to <strong>{email}</strong>
              </p>
              <p className="text-sm text-[#6B6B6B]">
                Click the link in your email to activate your account.
              </p>
              <div className="pt-4">
                <Link
                  href="/login"
                  className="text-sm text-[#5A7E7A] hover:underline"
                >
                  Back to sign in
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E2EEEC] via-white to-[#F3F4F6]">
      <header className="border-b border-[#E5E7EB] bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center">
            <span className="text-xl font-semibold text-[#3D3D3D]">My Budget Mate</span>
          </Link>
          <Button asChild variant="ghost" size="sm" className="text-[#6B6B6B]">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-80px)] max-w-md items-center justify-center px-6 py-12">
        <div className="w-full space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold text-[#3D3D3D]">Create your account</h1>
          </div>

          <Card className="border-[#E5E7EB] shadow-sm">
            <CardContent className="pt-6">
              <form className="space-y-4" onSubmit={handleSubmit} suppressHydrationWarning>
                {errors.general && (
                  <div className="rounded-lg bg-[#DDEAF5] p-3 text-sm text-[#4A7BA8]">
                    {errors.general}
                  </div>
                )}

                <div className="space-y-1">
                  <Input
                    placeholder="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border-[#E5E7EB] focus:border-[#7A9E9A] focus:ring-[#7A9E9A]"
                  />
                  {errors.email && (
                    <p className="text-xs text-[#6B9ECE]">{errors.email}</p>
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
                  {errors.password && (
                    <p className="text-xs text-[#6B9ECE]">{errors.password}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Input
                    placeholder="Confirm password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="border-[#E5E7EB] focus:border-[#7A9E9A] focus:ring-[#7A9E9A]"
                  />
                  {errors.confirmPassword && (
                    <p className="text-xs text-[#6B9ECE]">{errors.confirmPassword}</p>
                  )}
                </div>

                <Button
                  className="w-full bg-[#7A9E9A] hover:bg-[#6B8E8A] text-white"
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-[#6B6B6B]">
                  Already have an account?{" "}
                  <Link href="/login" className="text-[#5A7E7A] hover:underline">
                    Sign in
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
