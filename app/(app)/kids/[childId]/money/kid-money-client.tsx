"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MoneyEnvelopeCard } from "@/components/kids/money-envelope-card";
import { OpeningBalanceDialog } from "@/components/kids/opening-balance-dialog";
import { RemyHelpButton } from "@/components/shared/remy-help-button";
import { ArrowLeft, Settings, DollarSign } from "lucide-react";

const HELP_CONTENT = {
  tips: [
    "Check your balances regularly to see how much you've saved",
    "Think before you spend - do you really want it?",
    "Try to save a bit from every amount you receive",
  ],
  features: [
    "See your money split into Spend, Save, Invest, and Give",
    "Track your balance in each envelope",
    "Watch your savings grow over time",
    "Set up opening balances when you start",
  ],
  faqs: [
    {
      question: "What are the different envelopes for?",
      answer: "Spend is for things you want to buy soon. Save is for bigger goals. Invest is for the future. Give is for helping others.",
    },
    {
      question: "How do I get more money in my envelopes?",
      answer: "Complete chores to earn money! When your parent approves them, the money will be added based on your family's split settings.",
    },
    {
      question: "What are pending earnings?",
      answer: "These are chores you've completed that are waiting for your parent to transfer the money to your envelopes.",
    },
  ],
};

interface ChildProfile {
  id: string;
  name: string;
  avatar_url: string | null;
  money_mode: string;
  distribution_spend_pct: number;
  distribution_save_pct: number;
  distribution_invest_pct: number;
  distribution_give_pct: number;
}

interface BankAccount {
  id: string;
  envelope_type: string;
  current_balance: number;
  opening_balance: number;
}

interface KidMoneyClientProps {
  child: ChildProfile;
  initialEnvelopes: BankAccount[];
  pendingEarnings: number;
}

export function KidMoneyClient({
  child,
  initialEnvelopes,
  pendingEarnings,
}: KidMoneyClientProps) {
  const router = useRouter();
  const [showOpeningBalance, setShowOpeningBalance] = useState(false);

  // Build envelope balances from data
  const envelopeBalances = {
    spend: 0,
    save: 0,
    invest: 0,
    give: 0,
  };

  initialEnvelopes.forEach((env) => {
    if (env.envelope_type in envelopeBalances) {
      envelopeBalances[env.envelope_type as keyof typeof envelopeBalances] =
        Number(env.current_balance);
    }
  });

  const total =
    envelopeBalances.spend +
    envelopeBalances.save +
    envelopeBalances.invest +
    envelopeBalances.give;

  const handleOpeningBalanceSaved = () => {
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sage-very-light to-white">
      <div className="w-full max-w-2xl mx-auto px-4 py-6">
        {/* Back Navigation */}
        <Link
          href={`/kids/${child.id}/dashboard`}
          className="inline-flex items-center gap-2 text-text-medium hover:text-text-dark mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-sage-light flex items-center justify-center text-2xl border-4 border-sage">
              {child.avatar_url ? (
                <Image
                  src={child.avatar_url}
                  alt={child.name}
                  width={56}
                  height={56}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                "👤"
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-dark">
                {child.name}'s Money
              </h1>
              <p className="text-text-medium">Total: ${total.toFixed(2)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowOpeningBalance(true)}
            >
              <Settings className="h-4 w-4 mr-1" />
              Set Balance
            </Button>
            <RemyHelpButton title="My Money" content={HELP_CONTENT} />
          </div>
        </div>

        {/* Pending Earnings Alert */}
        {pendingEarnings > 0 && (
          <Card className="mb-6 border-gold bg-gold-light">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gold flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-text-dark">
                    Pending Earnings: ${pendingEarnings.toFixed(2)}
                  </p>
                  <p className="text-sm text-text-medium">
                    Waiting to be transferred by your parent
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Money Envelopes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <MoneyEnvelopeCard
            type="spend"
            balance={envelopeBalances.spend}
            percentage={child.distribution_spend_pct}
          />
          <MoneyEnvelopeCard
            type="save"
            balance={envelopeBalances.save}
            percentage={child.distribution_save_pct}
          />
          <MoneyEnvelopeCard
            type="invest"
            balance={envelopeBalances.invest}
            percentage={child.distribution_invest_pct}
          />
          <MoneyEnvelopeCard
            type="give"
            balance={envelopeBalances.give}
            percentage={child.distribution_give_pct}
          />
        </div>

        {/* How Your Money Works */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="text-xl">📚</span>
              How Your Money Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <span className="text-xl">💰</span>
                <div>
                  <p className="font-semibold text-text-dark">
                    Spending ({child.distribution_spend_pct}%)
                  </p>
                  <p className="text-text-medium">
                    Money you can spend on things you want now - treats, toys,
                    games!
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-xl">🏦</span>
                <div>
                  <p className="font-semibold text-text-dark">
                    Saving ({child.distribution_save_pct}%)
                  </p>
                  <p className="text-text-medium">
                    Money you're keeping safe for bigger things later - like a
                    bike or game console!
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-xl">📈</span>
                <div>
                  <p className="font-semibold text-text-dark">
                    Investing ({child.distribution_invest_pct}%)
                  </p>
                  <p className="text-text-medium">
                    Money that can grow over time - like planting a seed that
                    becomes a tree!
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-xl">💝</span>
                <div>
                  <p className="font-semibold text-text-dark">
                    Giving ({child.distribution_give_pct}%)
                  </p>
                  <p className="text-text-medium">
                    Money you share with others - birthday presents for friends
                    or helping charities!
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Opening Balance Dialog */}
        <OpeningBalanceDialog
          childId={child.id}
          childName={child.name}
          distribution={{
            spend_pct: child.distribution_spend_pct,
            save_pct: child.distribution_save_pct,
            invest_pct: child.distribution_invest_pct,
            give_pct: child.distribution_give_pct,
          }}
          open={showOpeningBalance}
          onOpenChange={setShowOpeningBalance}
          onSaved={handleOpeningBalanceSaved}
        />
      </div>
    </div>
  );
}
