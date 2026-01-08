"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/lib/hooks/use-toast";
import {
  Settings,
  User,
  Landmark,
  Shield,
  Coins,
  Receipt,
  Bell,
  Calendar,
  Check,
  Loader2,
  Home,
  Gift,
  ListTodo,
  ShoppingCart,
  ChefHat,
  UtensilsCrossed,
} from "lucide-react";

interface ChildProfile {
  id: string;
  name: string;
  date_of_birth: string | null;
  avatar_url: string | null;
  family_access_code?: string;
  // Optional settings fields - may not exist in all deployments
  bank_linking_enabled?: boolean;
  min_age_for_bank_linking?: number;
  daily_spending_limit?: number | null;
  weekly_spending_limit?: number | null;
  monthly_spending_limit?: number | null;
  require_approval_above?: number | null;
  featureAccess?: {
    can_view_chores: boolean;
    can_complete_chores: boolean;
    can_view_money: boolean;
    can_request_transfers: boolean;
  } | null;
  hubPermissions?: {
    household_hub: "none" | "view" | "edit" | "full";
    birthdays: "none" | "view" | "edit" | "full";
    todos: "none" | "view" | "edit" | "full";
    shopping: "none" | "view" | "edit" | "full";
    recipes: "none" | "view" | "edit" | "full";
    meal_planner: "none" | "view" | "edit" | "full";
  } | null;
  paymentSettings?: {
    id: string;
    child_profile_id: string;
    invoice_frequency: "weekly" | "fortnightly" | "monthly";
    invoice_day: number;
    reminder_enabled: boolean;
    auto_submit: boolean;
  } | null;
}

interface KidsSettingsClientProps {
  children: ChildProfile[];
}

// Autosave debounce hook
function useAutosave(
  saveFn: () => Promise<void>,
  delay: number = 800
): [boolean, () => void] {
  const [saving, setSaving] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const saveFnRef = useRef(saveFn);

  // Update the ref when saveFn changes
  saveFnRef.current = saveFn;

  const trigger = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setSaving(true);
    timeoutRef.current = setTimeout(async () => {
      try {
        await saveFnRef.current();
      } finally {
        setSaving(false);
      }
    }, delay);
  }, [delay]);

  return [saving, trigger];
}

// Saving indicator component
function SavingIndicator({ saving }: { saving: boolean }) {
  if (!saving) return null;
  return (
    <div className="fixed bottom-4 right-4 bg-sage text-white px-3 py-2 rounded-lg flex items-center gap-2 shadow-lg z-50">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="text-sm">Saving...</span>
    </div>
  );
}

