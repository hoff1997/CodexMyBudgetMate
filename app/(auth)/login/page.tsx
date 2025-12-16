import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PiggyBank } from "lucide-react";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E2EEEC] via-white to-[#F3F4F6]">
      <header className="border-b border-[#E5E7EB] bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <PiggyBank className="h-7 w-7 text-[#7A9E9A]" />
            <span className="text-lg font-semibold text-[#3D3D3D]">My Budget Mate</span>
          </Link>
          <Button asChild variant="ghost" size="sm" className="text-[#6B6B6B]">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-80px)] max-w-md items-center justify-center px-6 py-12">
        <div className="w-full space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold text-[#3D3D3D]">Welcome back</h1>
          </div>

          <Card className="border-[#E5E7EB] shadow-sm">
            <CardContent className="pt-6">
              <AuthForm />
              <div className="mt-6 text-center">
                <p className="text-sm text-[#6B6B6B]">
                  Don't have an account?{" "}
                  <Link href="/signup" className="text-[#5A7E7A] hover:underline">
                    Sign up
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
