import { cache } from "react";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type Relation<T> = T | T[] | null;

function firstRelation<T>(value: Relation<T>): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

export type CatalogueTrack = {
  id: string;
  name: string;
};

export type CatalogueProgram = {
  id: string;
  code: string;
  name: string;
  degreeTypeCode: string;
  degreeTypeLabel: string;
  degreeTypeSortOrder: number;
  departmentName: string | null;
  isCoConstructed: boolean;
  isActive: boolean;
  sourceNote: string | null;
  tracks: CatalogueTrack[];
};

export type CatalogueGroup = {
  code: string;
  label: string;
  sortOrder: number;
  programs: CatalogueProgram[];
};

export type CatalogueResult = {
  groups: CatalogueGroup[];
  programs: CatalogueProgram[];
  error: boolean;
};

type ProgramRow = {
  id: string;
  code: string;
  name: string;
  degree_type_code: string;
  is_co_constructed: boolean;
  is_active: boolean;
  source_note: string | null;
  degree_types: Relation<{
    label_fr: string | null;
    sort_order: number | null;
  }>;
  departments: Relation<{ name: string | null }>;
  program_tracks: { id: string; name: string }[] | null;
};

function parseProgram(row: ProgramRow): CatalogueProgram {
  const degreeType = firstRelation(row.degree_types);

  return {
    id: row.id,
    code: row.code,
    name: row.name,
    degreeTypeCode: row.degree_type_code,
    degreeTypeLabel: degreeType?.label_fr?.trim() ?? "",
    degreeTypeSortOrder: degreeType?.sort_order ?? 0,
    departmentName: firstRelation(row.departments)?.name?.trim() ?? null,
    isCoConstructed: row.is_co_constructed === true,
    isActive: row.is_active === true,
    sourceNote: row.source_note?.trim() || null,
    tracks: (row.program_tracks ?? [])
      .map((track) => ({ id: track.id, name: track.name }))
      .sort((a, b) => a.name.localeCompare(b.name, "fr")),
  };
}

function groupPrograms(programs: CatalogueProgram[]): CatalogueGroup[] {
  const groups = new Map<string, CatalogueGroup>();

  for (const program of programs) {
    const existing = groups.get(program.degreeTypeCode);

    if (existing) {
      existing.programs.push(program);
    } else {
      groups.set(program.degreeTypeCode, {
        code: program.degreeTypeCode,
        label: program.degreeTypeLabel || program.degreeTypeCode,
        sortOrder: program.degreeTypeSortOrder,
        programs: [program],
      });
    }
  }

  return Array.from(groups.values()).sort(
    (a, b) =>
      a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, "fr"),
  );
}

const PROGRAM_SELECT = `id, code, name, degree_type_code,
  is_co_constructed, is_active, source_note,
  degree_types(label_fr, sort_order),
  departments(name),
  program_tracks(id, name)`;

export const getCataloguePrograms = cache(
  async (): Promise<CatalogueResult> => {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("programs")
      .select(PROGRAM_SELECT)
      .order("name", { ascending: true });

    if (error) {
      return { groups: [], programs: [], error: true };
    }

    const programs = ((data ?? []) as unknown as ProgramRow[])
      .map(parseProgram)
      .sort((a, b) => a.name.localeCompare(b.name, "fr"));

    return {
      groups: groupPrograms(programs),
      programs,
      error: false,
    };
  },
);

export const getProgramByCode = cache(
  async (
    code: string,
  ): Promise<{ program: CatalogueProgram | null; error: boolean }> => {
    const normalizedCode = code.trim().toUpperCase();
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("programs")
      .select(PROGRAM_SELECT)
      .eq("code", normalizedCode)
      .maybeSingle();

    if (error) {
      return { program: null, error: true };
    }

    if (!data) {
      return { program: null, error: false };
    }

    return {
      program: parseProgram(data as unknown as ProgramRow),
      error: false,
    };
  },
);

export type DegreeProgramCount = {
  code: string;
  label: string;
  sortOrder: number;
  count: number;
};

export type DegreeProgramCountsResult = {
  items: DegreeProgramCount[];
  error: boolean;
};

type CountRow = {
  degree_type_code: string;
  degree_types: Relation<{
    label_fr: string | null;
    sort_order: number | null;
  }>;
};

export const getActiveProgramCounts = cache(
  async (): Promise<DegreeProgramCountsResult> => {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("programs")
      .select("degree_type_code, degree_types(label_fr, sort_order)")
      .eq("is_active", true);

    if (error) {
      return { items: [], error: true };
    }

    const counts = new Map<string, DegreeProgramCount>();

    for (const row of (data ?? []) as unknown as CountRow[]) {
      const degreeType = firstRelation(row.degree_types);
      const existing = counts.get(row.degree_type_code);

      if (existing) {
        existing.count += 1;
      } else {
        counts.set(row.degree_type_code, {
          code: row.degree_type_code,
          label:
            degreeType?.label_fr?.trim() || row.degree_type_code,
          sortOrder: degreeType?.sort_order ?? 0,
          count: 1,
        });
      }
    }

    const items = Array.from(counts.values()).sort(
      (a, b) =>
        a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, "fr"),
    );

    return { items, error: false };
  },
);
