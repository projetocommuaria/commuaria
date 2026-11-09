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
