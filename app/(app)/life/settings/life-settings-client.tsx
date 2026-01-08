"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Save, ShoppingCart, Calendar, Gift, Book, Users, Bell, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { RemyHelpButton } from "@/components/shared/remy-help-button";

const HELP_CONTENT = {
  coaching: [
    "Settings help you customise how the Life module works for your family.",
    "Taking time to set these up means a smoother experience day-to-day.",
    "You can always come back and adjust these as your needs change.",
  ],
  tips: [
    "Set your preferred supermarket for accurate price estimates",
    "Enable partner sharing to keep everyone in sync",
    "Turn on reminders so you never forget important dates",
  ],
  features: [
    "Configure shopping, meal planning, and celebration preferences",
    "Set default values for servings and budgets",
    "Control what gets shared with your partner",
    "Manage notification preferences",
  ],
  faqs: [
    {
      question: "What does partner sharing do?",
      answer: "When enabled, your partner (if linked) can see and edit your shopping lists, recipes, and calendar events.",
    },
    {
      question: "How do reminders work?",
      answer: "You'll get notifications for upcoming birthdays, meal plan prompts, and shopping list reminders based on your settings here.",
    },
    {
      question: "Can I change the meal plan start day?",
      answer: "Yes! Set which day your meal planning week starts on - Sunday or Monday are popular choices.",
    },
  ],
};

interface LifeSettings {
  id: string | null;
  user_id: string;
  default_supermarket_id: string | null;
  default_shopping_categories: string[];
  auto_categorize_items: boolean;
  show_price_estimates: boolean;
  meal_plan_start_day: string;
  default_servings: number;
  show_nutrition_info: boolean;
  celebration_reminder_weeks: number;
  default_gift_budget: number;
  link_gifts_to_envelope: boolean;
  default_recipe_servings: number;
  show_cooking_tips: boolean;
  share_lists_with_partner: boolean;
  share_recipes_with_partner: boolean;
  share_calendar_with_partner: boolean;
  notify_shopping_reminders: boolean;
  notify_meal_plan_reminders: boolean;
  notify_birthday_reminders: boolean;
  notify_chore_completions: boolean;
}

interface Supermarket {
  id: string;
  name: string;
  logo_url: string | null;
}

