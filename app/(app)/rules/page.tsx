import { fetchRulesData } from "@/lib/server/rules-data";
import { RulesClient } from "@/components/layout/rules/rules-client";

export default async function RulesPage() {
  const data = await fetchRulesData();
  return <RulesClient data={data} />;
}
