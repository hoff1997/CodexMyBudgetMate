export default function NetWorthLoading() {
  return (
    <div className="w-full flex flex-col gap-6 px-6 lg:px-8 py-6 animate-pulse">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 w-36 bg-gray-200 rounded" />
        <div className="h-4 w-64 bg-gray-100 rounded" />
      </div>

      {/* Net worth summary */}
      <div className="h-32 bg-gradient-to-r from-[#E2EEEC] to-[#DDEAF5] rounded-xl" />

      {/* Assets and Liabilities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assets */}
        <div className="space-y-3">
          <div className="h-6 w-20 bg-gray-200 rounded" />
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-white rounded-xl border border-gray-100" />
            ))}
          </div>
        </div>

        {/* Liabilities */}
        <div className="space-y-3">
          <div className="h-6 w-24 bg-gray-200 rounded" />
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-white rounded-xl border border-gray-100" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
