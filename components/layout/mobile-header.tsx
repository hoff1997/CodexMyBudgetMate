"use client";

import { Menu } from "lucide-react";
import { useSidebar } from "./sidebar-context";

export function MobileHeader() {
  const { open } = useSidebar();

  return (
    <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-[#E5E7EB] z-30 flex items-center px-4">
      <button
        onClick={open}
        className="p-2 -ml-2 text-[#6B6B6B] hover:bg-[#F3F4F6] rounded-lg"
        aria-label="Open menu"
      >
        <Menu className="w-6 h-6" />
      </button>

      <span className="ml-3 font-semibold text-[#3D3D3D]">My Budget Mate</span>
    </div>
  );
}
