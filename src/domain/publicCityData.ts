/** Client-side defense-in-depth for public-safe municipal report projections. */
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

/** Removes likely house numbers and reuses public text sanitization for map labels. */
export function sanitizePublicLocation(value: string, maxLength = 160): string {
  return sanitizePublicText(value, maxLength)
    .replace(/,?\s*(?:n[ºo.]?\s*)?\d{1,5}(?=\s*(?:,|$))/gi, "")
    .replace(/\s+,/g, ",")
    .replace(/,{2,}/g, ",")
    .trim();
}
