import type { CityItem } from "../types";

/** Computes a Leaflet-friendly [southWest, northEast] and center from imported GeoJSON. */
export function getGeoJsonBoundsAndCenter(feature: any): {
  bounds: [[number, number], [number, number]];
  center: [number, number];
} | null {
  const geometry = feature?.type === "Feature" ? feature.geometry : feature;
  if (!geometry || !["Polygon", "MultiPolygon"].includes(geometry.type)) return null;

  const positions: number[][] = [];
  const walk = (value: any): void => {
    if (!Array.isArray(value)) return;
    if (value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number") {
      positions.push(value);
      return;
    }
    value.forEach(walk);
  };
  walk(geometry.coordinates);
  if (!positions.length) return null;

  const longitudes = positions.map((point) => point[0]);
  const latitudes = positions.map((point) => point[1]);
  const south = Math.min(...latitudes);
  const north = Math.max(...latitudes);
  const west = Math.min(...longitudes);
  const east = Math.max(...longitudes);
  if (![south, north, west, east].every(Number.isFinite)) return null;

  return {
    bounds: [[south, west], [north, east]],
    center: [(south + north) / 2, (west + east) / 2],
  };
}

export function cityFeature(city: CityItem): any | null {
  const feature = city.boundary_geojson;
  if (!feature || !["Feature", "FeatureCollection", "Polygon", "MultiPolygon"].includes(feature.type)) return null;
  return feature;
}

type GeoPosition = readonly [longitude: number, latitude: number];
type GeoRing = GeoPosition[];
type GeoPolygon = GeoRing[];
type RingLocation = "inside" | "outside" | "boundary";

const BOUNDARY_EPSILON = 1e-10;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function collectPolygonCoordinates(geoJson: unknown): unknown[] {
  const polygonCoordinates: unknown[] = [];

  const visit = (value: unknown): void => {
    const record = asRecord(value);
    if (!record) return;

    if (record.type === "Feature") {
      visit(record.geometry);
      return;
    }
    if (record.type === "FeatureCollection") {
      if (Array.isArray(record.features)) record.features.forEach(visit);
      return;
    }
    if (record.type === "Polygon") {
      polygonCoordinates.push(record.coordinates);
      return;
    }
    if (record.type === "MultiPolygon" && Array.isArray(record.coordinates)) {
      polygonCoordinates.push(...record.coordinates);
    }
  };

  visit(geoJson);
  return polygonCoordinates;
}

function parsePolygonCoordinates(coordinates: unknown): GeoPolygon | null {
  if (!Array.isArray(coordinates) || coordinates.length === 0) return null;
  const rings: GeoRing[] = [];

  for (const ringValue of coordinates) {
    if (!Array.isArray(ringValue) || ringValue.length < 3) return null;
    const ring: GeoRing = [];
    for (const positionValue of ringValue) {
      if (
        !Array.isArray(positionValue) ||
        positionValue.length < 2 ||
        typeof positionValue[0] !== "number" ||
        typeof positionValue[1] !== "number" ||
        !Number.isFinite(positionValue[0]) ||
        !Number.isFinite(positionValue[1]) ||
        Math.abs(positionValue[0]) > 180 ||
        Math.abs(positionValue[1]) > 90
      ) {
        return null;
      }
      ring.push([positionValue[0], positionValue[1]]);
    }
    rings.push(ring);
  }

  return rings;
}

function getGeoPolygons(geoJson: unknown): GeoPolygon[] {
  return collectPolygonCoordinates(geoJson).flatMap((coordinates) => {
    const polygon = parsePolygonCoordinates(coordinates);
    return polygon ? [polygon] : [];
  });
}

function isPointOnSegment(
  longitude: number,
  latitude: number,
  start: GeoPosition,
  end: GeoPosition,
): boolean {
  const deltaLongitude = end[0] - start[0];
  const deltaLatitude = end[1] - start[1];
  const cross =
    (longitude - start[0]) * deltaLatitude -
    (latitude - start[1]) * deltaLongitude;
  const scale = Math.max(1, Math.abs(deltaLongitude) + Math.abs(deltaLatitude));
  if (Math.abs(cross) > BOUNDARY_EPSILON * scale) return false;

  return (
    longitude >= Math.min(start[0], end[0]) - BOUNDARY_EPSILON &&
    longitude <= Math.max(start[0], end[0]) + BOUNDARY_EPSILON &&
    latitude >= Math.min(start[1], end[1]) - BOUNDARY_EPSILON &&
    latitude <= Math.max(start[1], end[1]) + BOUNDARY_EPSILON
  );
}

