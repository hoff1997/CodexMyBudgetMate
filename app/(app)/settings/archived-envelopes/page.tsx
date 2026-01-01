import { ArchivedEnvelopesClient } from "./archived-envelopes-client";

export const metadata = {
  title: "Archived Envelopes - Settings",
};

export default function ArchivedEnvelopesPage() {
  return (
    <div className="w-full max-w-6xl mx-auto px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text-dark">
          Archived Envelopes
        </h1>
        <p className="text-sm text-text-medium mt-1">
          View and restore envelopes you've archived
        </p>
      </div>

      <ArchivedEnvelopesClient />
    </div>
  );
}
