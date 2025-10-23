import type { ReactNode } from "react";

export type CommandAction = {
  id: string;
  label: string;
  description?: string;
  shortcut?: string;
  group?: string;
  icon?: ReactNode;
  onSelect: () => void;
};
