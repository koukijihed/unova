import { fr } from "@/content/fr";
import type { EnrollmentStatus } from "@/lib/types";

type StatusKey =
  | EnrollmentStatus
  | "notRegistered"
  | "unavailable";

const STATUS_CLASSES: Record<StatusKey, string> = {
  pending: "border-amber-300 bg-amber-50 text-amber-900",
  accepted: "border-emerald-300 bg-emerald-50 text-emerald-900",
  rejected: "border-red-300 bg-red-50 text-red-800",
  interrupted: "border-slate-300 bg-slate-100 text-slate-800",
  graduated: "border-sky-300 bg-sky-50 text-sky-900",
  notRegistered: "border-slate-300 bg-slate-50 text-slate-700",
  unavailable: "border-slate-300 bg-slate-50 text-slate-700",
};

function getStatusKey(
  status: EnrollmentStatus | null,
  claimed: boolean,
): StatusKey {
  if (!claimed) {
    return "notRegistered";
  }

  return status ?? "unavailable";
}

export function StudentStatusBadge({
  status,
  claimed,
}: {
  status: EnrollmentStatus | null;
  claimed: boolean;
}) {
  const key = getStatusKey(status, claimed);

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${STATUS_CLASSES[key]}`}
    >
      {fr.app.management.students.statuses[key]}
    </span>
  );
}
