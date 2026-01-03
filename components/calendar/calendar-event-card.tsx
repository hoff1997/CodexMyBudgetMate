"use client";

import { Card } from "@/components/ui/card";
import { Clock, MapPin } from "lucide-react";

interface CalendarEventCardProps {
  event: {
    title: string;
    description?: string;
    location?: string;
    start_time: string;
    end_time: string;
    is_all_day: boolean;
    connection: {
      color_hex: string;
      owner_name: string;
    } | null;
  };
  compact?: boolean;
}

export function CalendarEventCard({
  event,
  compact = false,
}: CalendarEventCardProps) {
  const startTime = new Date(event.start_time);
  const endTime = new Date(event.end_time);

  const timeDisplay = event.is_all_day
    ? "All day"
    : `${startTime.toLocaleTimeString("en-NZ", {
        hour: "numeric",
        minute: "2-digit",
      })} - ${endTime.toLocaleTimeString("en-NZ", {
        hour: "numeric",
        minute: "2-digit",
      })}`;

  const borderColor = event.connection?.color_hex || "#7A9E9A";

  if (compact) {
    return (
      <div
        className="p-2 rounded-md border-l-4 bg-white"
        style={{ borderLeftColor: borderColor }}
      >
        <div className="font-medium text-sm text-text-dark truncate">
          {event.title}
        </div>
        <div className="text-xs text-text-medium">{timeDisplay}</div>
      </div>
    );
  }

  return (
    <Card
      className="p-3 border-l-4"
      style={{ borderLeftColor: borderColor }}
    >
      <h3 className="font-semibold text-text-dark mb-1">{event.title}</h3>
      <div className="flex items-center gap-2 text-sm text-text-medium mb-1">
        <Clock className="h-3 w-3" />
        {timeDisplay}
      </div>
      {event.location && (
        <div className="flex items-center gap-2 text-sm text-text-medium mb-1">
          <MapPin className="h-3 w-3" />
          <span className="truncate">{event.location}</span>
        </div>
      )}
      {event.description && (
        <p className="text-sm text-text-medium mt-2 line-clamp-2">
          {event.description}
        </p>
      )}
      {event.connection && (
        <div className="text-xs text-text-light mt-2">
          {event.connection.owner_name}
        </div>
      )}
    </Card>
  );
}
