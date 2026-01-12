export default function MealPlannerLoading() {
  return (
    <div className="w-full flex flex-col gap-6 px-6 lg:px-8 py-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-44 bg-gray-200 rounded" />
          <div className="h-4 w-72 bg-gray-100 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-10 bg-gray-100 rounded" />
          <div className="h-10 w-32 bg-gray-200 rounded" />
          <div className="h-10 w-10 bg-gray-100 rounded" />
        </div>
      </div>

      {/* Week calendar grid */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-[#E5E7EB]">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="p-3 text-center border-r border-[#E5E7EB] last:border-r-0">
              <div className="h-4 w-12 bg-gray-200 rounded mx-auto mb-1" />
              <div className="h-6 w-8 bg-gray-100 rounded mx-auto" />
            </div>
          ))}
        </div>

        {/* Meal rows */}
        {["Breakfast", "Lunch", "Dinner"].map((meal) => (
          <div key={meal} className="grid grid-cols-7 border-b border-[#E5E7EB] last:border-b-0">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="p-3 min-h-[100px] border-r border-[#E5E7EB] last:border-r-0"
              >
                <div className="h-4 w-full bg-gray-100 rounded mb-2" />
                <div className="h-16 bg-gray-50 rounded-lg" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
