"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  TodoListView,
  TemplatePicker,
  CreateListDialog,
} from "@/components/todos";
import { RemyHelpButton } from "@/components/shared/remy-help-button";
import { Plus, FileText, ListTodo } from "lucide-react";

const HELP_CONTENT = {
  tips: [
    "Create separate lists for different areas (home, garden, errands)",
    "Use templates for recurring tasks like weekly cleaning",
    "Assign tasks to family members to share the load",
  ],
  features: [
    "Create multiple to-do lists for different purposes",
    "Check off items as you complete them",
    "Use templates for common task lists",
    "Share lists with children for their chores",
  ],
  faqs: [
    {
      question: "How do templates work?",
      answer: "Templates are pre-made task lists. Click 'From Template' to start with a template like 'Weekly Cleaning' or 'Moving House'.",
    },
    {
      question: "Can I share a list with my kids?",
      answer: "Yes! When editing a list, you can choose which children can see it. Their tasks will appear in their dashboard.",
    },
    {
      question: "How do I see completed tasks?",
      answer: "Toggle 'Show completed' at the top of the page to see tasks you've already checked off.",
    },
  ],
};

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  completed_at: string | null;
  due_date: string | null;
  assigned_to: string | null;
  assigned_to_type: "parent" | "child" | "family" | null;
  category: string | null;
  notes: string | null;
  sort_order: number;
}

interface TodoList {
  id: string;
  name: string;
  icon: string;
  color: string;
  items: TodoItem[];
  totalItems: number;
  completedItems: number;
  shared_with_children: string[];
}

interface ChildProfile {
  id: string;
  name: string;
}

interface Template {
  id: string;
  name: string;
  icon: string;
  category: string;
  is_system: boolean;
  items: { text: string; category?: string }[];
}

interface TodosClientProps {
  initialLists: TodoList[];
  childProfiles: ChildProfile[];
}

