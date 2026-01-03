"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddChildDialog } from "@/components/kids/add-child-dialog";
import { Plus, Star, Clock, Copy, Check, ExternalLink } from "lucide-react";
import { RemyTip } from "@/components/onboarding/remy-tip";
import { cn } from "@/lib/cn";

interface ChildProfile {
  id: string;
  name: string;
  date_of_birth: string | null;
  avatar_url: string | null;
  family_access_code: string;
  star_balance: number;
  screen_time_balance: number;
  created_at: string;
}

interface KidsSetupClientProps {
  initialChildren: ChildProfile[];
}

export function KidsSetupClient({ initialChildren }: KidsSetupClientProps) {
  const router = useRouter();
  const [children, setChildren] = useState<ChildProfile[]>(initialChildren);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleAddSuccess = () => {
    // Refresh the page to get updated children list
    router.refresh();
  };

  const copyFamilyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const formatAge = (dob: string | null) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-dark">My Budget Mate Kids</h1>
          <p className="text-text-medium">Manage your children's profiles and settings</p>
        </div>
        <Button
          onClick={() => setAddDialogOpen(true)}
          className="bg-sage hover:bg-sage-dark"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Child
        </Button>
      </div>

      {/* Empty State */}
      {children.length === 0 && (
        <Card className="mb-6">
          <CardContent className="py-12 text-center">
            <div className="text-6xl mb-4">👨‍👩‍👧‍👦</div>
            <h2 className="text-xl font-semibold text-text-dark mb-2">
              No children added yet
            </h2>
            <p className="text-text-medium mb-6 max-w-md mx-auto">
              Add your first child to start teaching them about money management through
              chores and rewards.
            </p>
            <Button
              onClick={() => setAddDialogOpen(true)}
              className="bg-sage hover:bg-sage-dark"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Child
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Children Grid */}
      {children.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {children.map((child) => (
            <Card key={child.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-16 h-16 rounded-full bg-sage-light flex items-center justify-center text-3xl shrink-0">
                    {child.avatar_url ? (
                      <img
                        src={child.avatar_url}
                        alt={child.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      "👤"
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg mb-1">{child.name}</CardTitle>
                    {child.date_of_birth && (
                      <p className="text-sm text-text-medium">
                        Age: {formatAge(child.date_of_birth)}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Balances */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 bg-gold-light rounded-lg">
                    <div className="flex items-center gap-2 text-gold-dark mb-1">
                      <Star className="h-4 w-4" />
                      <span className="text-xs font-medium">Stars</span>
                    </div>
                    <p className="text-xl font-bold text-gold-dark">
                      {child.star_balance}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-light rounded-lg">
                    <div className="flex items-center gap-2 text-blue mb-1">
                      <Clock className="h-4 w-4" />
                      <span className="text-xs font-medium">Screen Time</span>
                    </div>
                    <p className="text-xl font-bold text-blue">
                      {child.screen_time_balance}m
                    </p>
                  </div>
                </div>

                {/* Family Code */}
                <div className="p-3 bg-silver-very-light rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-text-light mb-1">Family Code</p>
                      <code className="font-mono font-bold text-text-dark">
                        {child.family_access_code}
                      </code>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyFamilyCode(child.family_access_code)}
                    >
                      {copiedCode === child.family_access_code ? (
                        <Check className="h-4 w-4 text-sage" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => router.push(`/kids/${child.id}/dashboard`)}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Remy Tip */}
      {children.length > 0 && (
        <RemyTip pose="encouraging">
          Your kids can log in at{" "}
          <code className="px-1 py-0.5 bg-white rounded text-sage-dark font-mono text-sm">
            /kids/login
          </code>{" "}
          using their family code and PIN. They'll be able to see their chores, earn stars,
          and learn to manage their money!
        </RemyTip>
      )}

      {/* Add Child Dialog */}
      <AddChildDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={handleAddSuccess}
      />
    </div>
  );
}
