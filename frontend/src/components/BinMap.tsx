import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { PublicBin } from '../types/api';

// Elegant SaaS – soft dot, not neon chrome
const elegantIcon = new L.DivIcon({
  html: `<div style="
    width:16px;height:16px;
    background: #2563EB;
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 1px 2px rgba(15,23,42,0.12), 0 4px 12px rgba(37,99,235,0.25), 0 0 0 6px rgba(37,99,235,0.08);
    "></div>`,
  className: 'elegant-marker',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -12],
});

function MapClick({ onPick }: { onPick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick?.(e.latlng.lat, e.latlng.lng);
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
    <div className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-soft">
      {/* Header – elegant SaaS */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-slate-200 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-primary" />
          </span>
          <div>
            <p className="text-xs font-semibold tracking-tight text-slate-900">{bins.length} bins on map</p>
            <p className="text-[11px] font-medium text-slate-500">Chennai • OpenStreetMap</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide ${editable ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-600'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${editable ? 'bg-amber-500' : 'bg-slate-400'}`} />
          {editable ? 'Draggable • Click to set' : 'View only'}
        </span>
      </div>

      <MapContainer center={center} zoom={12} scrollWheelZoom className="h-[420px] w-full">
        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapClick onPick={onPick} />
        {bins.map((bin) => (
          <Marker
            key={bin.id}
            position={[bin.latitude, bin.longitude]}
            icon={elegantIcon}
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
              <div className="min-w-[200px] p-0.5">
                <p className="font-sans text-sm font-bold tracking-tight text-slate-900">{bin.name}</p>
                <p className="mt-0.5 text-xs font-medium text-slate-500">Accepts: {bin.accepted_waste_types.join(', ') || 'Any waste'}</p>
                <p className="text-xs text-slate-500">Capacity: <span className="font-semibold text-slate-900">{bin.capacity_kg} kg</span></p>
                <p className="mt-2 inline-flex rounded-full bg-slate-900 px-2 py-1 text-[11px] font-semibold tracking-wide text-white">
                  {bin.latitude.toFixed(4)}, {bin.longitude.toFixed(4)}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/40 px-4 py-2.5 text-[11px]">
        <span className="font-medium tracking-wide text-slate-500">Pin a location or drag markers to update</span>
        <span className="hidden sm:inline-flex items-center gap-1.5 font-medium text-slate-400">
          <span className="h-1 w-6 rounded-full bg-primary/20" />
          <span className="h-1 w-6 rounded-full bg-emerald-200" />
          <span className="h-1 w-6 rounded-full bg-slate-200" />
        </span>
      </div>
    </div>
  );
}
