import React, { useEffect, useMemo, useState } from "react";
import { Building2, Check, Download, LoaderCircle, MapPin, Plus, Save, X } from "lucide-react";
import { GeoJSON, MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import type { CityItem } from "../types";
import { getGeoJsonBoundsAndCenter, saveCity, setCityAvailability } from "../lib/cityService";
import { useTheme } from "../ThemeContext";

const UF_OPTIONS: Array<[string, string]> = [
  ["AC", "Acre"], ["AL", "Alagoas"], ["AP", "Amapá"], ["AM", "Amazonas"], ["BA", "Bahia"],
  ["CE", "Ceará"], ["DF", "Distrito Federal"], ["ES", "Espírito Santo"], ["GO", "Goiás"], ["MA", "Maranhão"],
  ["MT", "Mato Grosso"], ["MS", "Mato Grosso do Sul"], ["MG", "Minas Gerais"], ["PA", "Pará"], ["PB", "Paraíba"],
  ["PR", "Paraná"], ["PE", "Pernambuco"], ["PI", "Piauí"], ["RJ", "Rio de Janeiro"], ["RN", "Rio Grande do Norte"],
  ["RS", "Rio Grande do Sul"], ["RO", "Rondônia"], ["RR", "Roraima"], ["SC", "Santa Catarina"], ["SP", "São Paulo"],
  ["SE", "Sergipe"], ["TO", "Tocantins"],
];

const citySlug = (name: string, uf: string) =>
  `${name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${uf.toLowerCase()}`;

const PreviewBounds: React.FC<{ feature: any }> = ({ feature }) => {
  const map = useMap();
  useEffect(() => {
    if (!feature) return;
    try {
      const bounds = L.geoJSON(feature).getBounds();
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [18, 18], maxZoom: 12 });
    } catch { /* The preview remains centered if a malformed GeoJSON arrives. */ }
  }, [feature, map]);
  return null;
};

