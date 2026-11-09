// Calcul pur de l'avancement des besoins horaires d'une classe.
// Aucune dépendance : ce module est testé par scripts/test-timetable-requirements.mjs.

export type RequirementProgressInput = {
  id: string;
  courseId: string;
  sessionType: string;
  groupLabel: string | null;
  sessionsPerWeek: number;
  durationMinutes: number;
};

export type SessionProgressInput = {
  courseId: string;
  sessionType: string;
  groupLabel: string | null;
};

export type RequirementProgress = {
  id: string;
  courseId: string;
  sessionType: string;
  groupLabel: string | null;
  required: number;
  placed: number;
  remaining: number;
  durationMinutes: number;
  weeklyMinutes: number;
  placedWeeklyMinutes: number;
  remainingWeeklyMinutes: number;
};

export type RequirementsProgress = {
  items: RequirementProgress[];
  totalWeeklyMinutes: number;
  placedWeeklyMinutes: number;
  remainingWeeklyMinutes: number;
};

export function normalizeGroupLabel(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function normalizeType(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Compte les séances déjà présentes pour chaque besoin horaire.
 * Un besoin identique est identifié par le cours, le type et le groupe
 * (comparaison insensible à la casse et aux espaces). Le nombre de séances
 * restantes ne devient jamais négatif lorsque des séances ont été ajoutées
 * manuellement en plus du besoin.
 */
export function computeRequirementsProgress(
  requirements: RequirementProgressInput[],
  sessions: SessionProgressInput[],
): RequirementsProgress {
  const items: RequirementProgress[] = requirements.map((requirement) => {
    const courseId = requirement.courseId.trim();
    const sessionType = normalizeType(requirement.sessionType);
    const groupLabel = normalizeGroupLabel(requirement.groupLabel);

    const placed = sessions.filter(
      (session) =>
        session.courseId.trim() === courseId &&
        normalizeType(session.sessionType) === sessionType &&
        normalizeGroupLabel(session.groupLabel) === groupLabel,
    ).length;

    const required = Math.max(0, Math.trunc(requirement.sessionsPerWeek));
    const durationMinutes = Math.max(0, Math.trunc(requirement.durationMinutes));
    const remaining = Math.max(0, required - placed);
    const countedPlaced = Math.min(placed, required);

    return {
      id: requirement.id,
      courseId,
      sessionType: requirement.sessionType,
      groupLabel: requirement.groupLabel,
      required,
      placed,
      remaining,
      durationMinutes,
      weeklyMinutes: required * durationMinutes,
      placedWeeklyMinutes: countedPlaced * durationMinutes,
      remainingWeeklyMinutes: remaining * durationMinutes,
    };
  });

  return {
    items,
    totalWeeklyMinutes: items.reduce(
      (total, item) => total + item.weeklyMinutes,
      0,
    ),
    placedWeeklyMinutes: items.reduce(
      (total, item) => total + item.placedWeeklyMinutes,
      0,
    ),
    remainingWeeklyMinutes: items.reduce(
      (total, item) => total + item.remainingWeeklyMinutes,
      0,
    ),
  };
}

/** Nombre total de minutes hebdomadaires prévues par les besoins. */
export function totalWeeklyMinutes(
  requirements: RequirementProgressInput[],
): number {
  return requirements.reduce(
    (total, requirement) =>
      total +
      Math.max(0, Math.trunc(requirement.sessionsPerWeek)) *
        Math.max(0, Math.trunc(requirement.durationMinutes)),
    0,
  );
}
