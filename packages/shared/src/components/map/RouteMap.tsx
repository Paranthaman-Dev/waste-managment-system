import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { PublicBin, PickupRequest } from '../../types/api';
import { MapPin, Navigation, Maximize2, Minimize2, Truck, Package } from 'lucide-react';
import { Alert, Button, Badge } from '../ui/primitives';
import { fetchOsrmRoute, fetchOsrmTrip, minDistToRoute, haversine } from '../../utils/osrm';

export function parseLocationToLatLng(location: string): { lat: number; lng: number } | null {
  if (!location || typeof location !== 'string') return null;
  const m = location.match(/^\s*(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)\s*$/);
  if (!m) return null;
  const lat = parseFloat(m[1]);
  const lng = parseFloat(m[3]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

function createBinPin(color = '#10B981') {
  return new L.DivIcon({
    html: `
      <div style="position:relative;width:28px;height:28px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;width:26px;height:26px;border-radius:50%;background:${color};opacity:0.18;animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
        <div style="position:relative;width:18px;height:18px;background:${color};border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
          <div style="width:5px;height:5px;background:white;border-radius:50%;"></div>
        </div>
      </div>
    `,
    className: 'custom-bin-marker',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

function createPickupPin(color = '#ff4d00', label: string | number = '') {
  return new L.DivIcon({
    html: `
      <div style="position:relative;width:30px;height:30px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;width:26px;height:26px;border-radius:50%;background:${color};opacity:0.18;animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
        <div style="position:relative;width:22px;height:22px;background:${color};border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-size:10px;font-weight:800;font-family:JetBrains Mono, monospace;line-height:1;">
          ${label}
        </div>
      </div>
    `,
    className: 'custom-pickup-marker',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });
}

function createTruckPin() {
  return new L.DivIcon({
    html: `
      <div style="position:relative;width:30px;height:30px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;width:28px;height:28px;border-radius:50%;background:#2563EB;opacity:0.18;animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
        <div style="position:relative;width:22px;height:22px;background:#2563EB;border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"></path>
            <path d="M15 18H9"></path>
            <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"></path>
            <circle cx="7" cy="18" r="2"></circle>
            <circle cx="17" cy="18" r="2"></circle>
          </svg>
        </div>
      </div>
    `,
    className: 'custom-truck-marker',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });
}

function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, map.getZoom());
  }, [center, map]);
  return null;
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length >= 2) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [32, 32] });
    }
  }, [points, map]);
  return null;
}

