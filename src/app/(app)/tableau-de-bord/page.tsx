import Link from "next/link";
import { redirect } from "next/navigation";
import { Notice } from "@/components/notice";
import { fr } from "@/content/fr";
import {
  getCurrentEnrollment,
  getCurrentProfile,
  getCurrentStudentProfile,
  getCurrentUser,
  getCurrentUserRoles,
  getProfileNames,
} from "@/lib/auth/session";
import type { EnrollmentStatus } from "@/lib/types";

export const instant = false;

function getEnrollmentNotice(status: EnrollmentStatus) {
  switch (status) {
    case "pending":
      return {
        tone: "warning" as const,
        message: fr.app.dashboard.enrollmentPending,
      };
    case "accepted":
      return {
        tone: "success" as const,
        message: fr.app.dashboard.enrollmentAccepted,
      };
    case "rejected":
      return {
        tone: "error" as const,
        message: fr.app.dashboard.enrollmentRejected,
      };
    case "interrupted":
      return {
        tone: "warning" as const,
        message: fr.app.dashboard.enrollmentInterrupted,
      };
    case "graduated":
      return {
        tone: "success" as const,
        message: fr.app.dashboard.enrollmentGraduated,
      };
  }
}

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/connexion?redirection=%2Ftableau-de-bord");
  }

  const [profile, roles, studentProfile, enrollment] = await Promise.all([
    getCurrentProfile(),
    getCurrentUserRoles(),
    getCurrentStudentProfile(),
    getCurrentEnrollment(),
  ]);
  const { firstName } = getProfileNames(profile, user);
  const isStudent = studentProfile !== null;
  const hasNoRole = roles !== null && roles.length === 0;
  const showNoProfileNotice = !isStudent && (roles === null || hasNoRole);
  const showNoRoleNotice = !isStudent && hasNoRole;
  const enrollmentNotice = enrollment
    ? getEnrollmentNotice(enrollment.status)
    : null;

  return (
    <section className="mx-auto w-full max-w-4xl">
      <p className="text-sm font-semibold tracking-[0.18em] text-primary uppercase">
        {fr.app.pages.dashboard.title}
      </p>

      <h1 className="mt-3 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
        {fr.app.dashboard.greeting}
        {firstName ? `, ${firstName}` : ""}
      </h1>

      <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
        {fr.app.pages.dashboard.description}
      </p>

      {showNoProfileNotice ? (
        <Notice tone="warning">
          <p>{fr.app.dashboard.noProfileNotice}</p>
          <Link
            href="/verification"
            className="mt-3 inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {fr.app.dashboard.verifyLink}
          </Link>
        </Notice>
      ) : null}

      {showNoRoleNotice ? (
        <Notice tone="info">
          <p>{fr.app.dashboard.noRoleNotice}</p>
        </Notice>
      ) : null}

      {isStudent ? (
        enrollmentNotice ? (
          <Notice tone={enrollmentNotice.tone}>
            <p>{enrollmentNotice.message}</p>
          </Notice>
        ) : (
          <Notice tone="warning">
            <p>{fr.app.dashboard.enrollmentUnavailable}</p>
          </Notice>
        )
      ) : null}

      <div className="mt-8 rounded-2xl border border-primary/10 bg-white p-6 shadow-sm">
        <span className="inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-sm font-medium text-primary">
          {fr.common.comingSoon}
        </span>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
          {fr.app.dashboard.comingSoonDescription}
        </p>
      </div>
    </section>
  );
}
