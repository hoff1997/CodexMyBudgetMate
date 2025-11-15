"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, Sparkles, TrendingUp, Shield, Zap } from "lucide-react";
import { cn } from "@/lib/cn";

interface DemoConversionBannerProps {
  daysInDemo: number;
  achievementsEarned: number;
  envelopesCreated: number;
  transactionsTracked: number;
  onConvert: () => void;
  onDismiss?: () => void;
  variant?: 'banner' | 'card' | 'modal';
}

/**
 * Demo Conversion Banner
 *
 * Encourages demo mode users to convert to real data
 * Uses empowering language and celebrates progress made in demo
 */
export function DemoConversionBanner({
  daysInDemo,
  achievementsEarned,
  envelopesCreated,
  transactionsTracked,
  onConvert,
  onDismiss,
  variant = 'banner',
}: DemoConversionBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  // Determine urgency level based on demo usage
  const urgencyLevel =
    daysInDemo >= 14 ? 'high' :
    daysInDemo >= 7 ? 'medium' :
    'low';

  // Progressive messaging based on time in demo
  const getMessage = () => {
    if (daysInDemo >= 14) {
      return {
        title: "You're ready for the real thing! 🚀",
        description: "You've mastered the demo. Your achievements and progress will transfer seamlessly.",
        cta: "Switch to Real Data",
      };
    } else if (daysInDemo >= 7) {
      return {
        title: "Loving the demo? Time to make it real! 💪",
        description: "Track your actual budget and keep all the progress you've made.",
        cta: "Connect My Data",
      };
    } else {
      return {
        title: "Ready to track your real budget? 🌟",
        description: "Everything you've learned will transfer - including your achievements!",
        cta: "Get Started",
      };
    }
  };

  const message = getMessage();

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  if (isDismissed) return null;

  // Banner variant (top of dashboard)
  if (variant === 'banner') {
    return (
      <div className={cn(
        "relative overflow-hidden rounded-lg border-2",
        urgencyLevel === 'high' ? 'bg-gradient-to-r from-emerald-500 to-blue-500 border-emerald-400' :
        urgencyLevel === 'medium' ? 'bg-gradient-to-r from-blue-500 to-purple-500 border-blue-400' :
        'bg-gradient-to-r from-purple-500 to-pink-500 border-purple-400'
      )}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            {/* Content */}
            <div className="flex-1 flex items-center gap-4">
              <div className="hidden sm:block">
                <Sparkles className="h-8 w-8 text-white" />
              </div>

              <div className="flex-1 text-white">
                <h3 className="font-bold text-lg mb-1">{message.title}</h3>
                <p className="text-sm text-white/90 mb-2">{message.description}</p>

                {/* Stats */}
                <div className="flex flex-wrap gap-3 text-xs">
                  {achievementsEarned > 0 && (
                    <div className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded-full">
                      <span>🏆</span>
                      <span>{achievementsEarned} achievement{achievementsEarned !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {envelopesCreated > 0 && (
                    <div className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded-full">
                      <span>📬</span>
                      <span>{envelopesCreated} envelope{envelopesCreated !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {transactionsTracked > 0 && (
                    <div className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded-full">
                      <span>💰</span>
                      <span>{transactionsTracked} transaction{transactionsTracked !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded-full">
                    <span>📅</span>
                    <span>{daysInDemo} day{daysInDemo !== 1 ? 's' : ''} in demo</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                onClick={onConvert}
                variant="secondary"
                className="bg-white text-emerald-600 hover:bg-white/90 font-semibold"
              >
                {message.cta}
              </Button>

              {onDismiss && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDismiss}
                  className="text-white/80 hover:text-white hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </div>
    );
  }

  // Card variant (sidebar or dedicated section)
  if (variant === 'card') {
    return (
      <Card className="relative overflow-hidden border-2 border-emerald-500">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/20 to-blue-500/20 rounded-full blur-3xl" />

        <CardContent className="p-6 relative">
          {onDismiss && (
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          <div className="space-y-4">
            {/* Icon */}
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-full flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>

            {/* Title */}
            <div>
              <h3 className="font-bold text-xl mb-2">{message.title}</h3>
              <p className="text-sm text-muted-foreground">{message.description}</p>
            </div>

            {/* Progress showcase */}
            <div className="space-y-2 pt-2">
              <p className="text-xs font-medium text-muted-foreground uppercase">Your Demo Progress</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted rounded-lg p-3 text-center">
                  <div className="text-2xl mb-1">🏆</div>
                  <div className="font-bold text-lg">{achievementsEarned}</div>
                  <div className="text-xs text-muted-foreground">Achievements</div>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <div className="text-2xl mb-1">📬</div>
                  <div className="font-bold text-lg">{envelopesCreated}</div>
                  <div className="text-xs text-muted-foreground">Envelopes</div>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <div className="text-2xl mb-1">💰</div>
                  <div className="font-bold text-lg">{transactionsTracked}</div>
                  <div className="text-xs text-muted-foreground">Transactions</div>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <div className="text-2xl mb-1">📅</div>
                  <div className="font-bold text-lg">{daysInDemo}</div>
                  <div className="text-xs text-muted-foreground">Days Active</div>
                </div>
              </div>
            </div>

            {/* Benefits */}
            <div className="space-y-2 pt-2 border-t">
              <p className="text-xs font-medium text-muted-foreground uppercase">What You'll Keep</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4 text-emerald-500" />
                  <span>All your achievements & badges</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-emerald-500" />
                  <span>Your envelope structure</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  <span>Everything you've learned</span>
                </div>
              </div>
            </div>

            {/* CTA */}
            <Button
              onClick={onConvert}
              className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white font-semibold"
              size="lg"
            >
              {message.cta}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              It only takes 2 minutes to connect your bank or import a CSV
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Modal variant (for high-urgency conversion prompts)
  if (variant === 'modal') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <Card className="max-w-lg w-full">
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              {/* Celebration */}
              <div className="text-6xl animate-bounce">🎉</div>

              <div>
                <h2 className="text-3xl font-bold mb-2">{message.title}</h2>
                <p className="text-muted-foreground">{message.description}</p>
              </div>

              {/* Progress Summary */}
              <div className="bg-gradient-to-r from-emerald-500 to-blue-500 text-white rounded-lg p-6 space-y-3">
                <p className="font-semibold">You've Made Amazing Progress!</p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-2xl mb-1">🏆</div>
                    <div className="font-bold">{achievementsEarned}</div>
                    <div className="text-xs text-white/80">Achievements</div>
                  </div>
                  <div>
                    <div className="text-2xl mb-1">📬</div>
                    <div className="font-bold">{envelopesCreated}</div>
                    <div className="text-xs text-white/80">Envelopes</div>
                  </div>
                  <div>
                    <div className="text-2xl mb-1">💰</div>
                    <div className="font-bold">{transactionsTracked}</div>
                    <div className="text-xs text-white/80">Transactions</div>
                  </div>
                </div>
              </div>

              {/* Reassurance */}
              <div className="bg-muted rounded-lg p-4 space-y-2">
                <p className="font-medium text-sm">Everything transfers seamlessly:</p>
                <ul className="space-y-1 text-sm text-left">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">✓</span>
                    <span>All {achievementsEarned} achievement{achievementsEarned !== 1 ? 's' : ''} and points</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">✓</span>
                    <span>Your envelope structure and settings</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">✓</span>
                    <span>Everything you've learned and configured</span>
                  </li>
                </ul>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <Button
                  onClick={onConvert}
                  className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white font-semibold"
                  size="lg"
                >
                  {message.cta}
                </Button>

                {onDismiss && (
                  <Button
                    variant="ghost"
                    onClick={handleDismiss}
                    className="w-full"
                  >
                    Maybe Later
                  </Button>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                {daysInDemo >= 14
                  ? "You've been exploring for 2 weeks - ready to make it official?"
                  : "Takes less than 2 minutes to connect your bank or import CSV"
                }
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}

/**
 * Hook to determine when to show conversion prompts
 */
export function useDemoConversionTiming(daysInDemo: number, dismissedCount: number) {
  const [shouldShow, setShouldShow] = useState(false);
  const [suggestedVariant, setSuggestedVariant] = useState<'banner' | 'card' | 'modal'>('banner');

  useEffect(() => {
    // Don't overwhelm user with prompts
    if (dismissedCount >= 5) {
      setShouldShow(false);
      return;
    }

    // Progressive urgency
    if (daysInDemo >= 14) {
      // High urgency - show modal every 3rd visit
      setShouldShow(dismissedCount % 3 === 0);
      setSuggestedVariant('modal');
    } else if (daysInDemo >= 7) {
      // Medium urgency - show card in sidebar
      setShouldShow(true);
      setSuggestedVariant('card');
    } else if (daysInDemo >= 3) {
      // Low urgency - gentle banner
      setShouldShow(dismissedCount < 2);
      setSuggestedVariant('banner');
    } else {
      // First few days - let them explore
      setShouldShow(false);
    }
  }, [daysInDemo, dismissedCount]);

  return { shouldShow, suggestedVariant };
}
