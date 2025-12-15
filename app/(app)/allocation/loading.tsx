export default function AllocationLoading() {
  return (
    <div className="w-full flex flex-col gap-6 px-6 lg:px-8 py-6 animate-pulse">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 w-36 bg-gray-200 rounded" />
        <div className="h-4 w-72 bg-gray-100 rounded" />
      </div>

      {/* Progress bar */}
      <div className="h-16 bg-[#E2EEEC] rounded-xl" />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <div className="h-9 w-32 bg-gray-200 rounded-lg" />
        <div className="h-9 w-32 bg-gray-100 rounded-lg" />
        <div className="h-9 w-32 bg-gray-100 rounded-lg" />
      </div>

      {/* Table header */}
      <div className="h-12 bg-gray-100 rounded-t-lg" />

      {/* Table rows */}
      <div className="space-y-1">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-14 bg-gray-50 rounded border-b border-gray-100" />
        ))}
      </div>
    </div>
  );
}
