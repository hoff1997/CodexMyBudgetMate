"use client";

import Image from "next/image";
import { RemyHelpPanel } from "./RemyHelpPanel";

interface PageHeaderWithHelpProps {
  pageId: string;
  title: string;
  description?: string;
}

export function PageHeaderWithHelp({
  pageId,
  title,
  description,
}: PageHeaderWithHelpProps) {
  return (
    <header className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image
            src="/Images/My Budget Mate Evevelope Logo Icon.jpeg"
            alt="My Budget Mate Logo"
            width={32}
            height={32}
            className="rounded-md hidden lg:block"
          />
          <h1 className="text-2xl font-semibold text-[#3D3D3D]">{title}</h1>
        </div>
        <RemyHelpPanel pageId={pageId} />
      </div>
      {description && <p className="text-[#6B6B6B]">{description}</p>}
    </header>
  );
}
