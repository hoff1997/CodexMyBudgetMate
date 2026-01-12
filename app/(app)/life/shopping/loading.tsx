export default function ShoppingLoading() {
  return (
    <div className="w-full flex flex-col gap-6 px-6 lg:px-8 py-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-44 bg-gray-200 rounded" />
          <div className="h-4 w-64 bg-gray-100 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-32 bg-sage/30 rounded-lg" />
          <div className="h-10 w-10 bg-gray-100 rounded-lg" />
        </div>
      </div>

      {/* Shopping lists grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-[#E5E7EB] bg-white p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-sage/20 rounded-lg" />
                <div className="h-6 w-32 bg-gray-200 rounded" />
              </div>
              <div className="h-8 w-8 bg-gray-100 rounded" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full bg-gray-100 rounded" />
              <div className="h-4 w-3/4 bg-gray-100 rounded" />
              <div className="h-4 w-1/2 bg-gray-100 rounded" />
            </div>
            <div className="mt-4 pt-4 border-t border-[#E5E7EB] flex items-center justify-between">
              <div className="h-4 w-20 bg-gray-100 rounded" />
              <div className="h-8 w-24 bg-sage/20 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
