import { redirect } from "next/navigation";
import { CourseManager } from "@/components/management/course-manager";
import { FeedbackProvider } from "@/components/management/feedback";
import { Notice } from "@/components/notice";
import { fr } from "@/content/fr";
import { hasManagementRole } from "@/lib/auth/roles";
import { getCurrentRoles } from "@/lib/auth/session";
import { getClassCourses } from "@/lib/management/course-data";
import { getManagementClasses } from "@/lib/management/data";
import type { ManagementCourse } from "@/lib/management/course-data";
import { getClassRequirements, getRooms } from "@/lib/timetable/data";
import type { CourseRequirement, Room } from "@/lib/timetable/types";

export const metadata = {
  title: fr.app.management.courses.metadataTitle,
};

function readSearchParam(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

export default async function CoursesManagementPage({
  searchParams,
}: {
  searchParams: Promise<{
    classe?: string | string[];
  }>;
}) {
  const roles = await getCurrentRoles();

  if (!hasManagementRole(roles)) {
    redirect("/tableau-de-bord");
  }

  const params = await searchParams;
  const hasClassParam = params.classe !== undefined;
  const requestedClassId = readSearchParam(params.classe).trim();

  const { classes, error: classesError } = await getManagementClasses();
  const selectedClass = hasClassParam
    ? (classes.find((item) => item.id === requestedClassId) ?? null)
    : (classes[0] ?? null);
  const invalidClass = Boolean(requestedClassId && !selectedClass);

  let courses: ManagementCourse[] = [];
  let coursesError = false;
  let requirements: CourseRequirement[] = [];
  let rooms: Room[] = [];
  let requirementsError = false;
  let roomsError = false;

  if (selectedClass) {
    const [coursesResult, requirementsResult, roomsResult] =
      await Promise.all([
        getClassCourses(selectedClass.id),
        getClassRequirements(selectedClass.id),
        getRooms(),
      ]);

    courses = coursesResult.courses;
    coursesError = coursesResult.error;
    requirements = requirementsResult.requirements;
    requirementsError = requirementsResult.error;
    rooms = roomsResult.rooms;
    roomsError = roomsResult.error;
  }

  const labels = fr.app.management.courses;

  return (
    <section className="mx-auto w-full max-w-5xl">
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
          <form
            method="get"
            action="/gestion/cours"
            className="mt-8 flex flex-col gap-2 sm:flex-row sm:items-end"
          >
            <div className="min-w-0 flex-1">
              <label
                htmlFor="course-class-select"
                className="mb-1.5 block text-sm font-medium text-slate-800"
              >
                {labels.classLabel}
              </label>
              <select
                id="course-class-select"
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

            <button
              type="submit"
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-white px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {labels.showClass}
            </button>
          </form>

          {invalidClass ? (
            <Notice tone="error">
              <p>{labels.invalidClass}</p>
            </Notice>
          ) : null}

          {selectedClass ? (
            <>
              <h2 className="mt-8 text-xl font-semibold tracking-tight text-primary">
                {selectedClass.label}
              </h2>

              {coursesError ? (
                <Notice tone="error">
                  <p>{labels.coursesLoadFailed}</p>
                </Notice>
              ) : null}

              {requirementsError ? (
                <Notice tone="error">
                  <p>{fr.app.timetable.requirements.loadFailed}</p>
                </Notice>
              ) : null}

              {roomsError ? (
                <Notice tone="error">
                  <p>{fr.app.timetable.management.roomsLoadFailed}</p>
                </Notice>
              ) : null}

              {!coursesError && !requirementsError && !roomsError ? (
                <FeedbackProvider>
                  <CourseManager
                    classId={selectedClass.id}
                    courses={courses}
                    requirements={requirements}
                    rooms={rooms}
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
