"use client";

import dynamic from "next/dynamic";

const MapInner = dynamic(() => import("./MapInner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 animate-pulse rounded-xl flex items-center justify-center">
      <p className="text-muted text-sm">Loading map…</p>
    </div>
  ),
});

export default function CampusMap({
  filterCategories,
  className,
}: {
  filterCategories?: string[];
  className?: string;
}) {
  return (
    <div className={className ?? "w-full h-[500px] rounded-xl overflow-hidden"}>
      <MapInner filterCategories={filterCategories} />
    </div>
  );
}
