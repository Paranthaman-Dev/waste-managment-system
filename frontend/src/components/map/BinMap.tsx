import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { PublicBin } from '../../types/api';

const binIcon = new L.DivIcon({
  html: `<div style="width:14px;height:14px;background:#3A5A40;border:2.5px solid white;border-radius:999px;box-shadow:0 1px 4px rgba(26,46,20,0.2),0 0 0 6px rgba(58,90,64,0.12)"></div>`,
  className: 'bin-marker',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  popupAnchor: [0, -10],
});

function ClickHandler({ onPick }: { onPick?: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onPick?.(e.latlng.lat, e.latlng.lng); } });
  return null;
}

export function BinMap({
  bins,
  editable = false,
  onPick,
  onDrag,
  height = 420,
}: {
  bins: PublicBin[];
  editable?: boolean;
  onPick?: (lat: number, lng: number) => void;
  onDrag?: (bin: PublicBin, lat: number, lng: number) => void;
  height?: number;
}) {
  const center: [number, number] = bins.length ? [bins[0].latitude, bins[0].longitude] : [13.0827, 80.2707];
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white">
      <div className="flex items-center justify-between border-b border-border bg-muted/60 px-4 py-2.5">
        <p className="text-xs font-semibold text-foreground">{bins.length} bins • OpenStreetMap</p>
        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${editable ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-border bg-white text-muted-foreground'}`}>{editable ? 'Draggable' : 'View only'}</span>
      </div>
      <MapContainer center={center} zoom={12} scrollWheelZoom style={{ height, width: '100%' }}>
        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ClickHandler onPick={onPick} />
        {bins.map((bin) => (
          <Marker
            key={bin.id}
            position={[bin.latitude, bin.longitude]}
            icon={binIcon}
            draggable={editable}
            eventHandlers={
              editable
                ? {
                    dragend: (e) => {
                      const m = e.target as L.Marker;
                      const pos = m.getLatLng();
                      onDrag?.(bin, pos.lat, pos.lng);
                    },
                  }
                : undefined
            }
          >
            <Popup>
              <div className="min-w-[200px] p-1">
                <p className="text-sm font-bold">{bin.name}</p>
                <p className="text-xs text-muted-foreground">Accepts: {bin.accepted_waste_types.join(', ') || 'Any'}</p>
                <p className="text-xs text-muted-foreground">
                  Capacity: <span className="font-semibold text-foreground">{bin.capacity_kg} kg</span>
                </p>
                <p className="mt-1 inline-flex rounded-full bg-foreground px-2 py-1 text-xs font-semibold text-white">
                  {bin.latitude.toFixed(4)}, {bin.longitude.toFixed(4)}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
