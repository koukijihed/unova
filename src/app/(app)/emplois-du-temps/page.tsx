import type { Metadata } from "next";
import Link from "next/link";
import { Notice } from "@/components/notice";
import { PrintButton } from "@/components/timetable/print-button";
import { TimetableGrid } from "@/components/timetable/timetable-grid";
import { fr } from "@/content/fr";
import { hasManagementRole } from "@/lib/auth/roles";
import {
  getCurrentEnrollment,
  getCurrentRoles,
  getCurrentStudentProfile,
  getCurrentUser,
} from "@/lib/auth/session";
import { getManagementClasses } from "@/lib/management/data";
import {
  getClassTimetable,
  getRooms,
  getTeacherTimetable,
  getTimetableCourses,
} from "@/lib/timetable/data";
import type {
  Room,
  TimetableCourse,
  TimetableSession,
} from "@/lib/timetable/types";
import type { StudentEnrollment } from "@/lib/types";

export const metadata: Metadata = {
  title: fr.app.timetable.view.metadataTitle,
};

type SearchParams = {
  classe?: string | string[];
  semestre?: string | string[];
  groupe?: string | string[];
  enseignant?: string | string[];
  salle?: string | string[];
};

function readSearchParam(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

function readSemester(value: string | string[] | undefined): number {
  return readSearchParam(value) === "2" ? 2 : 1;
}

function SemesterForm({ semester }: { semester: number }) {
  const labels = fr.app.timetable.view;

  return (
    <form
      method="get"
      action="/emplois-du-temps"
      className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end"
    >
      <div className="sm:w-52">
        <label
          htmlFor="public-timetable-semester"
          className="mb-1.5 block text-sm font-medium text-slate-800"
        >
          {labels.semesterLabel}
        </label>
        <select
          id="public-timetable-semester"
          name="semestre"
          defaultValue={String(semester)}
          className="h-10 w-full rounded-xl border border-primary/15 bg-white px-3 text-sm text-foreground shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <option value="1">{fr.app.timetable.semesters.first}</option>
          <option value="2">{fr.app.timetable.semesters.second}</option>
        </select>
      </div>

      <button
        type="submit"
        className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-white px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {labels.show}
      </button>
    </form>
  );
}

function TimetableActions({ semester }: { semester: number }) {
  const labels = fr.app.timetable.view;

  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-slate-600">
        {labels.semesterCaption.replace(
          "{semester}",
          semester === 2
            ? fr.app.timetable.semesters.second
            : fr.app.timetable.semesters.first,
        )}
      </p>
      <PrintButton label={fr.app.timetable.common.print} />
    </div>
  );
}

