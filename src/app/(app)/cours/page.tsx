import type { Metadata } from "next";
import Link from "next/link";
import { Notice } from "@/components/notice";
import { fr } from "@/content/fr";
import {
  getCurrentEnrollment,
  getCurrentRoles,
  getCurrentStudentProfile,
} from "@/lib/auth/session";
import { getVisibleCourses } from "@/lib/management/course-data";
import type { EnrollmentStatus } from "@/lib/types";

export const metadata: Metadata = {
  title: fr.app.courses.metadataTitle,
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

function EmptyCourses({
  isVerifiedStudent,
  hasStaffRole,
  enrollmentStatus,
}: {
  isVerifiedStudent: boolean;
  hasStaffRole: boolean;
  enrollmentStatus: EnrollmentStatus | null;
}) {
  const labels = fr.app.courses;

  if (!isVerifiedStudent && !hasStaffRole) {
    return (
      <Notice tone="warning">
        <p>{labels.notVerified}</p>
        <Link
          href="/verification"
          className="mt-3 inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {labels.verifyLink}
        </Link>
      </Notice>
    );
  }

  if (isVerifiedStudent && enrollmentStatus === "pending") {
    return (
      <Notice tone="warning">
        <p>{labels.enrollmentPending}</p>
      </Notice>
    );
  }

  if (
    isVerifiedStudent &&
    enrollmentStatus !== null &&
    enrollmentStatus !== "accepted"
  ) {
    return (
      <Notice tone="info">
        <p>{labels.enrollmentNotAccepted}</p>
      </Notice>
    );
  }

  return (
    <p className="mt-8 rounded-2xl border border-dashed border-primary/20 bg-white px-5 py-8 text-center text-sm leading-6 text-slate-600">
      {labels.empty}
    </p>
  );
}

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const params = await searchParams;
  const query = readSearchParam(params.q).trim().slice(0, 100);

  const [result, studentProfile, enrollment, roles] = await Promise.all([
    getVisibleCourses(),
    getCurrentStudentProfile(),
    getCurrentEnrollment(),
    getCurrentRoles(),
  ]);

  const labels = fr.app.courses;
  const normalizedQuery = normalizeForSearch(query);
  const hasStaffRole =
    roles?.some(
      (role) =>
        role === "teacher" || role === "director" || role === "admin",
    ) ?? false;

  const visibleCourses = normalizedQuery
    ? result.courses.filter((course) =>
        normalizeForSearch(
          [
            course.name,
            course.classLabel,
            ...course.teachers.map((teacher) => teacher.fullName),
          ].join(" "),
        ).includes(normalizedQuery),
      )
    : result.courses;

  return (
    <section className="mx-auto w-full max-w-5xl">
      <p className="text-sm font-semibold tracking-wide text-accent uppercase">
        {labels.eyebrow}
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
        {labels.title}
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
        {labels.description}
      </p>

      <form
        method="get"
        action="/cours"
        className="mt-8 flex flex-col gap-2 sm:flex-row sm:items-end"
      >
        <div className="min-w-0 flex-1">
          <label
            htmlFor="course-search"
            className="mb-1.5 block text-sm font-medium text-slate-800"
          >
            {labels.searchLabel}
          </label>
          <input
            id="course-search"
            type="search"
            name="q"
            defaultValue={query}
            maxLength={100}
            placeholder={labels.searchPlaceholder}
            className="h-11 w-full rounded-xl border border-primary/15 bg-white px-3 text-sm text-foreground shadow-sm placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
        </div>
        <button
          type="submit"
          className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {labels.searchSubmit}
        </button>
      </form>

      {query ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className="text-sm text-slate-600" role="status">
            {visibleCourses.length === 1
              ? labels.resultsCountOne
              : labels.resultsCountMany.replace(
                  "{count}",
                  String(visibleCourses.length),
                )}
          </p>
          <Link
            href="/cours"
            className="inline-flex items-center rounded-lg text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {labels.clearSearch}
          </Link>
        </div>
      ) : null}

      {result.error ? (
        <Notice tone="error">{labels.loadFailed}</Notice>
      ) : visibleCourses.length === 0 ? (
        query ? (
          <p className="mt-8 rounded-2xl border border-primary/10 bg-white px-5 py-6 text-sm leading-6 text-slate-600">
            {labels.noResults}
          </p>
        ) : (
          <EmptyCourses
            isVerifiedStudent={studentProfile !== null}
            hasStaffRole={hasStaffRole}
            enrollmentStatus={enrollment?.status ?? null}
          />
        )
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {visibleCourses.map((course) => (
            <li key={course.id}>
              <Link
                href={`/cours/${course.id}`}
                className="flex h-full flex-col rounded-2xl border border-primary/10 bg-white p-5 shadow-sm transition-colors hover:border-accent/40 hover:bg-accent/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <h2 className="text-lg font-semibold text-primary">
                  {course.name}
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {course.classLabel || labels.classUnavailable}
                </p>

                {course.semester ? (
                  <p className="mt-2 text-xs font-semibold tracking-wide text-slate-600 uppercase">
                    {labels.semesterValue.replace(
                      "{semester}",
                      String(course.semester),
                    )}
                  </p>
                ) : null}

                <div className="mt-4">
                  <p className="text-xs font-semibold tracking-wide text-slate-600 uppercase">
                    {labels.teachersLabel}
                  </p>
                  {course.teachers.length > 0 ? (
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {course.teachers.map((teacher) => (
                        <li
                          key={teacher.userId}
                          className="rounded-full border border-primary/10 bg-background px-3 py-1 text-xs font-medium text-slate-700"
                        >
                          {teacher.fullName ||
                            fr.app.management.admin.common.none}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-sm text-slate-600">
                      {labels.noTeachers}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
