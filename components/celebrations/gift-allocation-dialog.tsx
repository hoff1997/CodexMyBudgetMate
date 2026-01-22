"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, X, AlertCircle, Users, ChevronDown, ChevronUp, PartyPopper, StickyNote } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/finance";
import { RemyAvatar } from "@/components/onboarding/remy-tip";
import type { GiftRecipient, GiftRecipientInput } from "@/lib/types/celebrations";

const ICONS = [
  "🎁", "🎂", "🎄", "💝", "🎉", "💐", "🌹", "🧸", "🎈", "🎊",
  "💍", "🍰", "🥳", "❤️", "🌸", "✨", "🎀", "🧁", "🍫", "💎",
] as const;

type CategoryOption = { id: string; name: string };

interface GiftAllocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  envelope: {
    id: string;
    name: string;
    icon: string;
    is_celebration?: boolean;
    target_amount: number;
    current_amount: number;
    category_id?: string;
    category_name?: string;
    priority?: string;
    notes?: string;
  };
  existingRecipients?: GiftRecipient[];
  onSave: (recipients: GiftRecipientInput[], budgetChange: number, envelopeUpdates?: EnvelopeUpdates) => Promise<void>;
  categories?: CategoryOption[];
}

interface EnvelopeUpdates {
  name?: string;
  icon?: string;
  category_id?: string;
  priority?: string;
  notes?: string;
}

interface LocalRecipient {
  id?: string;
  tempId: string;
  recipient_name: string;
  gift_amount: number;
  party_amount: number; // One-off budget for party/food (for birthdays)
  celebration_date: Date | null;
  notes: string;
}

// Helper to guess if envelope is likely a festival based on name
const FESTIVAL_KEYWORDS = ['christmas', 'diwali', 'easter', 'hanukkah', 'eid', 'lunar', 'new year', 'thanksgiving', 'mother', 'father', 'valentine'];
const isLikelyFestival = (name: string) => FESTIVAL_KEYWORDS.some(k => name.toLowerCase().includes(k));

/**
 * DatePickerForDialog - A date picker component designed to work inside dialogs
 * Uses the custom Popover which handles focus scope properly inside Radix dialogs
 *
 * Uses "buttons" captionLayout instead of "dropdown-buttons" to avoid
 * native select elements which have issues inside portaled popovers in dialogs.
 */
