import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Notice } from "@/components/notice";
import { fr } from "@/content/fr";
import { getVisibleCourse } from "@/lib/management/course-data";

type CourseDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: CourseDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const { course } = await getVisibleCourse(id);

  return {
    title: course
      ? `${course.name} — ${fr.site.name}`
      : fr.app.courses.metadataTitle,
  };
}

export default async function CourseDetailPage({
  params,
}: CourseDetailPageProps) {
  const { id } = await params;
  const { course, error } = await getVisibleCourse(id);
  const labels = fr.app.courses;
  const detail = labels.detail;

  if (error) {
    return (
      <section className="mx-auto w-full max-w-4xl">
        <Notice tone="error">{detail.loadFailed}</Notice>
      </section>
    );
  }

  if (!course) {
    notFound();
  }

  const sections = [
    {
      title: detail.documentsTitle,
      description: detail.documentsDescription,
    },
    {
      title: detail.videosTitle,
      description: detail.videosDescription,
    },
    {
      title: detail.questionsTitle,
      description: detail.questionsDescription,
    },
  ];

  return (
    <article className="mx-auto w-full max-w-4xl">
      <Link
        href="/cours"
        className="inline-flex items-center rounded-lg text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {detail.back}
      </Link>

      {!course.isActive ? (
        <span className="mt-6 inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">
          {fr.app.management.courses.badges.inactive}
        </span>
      ) : null}

      <h1 className="mt-4 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
        {course.name}
      </h1>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        {course.classLabel || labels.classUnavailable}
      </p>

      {course.semester ? (
        <p className="mt-1 text-xs font-semibold tracking-wide text-slate-600 uppercase">
          {labels.semesterValue.replace(
            "{semester}",
            String(course.semester),
          )}
        </p>
      ) : null}

      <section className="mt-8 rounded-2xl border border-primary/10 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold tracking-tight text-primary">
          {detail.descriptionLabel}
        </h2>
        <p className="mt-3 text-sm leading-6 whitespace-pre-line text-slate-700">
          {course.description || detail.noDescription}
        </p>
      </section>

      <section className="mt-6 rounded-2xl border border-primary/10 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold tracking-tight text-primary">
          {detail.teachersTitle}
        </h2>

        {course.teachers.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {course.teachers.map((teacher) => (
              <li
                key={teacher.userId}
                className="rounded-full border border-primary/10 bg-background px-3 py-1 text-sm font-medium text-slate-700"
              >
                {teacher.fullName || fr.app.management.admin.common.none}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {labels.noTeachers}
          </p>
        )}
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {sections.map((section) => (
          <section
            key={section.title}
            className="rounded-2xl border border-primary/10 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h2 className="text-base font-semibold text-primary">
                {section.title}
              </h2>
              <span className="inline-flex shrink-0 items-center rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-xs font-semibold text-primary">
                {fr.common.comingSoon}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {section.description}
            </p>
          </section>
        ))}
      </div>
    </article>
  );
}