export function RouteMap({
  bins,
  pickups,
  height = 380,
}: {
  bins: PublicBin[];
  pickups: PickupRequest[];
  height?: number | string;
}) {
  const enhancedPickups = useMemo(
    () =>
      pickups.map((p) => {
        if (p.latitude != null && p.longitude != null && Number.isFinite(p.latitude) && Number.isFinite(p.longitude)) return p;
        const parsed = parseLocationToLatLng(p.location);
        if (parsed) return { ...p, latitude: parsed.lat, longitude: parsed.lng };
        return p;
      }),
    [pickups],
  );

  const pickupsWithCoords = useMemo(
    () =>
      enhancedPickups.filter(
        (p) => p.latitude != null && p.longitude != null && Number.isFinite(p.latitude as number) && Number.isFinite(p.longitude as number),
      ),
    [enhancedPickups],
  );

  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [optimizedPickups, setOptimizedPickups] = useState<PickupRequest[]>(pickupsWithCoords);
  const [routeStats, setRouteStats] = useState<{ distanceM: number; durationS: number } | null>(null);
  const [routing, setRouting] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  // keep optimizedPickups in sync when pickupsWithCoords changes and no route yet
  useEffect(() => {
    if (routeCoords.length === 0) {
      setOptimizedPickups(pickupsWithCoords);
    }
  }, [pickupsWithCoords]); // eslint-disable-line react-hooks/exhaustive-deps

  const nearbyBins = useMemo(() => {
    if (routeCoords.length > 0) {
      return bins.filter((b) => minDistToRoute(b.latitude, b.longitude, routeCoords) <= 250);
    }
    if (pickupsWithCoords.length === 0) {
      // No pickup coords — show all bins so map is not empty (bins-only fallback)
      return bins;
    }
    // fallback: bins within 250m of any pickup (works with parsed location fallback)
    return bins.filter((b) => {
      let min = Infinity;
      for (const p of pickupsWithCoords) {
        const d = haversine(b.latitude, b.longitude, p.latitude as number, p.longitude as number);
        if (d < min) min = d;
      }
      return min <= 250;
    });
  }, [bins, routeCoords, pickupsWithCoords]);

  const routeLatLngs = useMemo<[number, number][]>(
    () => pickupsWithCoords.map((p) => [p.latitude as number, p.longitude as number]),
    [pickupsWithCoords],
  );

  // OSRM trip (optimize) → route fallback
  useEffect(() => {
    if (pickupsWithCoords.length < 2) {
      setRouteCoords([]);
      setOptimizedPickups(pickupsWithCoords);
      setRouteStats(null);
      setRouteError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setRouting(true);
      setRouteError(null);
      try {
        const pts = pickupsWithCoords.map((p) => ({ lat: p.latitude as number, lng: p.longitude as number }));
        let order: number[] | null = null;
        let coords: [number, number][] | null = null;
        let dist = 0;
        let dur = 0;
        try {
          const trip = await fetchOsrmTrip(pts, { roundtrip: false, source: 'first', destination: 'last' });
          if (trip && !cancelled) {
            coords = trip.coords;
            order = trip.order;
            dist = trip.distanceM;
            dur = trip.durationS;
            const reordered = order.map((i) => pickupsWithCoords[i]);
            if (!cancelled) setOptimizedPickups(reordered);
          }
        } catch (e) {
          // fallback to route
        }
        if (!coords) {
          const r = await fetchOsrmRoute(pts);
          if (r && !cancelled) {
            coords = r.coords;
            dist = r.distanceM;
            dur = r.durationS;
            setOptimizedPickups(pickupsWithCoords);
          }
        }
        if (coords && !cancelled) {
          setRouteCoords(coords);
          setRouteStats({ distanceM: dist, durationS: dur });
        } else if (!cancelled) {
          setRouteCoords([]);
          setOptimizedPickups(pickupsWithCoords);
          setRouteError('Road route unavailable — showing straight line');
        }
      } catch (e: any) {
        if (!cancelled) {
          setRouteError(e.message || 'Routing failed');
          setRouteCoords([]);
        }
      } finally {
        if (!cancelled) setRouting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pickupsWithCoords]);

  const initialCenter = useMemo<[number, number]>(() => {
    if (optimizedPickups.length > 0) return [optimizedPickups[0].latitude as number, optimizedPickups[0].longitude as number];
    if (routeCoords.length > 0) return routeCoords[0];
    if (pickupsWithCoords.length > 0) return [pickupsWithCoords[0].latitude as number, pickupsWithCoords[0].longitude as number];
    if (bins.length > 0) return [bins[0].latitude, bins[0].longitude];
    return [13.0827, 80.2707];
  }, [optimizedPickups, routeCoords, pickupsWithCoords, bins]);

  const [mapCenter, setMapCenter] = useState<[number, number]>(initialCenter);
  useEffect(() => setMapCenter(initialCenter), [initialCenter]);

  const boundsPoints = useMemo<[number, number][]>(() => {
    const pts: [number, number][] = [];
    if (routeCoords.length >= 2) pts.push(...routeCoords);
    else pts.push(...routeLatLngs);
    nearbyBins.forEach((b) => pts.push([b.latitude, b.longitude]));
    optimizedPickups.forEach((p) => {
      if (p.latitude != null && p.longitude != null) pts.push([p.latitude as number, p.longitude as number]);
    });
    if (userLocation) pts.push(userLocation);
    return pts;
  }, [routeCoords, routeLatLngs, nearbyBins, optimizedPickups, userLocation]);

  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(coords);
        setMapCenter(coords);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  const getWasteTypeColor = (types: string[]) => {
    if (types.includes('organic')) return '#10B981';
    if (types.includes('plastic')) return '#3B82F6';
    if (types.includes('e-waste')) return '#8B5CF6';
    if (types.includes('metal')) return '#F97316';
    return '#10B981';
  };

  const getPickupColor = (status: string) => {
    if (status === 'collected') return '#10B981';
    if (status === 'en_route') return '#3B82F6';
    if (status === 'assigned') return '#ff4d00';
    if (status === 'pending') return '#f59e0b';
    return '#6b7c6e';
  };

  const distanceKm = routeStats ? (routeStats.distanceM / 1000).toFixed(1) : null;
  const durationMin = routeStats ? Math.round(routeStats.durationS / 60) : null;

  return (
    <div
      className={`relative overflow-hidden rounded-[12px] border border-border bg-surface shadow-soft transition-all ${
        isFullscreen ? 'fixed inset-4 z-50 rounded-[16px] shadow-2xl' : ''
      }`}
    >
      <div className="flex flex-wrap items-center justify-between border-b border-border bg-surface px-3.5 py-2 gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Truck className="h-4 w-4 text-primary" />
          <span className="text-[13px] font-semibold text-foreground">
            {optimizedPickups.length} stop{optimizedPickups.length !== 1 ? 's' : ''} • {nearbyBins.length}/{bins.length} bins within 250m
          </span>
          {routeCoords.length >= 2 ? (
            <Badge tone="sage" dot>
              Road route
            </Badge>
          ) : routeLatLngs.length >= 2 ? (
            <Badge tone="stone" dot>
              Straight line
            </Badge>
          ) : null}
          {routing && (
            <Badge tone="info" dot>
              Routing…
            </Badge>
          )}
          {routeStats && !routing && (
            <Badge tone="neutral">
              {distanceKm} km • {durationMin} min
            </Badge>
          )}
          {routeError && (
            <Badge tone="amber">{routeError}</Badge>
          )}
          {pickups.length !== pickupsWithCoords.length && (
            <Badge tone="amber">{pickups.length - pickupsWithCoords.length} without coords</Badge>
          )}
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

      {pickupsWithCoords.length === 0 && bins.length > 0 && (
        <Alert variant="info" className="mx-3.5 mt-3">
          No pickup coordinates available — showing {bins.length} disposal site{bins.length !== 1 ? 's' : ''} only
          {pickups.length > 0 ? ` (${pickups.length - pickupsWithCoords.length} stop${pickups.length - pickupsWithCoords.length !== 1 ? 's' : ''} without usable coordinates)` : ''}.
        </Alert>
      )}

      {/* legend bar — compact, muted */}
      <div className="flex flex-wrap items-center gap-3 px-3.5 py-2 bg-surface-muted/40 border-b border-border text-[11px]">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#2563EB] border border-white shadow-sm inline-flex items-center justify-center">
            <span className="h-1.5 w-1.5 rounded-full bg-white inline-block" />
          </span>
          Truck
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#10B981] border border-white shadow-sm inline-block" /> Bin
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff4d00] border border-white shadow-sm inline-flex items-center justify-center text-[7px] font-bold text-white leading-none">1</span>
          Bag
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-5 bg-[#ff4d00] inline-block rounded" style={{ opacity: 0.9 }} /> Route
        </span>
        <span className="text-muted-foreground ml-auto hidden sm:inline">OSM tiles • OSRM road routing • 250m corridor</span>
      </div>

      <MapContainer center={mapCenter} zoom={13} scrollWheelZoom style={{ height: isFullscreen ? 'calc(100% - 80px)' : height, width: '100%' }}>
        <MapRecenter center={mapCenter} />
        {boundsPoints.length >= 2 && <FitBounds points={boundsPoints} />}
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {routeCoords.length >= 2 ? (
          <Polyline positions={routeCoords} pathOptions={{ color: '#ff4d00', weight: 4, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }} />
        ) : (
          routeLatLngs.length >= 2 && (
            <Polyline positions={routeLatLngs} pathOptions={{ color: '#ff4d00', weight: 4, opacity: 0.85, dashArray: '8 8', lineCap: 'round', lineJoin: 'round' }} />
          )
        )}

        {userLocation && (
          <>
            <Marker position={userLocation} icon={createTruckPin()}>
              <Popup>
                <div className="p-1 text-[13px]">
                  <p className="font-bold text-foreground flex items-center gap-1">
                    <Truck className="h-3 w-3 text-[#2563EB]" /> Truck — your location
                  </p>
                  <p className="text-muted-foreground font-mono text-[11px]">
                    {userLocation[0].toFixed(4)}, {userLocation[1].toFixed(4)}
                  </p>
                </div>
              </Popup>
            </Marker>
            <Circle center={userLocation} radius={800} pathOptions={{ color: '#2563EB', fillColor: '#2563EB', fillOpacity: 0.06, weight: 1.5 }} />
          </>
        )}

        {nearbyBins.map((bin) => {
          const pinColor = getWasteTypeColor(bin.accepted_waste_types || []);
          return (
            <Marker key={`bin-${bin.id}`} position={[bin.latitude, bin.longitude]} icon={createBinPin(pinColor)}>
              <Popup>
                <div className="min-w-[200px] p-2 space-y-1.5">
                  <div className="flex items-start justify-between gap-1">
                    <p className="text-[13px] font-bold text-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-emerald-600" />
                      {bin.name}
                    </p>
                    <span className="rounded bg-emerald-50 text-emerald-700 px-1 py-0.5 text-[10px] font-bold">{bin.capacity_kg} kg</span>
                  </div>
                  <div className="space-y-0.5 text-[13px]">
                    <p className="text-muted-foreground">
                      <span className="font-semibold text-foreground">Accepts:</span> {bin.accepted_waste_types.join(', ') || 'Any material'}
                    </p>
                    <p className="text-muted-foreground font-mono text-[11px]">
                      {bin.latitude.toFixed(4)}, {bin.longitude.toFixed(4)}
                    </p>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {optimizedPickups.map((p, idx) => {
          if (p.latitude == null || p.longitude == null) return null;
          const color = getPickupColor(p.status);
          return (
            <Marker key={`pickup-${p.id}`} position={[p.latitude as number, p.longitude as number]} icon={createPickupPin(color, idx + 1)}>
              <Popup>
                <div className="min-w-[200px] p-2 space-y-1.5">
                  <p className="text-[13px] font-bold text-foreground flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: color }}>
                      {idx + 1}
                    </span>
                    <span className="capitalize">
                      {p.waste_type} • {p.quantity_kg} kg
                    </span>
                  </p>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Package className="h-3 w-3 shrink-0 text-[#ff4d00]" />
                    Resident request (bag) • {p.location}
                  </p>
                  <p className="text-[11px] font-mono text-muted-foreground">
                    {(p.latitude as number).toFixed(4)}, {(p.longitude as number).toFixed(4)} • #{p.id}
                  </p>
                  <p className="text-[11px]">
                    <span className="font-semibold capitalize" style={{ color }}>
                      {p.status.replace('_', ' ')}
                    </span>{' '}
                    {p.preferred_time && <span className="text-muted-foreground">• {new Date(p.preferred_time).toLocaleString()}</span>}
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
