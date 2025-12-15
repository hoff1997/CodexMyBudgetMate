export default function SettingsLoading() {
  return (
    <div className="w-full flex flex-col gap-6 px-6 lg:px-8 py-6 animate-pulse">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 w-28 bg-gray-200 rounded" />
        <div className="h-4 w-56 bg-gray-100 rounded" />
      </div>

      {/* Profile section */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
        <div className="h-5 w-24 bg-gray-200 rounded" />
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 bg-gray-200 rounded-full" />
          <div className="space-y-2">
            <div className="h-5 w-40 bg-gray-200 rounded" />
            <div className="h-4 w-48 bg-gray-100 rounded" />
          </div>
        </div>
      </div>

      {/* Settings sections */}
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="h-5 w-32 bg-gray-200 rounded" />
          <div className="space-y-2">
            <div className="h-10 bg-gray-50 rounded" />
            <div className="h-10 bg-gray-50 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
