import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { PublicBin } from '../types/api';

// Y2K Chrome + Cyber HUD – Conceptual Sketch border, neon, efficient
const hudIcon = new L.DivIcon({
  html: `<div style="
    width:14px;height:14px;
    background: linear-gradient(180deg, #FFFFFF 0%, #00FFFF 100%);
    border: 2px solid #0A0E27;
    border-radius: 50%;
    box-shadow: 0 0 0 4px rgba(0,255,255,0.18), 0 0 12px rgba(0,255,255,0.6), 0 2px 8px rgba(0,0,0,0.4);
    "></div>`,
  className: 'hud-marker',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  popupAnchor: [0, -10],
});

const fallbackIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function MapClick({ onPick }: { onPick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) { onPick?.(e.latlng.lat, e.latlng.lng); },
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
    <div className="relative overflow-hidden rounded-[16px] border border-white/10 shadow-hud bg-ink">
      {/* HUD labels */}
      <div className="pointer-events-none absolute left-3 top-3 z-[400] flex items-center gap-2 rounded-full border border-white/10 bg-ink/80 px-3 py-1.5 backdrop-blur">
        <span className="h-2 w-2 rounded-full bg-neon-cyan shadow-neon-cyan animate-pulse" />
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">HUD MAP — {bins.length} BINS</span>
      </div>
      <div className="pointer-events-none absolute bottom-3 right-3 z-[400] rounded-full bg-white px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-ink shadow-chrome">
        {editable ? 'DRAG • CLICK' : 'READ ONLY'}
      </div>
      {/* Scanline overlay */}
      <div className="pointer-events-none absolute inset-0 z-[350] opacity-[0.04] bg-scanline" />

      <MapContainer center={center} zoom={12} scrollWheelZoom className="w-full h-[440px]">
        {/* Midnight – use OSM but darken via CSS filter for OLED */}
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClick onPick={onPick} />
        {bins.map((bin) => (
          <Marker
            key={bin.id}
            position={[bin.latitude, bin.longitude]}
            icon={hudIcon}
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
              <div className="min-w-[180px] p-1">
                <p className="font-display text-sm font-black tracking-tight text-ink">{bin.name}</p>
                <p className="font-mono text-xs text-ink/60">Waste: {bin.accepted_waste_types.join(', ') || 'Any'}</p>
                <p className="font-mono text-xs text-ink/60">Capacity: {bin.capacity_kg} kg</p>
                <p className="font-mono text-[11px] uppercase tracking-widest text-neon-cyan mt-1">{bin.latitude.toFixed(4)}, {bin.longitude.toFixed(4)}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Chrome footer */}
      <div className="flex items-center justify-between border-t border-white/10 bg-white px-3 py-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/40">Conceptual Sketch — Grid 24 — Layer 02</span>
        <span className="h-1 w-16 rounded-full bg-gradient-to-r from-neon-cyan to-neon-pink opacity-60" />
      </div>
    </div>
  );
}
