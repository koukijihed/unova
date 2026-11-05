import { EnrollmentActions } from "@/components/management/enrollment-actions";
import { StudentStatusBadge } from "@/components/management/student-status-badge";
import { fr } from "@/content/fr";
import type { ManagementStudent } from "@/lib/types";

function StudentActions({ student }: { student: ManagementStudent }) {
  if (student.enrollmentId) {
    const studentName =
      `${student.firstName} ${student.lastName}`.trim() ||
      fr.app.management.students.actions.unknownStudent;

    return (
      <EnrollmentActions
        enrollmentId={student.enrollmentId}
        status={student.enrollmentStatus}
        studentName={studentName}
      />
    );
  }

  return (
    <span className="text-xs text-slate-500">
      <span aria-hidden="true">—</span>
      <span className="sr-only">
        {fr.app.management.students.actions.noActions}
      </span>
    </span>
  );
}

export function StudentTable({
  students,
  emptyMessage,
}: {
  students: ManagementStudent[];
  emptyMessage: string;
}) {
  const labels = fr.app.management.students;

  if (students.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-primary/20 bg-white px-5 py-10 text-center text-sm leading-6 text-slate-600">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-2xl border border-primary/10 bg-white shadow-sm md:block">
        <table className="min-w-full divide-y divide-primary/10 text-left text-sm">
          <caption className="sr-only">{labels.table.caption}</caption>
          <thead className="bg-slate-50 text-xs tracking-wide text-slate-600 uppercase">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">
                {labels.table.lastName}
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                {labels.table.firstName}
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                {labels.table.status}
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                {labels.table.actions}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-primary/10">
            {students.map((student) => (
              <tr key={student.rosterId} className="align-top">
                <td className="px-4 py-4 font-medium text-slate-900">
                  {student.lastName || "—"}
                </td>
                <td className="px-4 py-4 text-slate-800">
                  {student.firstName || "—"}
                </td>
                <td className="px-4 py-4">
                  <StudentStatusBadge
                    status={student.enrollmentStatus}
                    claimed={student.claimed}
                  />
                </td>
                <td className="px-4 py-4">
                  <StudentActions student={student} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden">
        {students.map((student) => (
          <li
            key={student.rosterId}
            className="rounded-2xl border border-primary/10 bg-white p-4 shadow-sm"
          >
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  {labels.table.lastName}
                </dt>
                <dd className="mt-0.5 font-medium text-slate-900">
                  {student.lastName || "—"}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  {labels.table.firstName}
                </dt>
                <dd className="mt-0.5 text-slate-800">
                  {student.firstName || "—"}
                </dd>
              </div>

              <div className="col-span-2">
                <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  {labels.table.status}
                </dt>
                <dd className="mt-1">
                  <StudentStatusBadge
                    status={student.enrollmentStatus}
                    claimed={student.claimed}
                  />
                </dd>
              </div>

              <div className="col-span-2 border-t border-primary/10 pt-3">
                <dt className="sr-only">{labels.table.actions}</dt>
                <dd>
                  <StudentActions student={student} />
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
