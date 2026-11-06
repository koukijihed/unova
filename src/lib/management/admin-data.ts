import { createServerSupabaseClient } from "@/lib/supabase/server";

type Relation<T> = T | T[] | null;

type CountRelation = { count: number } | { count: number }[] | null;

export type ListResult<T> = {
  items: T[];
  error: boolean;
};

export type AcademicYear = {
  id: string;
  label: string;
  startsOn: string;
  endsOn: string;
  isCurrent: boolean;
  enrollmentOpen: boolean;
};

export type DegreeType = {
  code: string;
  label: string;
};

export type Department = {
  id: string;
  name: string;
};

export type AcademicLevel = {
  code: string;
  label: string;
};

export type ProgramListItem = {
  id: string;
  code: string;
  name: string;
  degreeTypeCode: string;
  degreeTypeLabel: string;
  departmentId: string | null;
  departmentName: string | null;
  isCoConstructed: boolean;
  autoAccept: boolean;
  isActive: boolean;
  sourceNote: string | null;
  trackCount: number;
  classCount: number;
};

export type ProgramDetail = ProgramListItem;

export type ProgramTrack = {
  id: string;
  name: string;
};

export type ProgramClass = {
  id: string;
  name: string;
  levelCode: string;
  levelLabel: string;
  trackId: string | null;
  trackName: string | null;
  academicYearId: string;
  academicYearLabel: string;
};

export type ProgramDirector = {
  userId: string;
  firstName: string;
  lastName: string;
};

type AcademicYearRow = {
  id: string;
  label: string;
  starts_on: string;
  ends_on: string;
  is_current: boolean;
  enrollment_open: boolean;
};

type ProgramRow = {
  id: string;
  code: string;
  name: string;
  degree_type_code: string;
  department_id: string | null;
  is_co_constructed: boolean;
  auto_accept: boolean;
  is_active: boolean;
  source_note: string | null;
  degree_types: Relation<{ label_fr: string | null }>;
  departments: Relation<{ name: string | null }>;
  program_tracks: CountRelation;
  classes: CountRelation;
};

type ProgramDetailRow = Omit<
  ProgramRow,
  "program_tracks" | "classes"
>;

type ProgramClassRow = {
  id: string;
  name: string;
  level_code: string;
  track_id: string | null;
  academic_year_id: string;
  academic_years: Relation<{ label: string | null }>;
  academic_levels: Relation<{ label_fr: string | null }>;
  program_tracks: Relation<{ name: string | null }>;
};

type ProgramDirectorRow = {
  user_id: string;
  profiles: Relation<{ first_name: string | null; last_name: string | null }>;
};

function firstRelation<T>(value: Relation<T>): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function readCount(value: CountRelation): number {
  if (Array.isArray(value)) {
    return value[0]?.count ?? 0;
  }

  return value?.count ?? 0;
}

function parseProgramRow(row: ProgramRow): ProgramListItem {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    degreeTypeCode: row.degree_type_code,
    degreeTypeLabel: firstRelation(row.degree_types)?.label_fr?.trim() ?? "",
    departmentId: row.department_id,
    departmentName: firstRelation(row.departments)?.name?.trim() ?? null,
    isCoConstructed: row.is_co_constructed === true,
    autoAccept: row.auto_accept === true,
    isActive: row.is_active === true,
    sourceNote: row.source_note?.trim() || null,
    trackCount: readCount(row.program_tracks),
    classCount: readCount(row.classes),
  };
}

function parseProgramDetailRow(row: ProgramDetailRow): ProgramDetail {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    degreeTypeCode: row.degree_type_code,
    degreeTypeLabel: firstRelation(row.degree_types)?.label_fr?.trim() ?? "",
    departmentId: row.department_id,
    departmentName: firstRelation(row.departments)?.name?.trim() ?? null,
    isCoConstructed: row.is_co_constructed === true,
    autoAccept: row.auto_accept === true,
    isActive: row.is_active === true,
    sourceNote: row.source_note?.trim() || null,
    trackCount: 0,
    classCount: 0,
  };
}

export async function getAcademicYears(): Promise<ListResult<AcademicYear>> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("academic_years")
    .select("id, label, starts_on, ends_on, is_current, enrollment_open")
    .order("label", { ascending: false });

  if (error) {
    return { items: [], error: true };
  }

  const items = ((data ?? []) as AcademicYearRow[]).map((row) => ({
    id: row.id,
    label: row.label,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    isCurrent: row.is_current === true,
    enrollmentOpen: row.enrollment_open === true,
  }));

  return { items, error: false };
}

