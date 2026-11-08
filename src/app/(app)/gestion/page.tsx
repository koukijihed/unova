import Link from "next/link";
import { fr } from "@/content/fr";
import { hasAdminRole, hasManagementRole } from "@/lib/auth/roles";
import { getCurrentRoles } from "@/lib/auth/session";

const cards = fr.app.management.cards;

type ManagementCard = {
  title: string;
  description: string;
  href?: string;
  action?: string;
};

export default async function ManagementPage() {
  const roles = await getCurrentRoles();
  const isAdmin = hasAdminRole(roles);
  const canManage = hasManagementRole(roles);

  const managementCards: ManagementCard[] = [
    {
      title: cards.students.title,
      description: cards.students.description,
      href: "/gestion/etudiants",
      action: cards.students.action,
    },
    ...(isAdmin
      ? [
          {
            title: cards.teachers.title,
            description: cards.teachers.description,
            href: "/gestion/enseignants",
            action: cards.teachers.action,
          },
        ]
      : []),
    ...(canManage
      ? [
          {
            title: cards.courses.title,
            description: cards.courses.description,
            href: "/gestion/cours",
            action: cards.courses.action,
          },
        ]
      : []),
    ...(isAdmin
      ? [
          {
            title: cards.programs.title,
            description: cards.programs.description,
            href: "/gestion/programmes",
            action: cards.programs.action,
          },
          {
            title: cards.academicYears.title,
            description: cards.academicYears.description,
            href: "/gestion/annees",
            action: cards.academicYears.action,
          },
        ]
      : []),
    {
      title: cards.schedules.title,
      description: cards.schedules.description,
    },
    {
      title: cards.statistics.title,
      description: cards.statistics.description,
    },
  ];

  return (
    <section className="mx-auto w-full max-w-6xl">
      <p className="text-sm font-semibold tracking-[0.18em] text-primary uppercase">
        {fr.app.management.eyebrow}
      </p>

      <h1 className="mt-3 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
        {fr.app.management.title}
      </h1>

      <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
        {fr.app.management.description}
      </p>

      <div className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight text-primary">
          {fr.app.management.overviewTitle}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          {fr.app.management.overviewDescription}
        </p>

        <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {managementCards.map((card) => (
            <li key={card.title}>
              {card.href ? (
                <Link
                  href={card.href}
                  className="group flex h-full flex-col rounded-2xl border border-primary/10 bg-white p-5 shadow-sm transition-colors hover:border-accent/50 hover:bg-accent/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-semibold text-primary">
                      {card.title}
                    </h3>
                    <span className="inline-flex shrink-0 items-center rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">
                      {card.action ?? cards.students.action}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {card.description}
                  </p>
                </Link>
              ) : (
                <div className="flex h-full flex-col rounded-2xl border border-primary/10 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-semibold text-primary">
                      {card.title}
                    </h3>
                    <span className="inline-flex shrink-0 items-center rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-primary">
                      {fr.common.comingSoon}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {card.description}
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
