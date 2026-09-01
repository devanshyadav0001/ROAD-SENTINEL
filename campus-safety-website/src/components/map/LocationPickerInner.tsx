"use client";

import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { MapPin, LocateFixed } from "lucide-react";

const pinIcon = L.divIcon({
  className: "custom-marker",
  html: `<div style="background:#059669;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function ClickHandler({
  onChange,
}: {
  onChange: (val: { lat: number; lng: number }) => void;
}) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function LocationPickerInner({
  value,
  onChange,
}: {
  value: { lat: number; lng: number } | null;
  onChange: (val: { lat: number; lng: number }) => void;
}) {
  const handleLocate = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => alert("Unable to get your location")
      );
    }
  };

  return (
    <div>
      <div className="relative w-full h-[300px] rounded-xl overflow-hidden">
        <MapContainer
          center={value ? [value.lat, value.lng] : [31.7754, 76.9861]}
          zoom={16}
          style={{ width: "100%", height: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onChange={onChange} />
          {value && <Marker position={[value.lat, value.lng]} icon={pinIcon} />}
        </MapContainer>
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2 text-sm text-muted">
          <MapPin className="w-4 h-4" />
          {value ? (
            <span>
              {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
            </span>
          ) : (
            <span>Click on the map to set location</span>
          )}
        </div>
        <button
          type="button"
          onClick={handleLocate}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          <LocateFixed className="w-4 h-4" />
          Use My Location
        </button>
      </div>
    </div>
  );
}
