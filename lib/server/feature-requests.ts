import { z } from "zod";
import {
  FEATURE_REQUEST_STATUSES,
  type FeatureRequest,
  type FeatureRequestStatus,
} from "@/lib/types/feature-request";

export const FEATURE_REQUEST_SELECT_COLUMNS = [
  "id",
  "title",
  "description",
  "status",
  "created_at",
  "updated_at",
] as const;

export type DbFeatureRequest = {
  id: string;
  title: string;
  description: string | null;
  status: FeatureRequestStatus;
  created_at: string;
  updated_at: string;
};

export const featureRequestCreateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z
    .string()
    .max(4000)
    .transform((value) => value.trim())
    .optional()
    .default(""),
  status: z.enum(FEATURE_REQUEST_STATUSES).optional().default("new"),
});

export const featureRequestUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z
      .string()
      .max(4000)
      .transform((value) => value.trim())
      .optional(),
    status: z.enum(FEATURE_REQUEST_STATUSES).optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "No updates provided",
  });

export function mapFeatureRequestRow(row: DbFeatureRequest): FeatureRequest {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function normaliseStatus(input: unknown): FeatureRequestStatus | undefined {
  if (typeof input !== "string") return undefined;
  const candidate = input.trim().toLowerCase();
  return isFeatureRequestStatus(candidate) ? candidate : undefined;
}

export function isFeatureRequestStatus(value: string): value is FeatureRequestStatus {
  return (FEATURE_REQUEST_STATUSES as readonly string[]).includes(
    value as FeatureRequestStatus,
  );
}
