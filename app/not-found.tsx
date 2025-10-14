"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-sky-50 via-white to-primary/10 px-6 py-24 text-center">
      <div className="mx-auto flex max-w-xl flex-col items-center gap-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <span className="text-2xl font-semibold text-primary">404</span>
        </div>
        <h1 className="text-4xl font-semibold text-secondary md:text-5xl">Page not found</h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Looks like this budget page is still under construction. Use the navigation below or head
          back to the dashboard to keep planning.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Visit marketing site</Link>
          </Button>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-3 text-xs text-muted-foreground">
          <Link className="underline-offset-4 hover:underline" href="/privacy">
            Privacy policy
          </Link>
          <span>·</span>
          <Link className="underline-offset-4 hover:underline" href="/terms">
            Terms of service
          </Link>
          <span>·</span>
          <Link className="underline-offset-4 hover:underline" href="/support">
            Support
          </Link>
        </div>
      </div>
    </div>
  );
}
