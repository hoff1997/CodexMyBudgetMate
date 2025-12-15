"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link2, Edit3, Shield, CheckCircle2, Info } from "lucide-react";

export type DataChoiceType = 'akahu' | 'manual';

interface DataChoiceProps {
  onSelect: (choice: DataChoiceType) => void;
}

export function DataChoice({ onSelect }: DataChoiceProps) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="text-5xl mb-2">🔗</div>
        <h2 className="text-2xl font-bold">How would you like to track your money?</h2>
        <p className="text-muted-foreground">
          Choose the option that works best for you
        </p>
      </div>

      {/* Two Simple Options */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Option 1: Connect Bank (Recommended) */}
        <Card
          className="relative p-6 border-2 border-[#7A9E9A] cursor-pointer transition-all hover:shadow-lg hover:bg-[#E2EEEC]/30"
          onClick={() => onSelect('akahu')}
        >
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#7A9E9A] text-white text-xs font-medium px-3 py-1 rounded-full">
            Recommended
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Link2 className="h-10 w-10 text-[#7A9E9A]" />
              <Shield className="h-5 w-5 text-[#7A9E9A]" />
            </div>

            <div>
              <h3 className="text-xl font-semibold">Connect My Bank</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Automatic transaction sync via Akahu
              </p>
            </div>

            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-[#7A9E9A] mt-0.5 flex-shrink-0" />
                <span>Transactions import automatically</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-[#7A9E9A] mt-0.5 flex-shrink-0" />
                <span>Works with all major NZ banks</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-[#7A9E9A] mt-0.5 flex-shrink-0" />
                <span>Bank-level security</span>
              </li>
            </ul>

            <Button className="w-full bg-[#7A9E9A] hover:bg-[#5A7E7A]">
              Connect Bank
            </Button>
          </div>
        </Card>

        {/* Option 2: Manual Entry */}
        <Card
          className="p-6 cursor-pointer transition-all hover:shadow-lg hover:border-[#B8D4D0]"
          onClick={() => onSelect('manual')}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Edit3 className="h-10 w-10 text-[#D4A853]" />
            </div>

            <div>
              <h3 className="text-xl font-semibold">Enter Manually</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Add transactions yourself
              </p>
            </div>

            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-[#7A9E9A] mt-0.5 flex-shrink-0" />
                <span>Complete control over your data</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-[#7A9E9A] mt-0.5 flex-shrink-0" />
                <span>No bank connection needed</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-[#7A9E9A] mt-0.5 flex-shrink-0" />
                <span>Perfect for getting started</span>
              </li>
            </ul>

            <Button variant="outline" className="w-full">
              Set Up Manually
            </Button>
          </div>
        </Card>
      </div>

      {/* CSV Import Note */}
      <div className="flex items-start gap-3 bg-[#DDEAF5] border border-[#6B9ECE] rounded-lg p-4">
        <Info className="h-5 w-5 text-[#6B9ECE] mt-0.5 flex-shrink-0" />
        <div className="text-sm">
          <p className="font-medium text-text-dark">Have a spreadsheet?</p>
          <p className="text-text-medium mt-1">
            You can import CSV files from your bank or existing budget spreadsheet later in Settings → Import Data.
          </p>
        </div>
      </div>

      {/* Help text */}
      <p className="text-center text-sm text-muted-foreground">
        You can always change this later or connect your bank after setup.
      </p>
    </div>
  );
}
