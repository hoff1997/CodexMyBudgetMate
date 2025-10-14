"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const schema = z.object({
  email: z.string().email({ message: "Enter a valid email" }),
});

type FormValues = z.infer<typeof schema>;

export function AuthForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(values: FormValues) {
    try {
      setIsLoading(true);
      const response = await fetch("/auth/sign-in", {
        method: "POST",
        body: JSON.stringify(values),
        headers: { "Content-Type": "application/json" },
      });
      setIsLoading(false);

      if (!response.ok) {
        toast.error("Authentication failed. Please try again.");
        return;
      }

      toast.success("Check your email for a magic link to sign in.");

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong. Please try again shortly.");
      setIsLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-1">
        <Input placeholder="Email" type="email" {...register("email")} />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>
      <Button className="w-full" type="submit" disabled={isLoading || isPending}>
        {isLoading || isPending ? "Sending magic link…" : "Send magic link"}
      </Button>
    </form>
  );
}
