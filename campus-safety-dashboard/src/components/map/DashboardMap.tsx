"use client";

import dynamic from "next/dynamic";

const DashboardMapInner = dynamic(() => import("./DashboardMapInner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-card animate-pulse rounded-xl flex items-center justify-center">
      <p className="text-muted text-sm">Loading map…</p>
    </div>
  ),
});

export default function DashboardMap({
  filterCategories,
  filterSeverities,
  className,
}: {
  filterCategories?: string[];
  filterSeverities?: string[];
  className?: string;
}) {
  return (
    <div className={className ?? "w-full h-[500px] rounded-xl overflow-hidden"}>
      <DashboardMapInner filterCategories={filterCategories} filterSeverities={filterSeverities} />
    </div>
  );
}
