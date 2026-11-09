import { getSupabaseClientForCity, isRealSupabaseForCity } from "./supabase";
import { DEFAULT_SEEDED_CITIES } from "../data/rmcIbgeCities";
import type { CityItem, PublicCityReport } from "../types";
import { cityFeature } from "../domain/cityGeometry";
import { sanitizePublicLocation, sanitizePublicText } from "../domain/publicCityData";
export { cityFeature, getGeoJsonBoundsAndCenter } from "../domain/cityGeometry";
export { sanitizePublicLocation, sanitizePublicText } from "../domain/publicCityData";

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

/** Fetches each seeded municipality only from its own Supabase project. */
export async function fetchCities(): Promise<CityItem[]> {
  const cities = await Promise.all(
    DEFAULT_SEEDED_CITIES.map(async (seededCity) => {
      const citySupabase = getSupabaseClientForCity(seededCity.id);
      if (!citySupabase || !isRealSupabaseForCity(seededCity.id)) return seededCity;

      try {
        const { data, error } = await citySupabase
          .from("cities")
          .select(CITY_COLUMNS)
          .eq("id", seededCity.id)
          .maybeSingle();
        if (error) throw error;
        return data ? { ...seededCity, ...asCity(data) } : seededCity;
      } catch (error) {
        console.warn(`Não foi possível carregar ${seededCity.name} do seu projeto Supabase; usando os limites locais:`, error);
        return seededCity;
      }
    }),
  );

  return cities.sort(
    (a, b) => a.state.localeCompare(b.state, "pt-BR") || a.name.localeCompare(b.name, "pt-BR"),
  );
}

/** Uses only the privacy-safe SECURITY DEFINER RPC; never selects from public.reports. */
export async function fetchPublicCityReports(cityId: string): Promise<PublicCityReport[]> {
  const citySupabase = getSupabaseClientForCity(cityId);
  if (!citySupabase || !isRealSupabaseForCity(cityId) || !cityId) return [];

  try {
    const { data, error } = await citySupabase.rpc("get_public_city_reports", { p_city_id: cityId });
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

export async function saveCity(city: CityItem): Promise<CityItem> {
  const citySupabase = getSupabaseClientForCity(city.id);
  if (!citySupabase || !isRealSupabaseForCity(city.id)) {
    throw new Error("O projeto Supabase do município selecionado não está configurado.");
  }
  if (!city.id || !city.name.trim() || !city.state.trim() || !/^\d{7}$/.test(city.ibge_code)) {
    throw new Error("Informe nome, UF e o código IBGE de sete dígitos.");
  }
  const geometry = cityFeature(city);
  const geometryType = geometry?.type === "Feature" ? geometry.geometry?.type : geometry?.type;
  if (!geometry || !["Polygon", "MultiPolygon"].includes(geometryType)) {
    throw new Error("Importe um limite municipal GeoJSON oficial (Polygon ou MultiPolygon) antes de salvar.");
  }
  const { error } = await citySupabase.from("cities").upsert({
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
  const citySupabase = getSupabaseClientForCity(cityId);
  if (!citySupabase || !isRealSupabaseForCity(cityId)) {
    throw new Error("O projeto Supabase do município selecionado não está configurado.");
  }
  const { data, error } = await citySupabase
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
