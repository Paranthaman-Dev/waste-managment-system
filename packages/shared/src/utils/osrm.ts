type LatLng = { lat: number; lng: number };

export function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function minDistToRoute(
  binLat: number,
  binLng: number,
  polyline: [number, number][],
): number {
  if (!polyline.length) return Infinity;
  let min = Infinity;
  for (const [lat, lng] of polyline) {
    const d = haversine(binLat, binLng, lat, lng);
    if (d < min) min = d;
  }
  return min;
}

// OSRM demo free no key, timeout 8s, frontend direct
export async function fetchOsrmRoute(
  points: LatLng[],
): Promise<{ coords: [number, number][]; distanceM: number; durationS: number } | null> {
  if (points.length < 2) return null;
  const coordsStr = points.map((p) => `${p.lng},${p.lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (res.status === 429) throw new Error("OSRM rate limited (429)");
  if (!res.ok) throw new Error(`OSRM route failed: ${res.status}`);
  const data = (await res.json()) as {
    code: string;
    routes: { geometry: { coordinates: [number, number][] }; distance: number; duration: number }[];
  };
  if (data.code !== "Ok" || !data.routes?.[0]) return null;
  const r = data.routes[0];
  const coords: [number, number][] = r.geometry.coordinates.map(
    ([lon, lat]) => [lat, lon] as [number, number],
  );
  return { coords, distanceM: r.distance, durationS: r.duration };
}

export async function fetchOsrmTrip(
  points: LatLng[],
  opts?: { roundtrip?: boolean; source?: "any" | "first"; destination?: "any" | "last" },
): Promise<{ coords: [number, number][]; order: number[]; distanceM: number; durationS: number } | null> {
  if (points.length < 2) return null;
  const roundtrip = opts?.roundtrip ?? false;
  const source = opts?.source ?? "first";
  const destination = opts?.destination ?? "last";
  const coordsStr = points.map((p) => `${p.lng},${p.lat}`).join(";");
  const url =
    `https://router.project-osrm.org/trip/v1/driving/${coordsStr}` +
    `?overview=full&geometries=geojson&roundtrip=${roundtrip}&source=${source}&destination=${destination}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (res.status === 429) throw new Error("OSRM rate limited (429)");
  if (!res.ok) throw new Error(`OSRM trip failed: ${res.status}`);
  const data = (await res.json()) as {
    code: string;
    trips: { geometry: { coordinates: [number, number][] }; distance: number; duration: number }[];
    waypoints: { waypoint_index: number; trips_index?: number }[];
  };
  if (data.code !== "Ok" || !data.trips?.[0]) return null;
  const t = data.trips[0];
  const coords: [number, number][] = t.geometry.coordinates.map(
    ([lon, lat]) => [lat, lon] as [number, number],
  );
  const wps = data.waypoints ?? [];
  // OSRM waypoints carry waypoint_index (original input index). If trips_index present,
  // sort by trips_index to restore visitation order; otherwise map sequentially.
  const hasTripsIndex = wps.some((w) => typeof w.trips_index === "number");
  const order = hasTripsIndex
    ? [...wps].sort((a, b) => (a.trips_index ?? 0) - (b.trips_index ?? 0)).map((w) => w.waypoint_index)
    : wps.map((w) => w.waypoint_index);
  return { coords, order, distanceM: t.distance, durationS: t.duration };
}