export function TodosClient({ initialLists, childProfiles }: TodosClientProps) {
  const router = useRouter();
  const [lists, setLists] = useState<TodoList[]>(initialLists);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  const refreshLists = useCallback(async () => {
    try {
      const res = await fetch(`/api/todos/lists?includeCompleted=${showCompleted}`);
      if (res.ok) {
        const data = await res.json();
        setLists(data);
      }
    } catch (error) {
      console.error("Error refreshing lists:", error);
    }
  }, [showCompleted]);

  const handleCreateList = async (data: { name: string; icon: string; color: string }) => {
    try {
      const res = await fetch("/api/todos/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const newList = await res.json();
        setLists((prev) => [{ ...newList, items: [], totalItems: 0, completedItems: 0 }, ...prev]);
      }
    } catch (error) {
      console.error("Error creating list:", error);
    }
  };

  const handleAddItem = async (listId: string, text: string, category?: string) => {
    try {
      const res = await fetch("/api/todos/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ list_id: listId, text, category: category || null }),
      });

      if (res.ok) {
        const newItem = await res.json();
        setLists((prev) =>
          prev.map((list) =>
            list.id === listId
              ? {
                  ...list,
                  items: [...list.items, newItem],
                  totalItems: list.totalItems + 1,
                }
              : list
          )
        );
      }
    } catch (error) {
      console.error("Error adding item:", error);
    }
  };

  const handleToggleItem = async (itemId: string, completed: boolean) => {
    try {
      const res = await fetch(`/api/todos/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });

      if (res.ok) {
        setLists((prev) =>
          prev.map((list) => ({
            ...list,
            items: list.items.map((item) =>
              item.id === itemId ? { ...item, completed } : item
            ),
            completedItems: list.items.filter((item) =>
              item.id === itemId ? completed : item.completed
            ).length,
          }))
        );
      }
    } catch (error) {
      console.error("Error toggling item:", error);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      const res = await fetch(`/api/todos/items/${itemId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setLists((prev) =>
          prev.map((list) => {
            const itemToDelete = list.items.find((i) => i.id === itemId);
            if (!itemToDelete) return list;
            return {
              ...list,
              items: list.items.filter((item) => item.id !== itemId),
              totalItems: list.totalItems - 1,
              completedItems: itemToDelete.completed
                ? list.completedItems - 1
                : list.completedItems,
            };
          })
        );
      }
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };

  const handleUpdateItem = async (itemId: string, updates: Partial<TodoItem>) => {
    try {
      const res = await fetch(`/api/todos/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        const updatedItem = await res.json();
        setLists((prev) =>
          prev.map((list) => ({
            ...list,
            items: list.items.map((item) =>
              item.id === itemId ? updatedItem : item
            ),
          }))
        );
      }
    } catch (error) {
      console.error("Error updating item:", error);
    }
  };

  const handleDeleteList = async (listId: string) => {
    if (!confirm("Are you sure you want to delete this list?")) return;

    try {
      const res = await fetch(`/api/todos/lists/${listId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setLists((prev) => prev.filter((list) => list.id !== listId));
      }
    } catch (error) {
      console.error("Error deleting list:", error);
    }
  };

  const handleResetList = async (listId: string) => {
    if (!confirm("This will uncheck all items in the list. Continue?")) return;

    try {
      const res = await fetch(`/api/todos/lists/${listId}/reset`, {
        method: "POST",
      });

      if (res.ok) {
        // Reset all items in the local state
        setLists((prev) =>
          prev.map((list) =>
            list.id === listId
              ? {
                  ...list,
                  items: list.items.map((item) => ({
                    ...item,
                    completed: false,
                    completed_at: null,
                  })),
                  completedItems: 0,
                }
              : list
          )
        );
      }
    } catch (error) {
      console.error("Error resetting list:", error);
    }
  };

  const handleSelectTemplate = async (template: Template) => {
    if (!selectedListId) {
      // Create a new list from template
      try {
        // First create the list
        const listRes = await fetch("/api/todos/lists", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: template.name,
            icon: template.icon,
            color: "sage",
          }),
        });

        if (listRes.ok) {
          const newList = await listRes.json();

          // Then add all template items
          const items: TodoItem[] = [];
          for (let i = 0; i < template.items.length; i++) {
            const itemRes = await fetch("/api/todos/items", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                list_id: newList.id,
                text: template.items[i].text,
                category: template.items[i].category,
              }),
            });
            if (itemRes.ok) {
              items.push(await itemRes.json());
            }
          }

          setLists((prev) => [
            {
              ...newList,
              items,
              totalItems: items.length,
              completedItems: 0,
            },
            ...prev,
          ]);
        }
      } catch (error) {
        console.error("Error creating list from template:", error);
      }
    } else {
      // Add template items to existing list
      try {
        const res = await fetch(`/api/todos/lists/${selectedListId}/from-template`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ template_id: template.id }),
        });

        if (res.ok) {
          await refreshLists();
        }
      } catch (error) {
        console.error("Error adding template to list:", error);
      }
    }
    setSelectedListId(null);
  };

  const openTemplatePickerForList = (listId: string) => {
    setSelectedListId(listId);
    setShowTemplatePicker(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-sage-light flex items-center justify-center">
              <ListTodo className="h-6 w-6 text-sage-dark" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-dark">To-Do Lists</h1>
              <p className="text-text-medium">Manage your household tasks</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedListId(null);
                setShowTemplatePicker(true);
              }}
            >
              <FileText className="h-4 w-4 mr-2" />
              From Template
            </Button>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-sage hover:bg-sage-dark"
            >
              <Plus className="h-4 w-4 mr-2" />
              New List
            </Button>
            <RemyHelpButton title="To-Do Lists" content={HELP_CONTENT} />
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Switch
              id="show-completed"
              checked={showCompleted}
              onCheckedChange={(checked) => {
                setShowCompleted(checked);
                refreshLists();
              }}
            />
            <Label htmlFor="show-completed" className="text-sm text-text-medium">
              Show completed
            </Label>
          </div>
        </div>

        {/* Lists */}
        {lists.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📝</div>
            <h2 className="text-xl font-semibold text-text-dark mb-2">
              No lists yet
            </h2>
            <p className="text-text-medium mb-6">
              Create your first to-do list or start from a template
            </p>
            <div className="flex justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedListId(null);
                  setShowTemplatePicker(true);
                }}
              >
                <FileText className="h-4 w-4 mr-2" />
                Use Template
              </Button>
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="bg-sage hover:bg-sage-dark"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create List
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {lists.map((list) => (
              <TodoListView
                key={list.id}
                list={list}
                childProfiles={childProfiles}
                onAddItem={handleAddItem}
                onToggleItem={handleToggleItem}
                onDeleteItem={handleDeleteItem}
                onUpdateItem={handleUpdateItem}
                onDeleteList={handleDeleteList}
                onResetList={handleResetList}
                showCompleted={showCompleted}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <CreateListDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreateList={handleCreateList}
      />

      <TemplatePicker
        open={showTemplatePicker}
        onOpenChange={setShowTemplatePicker}
        onSelectTemplate={handleSelectTemplate}
      />
    </div>
  );
}
