export default function RecipesLoading() {
  return (
    <div className="w-full flex flex-col gap-6 px-6 lg:px-8 py-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-40 bg-gray-200 rounded" />
          <div className="h-4 w-56 bg-gray-100 rounded" />
        </div>
        <div className="h-10 w-28 bg-sage/30 rounded-lg" />
      </div>

      {/* Search and filters */}
      <div className="flex flex-wrap gap-3">
        <div className="h-10 w-64 bg-gray-100 rounded-lg" />
        <div className="h-10 w-32 bg-gray-100 rounded-lg" />
        <div className="h-10 w-32 bg-gray-100 rounded-lg" />
      </div>

      {/* Recipe grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-[#E5E7EB] bg-white overflow-hidden"
          >
            <div className="h-40 bg-gray-200" />
            <div className="p-4 space-y-2">
              <div className="h-5 w-3/4 bg-gray-200 rounded" />
              <div className="h-4 w-1/2 bg-gray-100 rounded" />
              <div className="flex gap-2 pt-2">
                <div className="h-6 w-16 bg-sage/20 rounded-full" />
                <div className="h-6 w-20 bg-sage/20 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
