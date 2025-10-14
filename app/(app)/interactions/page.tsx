import { fetchRulesData } from "@/lib/server/rules-data";
import { InteractionsClient } from "@/components/layout/interactions/interactions-client";

export default async function InteractionsPage() {
  const data = await fetchRulesData();
  return <InteractionsClient data={data} />;
}
