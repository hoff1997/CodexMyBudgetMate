import { redirect } from "next/navigation";

// Screen Time Requests feature is archived - see docs/FUTURE-FEATURES.md
// Redirecting to kids setup page

export default async function ScreenTimeRequestsPage() {
  redirect("/kids/setup");
}
