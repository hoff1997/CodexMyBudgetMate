export default function ReconcileLoading() {
  return (
    <div className="w-full flex flex-col gap-6 px-6 lg:px-8 py-6 animate-pulse">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 w-52 bg-gray-200 rounded" />
        <div className="h-4 w-96 bg-gray-100 rounded" />
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <div className="h-9 w-28 bg-[#E2EEEC] rounded-lg" />
          <div className="h-9 w-28 bg-gray-100 rounded-lg" />
        </div>
        <div className="h-9 w-36 bg-gray-100 rounded-lg" />
      </div>

      {/* Transaction cards */}
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="h-5 w-40 bg-gray-200 rounded" />
                <div className="h-4 w-24 bg-gray-100 rounded" />
              </div>
              <div className="h-6 w-20 bg-gray-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
