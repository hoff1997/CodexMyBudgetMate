"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { WishlistCard } from "./wishlist-card";
import type { WishlistItemWithEnvelope } from "@/lib/types/wishlist";

interface WishlistListProps {
  items: WishlistItemWithEnvelope[];
  onReorder: (items: WishlistItemWithEnvelope[]) => void;
  onEdit: (item: WishlistItemWithEnvelope) => void;
  onDelete: (id: string) => void;
  onConvert: (id: string) => void;
  convertingId?: string | null;
  deletingId?: string | null;
  disabled?: boolean;
  convertButtonLabel?: string;
  isKidsMode?: boolean;
}

export function WishlistList({
  items,
  onReorder,
  onEdit,
  onDelete,
  onConvert,
  convertingId,
  deletingId,
  disabled,
  convertButtonLabel,
  isKidsMode,
}: WishlistListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      const reordered = arrayMove(items, oldIndex, newIndex);
      onReorder(reordered);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((item) => item.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {items.map((item) => (
            <WishlistCard
              key={item.id}
              item={item}
              onEdit={onEdit}
              onDelete={onDelete}
              onConvert={onConvert}
              isConverting={convertingId === item.id}
              isDeleting={deletingId === item.id}
              disabled={disabled}
              convertButtonLabel={convertButtonLabel}
              isKidsMode={isKidsMode}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
