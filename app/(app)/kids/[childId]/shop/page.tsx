import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

interface Props {
  params: Promise<{ childId: string }>;
}

// Avatar Shop is archived - see docs/FUTURE-FEATURES.md
// This page now shows a "Coming Soon" message and redirects to dashboard

export default async function AvatarShopPage({ params }: Props) {
  const { childId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Verify parent owns this child
  const { data: child } = await supabase
    .from("child_profiles")
    .select("id, first_name")
    .eq("id", childId)
    .eq("parent_user_id", user.id)
    .maybeSingle();

  if (!child) {
    redirect("/kids/setup");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sage-very-light to-white p-6">
      <div className="max-w-md mx-auto">
        <Card className="border-gold bg-gold-light">
          <CardContent className="pt-6 text-center">
            <div className="text-6xl mb-4">🚧</div>
            <h1 className="text-xl font-bold text-gold-dark mb-2">
              Avatar Shop Coming Soon!
            </h1>
            <p className="text-sm text-gold-dark mb-6">
              We're working on something exciting. The Avatar Shop will be back
              in a future update with even more cool items to collect!
            </p>
            <p className="text-xs text-gold-dark/70 mb-4">
              In the meantime, focus on completing chores and managing your money.
            </p>
            <Link href={`/kids/${childId}/dashboard`}>
              <Button className="bg-gold hover:bg-gold-dark text-white">
                Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
