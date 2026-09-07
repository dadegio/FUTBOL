export const PLAYOFF_FORMATS = new Set(["SINGLE_ELIM", "TWO_LEG"]);
export const PLAYOFF_COUNTS = new Set([2, 4, 8, 16]);
export const THEME_MODES = new Set(["IMPERIAL", "GENERIC", "CUSTOM"]);

export function normalizeOptionalUrl(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  if (text.startsWith("/") || /^https?:\/\//i.test(text)) return text;
  return undefined;
}

export function uniqueStringIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set<string>(
      value
        .map((id: unknown) => String(id).trim())
        .filter((id: string) => id.length > 0)
    )
  );
}
