import type { ReactNode } from "react";
import Sidebar from "@/components/layout/sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <Sidebar>{children}</Sidebar>;
}
