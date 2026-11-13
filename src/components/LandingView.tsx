import React from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  Activity,
  ArrowDown,
  ArrowRight,
  Building2,
  Camera,
  ClipboardCheck,
  MapPin,
  Megaphone,
  Navigation,
  Sparkles,
} from "lucide-react";
import {
  GeoJSON,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import type { CityItem, PublicCityReport } from "../types";
import { cityFeature, sanitizePublicLocation, sanitizePublicText } from "../lib/cityService";
import { rowBelongsToCity } from "../domain/cityScopedRows";
import { ARAUCARIA_CITY_ID } from "../lib/supabaseTenants";
import { useTheme } from "../ThemeContext";
import { SafeLogoImage } from "./SafeLogoImage";
import citizenReportPhoto from "../assets/images/landing_citizen_reporting.jpg";
import cityAerialPhoto from "../assets/images/landing_city_aerial.jpg";
import cityMaintenancePhoto from "../assets/images/landing_city_maintenance.jpg";
import desktopReportCapture from "../assets/images/landing_platform_report_desktop.png";
import mobileReportCapture from "../assets/images/landing_platform_report_mobile.png";
import roadRepairPhoto from "../assets/images/landing_road_repair.jpg";
import landingLightingWorker from "../assets/images/landing_lighting_worker_cutout.png";

interface LandingViewProps {
  onEnter: () => void;
  onSignup: () => void;
  reports?: PublicCityReport[];
  city?: CityItem | null;
  cities: CityItem[];
  onCityChange: (cityId: string) => void;
  themeToggle?: React.ReactNode;
}

const LandingReveal: React.FC<{
  children: React.ReactNode;
  className?: string;
  delay?: number;
}> = ({ children, className = "", delay = 0 }) => {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.16 }}
      transition={{ duration: reduceMotion ? 0 : 0.55, delay: reduceMotion ? 0 : delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const LandingMapFocus: React.FC<{ city: CityItem | null }> = ({ city }) => {
  const map = useMap();

  React.useEffect(() => {
    if (!city) return;
    const feature = cityFeature(city);
    const bounds = feature ? L.geoJSON(feature).getBounds() : null;
    if (bounds?.isValid()) {
      map.flyToBounds(bounds, {
        padding: [24, 24],
        maxZoom: city.default_zoom || 12,
        duration: 0.65,
      });
    } else {
      map.flyTo([city.center_lat, city.center_lng], city.default_zoom || 12, { duration: 0.65 });
    }
  }, [city?.id, map]);

  return null;
};

const getReportStatusLabel = (status: string): string => {
  if (status === "resolved") return "Concluída";
  if (status === "in_progress") return "Em andamento";
  if (status === "in_analysis") return "Em análise";
  return "Aberta";
};

const createPublicReportIcon = (status: string) => {
  const color = status === "resolved" ? "#16824b" : status === "in_progress" ? "#386b83" : "#d99a1b";
  return L.divIcon({
    className: "commuaria-public-marker",
    html: `<span aria-hidden="true" style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;border:2px solid rgba(255,255,255,.92);border-radius:9999px;background:${color};box-shadow:0 5px 18px rgba(16,24,20,.28);color:#fff"><svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg></span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -30],
  });
};

const sectionLabelClass = "text-[11px] font-semibold uppercase tracking-[0.2em]";

export const LandingView: React.FC<LandingViewProps> = ({
  onEnter,
  onSignup,
  reports = [],
  city,
  cities,
  onCityChange,
  themeToggle,
}) => {
  const { isDark } = useTheme();
  const reduceMotion = useReducedMotion();
  const activeCities = cities.filter((candidate) => candidate.is_active && cityFeature(candidate));
  const currentCity = activeCities.find((candidate) => candidate.id === city?.id) || activeCities[0] || null;
  const selectedCityId = currentCity?.id || "";
  const cityName = currentCity?.name || "seu município";
  const displayReports = reports.filter((report) =>
    rowBelongsToCity(report, selectedCityId, ARAUCARIA_CITY_ID),
  );
  const mapPointCount = displayReports.filter(
    (report) => Number.isFinite(Number(report.latitude)) && Number.isFinite(Number(report.longitude)),
  ).length;
  const navLinks = [
    { href: "#como-funciona", label: "Como funciona" },
    { href: "#mapa", label: "A plataforma" },
    { href: "#recursos", label: "Funcionalidades" },
    { href: "#municipios", label: "Municípios" },
  ];
  const steps = [
    {
      number: "01",
      title: "Registre o problema",
      description: "Escolha uma categoria e descreva o que precisa de atenção no espaço público.",
      Icon: Camera,
    },
    {
      number: "02",
      title: "Informe a localização",
      description: "Marque o ponto no mapa ou confirme o endereço para orientar a equipe municipal.",
      Icon: MapPin,
    },
    {
      number: "03",
      title: "Acompanhe a solicitação",
      description: "Consulte as atualizações e veja o andamento da solicitação pela plataforma.",
      Icon: Activity,
    },
  ];
  const rootText = isDark ? "text-white" : "text-[#183a2b]";
  const mutedText = isDark ? "text-white/72" : "text-[#40594b]";
  const linkClass = `whitespace-nowrap rounded-full px-3 py-2 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
    isDark
      ? "text-white/75 hover:bg-white/10 hover:text-white focus-visible:outline-emerald-200"
      : "text-[#40594b] hover:bg-[#183a2b]/[0.06] hover:text-[#183a2b] focus-visible:outline-emerald-700"
  }`;

  return (
    <div
      className={`relative h-full w-full overflow-x-hidden overflow-y-auto font-sans ${
        isDark ? "bg-[#5A635C] text-white selection:bg-white/20" : "bg-[#F4F7F4] text-[#183a2b] selection:bg-[#183a2b]/15"
      }`}
      style={{ scrollBehavior: reduceMotion ? "auto" : "smooth" }}
    >
      <a
        href="#conteudo"
        className="sr-only z-[100] rounded-full bg-white px-4 py-2 text-[#183a2b] focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Pular para o conteúdo
      </a>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 top-0 z-0 h-[900px] ${
          isDark
            ? "bg-[radial-gradient(ellipse_65%_55%_at_50%_0%,rgba(255,255,255,0.08),transparent_75%)]"
            : "bg-[radial-gradient(ellipse_65%_55%_at_50%_0%,rgba(24,58,43,0.07),transparent_75%)]"
        }`}
      />

      <div className="relative z-10">
        <div className="sticky top-0 z-40 px-3 pt-3 sm:px-5">
          <header
            className={`mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 rounded-2xl border px-3 py-2 shadow-[0_12px_36px_rgba(18,36,26,0.10)] backdrop-blur-xl sm:gap-x-3 sm:px-5 sm:py-2.5 xl:grid-cols-[auto_minmax(0,1fr)_auto] xl:rounded-full ${
              isDark ? "border-white/15 bg-[#17231d]/76 text-white" : "border-[#183a2b]/10 bg-white/76 text-[#183a2b]"
            }`}
          >
            <a href="#inicio" aria-label="Commuária — início" className="flex min-w-0 items-center gap-1.5 sm:gap-2.5">
              <SafeLogoImage isMinimal className="h-8 w-8 shrink-0 object-contain sm:h-9 sm:w-9" alt="" />
              <span className="truncate font-serif text-sm font-bold tracking-[0.09em] sm:text-xl sm:tracking-[0.11em]">
                COMMUÁRIA
              </span>
            </a>

            <nav
              aria-label="Navegação principal"
              className={`col-span-2 row-start-2 -mx-2 flex min-w-0 flex-wrap items-center gap-1 border-t px-1 pt-2 xl:col-span-1 xl:col-start-2 xl:row-start-1 xl:mx-0 xl:justify-center xl:border-t-0 xl:px-0 xl:pt-0 ${
                isDark ? "border-white/10" : "border-[#183a2b]/10"
              }`}
            >
              {navLinks.map((link) => (
                <a key={link.href} className={linkClass} href={link.href}>
                  {link.label}
                </a>
              ))}
            </nav>

            <div className="col-start-2 row-start-1 flex shrink-0 items-center justify-end gap-1.5 sm:gap-2 xl:col-start-3">
              {themeToggle}
              <button
                type="button"
                onClick={onEnter}
                className={`rounded-full px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:px-4 sm:text-sm ${
                  isDark
                    ? "border border-white/20 text-white hover:bg-white/10 focus-visible:outline-emerald-200"
                    : "border border-[#183a2b]/15 text-[#183a2b] hover:bg-[#183a2b]/[0.06] focus-visible:outline-emerald-700"
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={onSignup}
                aria-label="Criar conta"
                className="inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-full bg-[#183a2b] px-2.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#122c21] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 sm:px-4 sm:text-sm"
              >
                <span className="hidden sm:inline">Criar conta</span>
                <ArrowRight size={14} aria-hidden="true" />
              </button>
            </div>
          </header>
        </div>

        <main id="conteudo" className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10">
          <section id="inicio" aria-labelledby="landing-title" className="scroll-mt-32 pb-16 pt-10 sm:pb-24 sm:pt-16 lg:pt-20">
            <div className="grid items-center gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:gap-14">
              <LandingReveal className="order-2 max-w-2xl lg:order-2">
                <p className={`${sectionLabelClass} mb-5 inline-flex items-center gap-2 ${isDark ? "text-emerald-200" : "text-emerald-800"}`}>
                  <Sparkles size={14} aria-hidden="true" />
                  01 · Participação cidadã
                </p>
                <h1
                  id="landing-title"
                  className={`max-w-[12ch] font-serif text-[2.55rem] font-semibold leading-[1.06] tracking-[-0.045em] sm:text-5xl lg:text-[4.25rem] ${rootText}`}
                >
                  A cidade que você vive se transforma com a sua participação.
                </h1>
                <p className={`mt-6 max-w-xl text-base leading-7 sm:text-lg sm:leading-8 ${mutedText}`}>
                  Registre problemas urbanos, acompanhe solicitações e encontre notícias e serviços locais em uma plataforma feita para aproximar pessoas e municípios.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={onEnter}
                    className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-[#183a2b] px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(24,58,43,0.22)] transition-all hover:-translate-y-0.5 hover:bg-[#122c21] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                  >
                    Acessar a plataforma <ArrowRight size={17} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={onSignup}
                    className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full border px-6 py-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${
                      isDark ? "border-white/25 text-white hover:bg-white/10" : "border-[#183a2b]/20 text-[#183a2b] hover:bg-[#183a2b]/[0.05]"
                    }`}
                  >
                    <span>Criar conta</span>
                    <ArrowRight size={15} aria-hidden="true" />
                  </button>
                </div>
                <a
                  href="#mapa"
                  className={`mt-8 inline-flex items-center gap-2 text-sm font-medium transition-colors ${isDark ? "text-white/75 hover:text-white" : "text-[#40594b] hover:text-[#183a2b]"}`}
                >
                  Conheça a plataforma <ArrowDown size={15} aria-hidden="true" />
                </a>
              </LandingReveal>

              <LandingReveal delay={0.1} className="relative order-1 -ml-4 min-w-0 sm:-ml-6 lg:-ml-10 lg:order-1 xl:ml-[calc(37.5rem_-_50vw)]">
                <figure className="relative min-h-[460px] sm:min-h-[550px] lg:min-h-[650px]">
                  <img
                    src={landingLightingWorker}
                    alt="Funcionário equipado com colete refletivo fazendo manutenção em luminária de poste a partir de uma plataforma elevatória."
                    className={`absolute inset-0 h-full w-full object-contain object-[-18%_center] ${
                      isDark
                        ? "drop-shadow-[0_18px_24px_rgba(0,0,0,0.3)]"
                        : "drop-shadow-[0_18px_24px_rgba(24,58,43,0.2)]"
                    }`}
                    width={606}
                    height={1283}
                    fetchPriority="high"
                  />
                  <figcaption className="sr-only">
                    Funcionário com equipamentos de segurança realiza manutenção em uma luminária de poste.
                  </figcaption>
                  <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/20 bg-[#102017]/65 p-4 text-white shadow-lg backdrop-blur-lg sm:inset-x-6 sm:bottom-6 sm:p-5">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">Mapa público · {currentCity?.state || "Brasil"}</p>
                        <p className="mt-1 font-serif text-xl font-semibold sm:text-2xl">{currentCity?.name || "Municípios atendidos"}</p>
                        <p className="mt-1 text-xs text-white/75 sm:text-sm">
                          {mapPointCount > 0
                            ? `${mapPointCount} ${mapPointCount === 1 ? "ocorrência pública" : "ocorrências públicas"} no mapa`
                            : "Explore o mapa público de ocorrências"}
                        </p>
                      </div>
                      <a
                        href="#mapa"
                        aria-label={`Explorar mapa público de ${cityName}`}
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[#183a2b] transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                      >
                        <ArrowRight size={19} aria-hidden="true" />
                      </a>
                    </div>
                  </div>
                </figure>
              </LandingReveal>
            </div>
          </section>

          <section id="como-funciona" aria-labelledby="how-title" className="scroll-mt-32 py-16 sm:py-24">
            <div className="grid items-end gap-5 md:grid-cols-[1.05fr_0.95fr] md:gap-12">
              <LandingReveal>
                <p className={`${sectionLabelClass} mb-4 ${isDark ? "text-emerald-200" : "text-emerald-800"}`}>02 · Como funciona</p>
                <h2 id="how-title" className={`max-w-3xl font-serif text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl ${rootText}`}>
                  Três passos para dar visibilidade ao que importa.
                </h2>
              </LandingReveal>
              <LandingReveal delay={0.05}>
                <p className={`max-w-xl text-sm leading-7 sm:text-base ${mutedText}`}>
                  Uma observação, uma localização e um retorno ajudam a aproximar quem vive a cidade de quem cuida dos serviços públicos.
                </p>
              </LandingReveal>
            </div>

            <div className="mt-10 grid items-stretch gap-6 lg:grid-cols-[1.06fr_0.94fr] lg:gap-8">
              <LandingReveal className="relative min-w-0">
                <figure className="group relative h-full min-h-[340px] overflow-hidden rounded-[2.25rem] border border-white/20 shadow-[0_24px_70px_rgba(18,36,26,0.18)] sm:min-h-[440px]">
                  <img
                    src={citizenReportPhoto}
                    alt="Imagem ilustrativa de uma moradora registrando com o celular um buraco e uma calçada danificada."
                    className="absolute inset-0 h-full w-full object-cover object-[58%_center] transition-transform duration-700 group-hover:scale-[1.025]"
                    width={1376}
                    height={768}
                    loading="lazy"
                  />
                  <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#0c1711]/85 via-[#0c1711]/15 to-transparent" />
                  <div className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-[#102017]/65 px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.17em] text-white backdrop-blur-lg sm:left-7 sm:top-7">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
                    01 · Perceber
                  </div>
                  <figcaption className="absolute inset-x-5 bottom-5 text-white sm:inset-x-7 sm:bottom-7">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/75">A cidade conta com você</p>
                    <p className="mt-2 max-w-lg font-serif text-2xl font-semibold leading-tight sm:text-3xl">
                      O primeiro passo é mostrar o que precisa de atenção.
                    </p>
                  </figcaption>
                </figure>
              </LandingReveal>

              <div className="flex min-w-0 flex-col">
                <ol
                  aria-label="Etapas para registrar e acompanhar uma solicitação"
                  className={`divide-y ${isDark ? "divide-white/12" : "divide-[#183a2b]/12"}`}
                >
                  {steps.map(({ number, title, description, Icon }, index) => (
                    <li key={number}>
                      <LandingReveal delay={index * 0.05}>
                        <div className="flex gap-4 py-5 sm:gap-5 sm:py-6">
                          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border ${isDark ? "border-white/15 bg-white/[0.06] text-emerald-100" : "border-[#183a2b]/10 bg-white/70 text-[#183a2b]"}`}>
                            <Icon size={20} aria-hidden="true" />
                          </span>
                          <div>
                            <p className={`font-mono text-[10px] font-semibold tracking-[0.16em] ${isDark ? "text-emerald-200" : "text-emerald-800"}`}>
                              ETAPA {number}
                            </p>
                            <h3 className={`mt-1.5 font-serif text-xl font-semibold sm:text-2xl ${rootText}`}>{title}</h3>
                            <p className={`mt-2 max-w-xl text-sm leading-6 ${mutedText}`}>{description}</p>
                          </div>
                        </div>
                      </LandingReveal>
                    </li>
                  ))}
                </ol>

                <LandingReveal delay={0.16} className="mt-auto pt-7">
                  <figure className="group relative min-h-[230px] overflow-hidden rounded-[2rem] border border-white/20 shadow-[0_18px_50px_rgba(18,36,26,0.16)] sm:min-h-[270px]">
                    <img
                      src={roadRepairPhoto}
                      alt="Imagem ilustrativa de uma equipe municipal trabalhando no reparo de uma via urbana."
                      className="absolute inset-0 h-full w-full object-cover object-[62%_center] transition-transform duration-700 group-hover:scale-[1.025]"
                      width={1376}
                      height={768}
                      loading="lazy"
                    />
                    <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[#0c1711]/75 via-[#0c1711]/30 to-transparent" />
                    <figcaption className="absolute bottom-5 left-5 max-w-sm text-white sm:bottom-6 sm:left-6">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/75">Serviços municipais em campo</p>
                      <p className="mt-1.5 font-serif text-xl font-semibold sm:text-2xl">O cuidado continua nas ruas.</p>
                    </figcaption>
                  </figure>
                </LandingReveal>
              </div>
            </div>
          </section>

          <section id="mapa" aria-labelledby="map-title" className="scroll-mt-32 py-8 sm:py-12">
            <div className={`overflow-hidden rounded-[2.25rem] border shadow-[0_28px_80px_rgba(18,36,26,0.12)] backdrop-blur-xl ${isDark ? "border-white/12 bg-[#18251e]/80" : "border-[#183a2b]/10 bg-white/60"}`}>
              <div className={`flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-6 ${isDark ? "border-white/10 bg-white/[0.035]" : "border-[#183a2b]/10 bg-white/55"}`}>
                <div className={`flex min-w-0 items-center gap-2 text-xs ${rootText}`}>
                  <SafeLogoImage isMinimal className="h-7 w-7 shrink-0 object-contain" alt="" />
                  <span className="font-serif font-bold tracking-[0.08em]">COMMUÁRIA</span>
                  <span aria-hidden="true" className={mutedText}>/</span>
                  <span className={mutedText}>Mapa público</span>
                </div>
                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] backdrop-blur-lg ${isDark ? "border-white/12 bg-white/[0.05] text-emerald-100" : "border-[#183a2b]/10 bg-white/70 text-emerald-800"}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {currentCity ? `${currentCity.name} · ${currentCity.state}` : "Mapa municipal"}
                </span>
              </div>
              <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-center lg:gap-10">
                <LandingReveal className="flex flex-col">
                  <p className={`${sectionLabelClass} mb-4 ${isDark ? "text-emerald-200" : "text-emerald-800"}`}>03 · A plataforma</p>
                  <h2 id="map-title" className={`font-serif text-3xl font-semibold leading-tight tracking-tight sm:text-4xl ${rootText}`}>
                    Veja as ocorrências no território.
                  </h2>
                  <p className={`mt-4 text-sm leading-6 sm:text-base sm:leading-7 ${mutedText}`}>
                    Explore os registros públicos do município e abra um marcador para consultar os detalhes disponíveis.
                  </p>

                  <label className={`mt-7 flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.14em] ${rootText}`}>
                    Selecionar município
                    <span className="relative">
                      <select
                        aria-label="Selecionar município no mapa público"
                        value={selectedCityId}
                        disabled={activeCities.length < 2}
                        onChange={(event) => onCityChange(event.target.value)}
                        className={`min-h-12 w-full appearance-none rounded-xl border px-4 pr-11 text-sm font-medium normal-case tracking-normal outline-none transition focus-visible:ring-2 focus-visible:ring-emerald-600/40 disabled:cursor-default ${
                          isDark ? "border-white/15 bg-[#111b15] text-white" : "border-[#183a2b]/15 bg-white text-[#183a2b]"
                        }`}
                      >
                        {activeCities.map((availableCity) => (
                          <option key={availableCity.id} value={availableCity.id}>
                            {availableCity.name} · {availableCity.state}
                          </option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                        <Navigation size={16} aria-hidden="true" />
                      </span>
                    </span>
                  </label>

                  <div className={`mt-7 grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-1 ${mutedText}`}>
                    <div className="flex items-center gap-2.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#d99a1b]" />
                      <span>Aberta ou em análise</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#386b83]" />
                      <span>Em andamento</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#16824b]" />
                      <span>Concluída</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className={`h-3 w-3 rounded-sm border-2 ${isDark ? "border-emerald-200" : "border-emerald-800"}`} />
                      <span>Limite municipal</span>
                    </div>
                  </div>

                  <p className={`mt-7 border-t pt-5 text-xs leading-5 ${isDark ? "border-white/10 text-white/60" : "border-[#183a2b]/10 text-[#52675a]"}`}>
                    O mapa exibe apenas campos públicos e localização aproximada; dados pessoais não são mostrados.
                  </p>
                </LandingReveal>

                <LandingReveal delay={0.08} className="min-w-0">
                  <div
                    role="region"
                    aria-label={`Mapa público de ocorrências de ${cityName}`}
                    className={`relative h-[390px] overflow-hidden rounded-[1.5rem] border shadow-[0_20px_50px_rgba(20,40,28,0.12)] sm:h-[470px] lg:h-[560px] ${isDark ? "border-white/10 bg-[#dfe8df]" : "border-[#183a2b]/10 bg-[#dfe8df]"}`}
                  >
                    <MapContainer
                      center={[currentCity?.center_lat ?? -25.633835, currentCity?.center_lng ?? -49.461966]}
                      zoom={currentCity?.default_zoom || 12}
                      minZoom={6}
                      zoomControl
                      attributionControl
                      keyboard
                      style={{
                        height: "100%",
                        width: "100%",
                        filter: isDark ? "saturate(.82) contrast(1.05) brightness(.88)" : "saturate(.94) contrast(1.02)",
                      }}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      />
                      <LandingMapFocus city={currentCity} />
                      {activeCities.map((mapCity) => (
                        <GeoJSON
                          key={mapCity.id}
                          data={cityFeature(mapCity)}
                          style={() => ({
                            color: mapCity.id === currentCity?.id ? "#d99a1b" : isDark ? "#77a486" : "#467451",
                            weight: mapCity.id === currentCity?.id ? 3 : 1.5,
                            fillColor: mapCity.id === currentCity?.id ? "#f0c45d" : "#43a36b",
                            fillOpacity: mapCity.id === currentCity?.id ? 0.12 : 0.035,
                          })}
                          eventHandlers={{ click: () => onCityChange(mapCity.id) }}
                        />
                      ))}
                      {displayReports.map((report) => {
                        const latitude = Number(report.latitude);
                        const longitude = Number(report.longitude);
                        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
                        const safeTitle = sanitizePublicText(String(report.title || report.category || "Ocorrência urbana"), 100);
                        const safeDescription = sanitizePublicText(String(report.short_description || ""), 180);
                        const safeLocation = sanitizePublicLocation(String(report.public_location || "Localização aproximada"), 160);
                        return (
                          <Marker
                            key={report.id || `${latitude}-${longitude}`}
                            position={[latitude, longitude]}
                            icon={createPublicReportIcon(report.status)}
                          >
                            <Popup>
                              <div className="max-w-[250px] font-sans text-sm text-slate-800">
                                <strong>{safeTitle}</strong>
                                {safeDescription && <p className="mt-1 text-xs leading-relaxed">{safeDescription}</p>}
                                <p className="mt-1 text-xs text-slate-600">{safeLocation}</p>
                                <p className="mt-2 text-[11px] font-semibold">{getReportStatusLabel(report.status)}</p>
                              </div>
                            </Popup>
                          </Marker>
                        );
                      })}
                    </MapContainer>
                    {mapPointCount === 0 && (
                      <div className="pointer-events-none absolute bottom-4 left-4 z-[400] rounded-xl border border-white/60 bg-white/90 px-3.5 py-2.5 text-xs font-medium text-[#183a2b] shadow-lg backdrop-blur-sm">
                        Nenhum marcador público carregado neste momento.
                      </div>
                    )}
                  </div>
                  <div className={`mt-3 flex flex-wrap items-center justify-between gap-2 px-1 text-xs ${mutedText}`}>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      {currentCity ? `${currentCity.name} · ${currentCity.state}` : "Município"}
                    </span>
                    <span>{mapPointCount} {mapPointCount === 1 ? "ponto público" : "pontos públicos"}</span>
                  </div>
                </LandingReveal>
              </div>
              <div className={`grid gap-6 border-t p-5 sm:p-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-center ${isDark ? "border-white/10 bg-white/[0.025]" : "border-[#183a2b]/10 bg-white/35"}`}>
                <div className="max-w-sm">
                  <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${isDark ? "text-emerald-200" : "text-emerald-800"}`}>Commuária em uso</p>
                  <h3 className={`mt-2 font-serif text-2xl font-semibold leading-tight sm:text-3xl ${rootText}`}>
                    Uma experiência que acompanha você.
                  </h3>
                  <p className={`mt-3 text-sm leading-6 ${mutedText}`}>
                    Capturas reais da tela de registro em computador e celular, com dados de demonstração.
                  </p>
                </div>
                <div className="mx-auto flex w-full max-w-2xl items-end justify-center gap-3 sm:gap-5">
                  <figure className="min-w-0 max-w-[360px] flex-1">
                    <div className={`overflow-hidden rounded-[1.35rem] border shadow-[0_18px_50px_rgba(18,36,26,0.2)] ${isDark ? "border-white/15 bg-[#111b15]" : "border-[#183a2b]/15 bg-[#f4f7f4]"}`}>
                      <div aria-hidden="true" className={`flex h-8 items-center gap-1.5 border-b px-3 ${isDark ? "border-white/10 bg-white/[0.04]" : "border-[#183a2b]/10 bg-white/85"}`}>
                        <span className="h-2 w-2 rounded-full bg-rose-400/80" />
                        <span className="h-2 w-2 rounded-full bg-amber-400/80" />
                        <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
                        <span className={`ml-2 truncate text-[9px] font-medium ${mutedText}`}>commuaria · nova ocorrência</span>
                      </div>
                      <img
                        src={desktopReportCapture}
                        alt="Captura real da interface do Commuária em computador, com as categorias de registro de uma ocorrência."
                        className="block h-auto w-full"
                        width={700}
                        height={780}
                        loading="lazy"
                      />
                    </div>
                    <figcaption className={`mt-2 text-center text-[10px] font-medium ${mutedText}`}>Computador · categorias de solicitação</figcaption>
                  </figure>
                  <figure className="w-[min(24vw,150px)] min-w-[104px] shrink-0">
                    <div className={`rounded-[2rem] border p-1 shadow-[0_18px_50px_rgba(18,36,26,0.22)] ${isDark ? "border-white/15 bg-[#111b15]" : "border-[#183a2b]/15 bg-[#111b15]"}`}>
                      <img
                        src={mobileReportCapture}
                        alt="Captura real e responsiva da tela de registro do Commuária em celular."
                        className="block h-auto w-full rounded-[1.65rem]"
                        width={430}
                        height={1180}
                        loading="lazy"
                      />
                    </div>
                    <figcaption className={`mt-2 text-center text-[10px] font-medium ${mutedText}`}>Celular · mesma plataforma</figcaption>
                  </figure>
                </div>
              </div>
            </div>
          </section>

          <section id="recursos" aria-labelledby="features-title" className="scroll-mt-32 border-t border-[#183a2b]/10 py-16 sm:py-24">
            <LandingReveal>
              <div className="grid items-end gap-5 md:grid-cols-[1.1fr_0.7fr] md:gap-12">
                <div>
                  <p className={`${sectionLabelClass} mb-4 ${isDark ? "text-emerald-200" : "text-emerald-800"}`}>04 · Funcionalidades</p>
                  <h2 id="features-title" className={`max-w-3xl font-serif text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl ${rootText}`}>
                    Da primeira observação ao cuidado contínuo da cidade.
                  </h2>
                </div>
                <p className={`max-w-xl text-sm leading-6 sm:text-base sm:leading-7 ${mutedText}`}>
                  Ferramentas simples para compartilhar o que acontece no espaço público e acompanhar as respostas do município.
                </p>
              </div>
            </LandingReveal>

            <div className="mt-10 grid items-stretch gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:gap-12">
              <div className={`flex flex-col justify-center divide-y ${isDark ? "divide-white/12" : "divide-[#183a2b]/12"}`}>
                {[
                  {
                    eyebrow: "Participação cidadã",
                    title: "Registre com contexto.",
                    description: "Descreva o que aconteceu, selecione uma categoria e informe onde a cidade precisa de atenção.",
                    Icon: Camera,
                  },
                  {
                    eyebrow: "Acompanhamento",
                    title: "Saiba em que etapa está.",
                    description: "Consulte as atualizações da solicitação e mantenha o histórico do pedido sempre à mão.",
                    Icon: ClipboardCheck,
                  },
                  {
                    eyebrow: "Informação local",
                    title: "Encontre notícias e serviços.",
                    description: "Acesse comunicados e informações publicados para o município que você acompanha.",
                    Icon: Megaphone,
                  },
                ].map(({ eyebrow, title, description, Icon }, index) => (
                  <LandingReveal key={eyebrow} delay={index * 0.05}>
                    <article className="flex gap-4 py-5 sm:gap-5 sm:py-6">
                      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border ${isDark ? "border-white/15 bg-white/[0.06] text-emerald-100" : "border-[#183a2b]/10 bg-white/70 text-[#183a2b]"}`}>
                        <Icon size={20} aria-hidden="true" />
                      </span>
                      <div>
                        <p className={`text-[10px] font-semibold uppercase tracking-[0.17em] ${isDark ? "text-emerald-200" : "text-emerald-800"}`}>{eyebrow}</p>
                        <h3 className={`mt-1.5 font-serif text-xl font-semibold sm:text-2xl ${rootText}`}>{title}</h3>
                        <p className={`mt-2 max-w-lg text-sm leading-6 ${mutedText}`}>{description}</p>
                      </div>
                    </article>
                  </LandingReveal>
                ))}
                <LandingReveal delay={0.16} className="pt-6">
                  <button
                    type="button"
                    onClick={onEnter}
                    className={`inline-flex min-h-11 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${isDark ? "bg-white text-[#183a2b] hover:bg-emerald-50" : "bg-[#183a2b] text-white hover:bg-[#122c21]"}`}
                  >
                    Acessar para registrar <ArrowRight size={15} aria-hidden="true" />
                  </button>
                </LandingReveal>
              </div>

              <LandingReveal delay={0.06} className="min-w-0">
                <figure className="group relative h-full min-h-[390px] overflow-hidden rounded-[2.25rem] border border-white/20 shadow-[0_24px_70px_rgba(18,36,26,0.18)] sm:min-h-[510px]">
                  <img
                    src={cityMaintenancePhoto}
                    alt="Imagem ilustrativa de um técnico ajustando uma luminária de rua a partir de uma plataforma elevatória ao anoitecer."
                    className="absolute inset-0 h-full w-full object-cover object-[58%_center] transition-transform duration-700 group-hover:scale-[1.025]"
                    width={1408}
                    height={768}
                    loading="lazy"
                  />
                  <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#0c1711]/88 via-[#0c1711]/15 to-[#0c1711]/5" />
                  <div className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-[#102017]/65 px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.17em] text-white backdrop-blur-lg sm:left-7 sm:top-7">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
                    Cuidado urbano em movimento
                  </div>
                  <figcaption className="absolute inset-x-5 bottom-5 text-white sm:inset-x-7 sm:bottom-7">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/75">Da informação ao trabalho em campo</p>
                    <p className="mt-2 max-w-lg font-serif text-2xl font-semibold leading-tight sm:text-3xl">
                      Uma cidade mais bem cuidada começa com uma conversa que chega ao lugar certo.
                    </p>
                  </figcaption>
                </figure>
              </LandingReveal>
            </div>
          </section>

          <section id="municipios" aria-labelledby="cities-title" className="scroll-mt-32 py-10 sm:py-16">
            <div className={`grid overflow-hidden rounded-[2.25rem] border shadow-[0_28px_80px_rgba(18,36,26,0.12)] lg:grid-cols-[1.08fr_0.92fr] ${isDark ? "border-white/10 bg-[#183a2b]" : "border-[#183a2b]/10 bg-[#e7eee8]"}`}>
              <LandingReveal className="relative min-h-[330px] overflow-hidden sm:min-h-[460px] lg:min-h-[590px]">
                <figure className="group absolute inset-0">
                  <img
                    src={cityAerialPhoto}
                    alt="Imagem ilustrativa de uma paisagem urbana ao entardecer, sem representar um município específico."
                    className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-[1.02]"
                    width={1376}
                    height={768}
                    loading="lazy"
                  />
                  <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#0c1711]/80 via-[#0c1711]/10 to-transparent" />
                  <div className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-[#102017]/60 px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.17em] text-white backdrop-blur-lg sm:left-7 sm:top-7">
                    <MapPin size={13} aria-hidden="true" />
                    Territórios com histórias próprias
                  </div>
                  <figcaption className="absolute inset-x-5 bottom-5 text-white sm:inset-x-8 sm:bottom-8">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/75">Contexto urbano ilustrativo</p>
                    <p className="mt-2 max-w-xl font-serif text-2xl font-semibold leading-tight sm:text-3xl lg:text-4xl">
                      Cada cidade tem seu ritmo — e suas próprias prioridades.
                    </p>
                  </figcaption>
                </figure>
              </LandingReveal>

              <LandingReveal delay={0.08} className="flex flex-col justify-center p-6 sm:p-9 lg:p-12">
                <p className={`${sectionLabelClass} mb-4 ${isDark ? "text-emerald-200" : "text-emerald-800"}`}>05 · Para diferentes municípios</p>
                <h2 id="cities-title" className={`max-w-2xl font-serif text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl ${rootText}`}>
                  Uma plataforma. Muitos contextos locais.
                </h2>
                <p className={`mt-5 max-w-2xl text-sm leading-7 sm:text-base ${mutedText}`}>
                  Nascido em Araucária e preparado para diferentes municípios, o Commuária mantém cada experiência conectada ao território e às necessidades de quem vive nele.
                </p>
                <div className={`mt-8 border-t pt-6 ${isDark ? "border-white/15" : "border-[#183a2b]/12"}`}>
                  <div className="flex items-center gap-3">
                    <span className={`grid h-10 w-10 place-items-center rounded-xl ${isDark ? "bg-white/10 text-emerald-100" : "bg-[#183a2b]/[0.06] text-[#183a2b]"}`}>
                      <Building2 size={20} aria-hidden="true" />
                    </span>
                    <div>
                      <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${rootText}`}>Municípios disponíveis</p>
                      <p className={`mt-1 text-xs ${mutedText}`}>Escolha um território para explorar o mapa público.</p>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {activeCities.map((availableCity) => (
                      <button
                        key={availableCity.id}
                        type="button"
                        onClick={() => {
                          onCityChange(availableCity.id);
                          document.getElementById("mapa")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
                        }}
                        className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${isDark ? "border-white/15 text-white/85 hover:bg-white/10" : "border-[#183a2b]/12 bg-white/75 text-[#183a2b] hover:bg-[#183a2b]/[0.05]"}`}
                      >
                        <MapPin size={13} aria-hidden="true" />
                        {availableCity.name} · {availableCity.state}
                      </button>
                    ))}
                    {activeCities.length === 0 && (
                      <p className={`text-sm ${mutedText}`}>O mapa municipal estará disponível quando houver um município ativo.</p>
                    )}
                  </div>
                </div>
                <p className={`mt-7 text-[10px] leading-5 ${isDark ? "text-white/50" : "text-[#52675a]"}`}>
                  A imagem aérea é ilustrativa e não corresponde a um município específico.
                </p>
              </LandingReveal>
            </div>
          </section>

          <section id="acesso" aria-labelledby="final-title" className="scroll-mt-32 pb-10 pt-12 sm:pb-14 sm:pt-20">
            <LandingReveal>
              <div className="relative overflow-hidden rounded-[2rem] bg-[#183a2b] px-6 py-10 text-white shadow-[0_24px_60px_rgba(24,58,43,0.2)] sm:px-10 sm:py-14 lg:px-16">
                <div aria-hidden="true" className="absolute -right-16 -top-24 h-72 w-72 rounded-full border border-white/10" />
                <div aria-hidden="true" className="absolute -right-3 -top-10 h-48 w-48 rounded-full border border-white/10" />
                <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
                  <div className="max-w-2xl">
                    <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200">06 · Participe</p>
                    <h2 id="final-title" className="font-serif text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                      O cuidado com a cidade começa com uma boa conversa.
                    </h2>
                    <p className="mt-4 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
                      Acesse o Commuária para registrar uma ocorrência ou acompanhar o que acontece no seu município.
                    </p>
                  </div>
                  <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                    <button
                      type="button"
                      onClick={onEnter}
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#183a2b] transition-colors hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    >
                      Acessar plataforma <ArrowRight size={16} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={onSignup}
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    >
                      Criar conta <ArrowRight size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            </LandingReveal>
          </section>
        </main>

        <footer className={`relative z-10 border-t px-4 py-8 sm:px-6 lg:px-10 ${isDark ? "border-white/10 bg-[#17231d]/35" : "border-[#183a2b]/10 bg-white/55"}`}>
          <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <SafeLogoImage isMinimal className="h-9 w-9 object-contain" alt="" />
              <div>
                <p className={`font-serif text-sm font-bold tracking-[0.1em] ${rootText}`}>COMMUÁRIA</p>
                <p className={`mt-1 text-xs ${mutedText}`}>Participação cidadã e cuidado urbano.</p>
              </div>
            </div>
            <nav aria-label="Links do rodapé" className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
              {navLinks.map((link) => (
                <a key={link.href} href={link.href} className={`transition-colors ${isDark ? "text-white/65 hover:text-white" : "text-[#52675a] hover:text-[#183a2b]"}`}>
                  {link.label}
                </a>
              ))}
            </nav>
            <p className={`text-xs ${mutedText}`}>© {new Date().getFullYear()} Commuária</p>
          </div>
        </footer>
      </div>
    </div>
  );
};
