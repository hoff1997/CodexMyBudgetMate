"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  MoreVertical,
  Trash2,
  Calendar,
  User,
  ChevronDown,
  ChevronUp,
  Edit2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { format } from "date-fns";

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  completed_at: string | null;
  due_date: string | null;
  assigned_to: string | null;
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

interface TodoListViewProps {
  list: TodoList;
  childProfiles: ChildProfile[];
  onAddItem: (listId: string, text: string) => Promise<void>;
  onToggleItem: (itemId: string, completed: boolean) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
  onUpdateItem: (itemId: string, updates: Partial<TodoItem>) => Promise<void>;
  onDeleteList: (listId: string) => Promise<void>;
  showCompleted: boolean;
}

export function TodoListView({
  list,
  childProfiles,
  onAddItem,
  onToggleItem,
  onDeleteItem,
  onUpdateItem,
  onDeleteList,
  showCompleted,
}: TodoListViewProps) {
  const [newItemText, setNewItemText] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const handleAddItem = async () => {
    if (!newItemText.trim()) return;
    setIsAdding(true);
    try {
      await onAddItem(list.id, newItemText.trim());
      setNewItemText("");
    } finally {
      setIsAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddItem();
    }
  };

  const startEditing = (item: TodoItem) => {
    setEditingId(item.id);
    setEditText(item.text);
  };

  const saveEdit = async (itemId: string) => {
    if (editText.trim()) {
      await onUpdateItem(itemId, { text: editText.trim() });
    }
    setEditingId(null);
    setEditText("");
  };

  const getChildName = (childId: string) => {
    return childProfiles.find((c) => c.id === childId)?.name || "Unknown";
  };

  const progress =
    list.totalItems > 0
      ? Math.round((list.completedItems / list.totalItems) * 100)
      : 0;

  const pendingItems = list.items.filter((i) => !i.completed);
  const completedItems = list.items.filter((i) => i.completed);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer flex-1"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <span className="text-2xl">{list.icon}</span>
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                {list.name}
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-text-medium" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-text-medium" />
                )}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1.5 bg-silver-light rounded-full overflow-hidden max-w-32">
                  <div
                    className="h-full bg-sage transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-xs text-text-medium">
                  {list.completedItems}/{list.totalItems}
                </span>
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => onDeleteList(list.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete List
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-2">
          {/* Add new item */}
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Add a task..."
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isAdding}
              className="flex-1"
            />
            <Button
              onClick={handleAddItem}
              disabled={isAdding || !newItemText.trim()}
              size="sm"
              className="bg-sage hover:bg-sage-dark"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Pending items */}
          <div className="space-y-2">
            {pendingItems.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-silver-light/50 group"
              >
                <Checkbox
                  checked={item.completed}
                  onCheckedChange={(checked) =>
                    onToggleItem(item.id, checked as boolean)
                  }
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  {editingId === item.id ? (
                    <Input
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onBlur={() => saveEdit(item.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(item.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      autoFocus
                      className="h-7 text-sm"
                    />
                  ) : (
                    <div
                      className="text-sm cursor-pointer"
                      onClick={() => startEditing(item)}
                    >
                      {item.text}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    {item.due_date && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(item.due_date), "MMM d")}
                      </Badge>
                    )}
                    {item.assigned_to && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <User className="h-3 w-3" />
                        {getChildName(item.assigned_to)}
                      </Badge>
                    )}
                    {item.category && (
                      <Badge variant="secondary" className="text-xs">
                        {item.category}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => startEditing(item)}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-red-500"
                    onClick={() => onDeleteItem(item.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Completed items */}
          {showCompleted && completedItems.length > 0 && (
            <div className="mt-4 pt-4 border-t border-silver-light">
              <div className="text-xs text-text-medium mb-2 font-medium">
                Completed ({completedItems.length})
              </div>
              <div className="space-y-1">
                {completedItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-2 rounded-lg opacity-50"
                  >
                    <Checkbox
                      checked={item.completed}
                      onCheckedChange={(checked) =>
                        onToggleItem(item.id, checked as boolean)
                      }
                    />
                    <span className="text-sm line-through flex-1">
                      {item.text}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-red-500"
                      onClick={() => onDeleteItem(item.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pendingItems.length === 0 && !showCompleted && (
            <div className="text-center py-6 text-text-medium">
              <span className="text-3xl mb-2 block">✨</span>
              All done!
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
