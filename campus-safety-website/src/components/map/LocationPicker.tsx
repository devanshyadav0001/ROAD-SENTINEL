"use client";

import dynamic from "next/dynamic";

const LocationPickerInner = dynamic(() => import("./LocationPickerInner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[300px] bg-gray-100 animate-pulse rounded-xl flex items-center justify-center">
      <p className="text-muted text-sm">Loading map…</p>
    </div>
  ),
});

export default function LocationPicker({
  value,
  onChange,
}: {
  value: { lat: number; lng: number } | null;
  onChange: (val: { lat: number; lng: number }) => void;
}) {
  return <LocationPickerInner value={value} onChange={onChange} />;
}
