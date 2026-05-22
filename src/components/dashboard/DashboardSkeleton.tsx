const Pulse = ({ className }: { className?: string }) => (
  <div className={`animate-pulse rounded-xl bg-slate-200 ${className ?? ""}`} />
);

export const DashboardSkeleton = () => (
  <div className="space-y-6">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Pulse className="h-7 w-48" />
        <Pulse className="h-4 w-64" />
      </div>
      <Pulse className="h-10 w-72 rounded-lg" />
    </div>

    {/* Filter bar */}
    <Pulse className="h-14 w-full" />

    {/* KPI cards */}
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Pulse className="h-28" />
      <Pulse className="h-28" />
      <Pulse className="h-28" />
      <Pulse className="h-28" />
    </div>

    {/* Compensation */}
    <Pulse className="h-40" />

    {/* Charts row */}
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <Pulse className="h-80 lg:col-span-2" />
      <Pulse className="h-80" />
    </div>

    {/* Summary grid */}
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <Pulse className="h-48" />
      <Pulse className="h-48" />
      <Pulse className="h-48" />
    </div>
  </div>
);
