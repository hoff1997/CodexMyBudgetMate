import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-primary/10">
      <header className="border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <PiggyBank className="h-7 w-7 text-primary" />
            <span className="text-lg font-semibold text-secondary">My Budget Mate</span>
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-80px)] max-w-md items-center justify-center px-6 py-12">
        <div className="w-full space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold text-secondary">Welcome back</h1>
            <p className="text-sm text-muted-foreground">
              Sign in to your account to continue
            </p>
          </div>

          <Card className="border shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl text-secondary">Sign in</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Enter your email and password
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AuthForm />
              <div className="mt-6 space-y-3">
                <p className="text-center text-xs text-muted-foreground">
                  Need an account?{" "}
                  <Link href="/signup" className="text-primary underline hover:no-underline">
                    Request early access
                  </Link>
                </p>
                <p className="text-center text-xs text-muted-foreground">
                  Or{" "}
                  <Link href="/api/demo-mode/enter?redirect=/dashboard" className="text-primary underline hover:no-underline">
                    explore in demo mode
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
