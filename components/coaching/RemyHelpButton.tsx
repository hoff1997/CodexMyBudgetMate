"use client";

import { RemyAvatar } from "@/components/onboarding/remy-tip";
import { HelpCircle } from "lucide-react";

interface RemyHelpButtonProps {
  onClick: () => void;
}

export function RemyHelpButton({ onClick }: RemyHelpButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 h-9 bg-[#E2EEEC] hover:bg-[#D4E8E4] border border-[#B8D4D0] rounded-md transition-colors"
      title="Ask Remy for help"
    >
      <RemyAvatar pose="small" size="sm" className="!w-8 !h-8 !border-0" />
      <span className="text-sm text-[#5A7E7A] font-medium">Help</span>
      <HelpCircle className="w-4 h-4 text-[#5A7E7A]" />
    </button>
  );
}
