"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, FileText, Plus, ShoppingCart, List, FolderOpen } from "lucide-react";
import { cn } from "@/lib/cn";
import { FluentEmojiPicker } from "@/components/ui/fluent-emoji-picker";

interface TemplateItem {
  name: string;
  quantity: number;
  category_id: string | null;
  aisle_name: string | null;
}

interface Template {
  id: string;
  name: string;
  icon: string;
  items: TemplateItem[];
}

export type ListType = "basic" | "grocery" | "categorised";

interface CreateShoppingListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateList: (data: {
    name: string;
    icon: string;
    list_type: ListType;
    from_template_id?: string;
  }) => Promise<void>;
}

const LIST_TYPES = [
  {
    id: "basic" as ListType,
    name: "Quick List",
    description: "Just jot it down, no fuss",
    icon: List,
    defaultIcon: "📝",
    defaultName: "Quick List",
  },
  {
    id: "grocery" as ListType,
    name: "Grocery Shop",
    description: "Your usual shop, sorted by aisle",
    icon: ShoppingCart,
    defaultIcon: "🛒",
    defaultName: "Groceries",
  },
  {
    id: "categorised" as ListType,
    name: "DIY List",
    description: "Your categories, your rules",
    icon: FolderOpen,
    defaultIcon: "📦",
    defaultName: "My List",
  },
];

export function CreateShoppingListDialog({
  open,
  onOpenChange,
  onCreateList,
}: CreateShoppingListDialogProps) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🛒");
  const [listType, setListType] = useState<ListType>("grocery");
  const [isCreating, setIsCreating] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("new");

  // Fetch templates when dialog opens
  useEffect(() => {
    if (open) {
      fetchTemplates();
    } else {
      // Reset state when dialog closes
      setName("");
      setIcon("🛒");
      setListType("grocery");
      setSelectedTemplate(null);
      setActiveTab("new");
    }
  }, [open]);

  // Update icon when list type changes
  useEffect(() => {
    const typeConfig = LIST_TYPES.find((t) => t.id === listType);
    if (typeConfig) {
      setIcon(typeConfig.defaultIcon);
    }
  }, [listType]);

  const fetchTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const res = await fetch("/api/shopping/templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const handleCreate = async () => {
    if (activeTab === "template") {
      if (!selectedTemplate) return;
      const template = templates.find((t) => t.id === selectedTemplate);
      if (!template) return;

      setIsCreating(true);
      try {
        await onCreateList({
          name: name.trim() || template.name,
          icon: template.icon,
          list_type: "categorised", // Templates are always categorised
          from_template_id: selectedTemplate,
        });
        onOpenChange(false);
      } finally {
        setIsCreating(false);
      }
    } else {
      const typeConfig = LIST_TYPES.find((t) => t.id === listType);
      const finalName = name.trim() || typeConfig?.defaultName || "Shopping List";

      setIsCreating(true);
      try {
        await onCreateList({
          name: finalName,
          icon,
          list_type: listType,
        });
        onOpenChange(false);
      } finally {
        setIsCreating(false);
      }
    }
  };

  const selectedTemplateData = templates.find((t) => t.id === selectedTemplate);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Shopping List</DialogTitle>
          <DialogDescription>
            Choose what type of list you want to create
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new" className="gap-2">
              <Plus className="h-4 w-4" />
              New List
            </TabsTrigger>
            <TabsTrigger value="template" className="gap-2">
              <FileText className="h-4 w-4" />
              From Template
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="space-y-4 py-4">
            {/* List Type Selection */}
            <div className="space-y-3">
              <Label>List Type</Label>
              <RadioGroup
                value={listType}
                onValueChange={(value) => setListType(value as ListType)}
                className="space-y-2"
              >
                {LIST_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <label
                      key={type.id}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                        listType === type.id
                          ? "border-sage bg-sage-very-light ring-1 ring-sage"
                          : "border-silver-light hover:border-sage-light hover:bg-silver-very-light"
                      )}
                    >
                      <RadioGroupItem value={type.id} className="mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-sage" />
                          <span className="font-medium text-text-dark">
                            {type.name}
                          </span>
                        </div>
                        <p className="text-sm text-text-medium mt-0.5">
                          {type.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </RadioGroup>
            </div>

            {/* List Name */}
            <div className="space-y-2">
              <Label htmlFor="name">List Name</Label>
              <Input
                id="name"
                placeholder={
                  LIST_TYPES.find((t) => t.id === listType)?.defaultName ||
                  "e.g., Weekly Groceries"
                }
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                }}
              />
              <p className="text-xs text-text-medium">
                Leave blank to use default name
              </p>
            </div>

            {/* Icon Selection */}
            <div className="space-y-2">
              <Label>Icon</Label>
              <FluentEmojiPicker
                selectedEmoji={icon}
                onEmojiSelect={setIcon}
                size="lg"
                insideDialog={true}
              />
            </div>

            {/* Grocery List Info */}
            {listType === "grocery" && (
              <div className="p-3 rounded-lg bg-blue-light border border-blue text-sm">
                <p className="font-medium text-text-dark mb-1">
                  Grocery list features:
                </p>
                <ul className="text-text-medium space-y-1 text-xs">
                  <li>• Type to search from 200+ common NZ grocery items</li>
                  <li>• Items auto-sort by supermarket aisle</li>
                  <li>• See average prices as you add items</li>
                </ul>
              </div>
            )}
          </TabsContent>

          <TabsContent value="template" className="py-4">
            {isLoadingTemplates ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-sage" />
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-text-light mx-auto mb-3" />
                <p className="text-text-medium">No templates saved yet</p>
                <p className="text-sm text-text-light mt-1">
                  Save a shopping list as a template to reuse it here
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Template</Label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => setSelectedTemplate(template.id)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
                          selectedTemplate === template.id
                            ? "border-sage bg-sage-very-light ring-1 ring-sage"
                            : "border-silver-light hover:border-sage-light hover:bg-silver-very-light"
                        )}
                      >
                        <span className="text-xl">{template.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-text-dark truncate">
                            {template.name}
                          </div>
                          <Badge variant="outline" className="text-xs mt-0.5">
                            {template.items.length} items
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {selectedTemplateData && (
                  <div className="space-y-2">
                    <Label htmlFor="template-name">List Name (optional)</Label>
                    <Input
                      id="template-name"
                      placeholder={selectedTemplateData.name}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                    <p className="text-xs text-text-medium">
                      Leave blank to use template name
                    </p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={
              isCreating ||
              (activeTab === "template" && !selectedTemplate)
            }
            className="bg-sage hover:bg-sage-dark"
          >
            {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create List
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
