const ARAUCARIA_NEIGHBORHOODS = [
  "Capela Velha",
  "Costeira",
  "Iguaçu",
  "Centro",
  "Cachoeira",
  "Fazenda Velha",
  "Campina da Barra",
  "Tindiquera",
  "Boqueirão",
  "Thomaz Coelho",
  "Estação",
  "Passaúna",
  "São Miguel",
  "Vila Nova",
  "Porto das Laranjeiras",
  "Jardim Plínio",
  "Barigui",
  "Laranjeiras",
  "Sabiá",
  "Califórnia",
  "Guajuvira",
] as const;

/** Extracts a region label without assuming every tenant is Araucária. */
export function extractNeighborhoodFromAddress(
  address?: string | null,
  cityName?: string | null,
): string {
  const municipalityName = cityName?.trim() || "";
  const municipalityKey = normalize(municipalityName);
  const isAraucaria =
    municipalityKey === "araucaria" ||
    (!municipalityName && Boolean(address && normalize(address).includes("araucaria")));

  if (!address || !address.trim()) {
    if (isAraucaria) return "Região Central / Sede";
    return municipalityName ? `Região Central / ${municipalityName}` : "Região Central";
  }

  const lower = address.toLowerCase();
  if (isAraucaria) {
    if (lower.includes("victor do amaral")) return "Centro";
    if (lower.includes("vila angélica") || lower.includes("vila angelica")) return "Vila Angélica";
    if (lower.includes("jardim industrial")) return "Jardim Industrial";

    const knownNeighborhood = ARAUCARIA_NEIGHBORHOODS.find((neighborhood) =>
      lower.includes(neighborhood.toLowerCase()),
    );
    if (knownNeighborhood) return knownNeighborhood;
  }

  const ignoredParts = new Set([
    municipalityKey,
    "parana",
    "pr",
    "brasil",
    "regiao sul",
    "regiao metropolitana de curitiba",
  ]);
  const parts = address
    .split(/[,/]|\s+-\s+/)
    .map((part) => part.trim())
    .filter((part) => {
      if (!part) return false;
      const normalizedPart = normalize(part);
      if (/^\d+$/.test(normalizedPart) || /^\d{5}-?\d{3}$/.test(normalizedPart)) return false;
      if (ignoredParts.has(normalizedPart)) return false;
      return true;
    });

  if (parts.length >= 2) return parts[parts.length - 1];
  if (parts.length === 1) return parts[0];
  return municipalityName ? `${municipalityName} (Sede)` : "Região Central";
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
