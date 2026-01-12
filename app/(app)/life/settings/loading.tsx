export default function LifeSettingsLoading() {
  return (
    <div className="w-full flex flex-col gap-6 px-6 lg:px-8 py-6 animate-pulse">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 w-32 bg-gray-200 rounded" />
        <div className="h-4 w-56 bg-gray-100 rounded" />
      </div>

      {/* Settings sections */}
      <div className="space-y-6">
        {/* Calendar settings */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6">
          <div className="h-6 w-48 bg-gray-200 rounded mb-4" />
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3">
              <div className="h-5 w-40 bg-gray-100 rounded" />
              <div className="h-8 w-14 bg-gray-200 rounded-full" />
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="h-5 w-36 bg-gray-100 rounded" />
              <div className="h-8 w-14 bg-gray-200 rounded-full" />
            </div>
          </div>
        </div>

        {/* Notification settings */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6">
          <div className="h-6 w-40 bg-gray-200 rounded mb-4" />
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3">
              <div className="h-5 w-44 bg-gray-100 rounded" />
              <div className="h-8 w-14 bg-gray-200 rounded-full" />
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="h-5 w-32 bg-gray-100 rounded" />
              <div className="h-8 w-14 bg-gray-200 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
