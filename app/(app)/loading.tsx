export default function AppLoading() {
  return (
    <div className="w-full flex flex-col gap-6 px-6 lg:px-8 py-6 animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-48 bg-gray-200 rounded" />
        <div className="h-4 w-96 bg-gray-100 rounded" />
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="h-32 bg-gray-100 rounded-xl" />
        <div className="h-32 bg-gray-100 rounded-xl" />
        <div className="h-32 bg-gray-100 rounded-xl" />
      </div>

      {/* Table skeleton */}
      <div className="space-y-2">
        <div className="h-12 bg-gray-100 rounded-lg" />
        <div className="h-10 bg-gray-50 rounded" />
        <div className="h-10 bg-gray-50 rounded" />
        <div className="h-10 bg-gray-50 rounded" />
        <div className="h-10 bg-gray-50 rounded" />
        <div className="h-10 bg-gray-50 rounded" />
      </div>
    </div>
  );
}
