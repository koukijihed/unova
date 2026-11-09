import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FeedbackProvider } from "@/components/management/feedback";
import { Notice } from "@/components/notice";
import { UnavailabilityManager } from "@/components/timetable/unavailability-manager";
import { fr } from "@/content/fr";
import { hasAdminRole } from "@/lib/auth/roles";
import { getCurrentRoles, getCurrentUser } from "@/lib/auth/session";
import { getTeacherUnavailability } from "@/lib/timetable/data";

export const metadata: Metadata = {
  title: fr.app.timetable.availability.metadataTitle,
};

export default async function AvailabilityPage() {
  const [user, roles] = await Promise.all([
    getCurrentUser(),
    getCurrentRoles(),
  ]);

  if (!user) {
    redirect("/connexion");
  }

  const isTeacher = roles?.includes("teacher") ?? false;

  if (!isTeacher && !hasAdminRole(roles)) {
    redirect("/tableau-de-bord");
  }

  const labels = fr.app.timetable.availability;
  const { blocks, error } = await getTeacherUnavailability(user.id);

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

      <p className="mt-4 max-w-3xl rounded-2xl border border-sky-300 bg-sky-50 px-5 py-4 text-sm leading-6 text-sky-900">
        {labels.explanation}
      </p>

      {error ? (
        <Notice tone="error">
          <p>{labels.loadFailed}</p>
        </Notice>
      ) : (
        <FeedbackProvider>
          <UnavailabilityManager blocks={blocks} />
        </FeedbackProvider>
      )}
    </section>
  );
}
