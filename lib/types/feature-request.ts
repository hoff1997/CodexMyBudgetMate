export const FEATURE_REQUEST_STATUSES = ["new", "pending", "approved", "completed"] as const;

export type FeatureRequestStatus = (typeof FEATURE_REQUEST_STATUSES)[number];

export const FEATURE_REQUEST_STATUS_LABELS: Record<FeatureRequestStatus, string> = {
  new: "New",
  pending: "Pending",
  approved: "Approved",
  completed: "Completed",
};

export const FEATURE_REQUEST_STATUS_COLORS: Record<FeatureRequestStatus, string> = {
  new: "bg-blue-100 text-blue-800 border-blue-200",
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
  completed: "bg-purple-100 text-purple-800 border-purple-200",
};

export type FeatureRequest = {
  id: string;
  title: string;
  description: string | null;
  status: FeatureRequestStatus;
  createdAt: string;
  updatedAt: string;
};