export function LifeSettingsClient() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<LifeSettings | null>(null);
  const [supermarkets, setSupermarkets] = useState<Supermarket[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch("/api/life/settings");
      if (!response.ok) throw new Error("Failed to fetch settings");

      const data = await response.json();
      setSettings(data.settings);
      setSupermarkets(data.supermarkets || []);
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSetting = <K extends keyof LifeSettings>(key: K, value: LifeSettings[K]) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
    setHasChanges(true);
  };

  const saveSettings = async () => {
    if (!settings) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/life/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save settings");
      }

      toast.success("Settings saved successfully");
      setHasChanges(false);
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-sage" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Unable to load settings</p>
        <Button onClick={fetchSettings} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/life/hub")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-text-dark">Life Settings</h1>
            <p className="text-muted-foreground">Configure your household preferences</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={saveSettings}
            disabled={!hasChanges || isSaving}
            className="bg-sage hover:bg-sage-dark"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
          <RemyHelpButton title="Life Settings" content={HELP_CONTENT} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Shopping Preferences */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-sage" />
              <CardTitle>Shopping</CardTitle>
            </div>
            <CardDescription>Configure shopping list preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Default Supermarket</Label>
              <Select
                value={settings.default_supermarket_id || "none"}
                onValueChange={(value) => updateSetting("default_supermarket_id", value === "none" ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a supermarket" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No default</SelectItem>
                  {supermarkets.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Your preferred supermarket for category ordering
              </p>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-categorize items</Label>
                <p className="text-sm text-muted-foreground">
                  Suggest categories based on item names
                </p>
              </div>
              <Switch
                checked={settings.auto_categorize_items}
                onCheckedChange={(checked) => updateSetting("auto_categorize_items", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show price estimates</Label>
                <p className="text-sm text-muted-foreground">
                  Display estimated prices on items
                </p>
              </div>
              <Switch
                checked={settings.show_price_estimates}
                onCheckedChange={(checked) => updateSetting("show_price_estimates", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Meal Planning Preferences */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-sage" />
              <CardTitle>Meal Planning</CardTitle>
            </div>
            <CardDescription>Configure meal planner preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Week starts on</Label>
              <Select
                value={settings.meal_plan_start_day}
                onValueChange={(value) => updateSetting("meal_plan_start_day", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sunday">Sunday</SelectItem>
                  <SelectItem value="monday">Monday</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Default servings: {settings.default_servings}</Label>
              <Slider
                value={[settings.default_servings]}
                onValueChange={([value]) => updateSetting("default_servings", value)}
                min={1}
                max={12}
                step={1}
                className="w-full"
              />
              <p className="text-sm text-muted-foreground">
                Default number of servings for meal planning
              </p>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show nutrition info</Label>
                <p className="text-sm text-muted-foreground">
                  Display nutritional information on recipes
                </p>
              </div>
              <Switch
                checked={settings.show_nutrition_info}
                onCheckedChange={(checked) => updateSetting("show_nutrition_info", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Birthday & Celebration Preferences */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-sage" />
              <CardTitle>Birthdays & Celebrations</CardTitle>
            </div>
            <CardDescription>Configure birthday reminders and gift tracking</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>
                Reminder timing: {settings.celebration_reminder_weeks === 0 ? "Off" : `${settings.celebration_reminder_weeks} week${settings.celebration_reminder_weeks > 1 ? "s" : ""} before`}
              </Label>
              <Slider
                value={[settings.celebration_reminder_weeks]}
                onValueChange={([value]) => updateSetting("celebration_reminder_weeks", value)}
                min={0}
                max={8}
                step={1}
                className="w-full"
              />
              <p className="text-sm text-muted-foreground">
                How early to show birthday reminders (0 = off)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Default gift budget</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                <Input
                  type="number"
                  value={settings.default_gift_budget}
                  onChange={(e) => updateSetting("default_gift_budget", parseFloat(e.target.value) || 0)}
                  className="pl-7"
                  min={0}
                  step={5}
                />
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Link gifts to budget envelope</Label>
                <p className="text-sm text-muted-foreground">
                  Connect gift tracking to Celebrations envelope
                </p>
              </div>
              <Switch
                checked={settings.link_gifts_to_envelope}
                onCheckedChange={(checked) => updateSetting("link_gifts_to_envelope", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Recipe Preferences */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Book className="h-5 w-5 text-sage" />
              <CardTitle>Recipes</CardTitle>
            </div>
            <CardDescription>Configure recipe display preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Default recipe servings: {settings.default_recipe_servings}</Label>
              <Slider
                value={[settings.default_recipe_servings]}
                onValueChange={([value]) => updateSetting("default_recipe_servings", value)}
                min={1}
                max={12}
                step={1}
                className="w-full"
              />
              <p className="text-sm text-muted-foreground">
                Default servings when adding new recipes
              </p>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show cooking tips</Label>
                <p className="text-sm text-muted-foreground">
                  Display helpful cooking tips on recipes
                </p>
              </div>
              <Switch
                checked={settings.show_cooking_tips}
                onCheckedChange={(checked) => updateSetting("show_cooking_tips", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Sharing Preferences */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-sage" />
              <CardTitle>Sharing</CardTitle>
            </div>
            <CardDescription>Control what you share with your partner</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Share shopping & todo lists</Label>
                <p className="text-sm text-muted-foreground">
                  Partner can view and edit your lists
                </p>
              </div>
              <Switch
                checked={settings.share_lists_with_partner}
                onCheckedChange={(checked) => updateSetting("share_lists_with_partner", checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Share recipes</Label>
                <p className="text-sm text-muted-foreground">
                  Partner can view your recipe collection
                </p>
              </div>
              <Switch
                checked={settings.share_recipes_with_partner}
                onCheckedChange={(checked) => updateSetting("share_recipes_with_partner", checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Share calendar</Label>
                <p className="text-sm text-muted-foreground">
                  Partner can see your synced calendar events
                </p>
              </div>
              <Switch
                checked={settings.share_calendar_with_partner}
                onCheckedChange={(checked) => updateSetting("share_calendar_with_partner", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-sage" />
              <CardTitle>Notifications</CardTitle>
            </div>
            <CardDescription>Control when you receive notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Shopping reminders</Label>
                <p className="text-sm text-muted-foreground">
                  Notify when shopping day arrives
                </p>
              </div>
              <Switch
                checked={settings.notify_shopping_reminders}
                onCheckedChange={(checked) => updateSetting("notify_shopping_reminders", checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Meal plan reminders</Label>
                <p className="text-sm text-muted-foreground">
                  Remind to plan meals for the week
                </p>
              </div>
              <Switch
                checked={settings.notify_meal_plan_reminders}
                onCheckedChange={(checked) => updateSetting("notify_meal_plan_reminders", checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Birthday reminders</Label>
                <p className="text-sm text-muted-foreground">
                  Get reminded about upcoming birthdays
                </p>
              </div>
              <Switch
                checked={settings.notify_birthday_reminders}
                onCheckedChange={(checked) => updateSetting("notify_birthday_reminders", checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Chore completions</Label>
                <p className="text-sm text-muted-foreground">
                  Notify when kids complete chores
                </p>
              </div>
              <Switch
                checked={settings.notify_chore_completions}
                onCheckedChange={(checked) => updateSetting("notify_chore_completions", checked)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Floating save button for mobile */}
      {hasChanges && (
        <div className="fixed bottom-6 right-6 md:hidden">
          <Button
            onClick={saveSettings}
            disabled={isSaving}
            className="bg-sage hover:bg-sage-dark shadow-lg"
            size="lg"
          >
            {isSaving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Save className="h-5 w-5" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
