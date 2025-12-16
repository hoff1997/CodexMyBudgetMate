"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (resetError) {
      setError(resetError.message);
    } else {
      setSuccess(true);
    }

    setLoading(false);
  };

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
                We've sent a password reset link to <strong>{email}</strong>
              </p>
              <p className="text-sm text-[#6B6B6B]">
                Click the link in your email to reset your password.
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
            <h1 className="text-2xl font-semibold text-[#3D3D3D]">Reset your password</h1>
            <p className="text-sm text-[#6B6B6B]">
              Enter your email and we'll send you a reset link.
            </p>
          </div>

          <Card className="border-[#E5E7EB] shadow-sm">
            <CardContent className="pt-6">
              <form onSubmit={handleResetPassword} className="space-y-4">
                {error && (
                  <div className="rounded-lg bg-[#DDEAF5] p-3 text-sm text-[#4A7BA8]">
                    {error}
                  </div>
                )}

                <div>
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="border-[#E5E7EB] focus:border-[#7A9E9A] focus:ring-[#7A9E9A]"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[#7A9E9A] hover:bg-[#6B8E8A] text-white"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-[#6B6B6B]">
                  Remember your password?{" "}
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
