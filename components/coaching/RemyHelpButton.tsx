"use client";

import Image from "next/image";
import { HelpCircle } from "lucide-react";

interface RemyHelpButtonProps {
  onClick: () => void;
}

export function RemyHelpButton({ onClick }: RemyHelpButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-[#5A7E7A] bg-[#E2EEEC] hover:bg-[#D4E8E4] rounded-lg transition-colors"
      title="Ask Remy for help"
    >
      {/* Remy's face - NOT a boat emoji */}
      <div className="relative w-6 h-6 rounded-full overflow-hidden flex-shrink-0 border border-[#B8D4D0]">
        <Image
          src="/Images/remy-small.png"
          alt="Remy"
          fill
          className="object-cover object-top"
        />
      </div>
      <HelpCircle className="w-4 h-4" />
    </button>
  );
}
