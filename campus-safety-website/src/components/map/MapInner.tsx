"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { mockReports } from "@/lib/mock-data";
import { categoryLabels, categoryColors, type HazardCategory } from "@/types";
import StatusBadge from "@/components/shared/StatusBadge";
import SeverityBadge from "@/components/shared/SeverityBadge";

function createIcon(color: string) {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="background:${color};width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

export default function MapInner({
  filterCategories,
}: {
  filterCategories?: string[];
}) {
  const filtered = filterCategories?.length
    ? mockReports.filter((r) => filterCategories.includes(r.category))
    : mockReports;

  return (
    <MapContainer
      center={[31.7754, 76.9861]}
      zoom={16}
      style={{ width: "100%", height: "100%" }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {filtered.map((report) => (
        <Marker
          key={report.id}
          position={[report.location.lat, report.location.lng]}
          icon={createIcon(categoryColors[report.category as HazardCategory])}
        >
          <Popup>
            <div className="min-w-[200px]">
              <h3 className="font-semibold text-sm mb-1">{report.title}</h3>
              <p className="text-xs text-gray-500 mb-2">{report.location.address}</p>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium text-white"
                  style={{ backgroundColor: categoryColors[report.category as HazardCategory] }}
                >
                  {categoryLabels[report.category as HazardCategory]}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <SeverityBadge severity={report.severity} />
                <StatusBadge status={report.status} />
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {new Date(report.reportedAt).toLocaleDateString()}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
