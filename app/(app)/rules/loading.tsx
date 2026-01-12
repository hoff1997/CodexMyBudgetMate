export default function RulesLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 pb-24 pt-12 md:px-10 md:pb-12 animate-pulse">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 bg-sage/30 rounded" />
          <div className="h-8 w-48 bg-gray-200 rounded" />
        </div>
        <div className="h-4 w-96 bg-gray-100 rounded" />
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6">
          <div className="h-6 w-36 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-48 bg-gray-100 rounded mb-4" />
          <div className="space-y-3">
            <div className="flex justify-between">
              <div className="h-4 w-24 bg-gray-100 rounded" />
              <div className="h-4 w-8 bg-gray-200 rounded" />
            </div>
            <div className="flex justify-between">
              <div className="h-4 w-28 bg-gray-100 rounded" />
              <div className="h-4 w-8 bg-gray-200 rounded" />
            </div>
            <div className="flex justify-between">
              <div className="h-4 w-32 bg-gray-100 rounded" />
              <div className="h-4 w-12 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6">
          <div className="h-6 w-32 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-64 bg-gray-100 rounded mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-gray-50">
                <div className="space-y-1">
                  <div className="h-4 w-24 bg-gray-200 rounded" />
                  <div className="h-3 w-20 bg-gray-100 rounded" />
                </div>
                <div className="h-6 w-16 bg-sage/20 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create rule card */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-6">
        <div className="h-6 w-28 bg-gray-200 rounded mb-2" />
        <div className="h-4 w-72 bg-gray-100 rounded mb-6" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="h-10 bg-gray-100 rounded" />
          <div className="h-10 bg-gray-100 rounded" />
          <div className="h-10 bg-gray-100 rounded" />
        </div>
      </div>

      {/* Rules list card */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-6">
        <div className="h-6 w-32 bg-gray-200 rounded mb-2" />
        <div className="h-4 w-56 bg-gray-100 rounded mb-6" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 rounded-lg border bg-gray-50">
              <div className="flex gap-2 mb-2">
                <div className="h-5 w-16 bg-sage/20 rounded-full" />
                <div className="h-5 w-20 bg-gray-200 rounded-full" />
              </div>
              <div className="h-4 w-48 bg-gray-200 rounded mb-1" />
              <div className="h-3 w-32 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
