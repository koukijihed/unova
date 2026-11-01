import { redirect } from "next/navigation";
import { fr } from "@/content/fr";
import {
  getCurrentProfile,
  getCurrentUser,
  getCurrentUserRoles,
  getProfileNames,
} from "@/lib/auth/session";

export const instant = false;

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/connexion?redirection=%2Ftableau-de-bord");
  }

  const [profile, roles] = await Promise.all([
    getCurrentProfile(),
    getCurrentUserRoles(),
  ]);
  const { firstName } = getProfileNames(profile, user);
  const showNoRoleNotice = roles !== null && roles.length === 0;

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

      {showNoRoleNotice ? (
        <div
          role="status"
          className="mt-8 flex gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0"
          >
            <circle
              cx="12"
              cy="12"
              r="8.5"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <path
              d="M12 8v4.5M12 16h.01"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          <p>{fr.app.dashboard.noRoleNotice}</p>
        </div>
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