interface AdminCitiesModalProps {
  cities: CityItem[];
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

export const AdminCitiesModal: React.FC<AdminCitiesModalProps> = ({ cities, onClose, onSaved }) => {
  const { isDark } = useTheme();
  const [editing, setEditing] = useState<CityItem | null>(null);
  const [name, setName] = useState("");
  const [uf, setUf] = useState("PR");
  const [ibgeCode, setIbgeCode] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(false);
  const [feature, setFeature] = useState<any | null>(null);
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");

  const shell = isDark ? "bg-[#243a35] border-white/15 text-white" : "bg-white border-black/10 text-[#183a2b]";
  const inputClass = `w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-emerald-500/30 ${isDark ? "bg-white/5 border-white/15 text-white placeholder:text-white/40" : "bg-white border-black/10 text-[#183a2b] placeholder:text-[#2d4a3b]/45"}`;
  const muted = isDark ? "text-white/60" : "text-[#2d4a3b]/70";

  const filteredCities = useMemo(() => {
    const query = filter.trim().toLocaleLowerCase("pt-BR");
    return [...cities]
      .filter((city) => !query || `${city.name} ${city.state} ${city.ibge_code}`.toLocaleLowerCase("pt-BR").includes(query))
      .sort((a, b) => a.state.localeCompare(b.state, "pt-BR") || a.name.localeCompare(b.name, "pt-BR"));
  }, [cities, filter]);

  const resetForm = () => {
    setEditing(null);
    setName("");
    setUf("PR");
    setIbgeCode("");
    setDescription("");
    setActive(false);
    setFeature(null);
    setMessage("");
    setError("");
  };

  const editCity = (city: CityItem) => {
    setEditing(city);
    setName(city.name);
    setUf(city.state);
    setIbgeCode(city.ibge_code);
    setDescription(city.description || "");
    setActive(city.is_active);
    setFeature(city.boundary_geojson);
    setMessage("");
    setError("");
  };

  const importBoundary = async () => {
    if (!/^\d{7}$/.test(ibgeCode)) {
      setError("Informe o código IBGE de sete dígitos antes de importar o limite.");
      return;
    }
    setImporting(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/ibge/state-municipalities/${encodeURIComponent(uf)}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Não foi possível consultar a malha oficial do IBGE.");
      const features = Array.isArray(payload?.features) ? payload.features : [];
      const match = features.find((candidate: any) => {
        const props = candidate?.properties || {};
        return String(props.id || props.codigo_ibge || props.codarea || candidate.id || "").padStart(7, "0") === ibgeCode;
      });
      if (!match) throw new Error(`O código IBGE ${ibgeCode} não foi localizado na malha do estado ${uf}.`);
      const cityName = String(match.properties?.name || match.properties?.nome || match.name || name).trim();
      const normalizedFeature = {
        ...match,
        type: "Feature",
        properties: {
          ...(match.properties || {}),
          id: citySlug(cityName, uf),
          ibge_code: ibgeCode,
          name: cityName,
          state: uf,
        },
      };
      const metrics = getGeoJsonBoundsAndCenter(normalizedFeature);
      if (!metrics) throw new Error("A geometria retornada não é um polígono municipal válido.");
      setFeature(normalizedFeature);
      setName(cityName);
      setMessage("Limite municipal oficial importado e pronto para visualização.");
    } catch (err: any) {
      setError(err?.message || "Falha ao importar o limite IBGE.");
    } finally {
      setImporting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const metrics = getGeoJsonBoundsAndCenter(feature);
      if (!metrics) throw new Error("Importe o polígono municipal oficial antes de salvar.");
      const id = editing?.id || citySlug(name, uf);
      const city: CityItem = {
        id,
        ibge_code: ibgeCode,
        name: name.trim(),
        state: uf,
        is_active: active,
        center_lat: metrics.center[0],
        center_lng: metrics.center[1],
        default_zoom: editing?.default_zoom || 11,
        bounds: metrics.bounds,
        boundary_geojson: {
          ...feature,
          properties: { ...(feature?.properties || {}), id, ibge_code: ibgeCode, name: name.trim(), state: uf },
        },
        description: description.trim() || null,
      };
      await saveCity(city);
      await onSaved();
      setMessage(`${city.name} foi salvo${city.is_active ? " e disponibilizado" : ""} com sucesso.`);
      setEditing(city);
    } catch (err: any) {
      setError(err?.message || "Não foi possível salvar o município. Verifique se sua conta é ADM Global.");
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailability = async (city: CityItem) => {
    setError("");
    setMessage("");
    try {
      await setCityAvailability(city.id, !city.is_active);
      if (editing?.id === city.id) setActive(!city.is_active);
      await onSaved();
      setMessage(`${city.name}: ${city.is_active ? "indisponível para novos cadastros" : "disponível para novos cadastros"}.`);
    } catch (err: any) {
      setError(err?.message || "Não foi possível alterar a disponibilidade do município.");
    }
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 p-2 sm:p-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="admin-cities-title">
      <div className={`flex max-h-[96dvh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border shadow-2xl ${shell}`}>
        <header className={`flex items-start justify-between gap-4 border-b px-5 py-4 sm:px-7 ${isDark ? "border-white/10" : "border-black/10"}`}>
          <div className="flex items-start gap-3">
            <div className={`rounded-2xl p-2.5 ${isDark ? "bg-emerald-300/10 text-emerald-200" : "bg-emerald-700/10 text-emerald-800"}`}><Building2 size={21} /></div>
            <div>
              <h2 id="admin-cities-title" className="font-serif text-xl font-bold sm:text-2xl">Gestão de municípios</h2>
              <p className={`mt-1 max-w-2xl text-xs sm:text-sm ${muted}`}>Cadastre cidades usando os limites municipais oficiais do IBGE e controle sua disponibilidade no mapa de cadastro.</p>
            </div>
          </div>
          <button onClick={onClose} className={`rounded-full p-2 transition ${isDark ? "hover:bg-white/10" : "hover:bg-black/5"}`} aria-label="Fechar"><X size={20} /></button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[280px_minmax(0,1fr)] lg:overflow-hidden">
          <aside className={`border-b p-4 lg:overflow-y-auto lg:border-b-0 lg:border-r ${isDark ? "border-white/10" : "border-black/10"}`}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold">Municípios ({cities.length})</h3>
              <button onClick={resetForm} className={`inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs font-bold ${isDark ? "bg-white/10 hover:bg-white/15" : "bg-[#183a2b] text-white hover:bg-[#122c21]"}`}><Plus size={14} /> Novo</button>
            </div>
            <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Buscar município ou IBGE" className={`${inputClass} mt-3`} />
            <div className="mt-3 grid max-h-52 grid-cols-1 gap-2 overflow-y-auto lg:max-h-none">
              {filteredCities.map((city) => (
                <div key={city.id} className={`flex items-center gap-2 rounded-2xl border p-2.5 ${editing?.id === city.id ? isDark ? "border-emerald-300/40 bg-emerald-300/10" : "border-emerald-700/30 bg-emerald-50" : isDark ? "border-white/10 bg-white/[0.03]" : "border-black/5 bg-black/[0.02]"}`}>
                  <button onClick={() => editCity(city)} className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-sm font-semibold">{city.name} <span className={`text-xs font-normal ${muted}`}>· {city.state}</span></span>
                    <span className={`mt-0.5 block text-[10px] ${muted}`}>IBGE {city.ibge_code} · {city.is_active ? "Disponível" : "Em breve"}</span>
                  </button>
                  <button onClick={() => void toggleAvailability(city)} title={city.is_active ? "Desativar município" : "Ativar município"} className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${city.is_active ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200" : "bg-slate-500/10 text-slate-600 dark:text-slate-200"}`}>{city.is_active ? "Ativo" : "Inativo"}</button>
                </div>
              ))}
              {!filteredCities.length && <p className={`py-4 text-center text-xs ${muted}`}>Nenhum município encontrado.</p>}
            </div>
          </aside>

          <section className="min-h-0 space-y-4 p-4 sm:p-6 lg:overflow-y-auto">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-serif text-lg font-bold">{editing ? `Editar ${editing.name}` : "Novo município"}</h3>
                <p className={`text-xs ${muted}`}>O código IBGE identifica a malha territorial oficial.</p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold">
                <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="accent-emerald-700" /> Disponível para cadastro
              </label>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold">Nome do município<input className={`${inputClass} mt-1.5`} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Araucária" /></label>
              <label className="text-xs font-semibold">Estado / UF<select className={`${inputClass} mt-1.5`} value={uf} onChange={(e) => setUf(e.target.value)}>{UF_OPTIONS.map(([code, label]) => <option key={code} value={code}>{code} · {label}</option>)}</select></label>
              <label className="text-xs font-semibold">Código IBGE (7 dígitos)<input className={`${inputClass} mt-1.5`} value={ibgeCode} onChange={(e) => setIbgeCode(e.target.value.replace(/\D/g, "").slice(0, 7))} inputMode="numeric" placeholder="4101804" /></label>
              <label className="text-xs font-semibold">Descrição de apresentação<input className={`${inputClass} mt-1.5`} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Informação exibida no mapa público" /></label>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => void importBoundary()} disabled={importing || !ibgeCode} className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${isDark ? "bg-emerald-300 text-[#19372d] hover:bg-emerald-200" : "bg-[#183a2b] text-white hover:bg-[#122c21]"}`}>
                {importing ? <LoaderCircle size={15} className="animate-spin" /> : <Download size={15} />} Importar limite oficial IBGE
              </button>
              {feature && <span className={`inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300`}><Check size={14} /> Polígono carregado</span>}
            </div>

            {feature ? (
              <div className={`overflow-hidden rounded-2xl border ${isDark ? "border-white/10" : "border-black/10"}`}>
                <div className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold ${isDark ? "bg-white/5" : "bg-slate-50"}`}><MapPin size={14} /> Prévia do limite municipal</div>
                <MapContainer center={[-25.5, -49.3]} zoom={7} scrollWheelZoom={false} className="h-52 w-full sm:h-60">
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <GeoJSON key={`${editing?.id || name}-${ibgeCode}`} data={feature} style={{ color: "#16824b", weight: 3, fillColor: "#43a36b", fillOpacity: 0.24 }} />
                  <PreviewBounds feature={feature} />
                </MapContainer>
              </div>
            ) : (
              <div className={`flex min-h-36 items-center justify-center rounded-2xl border border-dashed px-5 text-center text-sm ${isDark ? "border-white/15 bg-white/[0.02]" : "border-black/15 bg-slate-50"}`}>
                <div><MapPin size={22} className={`mx-auto mb-2 ${muted}`} /><p className={muted}>Importe o código IBGE para visualizar o polígono territorial real antes de ativar a cidade.</p></div>
              </div>
            )}

            {(message || error) && <div role="status" className={`rounded-xl border px-3.5 py-2.5 text-xs ${error ? "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-200" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"}`}>{error || message}</div>}

            <div className="flex justify-end border-t pt-4" style={{ borderColor: isDark ? "rgba(255,255,255,.1)" : "rgba(0,0,0,.1)" }}>
              <button onClick={() => void handleSave()} disabled={saving || !name.trim() || !/^\d{7}$/.test(ibgeCode) || !feature} className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50 ${isDark ? "bg-white text-[#183a2b] hover:bg-white/90" : "bg-emerald-700 text-white hover:bg-emerald-800"}`}>
                {saving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />} Salvar município
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