function locatePointInRing(longitude: number, latitude: number, ring: GeoRing): RingLocation {
  let isInside = false;

  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const start = ring[previous];
    const end = ring[index];
    if (isPointOnSegment(longitude, latitude, start, end)) return "boundary";

    const crossesLatitude = (start[1] > latitude) !== (end[1] > latitude);
    if (!crossesLatitude) continue;
    const crossingLongitude =
      start[0] + ((latitude - start[1]) * (end[0] - start[0])) / (end[1] - start[1]);
    if (longitude < crossingLongitude) isInside = !isInside;
  }

  return isInside ? "inside" : "outside";
}

function isPointInPolygon(longitude: number, latitude: number, polygon: GeoPolygon): boolean {
  const [outerRing, ...holeRings] = polygon;
  if (!outerRing) return false;

  const outerLocation = locatePointInRing(longitude, latitude, outerRing);
  if (outerLocation === "outside") return false;
  if (outerLocation === "boundary") return true;

  for (const hole of holeRings) {
    const holeLocation = locatePointInRing(longitude, latitude, hole);
    // Treat municipal boundary lines (including hole outlines) as part of the area.
    if (holeLocation === "boundary") return true;
    if (holeLocation === "inside") return false;
  }
  return true;
}

function isPointInPolygons(longitude: number, latitude: number, polygons: GeoPolygon[]): boolean {
  return polygons.some((polygon) => isPointInPolygon(longitude, latitude, polygon));
}

/**
 * Tests a WGS84 point against a GeoJSON Polygon/MultiPolygon, Feature, or FeatureCollection.
 * Coordinates are supplied as latitude/longitude; GeoJSON stores them as longitude/latitude.
 * Points on municipal boundary lines count as inside, while hole interiors are excluded.
 */
export function isPointInGeoJson(
  geoJson: unknown,
  latitude: number,
  longitude: number,
): boolean {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return false;
  }

  return isPointInPolygons(longitude, latitude, getGeoPolygons(geoJson));
}

/**
 * Returns a usable point in the first valid polygon (preferably its interior) for map startup.
 * Falls back to a point on the outer boundary for highly concave polygons whose centroid is out.
 */
export function getPointInGeoJson(geoJson: unknown): [latitude: number, longitude: number] | null {
  const polygons = getGeoPolygons(geoJson);

  for (const polygon of polygons) {
    const outerRing = polygon[0];
    if (!outerRing?.length) continue;

    const vertices = outerRing.length > 1 &&
      outerRing[0][0] === outerRing[outerRing.length - 1][0] &&
      outerRing[0][1] === outerRing[outerRing.length - 1][1]
      ? outerRing.slice(0, -1)
      : outerRing;
    if (vertices.length === 0) continue;

    const candidates: GeoPosition[] = [];
    const longitudeValues = vertices.map(([value]) => value);
    const latitudeValues = vertices.map(([, value]) => value);
    const west = Math.min(...longitudeValues);
    const east = Math.max(...longitudeValues);
    const south = Math.min(...latitudeValues);
    const north = Math.max(...latitudeValues);
    candidates.push([(west + east) / 2, (south + north) / 2]);

    let twiceArea = 0;
    let centroidLongitudeNumerator = 0;
    let centroidLatitudeNumerator = 0;
    let averageLongitude = 0;
    let averageLatitude = 0;
    for (let index = 0; index < vertices.length; index += 1) {
      const current = vertices[index];
      const next = vertices[(index + 1) % vertices.length];
      const cross = current[0] * next[1] - next[0] * current[1];
      twiceArea += cross;
      centroidLongitudeNumerator += (current[0] + next[0]) * cross;
      centroidLatitudeNumerator += (current[1] + next[1]) * cross;
      averageLongitude += current[0];
      averageLatitude += current[1];
    }

    if (Math.abs(twiceArea) > Number.EPSILON) {
      candidates.push([
        centroidLongitudeNumerator / (3 * twiceArea),
        centroidLatitudeNumerator / (3 * twiceArea),
      ]);
    }
    candidates.push([
      averageLongitude / vertices.length,
      averageLatitude / vertices.length,
    ]);
    candidates.push(vertices[0]);

    for (const [longitude, latitude] of candidates) {
      if (isPointInPolygons(longitude, latitude, polygons)) return [latitude, longitude];
    }
  }

  return null;
}
