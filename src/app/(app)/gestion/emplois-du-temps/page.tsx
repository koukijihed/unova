import { redirect } from "next/navigation";
import { FeedbackProvider } from "@/components/management/feedback";
import { Notice } from "@/components/notice";
import { TimetableBoard } from "@/components/timetable/timetable-board";
import { fr } from "@/content/fr";
import { hasManagementRole } from "@/lib/auth/roles";
import { getCurrentRoles } from "@/lib/auth/session";
import { getManagementClasses } from "@/lib/management/data";
import {
  getClassRequirements,
  getClassTimetable,
  getRooms,
  getTimetableCounts,
  getTimetableCourses,
  getTimetableGenerations,
} from "@/lib/timetable/data";
import type {
  CourseRequirement,
  Room,
  TimetableCourse,
  TimetableGeneration,
  TimetableSession,
} from "@/lib/timetable/types";

export const metadata = {
  title: fr.app.timetable.management.metadataTitle,
};

function readSearchParam(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

export default async function TimetableManagementPage({
  searchParams,
}: {
  searchParams: Promise<{
    classe?: string | string[];
    semestre?: string | string[];
  }>;
}) {
  const roles = await getCurrentRoles();

  if (!hasManagementRole(roles)) {
    redirect("/tableau-de-bord");
  }

  const params = await searchParams;
  const labels = fr.app.timetable.management;
  const hasClassParam = params.classe !== undefined;
  const requestedClassId = readSearchParam(params.classe).trim();
  const semester = readSearchParam(params.semestre) === "2" ? 2 : 1;

  const { classes, error: classesError } = await getManagementClasses();
  const selectedClass = hasClassParam
    ? (classes.find((item) => item.id === requestedClassId) ?? null)
    : (classes[0] ?? null);
  const invalidClass = Boolean(requestedClassId && !selectedClass);

  let sessions: TimetableSession[] = [];
  let courses: TimetableCourse[] = [];
  let rooms: Room[] = [];
  let requirements: CourseRequirement[] = [];
  let generations: TimetableGeneration[] = [];
  let drafts = 0;
  let published = 0;
  let sessionsError = false;
  let coursesError = false;
  let roomsError = false;
  let requirementsError = false;
  let generationsError = false;

  if (selectedClass) {
    const [
      sessionsResult,
      coursesResult,
      roomsResult,
      countsResult,
      requirementsResult,
      generationsResult,
    ] = await Promise.all([
      getClassTimetable(selectedClass.id, semester, true),
      getTimetableCourses(selectedClass.id),
      getRooms(),
      getTimetableCounts(selectedClass.id, semester),
      getClassRequirements(selectedClass.id),
      getTimetableGenerations(selectedClass.id, semester),
    ]);

    sessions = sessionsResult.sessions;
    sessionsError = sessionsResult.error;
    courses = coursesResult.courses;
    coursesError = coursesResult.error;
    rooms = roomsResult.rooms;
    roomsError = roomsResult.error;
    drafts = countsResult.drafts;
    published = countsResult.published;
    requirements = requirementsResult.requirements;
    requirementsError = requirementsResult.error;
    generations = generationsResult.generations;
    generationsError = generationsResult.error;
  }

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
          <form
            method="get"
            action="/gestion/emplois-du-temps"
            className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="min-w-0 flex-1">
              <label
                htmlFor="timetable-class-select"
                className="mb-1.5 block text-sm font-medium text-slate-800"
              >
                {labels.classLabel}
              </label>
              <select
                id="timetable-class-select"
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

            <div className="sm:w-48">
              <label
                htmlFor="timetable-semester-select"
                className="mb-1.5 block text-sm font-medium text-slate-800"
              >
                {labels.semesterLabel}
              </label>
              <select
                id="timetable-semester-select"
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

          {sessionsError ? (
            <Notice tone="error">
              <p>{labels.sessionsLoadFailed}</p>
            </Notice>
          ) : null}

          {coursesError ? (
            <Notice tone="error">
              <p>{labels.coursesLoadFailed}</p>
            </Notice>
          ) : null}

          {roomsError ? (
            <Notice tone="error">
              <p>{labels.roomsLoadFailed}</p>
            </Notice>
          ) : null}

          {requirementsError ? (
            <Notice tone="error">
              <p>{fr.app.timetable.requirements.loadFailed}</p>
            </Notice>
          ) : null}

          {selectedClass ? (
            <>
              <h2 className="mt-8 text-xl font-semibold tracking-tight text-primary">
                {selectedClass.label}
              </h2>

              {!sessionsError && !coursesError && !roomsError ? (
                <FeedbackProvider>
                  <TimetableBoard
                    classId={selectedClass.id}
                    semester={semester}
                    sessions={sessions}
                    courses={courses}
                    rooms={rooms}
                    requirements={requirements}
                    generations={generations}
                    generationsError={generationsError}
                    drafts={drafts}
                    published={published}
                  />
                </FeedbackProvider>
              ) : null}
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