export async function getDegreeTypes(): Promise<ListResult<DegreeType>> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("degree_types")
    .select("code, label_fr")
    .order("sort_order", { ascending: true });

  if (error) {
    return { items: [], error: true };
  }

  const items = ((data ?? []) as { code: string; label_fr: string }[]).map(
    (row) => ({ code: row.code, label: row.label_fr }),
  );

  return { items, error: false };
}

export async function getDepartments(): Promise<ListResult<Department>> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("departments")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    return { items: [], error: true };
  }

  const items = ((data ?? []) as { id: string; name: string }[]).map(
    (row) => ({ id: row.id, name: row.name }),
  );

  return { items, error: false };
}

export async function getAcademicLevels(): Promise<ListResult<AcademicLevel>> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("academic_levels")
    .select("code, label_fr")
    .order("sort_order", { ascending: true });

  if (error) {
    return { items: [], error: true };
  }

  const items = ((data ?? []) as { code: string; label_fr: string }[]).map(
    (row) => ({ code: row.code, label: row.label_fr }),
  );

  return { items, error: false };
}

export async function getPrograms(): Promise<ListResult<ProgramListItem>> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("programs")
    .select(
      `id, code, name, degree_type_code, department_id,
       is_co_constructed, auto_accept, is_active, source_note,
       degree_types(label_fr),
       departments(name),
       program_tracks(count),
       classes(count)`,
    )
    .order("name", { ascending: true });

  if (error) {
    return { items: [], error: true };
  }

  const items = ((data ?? []) as unknown as ProgramRow[])
    .map(parseProgramRow)
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));

  return { items, error: false };
}

export async function getProgramDetail(
  programId: string,
): Promise<{ program: ProgramDetail | null; error: boolean }> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("programs")
    .select(
      `id, code, name, degree_type_code, department_id,
       is_co_constructed, auto_accept, is_active, source_note,
       degree_types(label_fr),
       departments(name)`,
    )
    .eq("id", programId)
    .maybeSingle();

  if (error) {
    return { program: null, error: true };
  }

  if (!data) {
    return { program: null, error: false };
  }

  return {
    program: parseProgramDetailRow(data as unknown as ProgramDetailRow),
    error: false,
  };
}

export async function getProgramTracks(
  programId: string,
): Promise<ListResult<ProgramTrack>> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("program_tracks")
    .select("id, name")
    .eq("program_id", programId)
    .order("name", { ascending: true });

  if (error) {
    return { items: [], error: true };
  }

  const items = ((data ?? []) as { id: string; name: string }[]).map(
    (row) => ({ id: row.id, name: row.name }),
  );

  return { items, error: false };
}

export async function getProgramClasses(
  programId: string,
): Promise<ListResult<ProgramClass>> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("classes")
    .select(
      `id, name, level_code, track_id, academic_year_id,
       academic_years(label),
       academic_levels(label_fr),
       program_tracks(name)`,
    )
    .eq("program_id", programId);

  if (error) {
    return { items: [], error: true };
  }

  const items = ((data ?? []) as unknown as ProgramClassRow[])
    .map((row) => ({
      id: row.id,
      name: row.name,
      levelCode: row.level_code,
      levelLabel:
        firstRelation(row.academic_levels)?.label_fr?.trim() ?? row.level_code,
      trackId: row.track_id,
      trackName: firstRelation(row.program_tracks)?.name?.trim() ?? null,
      academicYearId: row.academic_year_id,
      academicYearLabel:
        firstRelation(row.academic_years)?.label?.trim() ?? "",
    }))
    .sort(
      (a, b) =>
        b.academicYearLabel.localeCompare(a.academicYearLabel) ||
        a.name.localeCompare(b.name, "fr"),
    );

  return { items, error: false };
}

export async function getProgramDirectors(
  programId: string,
): Promise<ListResult<ProgramDirector>> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("program_directors")
    .select("user_id, profiles(first_name, last_name)")
    .eq("program_id", programId);

  if (error) {
    return { items: [], error: true };
  }

  const items = ((data ?? []) as unknown as ProgramDirectorRow[])
    .map((row) => {
      const profile = firstRelation(row.profiles);

      return {
        userId: row.user_id,
        firstName: profile?.first_name?.trim() ?? "",
        lastName: profile?.last_name?.trim() ?? "",
      };
    })
    .sort(
      (a, b) =>
        a.lastName.localeCompare(b.lastName, "fr") ||
        a.firstName.localeCompare(b.firstName, "fr"),
    );

  return { items, error: false };
}
