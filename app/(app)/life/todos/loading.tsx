export default function TodosLoading() {
  return (
    <div className="w-full flex flex-col gap-6 px-6 lg:px-8 py-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-32 bg-gray-200 rounded" />
          <div className="h-4 w-56 bg-gray-100 rounded" />
        </div>
        <div className="h-10 w-28 bg-sage/30 rounded-lg" />
      </div>

      {/* Todo lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-[#E5E7EB] bg-white p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-sage/20 rounded" />
                <div className="h-6 w-40 bg-gray-200 rounded" />
              </div>
              <div className="h-6 w-6 bg-gray-100 rounded" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="flex items-center gap-3 py-2">
                  <div className="h-5 w-5 bg-gray-200 rounded" />
                  <div className="h-4 flex-1 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
              <div className="h-4 w-28 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