export function KidsSettingsClient({ children }: KidsSettingsClientProps) {
  const { toast } = useToast();
  const [globalSaving, setGlobalSaving] = useState(false);
  const [savedFields, setSavedFields] = useState<Record<string, boolean>>({});

  // Local state for all children's settings
  const [localSettings, setLocalSettings] = useState<Record<string, Partial<ChildProfile>>>(() => {
    const initial: Record<string, Partial<ChildProfile>> = {};
    children.forEach(child => {
      initial[child.id] = { ...child };
    });
    return initial;
  });

  const calculateAge = (dob: string | null) => {
    if (!dob) return null;
    const age = Math.floor(
      (Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );
    return age;
  };

  // Generic save function for profile fields
  const saveProfileField = async (childId: string, field: string, value: unknown) => {
    setGlobalSaving(true);
    try {
      const response = await fetch(`/api/kids/profiles/${childId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });

      if (!response.ok) {
        throw new Error("Failed to update");
      }

      // Show checkmark briefly
      setSavedFields(prev => ({ ...prev, [`${childId}-${field}`]: true }));
      setTimeout(() => {
        setSavedFields(prev => ({ ...prev, [`${childId}-${field}`]: false }));
      }, 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save setting",
        variant: "destructive",
      });
    } finally {
      setGlobalSaving(false);
    }
  };

  // Save feature access
  const saveFeatureAccess = async (childId: string, feature: string, value: boolean) => {
    setGlobalSaving(true);
    try {
      const response = await fetch(`/api/kids/${childId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [feature]: value }),
      });

      if (!response.ok) throw new Error("Failed to update");

      setSavedFields(prev => ({ ...prev, [`${childId}-${feature}`]: true }));
      setTimeout(() => {
        setSavedFields(prev => ({ ...prev, [`${childId}-${feature}`]: false }));
      }, 2000);
    } catch {
      toast({
        title: "Error",
        description: "Failed to update feature access",
        variant: "destructive",
      });
    } finally {
      setGlobalSaving(false);
    }
  };

  // Save hub permissions
  const saveHubPermission = async (childId: string, feature: string, level: string) => {
    setGlobalSaving(true);
    try {
      const response = await fetch(`/api/kids/${childId}/hub-permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feature_name: feature, permission_level: level }),
      });

      if (!response.ok) throw new Error("Failed to update");

      setSavedFields(prev => ({ ...prev, [`${childId}-hub-${feature}`]: true }));
      setTimeout(() => {
        setSavedFields(prev => ({ ...prev, [`${childId}-hub-${feature}`]: false }));
      }, 2000);
    } catch {
      toast({
        title: "Error",
        description: "Failed to update hub permission",
        variant: "destructive",
      });
    } finally {
      setGlobalSaving(false);
    }
  };

  // Save invoice settings
  const saveInvoiceSettings = async (
    childId: string,
    settings: Record<string, unknown>
  ) => {
    setGlobalSaving(true);
    try {
      const response = await fetch(`/api/kids/${childId}/payment-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!response.ok) throw new Error("Failed to update");

      const key = Object.keys(settings)[0];
      setSavedFields(prev => ({ ...prev, [`${childId}-invoice-${key}`]: true }));
      setTimeout(() => {
        setSavedFields(prev => ({ ...prev, [`${childId}-invoice-${key}`]: false }));
      }, 2000);
    } catch {
      toast({
        title: "Error",
        description: "Failed to update invoice settings",
        variant: "destructive",
      });
    } finally {
      setGlobalSaving(false);
    }
  };

  // Helper for day names
  const getDayName = (day: number) => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[day] || "Unknown";
  };

  if (children.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-medium text-text-dark">No Children Added</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Add a child profile first to manage their settings
          </p>
          <Button asChild>
            <a href="/kids/setup">Go to Kids Setup</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Render saved checkmark
  const SavedCheck = ({ fieldKey }: { fieldKey: string }) => {
    if (!savedFields[fieldKey]) return null;
    return <Check className="h-4 w-4 text-green-600 absolute right-2 top-1/2 -translate-y-1/2" />;
  };

  return (
    <div className="space-y-6">
      <SavingIndicator saving={globalSaving} />

      {/* Comparison Chart - Children as Columns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Settings Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground w-48">
                    Setting
                  </th>
                  {children.map((child) => (
                    <th key={child.id} className="text-center py-3 px-4 min-w-[140px]">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-sage-light flex items-center justify-center text-xl overflow-hidden">
                          {child.avatar_url ? (
                            <Image
                              src={child.avatar_url}
                              alt={child.name}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            "👤"
                          )}
                        </div>
                        <div>
                          <p className="font-semibold">{child.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {calculateAge(child.date_of_birth) !== null
                              ? `${calculateAge(child.date_of_birth)} yrs`
                              : "Age not set"}
                          </p>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Feature Access Section */}
                <tr className="bg-sage-very-light">
                  <td colSpan={children.length + 1} className="py-2 px-2 font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Feature Access
                  </td>
                </tr>

                <tr className="border-b">
                  <td className="py-3 px-2 text-muted-foreground">View & Complete Chores</td>
                  {children.map((child) => {
                    const features = child.featureAccess || { can_view_chores: true };
                    return (
                      <td key={child.id} className="text-center py-3 px-4">
                        <Switch
                          checked={features.can_view_chores}
                          onCheckedChange={(v) => saveFeatureAccess(child.id, "can_view_chores", v)}
                        />
                      </td>
                    );
                  })}
                </tr>

                <tr className="border-b">
                  <td className="py-3 px-2 text-muted-foreground">View Money & Balances</td>
                  {children.map((child) => {
                    const features = child.featureAccess || { can_view_money: true };
                    return (
                      <td key={child.id} className="text-center py-3 px-4">
                        <Switch
                          checked={features.can_view_money}
                          onCheckedChange={(v) => saveFeatureAccess(child.id, "can_view_money", v)}
                        />
                      </td>
                    );
                  })}
                </tr>

                {/* Life Module Permissions Section */}
                <tr className="bg-sage-very-light">
                  <td colSpan={children.length + 1} className="py-2 px-2 font-medium flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    Life Module Access
                  </td>
                </tr>

                <tr className="border-b">
                  <td className="py-3 px-2 text-muted-foreground flex items-center gap-2">
                    <Home className="h-3 w-3" /> Household Hub
                  </td>
                  {children.map((child) => (
                    <td key={child.id} className="text-center py-3 px-4">
                      <Select
                        value={child.hubPermissions?.household_hub || "none"}
                        onValueChange={(v) => saveHubPermission(child.id, "household_hub", v)}
                      >
                        <SelectTrigger className="w-24 mx-auto">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="view">View</SelectItem>
                          <SelectItem value="edit">Edit</SelectItem>
                          <SelectItem value="full">Full</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  ))}
                </tr>

                <tr className="border-b">
                  <td className="py-3 px-2 text-muted-foreground flex items-center gap-2">
                    <Gift className="h-3 w-3" /> Birthdays
                  </td>
                  {children.map((child) => (
                    <td key={child.id} className="text-center py-3 px-4">
                      <Select
                        value={child.hubPermissions?.birthdays || "none"}
                        onValueChange={(v) => saveHubPermission(child.id, "birthdays", v)}
                      >
                        <SelectTrigger className="w-24 mx-auto">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="view">View</SelectItem>
                          <SelectItem value="edit">Edit</SelectItem>
                          <SelectItem value="full">Full</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  ))}
                </tr>

                <tr className="border-b">
                  <td className="py-3 px-2 text-muted-foreground flex items-center gap-2">
                    <ListTodo className="h-3 w-3" /> To-Do Lists
                  </td>
                  {children.map((child) => (
                    <td key={child.id} className="text-center py-3 px-4">
                      <Select
                        value={child.hubPermissions?.todos || "none"}
                        onValueChange={(v) => saveHubPermission(child.id, "todos", v)}
                      >
                        <SelectTrigger className="w-24 mx-auto">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="view">View</SelectItem>
                          <SelectItem value="edit">Edit</SelectItem>
                          <SelectItem value="full">Full</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  ))}
                </tr>

                <tr className="border-b">
                  <td className="py-3 px-2 text-muted-foreground flex items-center gap-2">
                    <ShoppingCart className="h-3 w-3" /> Shopping Lists
                  </td>
                  {children.map((child) => (
                    <td key={child.id} className="text-center py-3 px-4">
                      <Select
                        value={child.hubPermissions?.shopping || "none"}
                        onValueChange={(v) => saveHubPermission(child.id, "shopping", v)}
                      >
                        <SelectTrigger className="w-24 mx-auto">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="view">View</SelectItem>
                          <SelectItem value="edit">Edit</SelectItem>
                          <SelectItem value="full">Full</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  ))}
                </tr>

                <tr className="border-b">
                  <td className="py-3 px-2 text-muted-foreground flex items-center gap-2">
                    <ChefHat className="h-3 w-3" /> Recipes
                  </td>
                  {children.map((child) => (
                    <td key={child.id} className="text-center py-3 px-4">
                      <Select
                        value={child.hubPermissions?.recipes || "none"}
                        onValueChange={(v) => saveHubPermission(child.id, "recipes", v)}
                      >
                        <SelectTrigger className="w-24 mx-auto">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="view">View</SelectItem>
                          <SelectItem value="edit">Edit</SelectItem>
                          <SelectItem value="full">Full</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  ))}
                </tr>

                <tr className="border-b">
                  <td className="py-3 px-2 text-muted-foreground flex items-center gap-2">
                    <UtensilsCrossed className="h-3 w-3" /> Meal Planner
                  </td>
                  {children.map((child) => (
                    <td key={child.id} className="text-center py-3 px-4">
                      <Select
                        value={child.hubPermissions?.meal_planner || "none"}
                        onValueChange={(v) => saveHubPermission(child.id, "meal_planner", v)}
                      >
                        <SelectTrigger className="w-24 mx-auto">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="view">View</SelectItem>
                          <SelectItem value="edit">Edit</SelectItem>
                          <SelectItem value="full">Full</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  ))}
                </tr>

                {/* Invoice Settings Section */}
                <tr className="bg-sage-very-light">
                  <td colSpan={children.length + 1} className="py-2 px-2 font-medium flex items-center gap-2">
                    <Receipt className="h-4 w-4" />
                    Invoice Settings
                  </td>
                </tr>

                <tr className="border-b">
                  <td className="py-3 px-2 text-muted-foreground">Invoice Frequency</td>
                  {children.map((child) => (
                    <td key={child.id} className="text-center py-3 px-4">
                      <Select
                        value={child.paymentSettings?.invoice_frequency || "weekly"}
                        onValueChange={(v) =>
                          saveInvoiceSettings(child.id, {
                            invoice_frequency: v as "weekly" | "fortnightly" | "monthly",
                          })
                        }
                      >
                        <SelectTrigger className="w-28 mx-auto">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="fortnightly">Fortnightly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  ))}
                </tr>

                <tr className="border-b">
                  <td className="py-3 px-2 text-muted-foreground">Invoice Day</td>
                  {children.map((child) => {
                    const freq = child.paymentSettings?.invoice_frequency || "weekly";
                    const isMonthly = freq === "monthly";
                    return (
                      <td key={child.id} className="text-center py-3 px-4">
                        {isMonthly ? (
                          <Select
                            value={String(child.paymentSettings?.invoice_day || 1)}
                            onValueChange={(v) =>
                              saveInvoiceSettings(child.id, { invoice_day: parseInt(v) })
                            }
                          >
                            <SelectTrigger className="w-20 mx-auto">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                                <SelectItem key={day} value={String(day)}>
                                  {day}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Select
                            value={String(child.paymentSettings?.invoice_day ?? 5)}
                            onValueChange={(v) =>
                              saveInvoiceSettings(child.id, { invoice_day: parseInt(v) })
                            }
                          >
                            <SelectTrigger className="w-28 mx-auto">
                              <SelectValue>
                                {getDayName(child.paymentSettings?.invoice_day ?? 5)}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                                <SelectItem key={day} value={String(day)}>
                                  {getDayName(day)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </td>
                    );
                  })}
                </tr>

                <tr className="border-b">
                  <td className="py-3 px-2 text-muted-foreground flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Reminders
                  </td>
                  {children.map((child) => (
                    <td key={child.id} className="text-center py-3 px-4">
                      <Switch
                        checked={child.paymentSettings?.reminder_enabled ?? true}
                        onCheckedChange={(v) =>
                          saveInvoiceSettings(child.id, { reminder_enabled: v })
                        }
                      />
                    </td>
                  ))}
                </tr>

                <tr className="border-b">
                  <td className="py-3 px-2 text-muted-foreground">Auto-submit Invoices</td>
                  {children.map((child) => (
                    <td key={child.id} className="text-center py-3 px-4">
                      <Switch
                        checked={child.paymentSettings?.auto_submit ?? false}
                        onCheckedChange={(v) =>
                          saveInvoiceSettings(child.id, { auto_submit: v })
                        }
                      />
                    </td>
                  ))}
                </tr>

                {/* Bank Linking Section */}
                <tr className="bg-sage-very-light">
                  <td colSpan={children.length + 1} className="py-2 px-2 font-medium flex items-center gap-2">
                    <Landmark className="h-4 w-4" />
                    Bank Account Linking (Akahu)
                  </td>
                </tr>

                <tr className="border-b">
                  <td className="py-3 px-2 text-muted-foreground">Bank Linking Enabled</td>
                  {children.map((child) => (
                    <td key={child.id} className="text-center py-3 px-4">
                      <Switch
                        checked={child.bank_linking_enabled ?? true}
                        onCheckedChange={(v) =>
                          saveProfileField(child.id, "bank_linking_enabled", v)
                        }
                      />
                    </td>
                  ))}
                </tr>

                {/* Family Access Codes */}
                <tr className="bg-sage-very-light">
                  <td colSpan={children.length + 1} className="py-2 px-2 font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Login Details
                  </td>
                </tr>

                <tr>
                  <td className="py-3 px-2 text-muted-foreground">Family Access Code</td>
                  {children.map((child) => (
                    <td key={child.id} className="text-center py-3 px-4">
                      <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                        {child.family_access_code || "Not set"}
                      </code>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
