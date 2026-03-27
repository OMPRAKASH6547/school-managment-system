export default function RootLoading() {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="skeleton-shimmer h-10 w-56 rounded-lg" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="skeleton-shimmer h-28 rounded-xl" />
          <div className="skeleton-shimmer h-28 rounded-xl" />
          <div className="skeleton-shimmer h-28 rounded-xl" />
        </div>
        <div className="skeleton-shimmer h-72 rounded-xl" />
      </div>
    </div>
  );
}
