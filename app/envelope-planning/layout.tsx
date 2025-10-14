import { ReactNode } from "react";
import Sidebar from "@/components/layout/sidebar";

export default function EnvelopePlanningLayout({ children }: { children: ReactNode }) {
  return <Sidebar>{children}</Sidebar>;
}
