"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { mockReports } from "@/lib/mock-data";
import { categoryLabels, categoryColors, severityLabels, statusLabels, type HazardCategory } from "@/types";

function createIcon(color: string) {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="background:${color};width:14px;height:14px;border-radius:50%;border:2px solid rgba(255,255,255,0.8);box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

export default function DashboardMapInner({
  filterCategories,
  filterSeverities,
}: {
  filterCategories?: string[];
  filterSeverities?: string[];
}) {
  let filtered = mockReports;
  if (filterCategories?.length) {
    filtered = filtered.filter((r) => filterCategories.includes(r.category));
  }
  if (filterSeverities?.length) {
    filtered = filtered.filter((r) => filterSeverities.includes(r.severity));
  }

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
            <div className="min-w-[180px] text-gray-900">
              <h3 className="font-semibold text-sm mb-1">{report.title}</h3>
              <p className="text-xs text-gray-500 mb-1">{report.location.address}</p>
              <p className="text-xs"><strong>Category:</strong> {categoryLabels[report.category as HazardCategory]}</p>
              <p className="text-xs"><strong>Severity:</strong> {severityLabels[report.severity]}</p>
              <p className="text-xs"><strong>Status:</strong> {statusLabels[report.status]}</p>
              <p className="text-xs text-gray-400 mt-1">{new Date(report.reportedAt).toLocaleDateString()}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
