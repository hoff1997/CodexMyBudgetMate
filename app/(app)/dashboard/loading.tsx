export default function DashboardLoading() {
  return (
    <div className="w-full flex flex-col gap-6 px-6 lg:px-8 py-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-56 bg-gray-200 rounded" />
          <div className="h-4 w-80 bg-gray-100 rounded" />
        </div>
        <div className="h-10 w-24 bg-gray-100 rounded-lg" />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-28 bg-[#E2EEEC] rounded-xl" />
        <div className="h-28 bg-[#DDEAF5] rounded-xl" />
        <div className="h-28 bg-[#F3F4F6] rounded-xl" />
      </div>

      {/* Main content area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="h-6 w-40 bg-gray-200 rounded" />
          <div className="h-48 bg-gray-50 rounded-xl border border-gray-100" />
        </div>
        <div className="space-y-4">
          <div className="h-6 w-40 bg-gray-200 rounded" />
          <div className="h-48 bg-gray-50 rounded-xl border border-gray-100" />
        </div>
      </div>
    </div>
  );
}