function EmptyOrGrid({
  sessions,
  emptyMessage,
  caption,
}: {
  sessions: TimetableSession[];
  emptyMessage: string;
  caption?: string;
}) {
  if (sessions.length === 0) {
    return (
      <div className="mt-4 rounded-2xl border border-primary/10 bg-white p-6 text-sm leading-6 text-slate-600 shadow-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="mt-4">
      <TimetableGrid sessions={sessions} caption={caption} />
    </div>
  );
}

async function StudentTimetable({
  enrollment,
  semester,
}: {
  enrollment: StudentEnrollment | null;
  semester: number;
}) {
  const labels = fr.app.timetable.view;

  if (!enrollment || enrollment.status !== "accepted") {
    const pending = enrollment?.status === "pending";

    return (
      <Notice tone={pending ? "warning" : "error"}>
        <p>{pending ? labels.pendingEnrollment : labels.noAcceptedEnrollment}</p>
        {!pending ? (
          <Link
            href="/verification"
            className="mt-3 inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {labels.verificationLink}
          </Link>
        ) : null}
      </Notice>
    );
  }

  const [sessionsResult, classesResult] = await Promise.all([
    getClassTimetable(enrollment.class_id, semester, false),
    getManagementClasses(),
  ]);
  const classLabel =
    classesResult.classes.find((item) => item.id === enrollment.class_id)
      ?.label ?? labels.studentTitle;

  return (
    <>
      <SemesterForm semester={semester} />

      <h2 className="mt-6 text-xl font-semibold tracking-tight text-primary">
        {classLabel}
      </h2>

      <TimetableActions semester={semester} />

      {sessionsResult.error ? (
        <Notice tone="error">
          <p>{labels.loadFailed}</p>
        </Notice>
      ) : (
        <EmptyOrGrid
          sessions={sessionsResult.sessions}
          emptyMessage={labels.noSessions}
          caption={`${labels.gridCaption} — ${classLabel}`}
        />
      )}
    </>
  );
}

async function TeacherTimetable({
  teacherId,
  semester,
}: {
  teacherId: string;
  semester: number;
}) {
  const labels = fr.app.timetable.view;
  const { sessions, error } = await getTeacherTimetable(teacherId, semester);

  return (
    <>
      <SemesterForm semester={semester} />

      <h2 className="mt-6 text-xl font-semibold tracking-tight text-primary">
        {labels.teacherTitle}
      </h2>

      <TimetableActions semester={semester} />

      {error ? (
        <Notice tone="error">
          <p>{labels.loadFailed}</p>
        </Notice>
      ) : (
        <EmptyOrGrid
          sessions={sessions}
          emptyMessage={labels.teacherEmpty}
        />
      )}
    </>
  );
}

async function ManagerTimetable({
  requestedClassId,
  filters,
  semester,
}: {
  requestedClassId: string;
  filters: { group: string; teacherId: string; roomId: string };
  semester: number;
}) {
  const labels = fr.app.timetable.view;
  const { classes, error: classesError } = await getManagementClasses();
  const selectedClass = requestedClassId
    ? (classes.find((item) => item.id === requestedClassId) ?? null)
    : (classes[0] ?? null);
  const invalidClass = Boolean(requestedClassId && !selectedClass);

  if (classesError) {
    return (
      <Notice tone="error">
        <p>{labels.classesLoadFailed}</p>
      </Notice>
    );
  }

  if (classes.length === 0) {
    return (
      <Notice tone="info">
        <p>{labels.noClasses}</p>
      </Notice>
    );
  }

  let sessions: TimetableSession[] = [];
  let courses: TimetableCourse[] = [];
  let rooms: Room[] = [];
  let sessionsError = false;

  if (selectedClass) {
    const [sessionsResult, coursesResult, roomsResult] = await Promise.all([
      getClassTimetable(selectedClass.id, semester, true),
      getTimetableCourses(selectedClass.id),
      getRooms(),
    ]);

    sessions = sessionsResult.sessions;
    sessionsError = sessionsResult.error;
    courses = coursesResult.courses;
    rooms = roomsResult.rooms;
  }

  const groups = Array.from(
    new Set(
      sessions
        .map((session) => session.groupLabel?.trim() ?? "")
        .filter((group) => group.length > 0),
    ),
  ).sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));

  const teacherNames = new Map<string, string>();

  for (const course of courses) {
    for (const teacher of course.teachers) {
      teacherNames.set(teacher.userId, teacher.fullName);
    }
  }

  for (const session of sessions) {
    if (session.teacherId && session.teacherName) {
      teacherNames.set(session.teacherId, session.teacherName);
    }
  }

  const teacherOptions = Array.from(teacherNames, ([id, name]) => ({
    id,
    name,
  })).sort((a, b) =>
    a.name.localeCompare(b.name, "fr", { sensitivity: "base" }),
  );

  const visibleSessions = sessions.filter((session) => {
    if (
      filters.group &&
      (session.groupLabel ?? "").toLowerCase() !== filters.group.toLowerCase()
    ) {
      return false;
    }

    if (filters.teacherId && session.teacherId !== filters.teacherId) {
      return false;
    }

    if (filters.roomId && session.roomId !== filters.roomId) {
      return false;
    }

    return true;
  });

  const hasFilters = Boolean(
    filters.group || filters.teacherId || filters.roomId,
  );

  return (
    <>
      <form
        method="get"
        action="/emplois-du-temps"
        className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="min-w-0 flex-1">
          <label
            htmlFor="public-timetable-class"
            className="mb-1.5 block text-sm font-medium text-slate-800"
          >
            {labels.classLabel}
          </label>
          <select
            id="public-timetable-class"
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

        <div className="sm:w-52">
          <label
            htmlFor="public-timetable-staff-semester"
            className="mb-1.5 block text-sm font-medium text-slate-800"
          >
            {labels.semesterLabel}
          </label>
          <select
            id="public-timetable-staff-semester"
            name="semestre"
            defaultValue={String(semester)}
            className="h-10 w-full rounded-xl border border-primary/15 bg-white px-3 text-sm text-foreground shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <option value="1">{fr.app.timetable.semesters.first}</option>
            <option value="2">{fr.app.timetable.semesters.second}</option>
          </select>
        </div>

        <button
          type="submit"
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-white px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {labels.show}
        </button>
      </form>

      {invalidClass ? (
        <Notice tone="error">
          <p>{labels.invalidClass}</p>
        </Notice>
      ) : null}

      {selectedClass ? (
        <>
          <h2 className="mt-6 text-xl font-semibold tracking-tight text-primary">
            {selectedClass.label}
          </h2>

          <form
            method="get"
            action="/emplois-du-temps"
            className="mt-4 rounded-2xl border border-primary/10 bg-white p-4 shadow-sm"
          >
            <h3 className="text-sm font-semibold text-primary">
              {labels.filtersTitle}
            </h3>

            <input type="hidden" name="classe" value={selectedClass.id} />
            <input type="hidden" name="semestre" value={String(semester)} />

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="timetable-filter-group"
                  className="mb-1.5 block text-sm font-medium text-slate-800"
                >
                  {labels.groupLabel}
                </label>
                <select
                  id="timetable-filter-group"
                  name="groupe"
                  defaultValue={filters.group}
                  className="h-10 w-full rounded-xl border border-primary/15 bg-white px-3 text-sm text-foreground shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <option value="">{labels.groupAll}</option>
                  {groups.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="timetable-filter-teacher"
                  className="mb-1.5 block text-sm font-medium text-slate-800"
                >
                  {labels.teacherLabel}
                </label>
                <select
                  id="timetable-filter-teacher"
                  name="enseignant"
                  defaultValue={filters.teacherId}
                  className="h-10 w-full rounded-xl border border-primary/15 bg-white px-3 text-sm text-foreground shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <option value="">{labels.teacherAll}</option>
                  {teacherOptions.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="timetable-filter-room"
                  className="mb-1.5 block text-sm font-medium text-slate-800"
                >
                  {labels.roomLabel}
                </label>
                <select
                  id="timetable-filter-room"
                  name="salle"
                  defaultValue={filters.roomId}
                  className="h-10 w-full rounded-xl border border-primary/15 bg-white px-3 text-sm text-foreground shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <option value="">{labels.roomAll}</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {labels.applyFilters}
              </button>
              <Link
                href={`/emplois-du-temps?classe=${selectedClass.id}&semestre=${semester}`}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-primary/20 bg-white px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {labels.resetFilters}
              </Link>
            </div>
          </form>

          <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            {labels.draftNotice}
          </p>

          <TimetableActions semester={semester} />

          {sessionsError ? (
            <Notice tone="error">
              <p>{labels.loadFailed}</p>
            </Notice>
          ) : (
            <EmptyOrGrid
              sessions={visibleSessions}
              emptyMessage={
                hasFilters && sessions.length > 0
                  ? labels.noSessionsForFilters
                  : labels.noSessions
              }
              caption={`${labels.gridCaption} — ${selectedClass.label}`}
            />
          )}
        </>
      ) : invalidClass ? null : (
        <Notice tone="info">
          <p>{labels.noClassSelected}</p>
        </Notice>
      )}
    </>
  );
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const labels = fr.app.timetable.view;
  const semester = readSemester(params.semestre);
  const requestedClassId = readSearchParam(params.classe).trim();
  const filters = {
    group: readSearchParam(params.groupe).trim(),
    teacherId: readSearchParam(params.enseignant).trim(),
    roomId: readSearchParam(params.salle).trim(),
  };

  const [roles, studentProfile, enrollment, user] = await Promise.all([
    getCurrentRoles(),
    getCurrentStudentProfile(),
    getCurrentEnrollment(),
    getCurrentUser(),
  ]);

  const isManager = hasManagementRole(roles);
  const isStudent = studentProfile !== null;
  const isTeacher = roles?.includes("teacher") ?? false;

  return (
    <section className="mx-auto w-full max-w-7xl">
      <p className="text-sm font-semibold tracking-[0.18em] text-primary uppercase">
        {labels.eyebrow}
      </p>

      <h1 className="mt-3 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
        {labels.title}
      </h1>

      <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
        {labels.description}
      </p>

      {isManager ? (
        <ManagerTimetable
          requestedClassId={requestedClassId}
          filters={filters}
          semester={semester}
        />
      ) : isStudent ? (
        <StudentTimetable enrollment={enrollment} semester={semester} />
      ) : isTeacher && user ? (
        <TeacherTimetable teacherId={user.id} semester={semester} />
      ) : (
        <Notice tone="info">
          <p>{labels.unknownRole}</p>
        </Notice>
      )}
    </section>
  );
}
