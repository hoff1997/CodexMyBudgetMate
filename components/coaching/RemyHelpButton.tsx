"use client";

import { HelpCircle } from "lucide-react";

interface RemyHelpButtonProps {
  onClick: () => void;
}

export function RemyHelpButton({ onClick }: RemyHelpButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center w-10 h-10 text-[#5A7E7A] bg-[#E2EEEC] hover:bg-[#D4E8E4] rounded-full transition-colors"
      title="Ask Remy for help"
    >
      <HelpCircle className="w-5 h-5" />
    </button>
  );
}
