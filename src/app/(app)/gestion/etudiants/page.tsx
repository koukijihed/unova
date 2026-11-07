import Link from "next/link";
import { AcceptAllDialog } from "@/components/management/accept-all-dialog";
import { StudentTable } from "@/components/management/student-table";
import { Notice } from "@/components/notice";
import { fr } from "@/content/fr";
import { getClassStudents, getManagementClasses } from "@/lib/management/data";
import type { ManagementStudent } from "@/lib/types";

export const metadata = {
  title: fr.app.management.students.metadataTitle,
};

function readSearchParam(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

function normalizeForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function countStudents(students: ManagementStudent[]) {
  return {
    total: students.length,
    pending: students.filter(
      (student) => student.enrollmentStatus === "pending",
    ).length,
    accepted: students.filter(
      (student) => student.enrollmentStatus === "accepted",
    ).length,
    rejected: students.filter(
      (student) => student.enrollmentStatus === "rejected",
    ).length,
    notRegistered: students.filter(
      (student) => !student.claimed && student.enrollmentStatus === null,
    ).length,
  };
}

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    classe?: string | string[];
    q?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const hasClassParam = params.classe !== undefined;
  const requestedClassId = readSearchParam(params.classe).trim();
  const searchQuery = readSearchParam(params.q).trim().slice(0, 100);

  const { classes, error: classesError } = await getManagementClasses();
  const selectedClass = hasClassParam
    ? (classes.find((item) => item.id === requestedClassId) ?? null)
    : (classes[0] ?? null);
  const invalidClass = Boolean(requestedClassId && !selectedClass);

  let students: ManagementStudent[] = [];
  let studentsError: "forbidden" | "load_failed" | null = null;

  if (selectedClass) {
    const result = await getClassStudents(selectedClass.id);
    students = result.students;
    studentsError = result.error;
  }

  const counters = countStudents(students);
  const normalizedQuery = normalizeForSearch(searchQuery);
  const visibleStudents = normalizedQuery
    ? students.filter((student) =>
        normalizeForSearch(`${student.firstName} ${student.lastName}`).includes(
          normalizedQuery,
        ),
      )
    : students;

  const labels = fr.app.management.students;
  const messages = labels.messages;
  const counterItems = [
    { label: labels.counters.total, value: counters.total },
    { label: labels.counters.pending, value: counters.pending },
    { label: labels.counters.accepted, value: counters.accepted },
    { label: labels.counters.rejected, value: counters.rejected },
    { label: labels.counters.notRegistered, value: counters.notRegistered },
  ];
  const studentsErrorMessage =
    studentsError === "forbidden"
      ? messages.forbidden
      : labels.studentsLoadFailed;
  const emptyMessage =
    students.length === 0 ? labels.noStudents : labels.noSearchResults;

  return (
    <section className="mx-auto w-full max-w-6xl">
      <p className="text-sm font-semibold tracking-[0.18em] text-primary uppercase">
        {labels.eyebrow}
      </p>

      <h1 className="mt-3 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
        {labels.title}
      </h1>

      <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
        {labels.description}
      </p>

      {classesError ? (
        <Notice tone="error">
          <p>{labels.classesLoadFailed}</p>
        </Notice>
      ) : classes.length === 0 ? (
        <Notice tone="info">
          <p>{labels.noClasses}</p>
        </Notice>
      ) : (
        <>
          <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <form
              method="get"
              action="/gestion/etudiants"
              className="flex flex-col gap-2 sm:flex-row sm:items-end"
            >
              <div className="min-w-0 flex-1">
                <label
                  htmlFor="class-select"
                  className="mb-1.5 block text-sm font-medium text-slate-800"
                >
                  {labels.classLabel}
                </label>
                <select
                  id="class-select"
                  name="classe"
                  defaultValue={selectedClass?.id ?? ""}
                  className="h-10 w-full rounded-xl border border-primary/15 bg-white px-3 text-sm text-foreground shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <option value="">{labels.classPlaceholder}</option>
                  {classes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              {searchQuery ? (
                <input type="hidden" name="q" value={searchQuery} />
              ) : null}

              <button
                type="submit"
                className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-white px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {labels.showClass}
              </button>
            </form>

            <form
              method="get"
              action="/gestion/etudiants"
              className="flex flex-col gap-2 sm:flex-row sm:items-end"
            >
              <div className="min-w-0 flex-1">
                <label
                  htmlFor="student-search"
                  className="mb-1.5 block text-sm font-medium text-slate-800"
                >
                  {labels.searchLabel}
                </label>
                <input
                  id="student-search"
                  type="search"
                  name="q"
                  defaultValue={searchQuery}
                  maxLength={100}
                  placeholder={labels.searchPlaceholder}
                  className="h-10 w-full rounded-xl border border-primary/15 bg-white px-3 text-sm text-foreground shadow-sm placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                />
              </div>

              {selectedClass ? (
                <input
                  type="hidden"
                  name="classe"
                  value={selectedClass.id}
                />
              ) : null}

              <button
                type="submit"
                className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {labels.searchSubmit}
              </button>
            </form>
          </div>

          {searchQuery ? (
            <div className="mt-3">
              <Link
                href={
                  selectedClass
                    ? `/gestion/etudiants?classe=${encodeURIComponent(selectedClass.id)}`
                    : "/gestion/etudiants"
                }
                className="inline-flex items-center rounded-lg text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {labels.clearSearch}
              </Link>
            </div>
          ) : null}

          {invalidClass ? (
            <Notice tone="error">
              <p>{labels.invalidClass}</p>
            </Notice>
          ) : null}

          {selectedClass ? (
            <>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <h2 className="text-xl font-semibold tracking-tight text-primary">
                  {selectedClass.label}
                </h2>

                {studentsError === null ? (
                  <AcceptAllDialog
                    classId={selectedClass.id}
                    classLabel={selectedClass.label}
                    pendingCount={counters.pending}
                  />
                ) : null}
              </div>

              {studentsError ? (
                <Notice tone="error">
                  <p>{studentsErrorMessage}</p>
                </Notice>
              ) : (
                <>
                  <section
                    aria-label={labels.countersAriaLabel}
                    className="mt-5"
                  >
                    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                      {counterItems.map((item) => (
                        <div
                          key={item.label}
                          className="rounded-2xl border border-primary/10 bg-white p-4 shadow-sm"
                        >
                          <dt className="text-xs font-semibold tracking-wide text-slate-600 uppercase">
                            {item.label}
                          </dt>
                          <dd className="mt-1 text-2xl font-bold text-primary">
                            {item.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </section>

                  <div className="mt-6">
                    <StudentTable
                      students={visibleStudents}
                      emptyMessage={emptyMessage}
                    />
                  </div>
                </>
              )}
            </>
          ) : invalidClass ? null : (
            <Notice tone="info">
              <p>{labels.noClassSelected}</p>
            </Notice>
          )}
        </>
      )}
    </section>
  );
}
