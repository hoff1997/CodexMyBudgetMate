export default function EnvelopeSummaryLoading() {
  return (
    <div className="w-full flex flex-col gap-4 px-4 sm:px-6 lg:px-8 py-4 animate-pulse">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 w-48 bg-gray-200 rounded" />
        <div className="h-4 w-80 bg-gray-100 rounded" />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="h-24 bg-[#E2EEEC] rounded-xl" />
        <div className="h-24 bg-[#F3F4F6] rounded-xl" />
        <div className="h-24 bg-[#DDEAF5] rounded-xl" />
      </div>

      {/* Category groups */}
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-6 w-32 bg-gray-200 rounded" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="h-20 bg-white rounded-xl border border-gray-100" />
              <div className="h-20 bg-white rounded-xl border border-gray-100" />
              <div className="h-20 bg-white rounded-xl border border-gray-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
