"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

interface TemplateItem {
  text: string;
  category?: string;
}

interface Template {
  id: string;
  name: string;
  icon: string;
  category: string;
  is_system: boolean;
  items: TemplateItem[];
}

interface TemplatePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: Template) => Promise<void>;
}

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "household", label: "Household" },
  { value: "routine", label: "Routines" },
  { value: "life-events", label: "Life Events" },
  { value: "travel", label: "Travel" },
  { value: "events", label: "Events" },
  { value: "custom", label: "My Templates" },
];

export function TemplatePicker({
  open,
  onOpenChange,
  onSelectTemplate,
}: TemplatePickerProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/todos/templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = async (template: Template) => {
    setApplying(template.id);
    try {
      await onSelectTemplate(template);
      onOpenChange(false);
    } finally {
      setApplying(null);
    }
  };

  const filteredTemplates =
    selectedCategory === "all"
      ? templates
      : templates.filter((t) => t.category === selectedCategory);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Choose a Template</DialogTitle>
        </DialogHeader>

        <Tabs
          value={selectedCategory}
          onValueChange={setSelectedCategory}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="justify-start overflow-x-auto">
            {CATEGORIES.map((cat) => (
              <TabsTrigger key={cat.value} value={cat.value}>
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-sage" />
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-12 text-text-medium">
                No templates in this category
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredTemplates.map((template) => (
                  <Card
                    key={template.id}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md",
                      applying === template.id && "ring-2 ring-sage"
                    )}
                    onClick={() => handleSelectTemplate(template)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{template.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium flex items-center gap-2">
                            {template.name}
                            {template.is_system && (
                              <Badge variant="secondary" className="text-xs">
                                Built-in
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-text-medium mt-1">
                            {template.items.length} items
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {template.items.slice(0, 3).map((item, i) => (
                              <Badge
                                key={i}
                                variant="outline"
                                className="text-xs"
                              >
                                {item.text.length > 20
                                  ? item.text.substring(0, 20) + "..."
                                  : item.text}
                              </Badge>
                            ))}
                            {template.items.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{template.items.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                        {applying === template.id && (
                          <Loader2 className="h-4 w-4 animate-spin text-sage" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
