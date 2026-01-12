export default function HubLoading() {
  return (
    <div className="w-full flex flex-col gap-6 px-6 lg:px-8 py-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-gray-200 rounded" />
          <div className="h-4 w-64 bg-gray-100 rounded" />
        </div>
        <div className="h-10 w-32 bg-gray-100 rounded-lg" />
      </div>

      {/* Today widget */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-6">
        <div className="h-6 w-40 bg-gray-200 rounded mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-3">
            <div className="h-4 w-24 bg-gray-100 rounded" />
            <div className="h-16 bg-gray-50 rounded-lg" />
            <div className="h-16 bg-gray-50 rounded-lg" />
          </div>
          <div className="space-y-3">
            <div className="h-4 w-24 bg-gray-100 rounded" />
            <div className="h-16 bg-gray-50 rounded-lg" />
          </div>
          <div className="space-y-3">
            <div className="h-4 w-24 bg-gray-100 rounded" />
            <div className="h-16 bg-gray-50 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Lists grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Shopping lists */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6">
          <div className="h-6 w-32 bg-gray-200 rounded mb-4" />
          <div className="space-y-3">
            <div className="h-12 bg-gray-50 rounded-lg" />
            <div className="h-12 bg-gray-50 rounded-lg" />
          </div>
        </div>

        {/* Todo lists */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6">
          <div className="h-6 w-28 bg-gray-200 rounded mb-4" />
          <div className="space-y-3">
            <div className="h-12 bg-gray-50 rounded-lg" />
            <div className="h-12 bg-gray-50 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
