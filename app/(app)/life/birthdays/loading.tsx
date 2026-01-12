export default function BirthdaysLoading() {
  return (
    <div className="w-full flex flex-col gap-6 px-6 lg:px-8 py-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-36 bg-gray-200 rounded" />
          <div className="h-4 w-64 bg-gray-100 rounded" />
        </div>
        <div className="h-10 w-32 bg-sage/30 rounded-lg" />
      </div>

      {/* Upcoming section */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-6">
        <div className="h-6 w-40 bg-gray-200 rounded mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-4 rounded-lg bg-[#F9FAFB]"
            >
              <div className="h-12 w-12 bg-sage/20 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-32 bg-gray-200 rounded" />
                <div className="h-4 w-24 bg-gray-100 rounded" />
              </div>
              <div className="h-8 w-16 bg-gold/20 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Month view */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-6">
        <div className="h-6 w-32 bg-gray-200 rounded mb-4" />
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <div
              key={i}
              className="h-12 bg-gray-50 rounded-lg flex items-center justify-center"
            >
              <div className="h-6 w-6 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
