import { supabase, isRealSupabase } from "./supabase";
import { DEFAULT_SEEDED_CITIES } from "../data/rmcIbgeCities";
import type { CityItem, PublicCityReport } from "../types";

const CITY_COLUMNS =
  "id,ibge_code,name,state,is_active,center_lat,center_lng,default_zoom,bounds,boundary_geojson,description,created_at,updated_at";

const asCity = (row: any): CityItem => ({
  id: String(row.id),
  ibge_code: String(row.ibge_code || ""),
  name: String(row.name || ""),
  state: String(row.state || ""),
  is_active: Boolean(row.is_active),
  center_lat: Number(row.center_lat),
  center_lng: Number(row.center_lng),
  default_zoom: Number(row.default_zoom || 11),
  bounds: row.bounds || null,
  boundary_geojson: row.boundary_geojson,
  description: row.description || null,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

/** Fetches city metadata and real boundaries. Static IBGE seed data is a resilient offline fallback. */
export async function fetchCities(): Promise<CityItem[]> {
  if (!supabase || !isRealSupabase) return [...DEFAULT_SEEDED_CITIES];

  try {
    const { data, error } = await supabase
      .from("cities")
      .select(CITY_COLUMNS)
      .order("state", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw error;

    const fromDb = Array.isArray(data) ? data.map(asCity) : [];
    const byId = new Map<string, CityItem>();
    for (const city of DEFAULT_SEEDED_CITIES) byId.set(city.id, city);
    for (const city of fromDb) byId.set(city.id, city);
    return [...byId.values()].sort(
      (a, b) => a.state.localeCompare(b.state, "pt-BR") || a.name.localeCompare(b.name, "pt-BR"),
    );
  } catch (error) {
    console.warn("Não foi possível carregar os municípios do Supabase; usando limites oficiais locais:", error);
    return [...DEFAULT_SEEDED_CITIES];
  }
}

/** Uses only the privacy-safe SECURITY DEFINER RPC; never selects from public.reports. */
export async function fetchPublicCityReports(cityId: string): Promise<PublicCityReport[]> {
  if (!supabase || !isRealSupabase || !cityId) return [];

  try {
    const { data, error } = await supabase.rpc("get_public_city_reports", { p_city_id: cityId });
    if (error) throw error;
    return (Array.isArray(data) ? data : []).flatMap((row: any) => {
      const latitude = Number(row.latitude);
      const longitude = Number(row.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];
      // Explicit projection is deliberate: no user/profile fields can reach this public map.
      return [{
        id: String(row.id),
        city_id: String(row.city_id),
        category: sanitizePublicText(String(row.category || "Outros"), 60),
        title: sanitizePublicText(String(row.title || "Ocorrência urbana"), 100),
        short_description: sanitizePublicText(String(row.short_description || ""), 180),
        public_location: sanitizePublicLocation(String(row.public_location || "Localização aproximada"), 160),
        latitude,
        longitude,
        status: String(row.status || "unresolved"),
        created_at: String(row.created_at || ""),
      } satisfies PublicCityReport];
    });
  } catch (error) {
    console.warn("Falha ao carregar ocorrências públicas do município:", error);
    return [];
  }
}

/** Lightweight client-side defense-in-depth for the already sanitized public RPC fields. */
export function sanitizePublicText(value: string, maxLength = 180): string {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[dado ocultado]")
    .replace(/\b\d{3}[.\s-]?\d{3}[.\s-]?\d{3}[.\s-]?\d{2}\b/g, "[dado ocultado]")
    .replace(/(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?9?\d{4}[\s.-]?\d{4}\b/g, "[dado ocultado]")
    .replace(/\b(?:meu nome é|me chamo|nome:)\s+[\p{L}][\p{L}\s.'-]{1,80}/giu, "[identificação removida]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function sanitizePublicLocation(value: string, maxLength = 160): string {
  return sanitizePublicText(value, maxLength)
    .replace(/,?\s*(?:n[ºo.]?\s*)?\d{1,5}(?=\s*(?:,|$))/gi, "")
    .replace(/\s+,/g, ",")
    .replace(/,{2,}/g, ",")
    .trim();
}

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

export async function saveCity(city: CityItem): Promise<CityItem> {
  if (!supabase || !isRealSupabase) throw new Error("A conexão com o Supabase é necessária para gerenciar municípios.");
  if (!city.id || !city.name.trim() || !city.state.trim() || !/^\d{7}$/.test(city.ibge_code)) {
    throw new Error("Informe nome, UF e o código IBGE de sete dígitos.");
  }
  const geometry = cityFeature(city);
  const geometryType = geometry?.type === "Feature" ? geometry.geometry?.type : geometry?.type;
  if (!geometry || !["Polygon", "MultiPolygon"].includes(geometryType)) {
    throw new Error("Importe um limite municipal GeoJSON oficial (Polygon ou MultiPolygon) antes de salvar.");
  }
  const { error } = await supabase.from("cities").upsert({
    id: city.id,
    ibge_code: city.ibge_code,
    name: city.name.trim(),
    state: city.state.trim().toUpperCase(),
    is_active: city.is_active,
    center_lat: city.center_lat,
    center_lng: city.center_lng,
    default_zoom: city.default_zoom,
    bounds: city.bounds,
    boundary_geojson: city.boundary_geojson,
    description: city.description?.trim() || null,
  }, { onConflict: "id" });
  if (error) throw error;
  return city;
}

export async function setCityAvailability(cityId: string, isActive: boolean): Promise<void> {
  if (!supabase || !isRealSupabase) throw new Error("A conexão com o Supabase é necessária para gerenciar municípios.");
  const { data, error } = await supabase
    .from("cities")
    .update({ is_active: isActive })
    .eq("id", cityId)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (data) return;

  // The existing city table may not yet contain a built-in IBGE city from the offline catalogue.
  // Upsert that row instead of silently marking a non-existent city as available.
  const localCity = DEFAULT_SEEDED_CITIES.find((city) => city.id === cityId);
  if (!localCity) throw new Error("Município não encontrado no cadastro.");
  await saveCity({ ...localCity, is_active: isActive });
}
