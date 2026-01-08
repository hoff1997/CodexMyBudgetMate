"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Cake,
  CalendarIcon,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Gift,
  Clock,
  PartyPopper,
  Loader2,
  Wallet,
  AlertCircle,
} from "lucide-react";
import { format, differenceInDays, setYear } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/finance";
import { RemyHelpButton } from "@/components/shared/remy-help-button";

const HELP_CONTENT = {
  tips: [
    "Set up birthday envelopes with monthly contributions",
    "Add notes for gift ideas as you think of them",
    "Check the countdown to plan shopping trips",
  ],
  features: [
    "See all upcoming birthdays at a glance",
    "Track gift and party budgets for each person",
    "Countdown shows days until each birthday",
    "Linked to your celebration budget envelopes",
  ],
  faqs: [
    {
      question: "How do I add a birthday?",
      answer: "Birthdays are added through your celebration envelopes. Create a 'Birthday' or 'Celebrations' envelope and add gift recipients with their dates.",
    },
    {
      question: "How do gift budgets work?",
      answer: "When you set up a birthday in your envelope, you can specify the gift amount and party amount. We'll help you save for it throughout the year.",
    },
    {
      question: "Can I set reminders?",
      answer: "The birthday list automatically shows you upcoming celebrations. Plan to check it at the start of each month!",
    },
  ],
};

interface Birthday {
  id: string;
  name: string;
  date: string;
  giftAmount: number;
  partyAmount: number;
  notes: string | null;
  envelopeId: string;
  envelopeName: string;
  envelopeIcon: string;
  needsGift?: boolean;
}

interface BirthdaysClientProps {
  initialBirthdays: Birthday[];
}

interface AddBirthdayForm {
  name: string;
  date: Date | null;
  needsGift: boolean;
  giftAmount: number;
  partyAmount: number;
  notes: string;
}

const DEFAULT_ADD_FORM: AddBirthdayForm = {
  name: "",
  date: null,
  needsGift: true,
  giftAmount: 50,
  partyAmount: 0,
  notes: "",
};

