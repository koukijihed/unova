export const ACADEMIC_YEAR_LABEL_PATTERN = /^[0-9]{4}-[0-9]{4}$/;
export const PROGRAM_CODE_PATTERN = /^[A-Z0-9-]{2,20}$/;
export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const PROGRAM_NAME_MAX_LENGTH = 200;
export const TRACK_NAME_MAX_LENGTH = 200;
export const CLASS_NAME_MAX_LENGTH = 200;
export const SOURCE_NOTE_MAX_LENGTH = 500;

export function isValidDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function isConsecutiveAcademicYear(label: string): boolean {
  if (!ACADEMIC_YEAR_LABEL_PATTERN.test(label)) {
    return false;
  }

  const [start, end] = label.split("-").map(Number);

  return end === start + 1;
}

export function isValidAcademicYearLabel(label: string): boolean {
  return (
    ACADEMIC_YEAR_LABEL_PATTERN.test(label) &&
    isConsecutiveAcademicYear(label)
  );
}

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}
