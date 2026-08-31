import 'leaflet/dist/leaflet.css';
import React, { useEffect, useState } from 'react';

import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { PublicBin } from '../../types/api';
import { MapPin, Navigation, Maximize2, Minimize2 } from 'lucide-react';
import { Button, Badge } from '../ui/primitives';

function createCustomPin(color = '#10B981', isDraggable = false) {
  return new L.DivIcon({
    html: `
      <div style="position:relative;width:28px;height:28px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;width:26px;height:26px;border-radius:50%;background:${color};opacity:0.2;animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
        <div style="position:relative;width:18px;height:18px;background:${color};border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
          <div style="width:5px;height:5px;background:white;border-radius:50%;"></div>
        </div>
        ${isDraggable ? `<div style="position:absolute;top:-2px;right:-2px;background:#F59E0B;width:8px;height:8px;border-radius:50%;border:1.5px solid white;"></div>` : ''}
      </div>
    `,
    className: 'custom-bin-marker',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

const userLocationPin = new L.DivIcon({
  html: `
    <div style="position:relative;width:22px;height:22px;display:flex;align-items:center;justify-content:center;">
      <div style="position:absolute;width:22px;height:22px;border-radius:50%;background:#3B82F6;opacity:0.3;animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
      <div style="position:relative;width:12px;height:12px;background:#2563EB;border:2px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>
    </div>
  `,
  className: 'user-marker',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, map.getZoom());
  }, [center, map]);
  return null;
}

function ClickHandler({ onPick }: { onPick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick?.(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)));
    },
  });
  return null;
}

export function BinMap({
  bins,
  editable = false,
  onPick,
  onDrag,
  height = 460,
  selectedBinId,
  onSelectBin,
}: {
  bins: PublicBin[];
  editable?: boolean;
  onPick?: (lat: number, lng: number) => void;
  onDrag?: (bin: PublicBin, lat: number, lng: number) => void;
  height?: number | string;
  selectedBinId?: number | null;
  onSelectBin?: (bin: PublicBin) => void;
}) {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>(() => {
    if (bins.length > 0) return [bins[0].latitude, bins[0].longitude];
    return [13.0827, 80.2707];
  });
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (selectedBinId) {
      const b = bins.find((item) => item.id === selectedBinId);
      if (b) setMapCenter([b.latitude, b.longitude]);
    }
  }, [selectedBinId, bins]);

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(coords);
        setMapCenter(coords);
        setLocating(false);
        if (onPick) onPick(Number(pos.coords.latitude.toFixed(6)), Number(pos.coords.longitude.toFixed(6)));
      },
      () => {
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const getWasteTypeColor = (types: string[]) => {
    if (types.includes('organic')) return '#10B981';
    if (types.includes('plastic')) return '#3B82F6';
    if (types.includes('e-waste')) return '#8B5CF6';
    if (types.includes('metal')) return '#F97316';
    return '#10B981';
  };

  return (
    <div
      className={`relative overflow-hidden rounded-[12px] border border-border bg-surface shadow-soft transition-all ${
        isFullscreen ? 'fixed inset-4 z-50 rounded-[16px] shadow-2xl' : ''
      }`}
    >
      <div className="flex flex-wrap items-center justify-between border-b border-border bg-surface px-3.5 py-2 gap-2">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="text-[13px] font-semibold text-foreground">{bins.length} Disposal sites</span>
          <Badge tone={editable ? 'amber' : 'neutral'} dot={editable}>
            {editable ? 'Editable' : 'Live'}
          </Badge>
        </div>

        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={handleLocateMe} loading={locating} className="text-[13px] h-9 px-3" title="Use your current location">
            <Navigation className="h-4 w-4 mr-1 text-blue-500" />
            <span>Locate me</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
            aria-label={isFullscreen ? 'Exit full screen' : 'Full screen'}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <MapContainer
        center={mapCenter}
        zoom={13}
        scrollWheelZoom
        style={{ height: isFullscreen ? 'calc(100% - 44px)' : height, width: '100%' }}
      >
        <MapRecenter center={mapCenter} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <ClickHandler onPick={onPick} />

        {userLocation && (
          <>
            <Marker position={userLocation} icon={userLocationPin}>
              <Popup>
                <div className="p-1 text-[13px]">
                  <p className="font-bold text-foreground">Your location</p>
                  <p className="text-muted-foreground">{userLocation[0].toFixed(4)}, {userLocation[1].toFixed(4)}</p>
                </div>
              </Popup>
            </Marker>
            <Circle
              center={userLocation}
              radius={800}
              pathOptions={{ color: '#3B82F6', fillColor: '#3B82F6', fillOpacity: 0.08, weight: 1.5 }}
            />
          </>
        )}

        {bins.map((bin) => {
          const pinColor = getWasteTypeColor(bin.accepted_waste_types || []);
          return (
            <Marker
              key={bin.id}
              position={[bin.latitude, bin.longitude]}
              icon={createCustomPin(pinColor, editable)}
              draggable={editable}
              eventHandlers={{
                click: () => onSelectBin?.(bin),
                dragend: (e) => {
                  if (editable) {
                    const m = e.target as L.Marker;
                    const pos = m.getLatLng();
                    onDrag?.(bin, Number(pos.lat.toFixed(6)), Number(pos.lng.toFixed(6)));
                  }
                },
              }}
            >
              <Popup>
                <div className="min-w-[200px] p-2 space-y-1.5">
                  <div className="flex items-start justify-between gap-1">
                    <p className="text-[13px] font-bold text-foreground">{bin.name}</p>
                    <span className="rounded bg-emerald-50 text-emerald-700 px-1 py-0.5 text-[10px] font-bold">
                      {bin.capacity_kg} kg
                    </span>
                  </div>

                  <div className="space-y-0.5 text-[13px]">
                    <p className="text-muted-foreground">
                      <span className="font-semibold text-foreground">Accepts:</span>{' '}
                      {bin.accepted_waste_types.join(', ') || 'Any material'}
                    </p>
                    <p className="text-muted-foreground font-mono text-[11px]">
                      {bin.latitude.toFixed(4)}, {bin.longitude.toFixed(4)}
                    </p>
                  </div>

                  {editable ? (
                    <p className="text-[11px] font-semibold text-amber-600">Drag the marker to move it</p>
                  ) : (
                    onSelectBin && (
                      <Button size="sm" variant="subtle" className="w-full h-9 text-[12px] mt-1" onClick={() => onSelectBin(bin)}>
                        Inspect site
                      </Button>
                    )
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
