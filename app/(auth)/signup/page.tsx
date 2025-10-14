import Link from "next/link";

export default function SignupInfoPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-lg space-y-6 rounded-2xl border bg-background p-8 shadow-lg">
        <h1 className="text-2xl font-semibold">Request access</h1>
        <p className="text-sm text-muted-foreground">
          My Budget Mate is currently in a guided onboarding phase. To request an invite,
          email <a className="text-primary underline" href="mailto:hello@mybudgetmate.co.nz">hello@mybudgetmate.co.nz</a>.
        </p>
        <p className="text-sm text-muted-foreground">
          Already invited? Check your email for a Supabase magic link or {" "}
          <Link href="/login" className="text-primary underline">
            try signing in again
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