function DatePickerForDialog({
  date,
  onDateChange,
}: {
  date: Date | null;
  onDateChange: (date: Date | null) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  // Default to selected date's month/year, or current date
  const [displayMonth, setDisplayMonth] = useState<Date>(date || new Date());

  // Update display month when date changes externally
  useEffect(() => {
    if (date) {
      setDisplayMonth(date);
    }
  }, [date]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          type="button"
          className={cn(
            "h-8 px-2 justify-center bg-white text-xs",
            !date && "text-muted-foreground"
          )}
        >
          {date ? format(date, "d MMM") : <CalendarIcon className="h-3.5 w-3.5" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0"
        align="center"
        sideOffset={8}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Calendar
          mode="single"
          selected={date || undefined}
          onSelect={(selectedDate) => {
            onDateChange(selectedDate || null);
            setIsOpen(false);
          }}
          month={displayMonth}
          onMonthChange={setDisplayMonth}
          captionLayout="buttons"
        />
      </PopoverContent>
    </Popover>
  );
}

export function GiftAllocationDialog({
  open,
  onOpenChange,
  envelope,
  existingRecipients = [],
  onSave,
  categories = [],
}: GiftAllocationDialogProps) {
  const [recipients, setRecipients] = useState<LocalRecipient[]>([]);
  const [showBudgetWarning, setShowBudgetWarning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showEnvelopeSettings, setShowEnvelopeSettings] = useState(false);

  // Envelope configuration state
  const [envelopeName, setEnvelopeName] = useState(envelope.name);
  const [envelopeIcon, setEnvelopeIcon] = useState(envelope.icon);
  const [envelopeCategoryId, setEnvelopeCategoryId] = useState(envelope.category_id || "");
  const [envelopePriority, setEnvelopePriority] = useState(envelope.priority || "");
  const [envelopeNotes, setEnvelopeNotes] = useState(envelope.notes || "");

  // Envelope-level party budget (for festivals like Christmas, Diwali)
  const [envelopePartyBudget, setEnvelopePartyBudget] = useState(0);

  // User toggle: is this a one-off event (festival) or spread through the year (birthdays)?
  // Default based on envelope name, but user can override
  const [isFestival, setIsFestival] = useState(() => isLikelyFestival(envelope.name));

  // All celebration envelopes should allow dates for recipients
  // The date field helps track when gifts are needed
  const requiresDate = true; // Always show date for celebration envelopes

  // Reset envelope settings when dialog opens with new envelope
  useEffect(() => {
    if (open) {
      setEnvelopeName(envelope.name);
      setEnvelopeIcon(envelope.icon);
      setEnvelopeCategoryId(envelope.category_id || "");
      setEnvelopePriority(envelope.priority || "");
      setEnvelopeNotes(envelope.notes || "");
      // For festivals, extract party budget from a special recipient entry named "__PARTY__"
      const partyRecipient = existingRecipients.find(r => r.recipient_name === '__PARTY__');
      setEnvelopePartyBudget(partyRecipient ? Number(partyRecipient.gift_amount) || 0 : 0);
      // Set festival toggle based on whether __PARTY__ exists or name suggests festival
      setIsFestival(partyRecipient ? true : isLikelyFestival(envelope.name));
    }
  }, [open, envelope, existingRecipients]);

  // Icon options with current icon first if not in list
  const iconOptions = useMemo(() => {
    if (!envelopeIcon) return ICONS;
    if (ICONS.includes(envelopeIcon as (typeof ICONS)[number])) {
      return ICONS;
    }
    return [envelopeIcon, ...ICONS.filter((icon) => icon !== envelopeIcon)] as readonly string[];
  }, [envelopeIcon]);

  // Initialise recipients from existing data
  useEffect(() => {
    // Filter out the __PARTY__ pseudo-recipient (used for festival party budgets)
    const realRecipients = existingRecipients.filter(r => r.recipient_name !== '__PARTY__');

    if (open && realRecipients.length > 0) {
      setRecipients(
        realRecipients.map((r) => ({
          id: r.id,
          tempId: r.id,
          recipient_name: r.recipient_name,
          gift_amount: Number(r.gift_amount) || 0,
          party_amount: Number((r as any).party_amount) || 0,
          celebration_date: r.celebration_date ? new Date(r.celebration_date) : null,
          notes: r.notes || "",
        }))
      );
    } else if (open && realRecipients.length === 0) {
      // Start with one empty recipient
      setRecipients([{
        tempId: crypto.randomUUID(),
        recipient_name: "",
        gift_amount: 0,
        party_amount: 0,
        celebration_date: requiresDate ? new Date() : null,
        notes: "",
      }]);
    }
  }, [open, existingRecipients, requiresDate]);

  // Calculate budget totals
  // For festivals: gifts + envelope party budget
  // For birthdays: gifts + per-person party amounts
  const originalTotal = useMemo(() => {
    const realRecipients = existingRecipients.filter(r => r.recipient_name !== '__PARTY__');
    const partyRecipient = existingRecipients.find(r => r.recipient_name === '__PARTY__');
    const giftsTotal = realRecipients.reduce((sum, r) => sum + Number(r.gift_amount || 0), 0);
    const partyTotal = isFestival
      ? (partyRecipient ? Number(partyRecipient.gift_amount) || 0 : 0)
      : realRecipients.reduce((sum, r) => sum + Number((r as any).party_amount || 0), 0);
    return giftsTotal + partyTotal;
  }, [existingRecipients, isFestival]);

  const newTotal = useMemo(() => {
    const giftsTotal = recipients.reduce((sum, r) => sum + Number(r.gift_amount || 0), 0);
    const partyTotal = isFestival
      ? envelopePartyBudget
      : recipients.reduce((sum, r) => sum + Number(r.party_amount || 0), 0);
    return giftsTotal + partyTotal;
  }, [recipients, isFestival, envelopePartyBudget]);

  const giftTotal = useMemo(
    () => recipients.reduce((sum, r) => sum + Number(r.gift_amount || 0), 0),
    [recipients]
  );

  // For festivals: use envelope-level party budget; for birthdays: sum per-person party amounts
  const partyTotal = useMemo(
    () => isFestival
      ? envelopePartyBudget
      : recipients.reduce((sum, r) => sum + Number(r.party_amount || 0), 0),
    [recipients, isFestival, envelopePartyBudget]
  );

  const budgetChange = newTotal - originalTotal;

  const addRecipient = () => {
    setRecipients([
      ...recipients,
      {
        tempId: crypto.randomUUID(),
        recipient_name: "",
        gift_amount: 0,
        party_amount: 0,
        celebration_date: requiresDate ? new Date() : null,
        notes: "",
      },
    ]);
  };

  const updateRecipient = (
    tempId: string,
    field: keyof LocalRecipient,
    value: string | number | Date | null
  ) => {
    setRecipients(
      recipients.map((r) =>
        r.tempId === tempId ? { ...r, [field]: value } : r
      )
    );
  };

  const removeRecipient = (tempId: string) => {
    if (recipients.length <= 1) {
      // Don't remove the last one, just clear it
      setRecipients([{
        tempId: crypto.randomUUID(),
        recipient_name: "",
        gift_amount: 0,
        party_amount: 0,
        celebration_date: requiresDate ? new Date() : null,
        notes: "",
      }]);
    } else {
      setRecipients(recipients.filter((r) => r.tempId !== tempId));
    }
  };

  // Validation: Allow saving with no recipients if there's an event cost (party budget for festivals)
  // For festivals: can save with just party budget OR with recipients that have gift amounts
  // For birthdays: need either gift or party amount per recipient
  const hasValidRecipients = recipients.some((r) => r.recipient_name.trim());
  const allRecipientsValid = recipients.every(
    (r) => !r.recipient_name.trim() || ( // Empty recipients are OK (will be filtered out)
      r.gift_amount > 0 || (!isFestival && r.party_amount > 0)
    )
  );
  const isValid = allRecipientsValid && (
    hasValidRecipients || // Has at least one named recipient
    (isFestival && envelopePartyBudget > 0) // OR festival with event-only cost
  );

  const handleSave = () => {
    if (!isValid) {
      if (isFestival && !hasValidRecipients && envelopePartyBudget <= 0) {
        toast.error("Please add recipients or an event budget");
      } else {
        toast.error("Please fill in all recipient names and amounts");
      }
      return;
    }

    if (Math.abs(budgetChange) > 0.01) {
      setShowBudgetWarning(true);
    } else {
      handleConfirmSave();
    }
  };

  const handleConfirmSave = async () => {
    setIsSaving(true);
    try {
      // Build list of recipients to save
      let recipientsToSave: GiftRecipientInput[] = recipients
        .filter((r) => r.recipient_name.trim() && r.gift_amount > 0)
        .map((r) => ({
          id: r.id,
          recipient_name: r.recipient_name.trim(),
          gift_amount: r.gift_amount,
          // For birthdays: include per-person party amount; for festivals: no per-person party
          party_amount: isFestival ? 0 : r.party_amount,
          celebration_date: r.celebration_date,
          notes: r.notes.trim() || undefined,
        }));

      // For festivals: add a __PARTY__ pseudo-recipient for the envelope-level party budget
      if (isFestival && envelopePartyBudget > 0) {
        const existingParty = existingRecipients.find(r => r.recipient_name === '__PARTY__');
        recipientsToSave.push({
          id: existingParty?.id,
          recipient_name: '__PARTY__',
          gift_amount: envelopePartyBudget,
          party_amount: 0,
          celebration_date: null,
          notes: 'Party/Food budget for ' + envelopeName,
        });
      }

      // Build envelope updates if anything changed
      const envelopeUpdates: EnvelopeUpdates = {};
      if (envelopeName !== envelope.name) envelopeUpdates.name = envelopeName;
      if (envelopeIcon !== envelope.icon) envelopeUpdates.icon = envelopeIcon;
      if (envelopeCategoryId !== (envelope.category_id || "")) envelopeUpdates.category_id = envelopeCategoryId || undefined;
      if (envelopePriority !== (envelope.priority || "")) envelopeUpdates.priority = envelopePriority || undefined;
      if (envelopeNotes !== (envelope.notes || "")) envelopeUpdates.notes = envelopeNotes || undefined;

      const hasEnvelopeUpdates = Object.keys(envelopeUpdates).length > 0;

      await onSave(recipientsToSave, budgetChange, hasEnvelopeUpdates ? envelopeUpdates : undefined);
      toast.success(`Gift recipients saved for ${envelopeName}`);
      onOpenChange(false);
      setShowBudgetWarning(false);
    } catch (error) {
      console.error("Failed to save gift recipients:", error);
      toast.error("Failed to save gift recipients");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setShowBudgetWarning(false);
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto bg-white rounded-xl shadow-xl z-50 p-6">
          <Dialog.Title className="text-xl font-bold text-text-dark flex items-center gap-2">
            <span className="text-2xl">{envelopeIcon}</span>
            {envelopeName} - Gift Recipients
          </Dialog.Title>

          <Dialog.Description className="text-sm text-text-medium mt-1 mb-4">
            Add the people you buy gifts for and how much you budget for each.
          </Dialog.Description>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="absolute top-4 right-4"
          >
            <X className="h-4 w-4" />
          </Button>

          {!showBudgetWarning ? (
            <div className="space-y-4">
              {/* Remy guidance - matching help button style */}
              <div className="flex items-start gap-3 p-3 bg-sage-very-light rounded-lg border border-sage-light">
                <RemyAvatar pose="small" size="sm" />
                <div className="space-y-2">
                  <p className="text-sm text-text-dark">
                    Add each person you're budgeting for. {!isFestival
                      ? "Pop in their special date and we'll remind you in advance!"
                      : ""}
                  </p>
                  <p className="text-xs text-text-medium">
                    We'll spread these costs across the year so you're always prepared. Your envelope will go up and down throughout the year as celebrations come and go - that's completely normal!</p>
                </div>
              </div>

              {/* Celebration type toggle */}
              <div className="flex items-center gap-4 p-3 bg-muted/20 rounded-lg border border-border">
                <span className="text-sm text-text-dark">This celebration is:</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsFestival(true)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                      isFestival
                        ? "bg-sage text-white"
                        : "bg-muted/50 text-text-medium hover:bg-muted"
                    )}
                  >
                    One-off event
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFestival(false)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                      !isFestival
                        ? "bg-sage text-white"
                        : "bg-muted/50 text-text-medium hover:bg-muted"
                    )}
                  >
                    Multiple dates
                  </button>
                </div>
                <span className="text-xs text-text-medium ml-auto">
                  {isFestival ? "e.g. Christmas, Diwali" : "e.g. Birthdays, Anniversaries"}
                </span>
              </div>

              {/* Collapsible Envelope Settings */}
              <div className="border border-border rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowEnvelopeSettings(!showEnvelopeSettings)}
                  className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <span className="text-sm font-medium text-text-dark">Envelope Settings</span>
                  {showEnvelopeSettings ? (
                    <ChevronUp className="h-4 w-4 text-text-medium" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-text-medium" />
                  )}
                </button>

                {showEnvelopeSettings && (
                  <div className="p-4 space-y-4 border-t border-border">
                    {/* Name & Icon */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="envelope-name" className="text-sm font-medium text-text-dark">
                          Name
                        </Label>
                        <Input
                          id="envelope-name"
                          value={envelopeName}
                          onChange={(e) => setEnvelopeName(e.target.value)}
                          placeholder="Envelope name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-text-dark">Icon</Label>
                        <div className="flex flex-wrap gap-1">
                          {iconOptions.slice(0, 10).map((icon) => (
                            <button
                              key={icon}
                              type="button"
                              className={cn(
                                "flex h-8 w-8 items-center justify-center rounded-lg border text-lg transition",
                                envelopeIcon === icon
                                  ? "border-sage bg-sage-very-light"
                                  : "border-border hover:border-sage-light"
                              )}
                              onClick={() => setEnvelopeIcon(icon)}
                            >
                              {icon}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Category & Priority */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="envelope-category" className="text-sm font-medium text-text-dark">
                          Category
                        </Label>
                        <select
                          id="envelope-category"
                          className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                          value={envelopeCategoryId}
                          onChange={(e) => setEnvelopeCategoryId(e.target.value)}
                        >
                          <option value="">No category</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="envelope-priority" className="text-sm font-medium text-text-dark">
                          Priority
                        </Label>
                        <select
                          id="envelope-priority"
                          className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                          value={envelopePriority}
                          onChange={(e) => setEnvelopePriority(e.target.value)}
                        >
                          <option value="">Select priority</option>
                          <option value="essential">Essential (Must pay)</option>
                          <option value="important">Important (Should pay)</option>
                          <option value="discretionary">Extras (Nice to have)</option>
                        </select>
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                      <Label htmlFor="envelope-notes" className="text-sm font-medium text-text-dark">
                        Notes
                      </Label>
                      <Textarea
                        id="envelope-notes"
                        value={envelopeNotes}
                        onChange={(e) => setEnvelopeNotes(e.target.value)}
                        placeholder="Optional notes about this envelope..."
                        rows={2}
                        className="resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Recipients list - compact single-line layout */}
              <div className="space-y-2">
                {/* Header row - different for festivals vs birthdays */}
                {isFestival ? (
                  // Festival: Name, Gift only (party is at envelope level)
                  <div className="grid grid-cols-[1fr_70px_28px] gap-2 px-2 text-xs font-medium text-text-medium">
                    <span>Name</span>
                    <span className="text-center">Gift</span>
                    <span></span>
                  </div>
                ) : (
                  // Birthday: Name, Date, Gift, Party, Total
                  <div className="grid grid-cols-[1fr_90px_70px_70px_70px_28px] gap-2 px-2 text-xs font-medium text-text-medium">
                    <span>Name</span>
                    <span className="text-center">Date</span>
                    <span className="text-center">Gift</span>
                    <span className="text-center">Party</span>
                    <span className="text-center">Total</span>
                    <span></span>
                  </div>
                )}

                {recipients.map((recipient) => (
                  <div
                    key={recipient.tempId}
                    className={cn(
                      "gap-2 items-center p-2 bg-sage-very-light rounded-lg border border-sage-light",
                      isFestival
                        ? "grid grid-cols-[1fr_70px_28px]"
                        : "grid grid-cols-[1fr_90px_70px_70px_70px_28px]"
                    )}
                  >
                    {/* Name */}
                    <Input
                      placeholder="Name"
                      value={recipient.recipient_name}
                      onChange={(e) =>
                        updateRecipient(recipient.tempId, "recipient_name", e.target.value)
                      }
                      className="bg-white h-8 text-sm"
                    />

                    {/* Date picker - only for birthdays */}
                    {!isFestival && (
                      <DatePickerForDialog
                        date={recipient.celebration_date}
                        onDateChange={(date) =>
                          updateRecipient(recipient.tempId, "celebration_date", date)
                        }
                      />
                    )}

                    {/* Gift amount */}
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-text-medium text-xs">
                        $
                      </span>
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        placeholder="0"
                        value={recipient.gift_amount || ""}
                        onChange={(e) =>
                          updateRecipient(
                            recipient.tempId,
                            "gift_amount",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="pl-5 bg-white h-8 text-sm text-center"
                      />
                    </div>

                    {/* Party/food amount - only for birthdays */}
                    {!isFestival && (
                      <>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-text-medium text-xs">
                            $
                          </span>
                          <Input
                            type="number"
                            step="1"
                            min="0"
                            placeholder="0"
                            value={recipient.party_amount || ""}
                            onChange={(e) =>
                              updateRecipient(
                                recipient.tempId,
                                "party_amount",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="pl-5 bg-white h-8 text-sm text-center"
                          />
                        </div>

                        {/* Total for this person */}
                        <div className="text-sm font-medium text-text-dark text-center">
                          ${(recipient.gift_amount || 0) + (recipient.party_amount || 0)}
                        </div>
                      </>
                    )}

                    {/* Remove button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRecipient(recipient.tempId)}
                      className="h-7 w-7 p-0 text-text-medium hover:text-red-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}

                {/* Add recipient button */}
                <Button
                  variant="outline"
                  onClick={addRecipient}
                  size="sm"
                  className="w-full border-dashed border-sage hover:border-sage-dark hover:bg-sage-very-light"
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Add Person
                </Button>
              </div>

              {/* Festival party/food budget - envelope level */}
              {isFestival && (
                <div className="bg-gold-light/30 border border-gold rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <PartyPopper className="h-5 w-5 text-gold flex-shrink-0" />
                    <div className="flex-1">
                      <Label className="text-sm font-medium text-text-dark">
                        Party/Food Budget
                      </Label>
                      <p className="text-xs text-text-medium">
                        One-off budget for the {envelopeName} celebration
                      </p>
                    </div>
                    <div className="relative w-24">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-medium">
                        $
                      </span>
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        placeholder="0"
                        value={envelopePartyBudget || ""}
                        onChange={(e) => setEnvelopePartyBudget(parseFloat(e.target.value) || 0)}
                        className="pl-7 h-9 text-center"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Total display - auto-calculated from all recipients */}
              <div className="bg-blue-light/30 border border-blue-light rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-text-dark">
                    Total Annual Budget:
                  </span>
                  <span className="text-lg font-semibold text-blue">
                    {formatCurrency(newTotal)}/year
                  </span>
                </div>
                {/* Breakdown by type */}
                <div className="flex items-center gap-4 mt-2 text-sm text-text-medium">
                  <span className="flex items-center gap-1">
                    🎁 Gifts: {formatCurrency(giftTotal)}
                  </span>
                  {partyTotal > 0 && (
                    <span className="flex items-center gap-1">
                      <PartyPopper className="h-3.5 w-3.5" /> Party/Food: {formatCurrency(partyTotal)}
                    </span>
                  )}
                </div>
                {Math.abs(budgetChange) > 0.01 && (
                  <p className="text-sm text-text-medium mt-2">
                    {budgetChange > 0 ? "Increase" : "Decrease"} of{" "}
                    {formatCurrency(Math.abs(budgetChange))} from current budget
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2 text-xs text-text-medium">
                  <Users className="h-3 w-3" />
                  <span>
                    {recipients.filter((r) => r.recipient_name.trim()).length}{" "}
                    {recipients.filter((r) => r.recipient_name.trim()).length === 1
                      ? "person"
                      : "people"}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!isValid || isSaving}
                  className="bg-sage hover:bg-sage-dark"
                >
                  {isSaving ? "Saving..." : "Save Recipients"}
                </Button>
              </div>
            </div>
          ) : (
            // Budget change warning
            <div className="space-y-4">
              <div className="bg-gold-light/30 border border-gold rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-gold flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-text-dark">Budget Change Detected</h4>
                    <p className="text-sm text-text-dark mt-1">
                      Your total gift budget{" "}
                      {budgetChange > 0 ? "increased" : "decreased"} by{" "}
                      <strong>{formatCurrency(Math.abs(budgetChange))}</strong>.
                    </p>
                    <p className="text-sm text-text-dark mt-2">
                      {budgetChange > 0 ? (
                        <>
                          You'll need to allocate an extra{" "}
                          {formatCurrency(budgetChange)} from your income to cover this.
                          Consider adjusting other envelopes if needed.
                        </>
                      ) : (
                        <>
                          You've freed up {formatCurrency(Math.abs(budgetChange))}.
                          You can reallocate this to other envelopes or your Surplus.
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setShowBudgetWarning(false)}>
                  Back
                </Button>
                <Button
                  onClick={handleConfirmSave}
                  disabled={isSaving}
                  className="bg-sage hover:bg-sage-dark"
                >
                  {isSaving ? "Saving..." : "Save & Adjust Budget"}
                </Button>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
