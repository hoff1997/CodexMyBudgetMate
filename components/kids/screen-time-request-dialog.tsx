"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tv, Loader2 } from "lucide-react";

interface ScreenTimeRequestDialogProps {
  childId: string;
  currentBalance: number;
  onRequestSent?: () => void;
}

export function ScreenTimeRequestDialog({
  childId,
  currentBalance,
  onRequestSent,
}: ScreenTimeRequestDialogProps) {
  const [open, setOpen] = useState(false);
  const [minutes, setMinutes] = useState("30");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const minutesNum = parseInt(minutes);

    if (minutesNum <= 0) {
      setError("Please enter a positive number");
      return;
    }

    if (minutesNum > currentBalance) {
      setError(`You can only request up to ${currentBalance} minutes.`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/kids/screen-time/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          child_id: childId,
          minutes_requested: minutesNum,
        }),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          setOpen(false);
          setMinutes("30");
          setSuccess(false);
          onRequestSent?.();
        }, 2000);
      } else {
        const data = await res.json();
        setError(data.error || "Request failed");
      }
    } catch (err) {
      console.error("Request error:", err);
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const quickOptions = [15, 30, 60, 120];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue hover:bg-blue/90 gap-2">
          <Tv className="h-4 w-4" />
          Request Screen Time
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tv className="h-5 w-5 text-blue" />
            Request Screen Time
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center">
            <div className="text-4xl mb-4">✅</div>
            <h3 className="text-lg font-semibold text-sage">Request Sent!</h3>
            <p className="text-sm text-text-medium mt-2">
              Your parent will approve it soon.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-blue-light p-4 rounded-lg text-center">
              <div className="text-sm text-text-medium">Available Balance</div>
              <div className="text-3xl font-bold text-blue">
                {currentBalance} min
              </div>
            </div>

            <div>
              <Label htmlFor="minutes">How many minutes?</Label>
              <Input
                id="minutes"
                type="number"
                min="1"
                max={currentBalance}
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                required
                className="text-center text-lg"
              />
            </div>

            <div className="grid grid-cols-4 gap-2">
              {quickOptions.map((mins) => (
                <Button
                  key={mins}
                  type="button"
                  variant={minutes === mins.toString() ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMinutes(mins.toString())}
                  disabled={mins > currentBalance}
                  className={
                    minutes === mins.toString()
                      ? "bg-blue hover:bg-blue/90"
                      : ""
                  }
                >
                  {mins}m
                </Button>
              ))}
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-sage hover:bg-sage-dark"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Send Request"
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
