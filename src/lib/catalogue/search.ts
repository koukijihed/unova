import type { CatalogueProgram } from "@/lib/catalogue/data";

export function normalizeForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function matchesProgramQuery(
  program: CatalogueProgram,
  query: string,
): boolean {
  const normalizedQuery = normalizeForSearch(query.trim());

  if (!normalizedQuery) {
    return true;
  }

  const haystack = normalizeForSearch(
    [
      program.name,
      program.code,
      program.degreeTypeLabel,
      program.departmentName ?? "",
      ...program.tracks.map((track) => track.name),
    ].join(" "),
  );

  return haystack.includes(normalizedQuery);
}
