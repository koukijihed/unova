import { FeedbackProvider } from "@/components/management/feedback";
import { TeacherManager } from "@/components/management/teacher-manager";
import { Notice } from "@/components/notice";
import { fr } from "@/content/fr";
import { requireAdmin } from "@/lib/auth/session";
import { getTeachers } from "@/lib/management/teacher-data";

export const metadata = {
  title: fr.app.management.teachers.metadataTitle,
};

export default async function TeachersPage() {
  await requireAdmin();

  const { teachers, error } = await getTeachers();
  const labels = fr.app.management.teachers;

  return (
    <section className="mx-auto w-full max-w-4xl">
      <p className="text-sm font-semibold tracking-[0.18em] text-primary uppercase">
        {labels.eyebrow}
      </p>

      <h1 className="mt-3 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
        {labels.title}
      </h1>

      <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
        {labels.description}
      </p>

      <div className="mt-8">
        {error ? (
          <Notice tone="error">{labels.loadFailed}</Notice>
        ) : (
          <FeedbackProvider>
            <TeacherManager teachers={teachers} />
          </FeedbackProvider>
        )}
      </div>
    </section>
  );
}