export function BirthdaysClient({ initialBirthdays }: BirthdaysClientProps) {
  const router = useRouter();
  const [birthdays, setBirthdays] = useState<Birthday[]>(initialBirthdays);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    date: Date | null;
    giftAmount: number;
    partyAmount: number;
    notes: string;
  } | null>(null);

  // Add birthday dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addForm, setAddForm] = useState<AddBirthdayForm>(DEFAULT_ADD_FORM);
  const [isAdding, setIsAdding] = useState(false);
  const [showEnvelopeCreatedMessage, setShowEnvelopeCreatedMessage] = useState(false);

  // Calculate days until each birthday
  const birthdaysWithDaysUntil = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return birthdays.map((b) => {
      const birthDate = new Date(b.date);
      // Set to this year
      let nextBirthday = setYear(birthDate, today.getFullYear());
      nextBirthday.setHours(0, 0, 0, 0);

      // If already passed this year, set to next year
      if (nextBirthday < today) {
        nextBirthday = setYear(birthDate, today.getFullYear() + 1);
      }

      const daysUntil = differenceInDays(nextBirthday, today);

      return {
        ...b,
        daysUntil,
        nextBirthday,
      };
    }).sort((a, b) => a.daysUntil - b.daysUntil);
  }, [birthdays]);

  const handleEdit = (birthday: Birthday) => {
    setEditingId(birthday.id);
    setEditForm({
      name: birthday.name,
      date: birthday.date ? new Date(birthday.date) : null,
      giftAmount: birthday.giftAmount,
      partyAmount: birthday.partyAmount,
      notes: birthday.notes || "",
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleSaveEdit = async (id: string, envelopeId: string) => {
    if (!editForm || !editForm.name.trim() || !editForm.date) {
      toast.error("Name and date are required");
      return;
    }

    try {
      const res = await fetch(`/api/birthdays/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient_name: editForm.name.trim(),
          celebration_date: editForm.date.toISOString().split("T")[0],
          gift_amount: editForm.giftAmount,
          party_amount: editForm.partyAmount,
          notes: editForm.notes.trim() || null,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update");
      }

      // Update local state
      setBirthdays((prev) =>
        prev.map((b) =>
          b.id === id
            ? {
                ...b,
                name: editForm.name.trim(),
                date: editForm.date!.toISOString().split("T")[0],
                giftAmount: editForm.giftAmount,
                partyAmount: editForm.partyAmount,
                notes: editForm.notes.trim() || null,
              }
            : b
        )
      );

      toast.success("Birthday updated");
      setEditingId(null);
      setEditForm(null);
    } catch (error) {
      console.error("Failed to update birthday:", error);
      toast.error("Failed to update birthday");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this birthday?")) {
      return;
    }

    try {
      const res = await fetch(`/api/birthdays/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete");
      }

      setBirthdays((prev) => prev.filter((b) => b.id !== id));
      toast.success("Birthday deleted");
    } catch (error) {
      console.error("Failed to delete birthday:", error);
      toast.error("Failed to delete birthday");
    }
  };

  const getDaysUntilText = (daysUntil: number) => {
    if (daysUntil === 0) return "Today!";
    if (daysUntil === 1) return "Tomorrow";
    if (daysUntil <= 7) return `In ${daysUntil} days`;
    if (daysUntil <= 14) return "Next week";
    if (daysUntil <= 30) return `In ${Math.ceil(daysUntil / 7)} weeks`;
    return `In ${Math.ceil(daysUntil / 30)} months`;
  };

  const getDaysUntilColor = (daysUntil: number) => {
    if (daysUntil <= 7) return "text-gold bg-gold-light";
    if (daysUntil <= 30) return "text-blue bg-blue-light";
    return "text-text-medium bg-silver-light";
  };

  const handleOpenAddDialog = () => {
    setAddForm(DEFAULT_ADD_FORM);
    setShowEnvelopeCreatedMessage(false);
    setAddDialogOpen(true);
  };

  const handleAddBirthday = async () => {
    if (!addForm.name.trim() || !addForm.date) {
      toast.error("Name and date are required");
      return;
    }

    setIsAdding(true);
    try {
      const res = await fetch("/api/birthdays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient_name: addForm.name.trim(),
          celebration_date: addForm.date.toISOString().split("T")[0],
          gift_amount: addForm.needsGift ? addForm.giftAmount : 0,
          party_amount: addForm.needsGift ? addForm.partyAmount : 0,
          notes: addForm.notes.trim() || null,
          needs_gift: addForm.needsGift,
          create_envelope: addForm.needsGift, // Auto-create envelope when celebrating
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to add birthday");
      }

      const data = await res.json();

      // Add to local state
      const newBirthday: Birthday = {
        id: data.birthday.id,
        name: data.birthday.recipient_name,
        date: data.birthday.celebration_date,
        giftAmount: data.birthday.gift_amount,
        partyAmount: data.birthday.party_amount,
        notes: data.birthday.notes,
        envelopeId: data.birthday.envelope_id,
        envelopeName: data.birthday.envelopes?.name || "Birthdays",
        envelopeIcon: data.birthday.envelopes?.icon || "🎂",
        needsGift: data.birthday.needs_gift,
      };

      setBirthdays((prev) => [...prev, newBirthday]);

      if (data.envelope_created) {
        setShowEnvelopeCreatedMessage(true);
        toast.success("Birthday added and Birthdays envelope created!");
      } else {
        toast.success("Birthday added!");
        setAddDialogOpen(false);
        setAddForm(DEFAULT_ADD_FORM);
      }
    } catch (error) {
      console.error("Failed to add birthday:", error);
      toast.error(error instanceof Error ? error.message : "Failed to add birthday");
    } finally {
      setIsAdding(false);
    }
  };

  const handleGoToBudget = () => {
    setAddDialogOpen(false);
    router.push("/budgetallocation?highlight=new");
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-sage-very-light flex items-center justify-center">
            <Cake className="h-5 w-5 text-sage" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-dark">Birthdays</h1>
            <p className="text-sm text-text-medium">
              {birthdays.length} {birthdays.length === 1 ? "birthday" : "birthdays"} tracked
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleOpenAddDialog}
            size="sm"
            className="bg-sage hover:bg-sage-dark"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Birthday
          </Button>
          <RemyHelpButton title="Birthdays" content={HELP_CONTENT} />
        </div>
      </div>

      {/* Birthday list */}
      {birthdaysWithDaysUntil.length === 0 ? (
        <Card className="p-8 text-center">
          <Cake className="h-12 w-12 text-silver mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text-dark mb-2">No birthdays yet</h3>
          <p className="text-sm text-text-medium mb-4">
            Track birthdays for friends and family. You can choose whether to budget for gifts.
          </p>
          <Button
            onClick={handleOpenAddDialog}
            className="bg-sage hover:bg-sage-dark"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Birthday
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {birthdaysWithDaysUntil.map((birthday) => (
            <Card
              key={birthday.id}
              className={cn(
                "p-4 transition-all",
                birthday.daysUntil <= 7 && "border-gold"
              )}
            >
              {editingId === birthday.id && editForm ? (
                // Edit mode
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <Input
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm({ ...editForm, name: e.target.value })
                      }
                      placeholder="Name"
                      className="flex-1"
                    />
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-[140px] justify-start",
                            !editForm.date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {editForm.date
                            ? format(editForm.date, "d MMM")
                            : "Pick date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={editForm.date || undefined}
                          onSelect={(date) =>
                            setEditForm({ ...editForm, date: date || null })
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-medium text-xs">
                        🎁
                      </span>
                      <Input
                        type="number"
                        value={editForm.giftAmount || ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            giftAmount: parseFloat(e.target.value) || 0,
                          })
                        }
                        placeholder="Gift"
                        className="pl-7"
                      />
                    </div>
                    <div className="relative flex-1">
                      <PartyPopper className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-text-medium" />
                      <Input
                        type="number"
                        value={editForm.partyAmount || ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            partyAmount: parseFloat(e.target.value) || 0,
                          })
                        }
                        placeholder="Party"
                        className="pl-7"
                      />
                    </div>
                    <Input
                      value={editForm.notes}
                      onChange={(e) =>
                        setEditForm({ ...editForm, notes: e.target.value })
                      }
                      placeholder="Notes"
                      className="flex-1"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelEdit}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSaveEdit(birthday.id, birthday.envelopeId)}
                      className="bg-sage hover:bg-sage-dark"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                // View mode
                <div className="flex items-center gap-4">
                  {/* Icon & Name */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-sage-very-light flex items-center justify-center text-lg flex-shrink-0">
                      {birthday.envelopeIcon}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium text-text-dark truncate">
                        {birthday.name}
                      </h3>
                      <p className="text-xs text-text-medium">
                        {format(new Date(birthday.date), "d MMMM")}
                        {birthday.notes && ` - ${birthday.notes}`}
                      </p>
                    </div>
                  </div>

                  {/* Days until */}
                  <div
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5",
                      getDaysUntilColor(birthday.daysUntil)
                    )}
                  >
                    <Clock className="h-3 w-3" />
                    {getDaysUntilText(birthday.daysUntil)}
                  </div>

                  {/* Gift & Party amounts */}
                  {(birthday.giftAmount > 0 || birthday.partyAmount > 0) && (
                    <div className="flex items-center gap-2 text-sm">
                      {birthday.giftAmount > 0 && (
                        <span className="flex items-center gap-1 font-medium text-text-dark" title="Gift budget">
                          🎁 {formatCurrency(birthday.giftAmount)}
                        </span>
                      )}
                      {birthday.partyAmount > 0 && (
                        <span className="flex items-center gap-1 font-medium text-gold" title="Party/food budget">
                          <PartyPopper className="h-3.5 w-3.5" />
                          {formatCurrency(birthday.partyAmount)}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(birthday)}
                      className="h-8 w-8 p-0"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(birthday.id)}
                      className="h-8 w-8 p-0 text-text-medium hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Upcoming section */}
      {birthdaysWithDaysUntil.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-medium text-text-medium uppercase tracking-wide mb-3">
            Coming Up Soon
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {birthdaysWithDaysUntil
              .filter((b) => b.daysUntil <= 30)
              .slice(0, 6)
              .map((birthday) => (
                <Card
                  key={`upcoming-${birthday.id}`}
                  className={cn(
                    "p-3",
                    birthday.daysUntil <= 7
                      ? "bg-gold-light/30 border-gold"
                      : "bg-blue-light/30 border-blue-light"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{birthday.envelopeIcon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-dark text-sm truncate">
                        {birthday.name}
                      </p>
                      <p className="text-xs text-text-medium">
                        {format(birthday.nextBirthday, "EEEE, d MMM")}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded",
                        birthday.daysUntil <= 7
                          ? "text-gold bg-gold-light"
                          : "text-blue"
                      )}
                    >
                      {birthday.daysUntil === 0
                        ? "Today!"
                        : birthday.daysUntil === 1
                        ? "Tomorrow"
                        : `${birthday.daysUntil}d`}
                    </div>
                  </div>
                </Card>
              ))}
          </div>
        </div>
      )}

      {/* Add Birthday Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cake className="h-5 w-5 text-sage" />
              {showEnvelopeCreatedMessage ? "Birthday Added!" : "Add Birthday"}
            </DialogTitle>
            {!showEnvelopeCreatedMessage && (
              <DialogDescription>
                Track birthdays for friends and family
              </DialogDescription>
            )}
          </DialogHeader>

          {showEnvelopeCreatedMessage ? (
            // Success message after envelope creation
            <div className="py-4 space-y-4">
              <div className="p-4 rounded-lg bg-sage-very-light border border-sage-light">
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-sage mt-0.5" />
                  <div>
                    <p className="font-medium text-text-dark">Birthdays envelope created</p>
                    <p className="text-sm text-text-medium mt-1">
                      A new "Birthdays" envelope has been added to your Celebrations category.
                      Head to Budget Allocation to set up how much you want to save each pay.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-gold-light/50 border border-gold">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-gold mt-0.5" />
                  <p className="text-sm text-text-dark">
                    <strong>Reminder:</strong> Don't forget to allocate funds to your new birthday envelope!
                  </p>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setAddDialogOpen(false);
                    setAddForm(DEFAULT_ADD_FORM);
                    setShowEnvelopeCreatedMessage(false);
                  }}
                >
                  Done
                </Button>
                <Button
                  onClick={handleGoToBudget}
                  className="bg-sage hover:bg-sage-dark"
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  Adjust Budget Now
                </Button>
              </DialogFooter>
            </div>
          ) : (
            // Add birthday form
            <div className="space-y-4 py-2">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="birthday-name">Name</Label>
                <Input
                  id="birthday-name"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  placeholder="e.g., Mum, Dad, Sarah"
                />
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label>Birthday</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start",
                        !addForm.date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {addForm.date ? format(addForm.date, "d MMMM") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={addForm.date || undefined}
                      onSelect={(date) => setAddForm({ ...addForm, date: date || null })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Celebrate Toggle */}
              <div className="flex items-center space-x-3 p-3 rounded-lg bg-silver-very-light">
                <Checkbox
                  id="needs-gift"
                  checked={addForm.needsGift}
                  onCheckedChange={(checked) =>
                    setAddForm({ ...addForm, needsGift: checked as boolean })
                  }
                />
                <Label htmlFor="needs-gift" className="flex-1 cursor-pointer">
                  <span className="font-medium">I give a gift or celebrate this birthday</span>
                  <p className="text-xs text-text-medium mt-0.5">
                    Uncheck to just track the date
                  </p>
                </Label>
              </div>

              {/* Gift amounts - only show if celebrating */}
              {addForm.needsGift && (
                <div className="space-y-3 p-3 rounded-lg border border-sage-light bg-sage-very-light/30">
                  <div className="flex gap-3">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs flex items-center gap-1">
                        <Gift className="h-3 w-3" /> Gift Budget
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-medium">
                          $
                        </span>
                        <Input
                          type="number"
                          value={addForm.giftAmount || ""}
                          onChange={(e) =>
                            setAddForm({
                              ...addForm,
                              giftAmount: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="pl-7"
                        />
                      </div>
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs flex items-center gap-1">
                        <PartyPopper className="h-3 w-3" /> Party Budget
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-medium">
                          $
                        </span>
                        <Input
                          type="number"
                          value={addForm.partyAmount || ""}
                          onChange={(e) =>
                            setAddForm({
                              ...addForm,
                              partyAmount: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="pl-7"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="birthday-notes">Notes (optional)</Label>
                <Input
                  id="birthday-notes"
                  value={addForm.notes}
                  onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                  placeholder="Gift ideas, interests, etc."
                />
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setAddDialogOpen(false)}
                  disabled={isAdding}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddBirthday}
                  disabled={isAdding || !addForm.name.trim() || !addForm.date}
                  className="bg-sage hover:bg-sage-dark"
                >
                  {isAdding ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Add Birthday
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
