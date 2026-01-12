export default function TransferRequestsLoading() {
  return (
    <div className="w-full flex flex-col gap-6 px-6 lg:px-8 py-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 bg-gray-200 rounded-lg" />
        <div className="space-y-2">
          <div className="h-7 w-48 bg-gray-200 rounded" />
          <div className="h-4 w-64 bg-gray-100 rounded" />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-gray-200 rounded-lg" />
              <div className="space-y-2">
                <div className="h-6 w-12 bg-gray-200 rounded" />
                <div className="h-4 w-24 bg-gray-100 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pending Section */}
      <div className="space-y-4">
        <div className="h-6 w-36 bg-gray-200 rounded" />
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 space-y-4">
          {/* Child Header */}
          <div className="flex items-center gap-3 pb-3 border-b">
            <div className="h-10 w-10 bg-gray-200 rounded-full" />
            <div className="space-y-2">
              <div className="h-5 w-24 bg-gray-200 rounded" />
              <div className="h-3 w-32 bg-gray-100 rounded" />
            </div>
          </div>

          {/* Requests */}
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-gray-200 rounded-lg" />
                <div className="h-3 w-3 bg-gray-100 rounded" />
                <div className="h-8 w-8 bg-gray-200 rounded-lg" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="h-5 w-16 bg-gray-200 rounded" />
                <div className="h-3 w-32 bg-gray-100 rounded" />
              </div>
              <div className="space-y-2 text-right">
                <div className="h-3 w-16 bg-gray-100 rounded ml-auto" />
                <div className="h-8 w-16 bg-gray-200 rounded ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Resolved Section */}
      <div className="space-y-4">
        <div className="h-6 w-40 bg-gray-200 rounded" />
        <div className="rounded-xl border border-[#E5E7EB] bg-white divide-y">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <div className="h-8 w-8 bg-gray-200 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-32 bg-gray-200 rounded" />
                <div className="h-4 w-24 bg-gray-100 rounded" />
              </div>
              <div className="h-4 w-12 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
