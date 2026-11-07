import Link from "next/link";
import { Notice } from "@/components/notice";
import { ProgramForm } from "@/components/management/program-form";
import { fr } from "@/content/fr";
import {
  getDegreeTypes,
  getDepartments,
  getPrograms,
} from "@/lib/management/admin-data";

export const metadata = {
  title: fr.app.management.admin.programs.metadataTitle,
};

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "active" | "inactive" | "info";
}) {
  const toneClasses = {
    active: "border border-emerald-300 bg-emerald-50 text-emerald-900",
    inactive: "border border-amber-300 bg-amber-50 text-amber-900",
    info: "border border-primary/15 bg-slate-100 text-slate-700",
  } as const;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}

export default async function ProgramsPage() {
  const [programsResult, degreesResult, departmentsResult] = await Promise.all([
    getPrograms(),
    getDegreeTypes(),
    getDepartments(),
  ]);
  const labels = fr.app.management.admin.programs;
  const messages = fr.app.management.admin.messages;
  const loadFailed =
    programsResult.error ||
    degreesResult.error ||
    departmentsResult.error;

  return (
    <section className="mx-auto w-full max-w-6xl">
      <Link
        href="/gestion"
        className="inline-flex items-center rounded-lg text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {fr.app.management.admin.backToManagement}
      </Link>

      <p className="mt-6 text-sm font-semibold tracking-[0.18em] text-primary uppercase">
        {labels.eyebrow}
      </p>

      <h1 className="mt-3 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
        {labels.title}
      </h1>

      <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
        {labels.description}
      </p>

      <section className="mt-8 rounded-2xl border border-primary/10 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold tracking-tight text-primary">
          {labels.createTitle}
        </h2>
        <div className="mt-5">
          <ProgramForm
            mode="create"
            degreeTypes={degreesResult.items}
            departments={departmentsResult.items}
          />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold tracking-tight text-primary">
          {labels.listTitle}
        </h2>

        {loadFailed ? (
          <Notice tone="error">
            <p>{messages.loadFailed}</p>
          </Notice>
        ) : programsResult.items.length === 0 ? (
          <Notice tone="info">
            <p>{labels.noPrograms}</p>
          </Notice>
        ) : (
          <ul className="mt-4 grid gap-4 xl:grid-cols-2">
            {programsResult.items.map((program) => (
              <li
                key={program.id}
                className="flex flex-col rounded-2xl border border-primary/10 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-semibold tracking-wide text-slate-600">
                      {program.code}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-primary">
                      {program.name}
                    </h3>
                  </div>
                  <Badge tone={program.isActive ? "active" : "inactive"}>
                    {program.isActive
                      ? labels.badges.active
                      : labels.badges.inactive}
                  </Badge>
                </div>

                <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold tracking-wide text-slate-600 uppercase">
                      {labels.table.degree}
                    </dt>
                    <dd className="mt-0.5 text-slate-800">
                      {program.degreeTypeLabel}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold tracking-wide text-slate-600 uppercase">
                      {labels.table.department}
                    </dt>
                    <dd className="mt-0.5 text-slate-800">
                      {program.departmentName ??
                        fr.app.management.admin.programDetail.noDepartment}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {program.autoAccept ? (
                    <Badge tone="info">{labels.badges.autoAccept}</Badge>
                  ) : null}
                  {program.isCoConstructed ? (
                    <Badge tone="info">{labels.badges.coConstructed}</Badge>
                  ) : null}
                  <Badge tone="info">
                    {labels.table.tracks} : {program.trackCount}
                  </Badge>
                  <Badge tone="info">
                    {labels.table.classes} : {program.classCount}
                  </Badge>
                </div>

                {program.sourceNote ? (
                  <p className="mt-4 text-xs leading-5 text-slate-600">
                    {program.sourceNote}
                  </p>
                ) : null}

                <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-primary/10 pt-4">
                  <Link
                    href={`/gestion/programmes/${program.id}`}
                    className="inline-flex min-h-9 items-center justify-center rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    {labels.detail}
                  </Link>

                  <details className="group w-full">
                    <summary className="inline-flex min-h-9 cursor-pointer list-none items-center justify-center rounded-lg border border-primary/20 bg-white px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                      {labels.edit}
                    </summary>
                    <div className="mt-4 rounded-xl border border-primary/10 bg-slate-50 p-4">
                      <ProgramForm
                        mode="edit"
                        program={program}
                        degreeTypes={degreesResult.items}
                        departments={departmentsResult.items}
                      />
                    </div>
                  </details>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
