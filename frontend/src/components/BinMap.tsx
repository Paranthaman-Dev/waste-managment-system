import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { PublicBin } from '../types/api';

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function MapClick({ onPick }: { onPick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(event) {
      onPick?.(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

export function BinMap({
  bins,
  editable = false,
  onPick,
  onDrag,
}: {
  bins: PublicBin[];
  editable?: boolean;
  onPick?: (lat: number, lng: number) => void;
  onDrag?: (bin: PublicBin, lat: number, lng: number) => void;
}) {
  const center: [number, number] = bins.length ? [bins[0].latitude, bins[0].longitude] : [13.0827, 80.2707];

  return (
    <MapContainer center={center} zoom={12} scrollWheelZoom className="w-full shadow-lg">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapClick onPick={onPick} />
      {bins.map((bin) => (
        <Marker
          key={bin.id}
          position={[bin.latitude, bin.longitude]}
          icon={markerIcon}
          draggable={editable}
          eventHandlers={
            editable
              ? {
                  dragend: (event) => {
                    const marker = event.target as L.Marker;
                    const position = marker.getLatLng();
                    onDrag?.(bin, position.lat, position.lng);
                  },
                }
              : undefined
          }
        >
          <Popup>
            <strong>{bin.name}</strong>
            <br />
            Waste: {bin.accepted_waste_types.join(', ') || 'Any'}
            <br />
            Capacity: {bin.capacity_kg} kg
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
