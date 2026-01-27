"use client";

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
        <h1 className="text-2xl font-semibold text-[#3D3D3D]">{title}</h1>
        <RemyHelpPanel pageId={pageId} />
      </div>
      {description && <p className="text-[#6B6B6B]">{description}</p>}
    </header>
  );
}
