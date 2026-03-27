export default function SchoolLoading() {
  return (
    <div className="min-h-screen bg-slate-100 p-4 lg:p-6">
      <div className="space-y-5">
        <div className="skeleton-shimmer h-10 w-64 rounded-lg" />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="skeleton-shimmer h-24 rounded-xl" />
          <div className="skeleton-shimmer h-24 rounded-xl" />
          <div className="skeleton-shimmer h-24 rounded-xl" />
          <div className="skeleton-shimmer h-24 rounded-xl" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="skeleton-shimmer h-28 rounded-xl" />
          <div className="skeleton-shimmer h-28 rounded-xl" />
          <div className="skeleton-shimmer h-28 rounded-xl" />
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div className="skeleton-shimmer h-6 w-52 rounded-md" />
            <div className="skeleton-shimmer h-5 w-32 rounded-md" />
          </div>
          <div className="space-y-3 p-6">
            <div className="skeleton-shimmer h-10 w-full rounded-lg" />
            <div className="skeleton-shimmer h-10 w-full rounded-lg" />
            <div className="skeleton-shimmer h-10 w-full rounded-lg" />
            <div className="skeleton-shimmer h-10 w-full rounded-lg" />
            <div className="skeleton-shimmer h-10 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
