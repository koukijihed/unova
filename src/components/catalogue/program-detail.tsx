import Link from "next/link";
import { fr } from "@/content/fr";
import type { CatalogueProgram } from "@/lib/catalogue/data";

type ProgramDetailProps = {
  program: CatalogueProgram;
  backHref: string;
  backLabel: string;
  showSourceNote: boolean;
};

export function ProgramDetail({
  program,
  backHref,
  backLabel,
  showSourceNote,
}: ProgramDetailProps) {
  const labels = fr.catalogue;

  return (
    <article className="mx-auto w-full max-w-4xl">
      <Link
        href={backHref}
        className="inline-flex items-center rounded-lg text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {backLabel}
      </Link>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {program.isCoConstructed ? (
          <span className="inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-primary">
            {labels.coConstructed}
          </span>
        ) : null}
        {!program.isActive ? (
          <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">
            {labels.inactive}
          </span>
        ) : null}
      </div>

      <h1 className="mt-4 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
        {program.name}
      </h1>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-primary/10 bg-white p-5 shadow-sm">
          <dt className="text-xs font-semibold tracking-wide text-slate-600 uppercase">
            {labels.degreeLabel}
          </dt>
          <dd className="mt-1 text-base font-medium text-primary">
            {program.degreeTypeLabel || fr.common.notAvailable}
          </dd>
        </div>

        <div className="rounded-2xl border border-primary/10 bg-white p-5 shadow-sm">
          <dt className="text-xs font-semibold tracking-wide text-slate-600 uppercase">
            {labels.departmentLabel}
          </dt>
          <dd className="mt-1 text-base font-medium text-primary">
            {program.departmentName ?? fr.common.notAvailable}
          </dd>
        </div>
      </dl>

      <section className="mt-8 rounded-2xl border border-primary/10 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold tracking-tight text-primary">
          {labels.tracksTitle}
        </h2>
        {program.tracks.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {program.tracks.map((track) => (
              <li
                key={track.id}
                className="rounded-full border border-primary/10 bg-background px-3 py-1 text-sm font-medium text-slate-700"
              >
                {track.name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {labels.noTracks}
          </p>
        )}
      </section>

      {showSourceNote && program.sourceNote ? (
        <section className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-6 text-amber-900">
          <h2 className="text-sm font-semibold tracking-wide uppercase">
            {labels.sourceNote}
          </h2>
          <p className="mt-2 text-sm leading-6">{program.sourceNote}</p>
        </section>
      ) : null}

      <p className="mt-8 rounded-2xl border border-accent/30 bg-accent/10 px-5 py-4 text-sm leading-6 font-medium text-primary">
        {labels.planNote}
      </p>
    </article>
  );
}
