import Link from "next/link";
import { fr } from "@/content/fr";
import type { CatalogueGroup, CatalogueProgram } from "@/lib/catalogue/data";
import { matchesProgramQuery } from "@/lib/catalogue/search";

type ProgramCatalogueProps = {
  groups: CatalogueGroup[];
  query: string;
  searchAction: string;
  detailBasePath: string;
  showSourceNote: boolean;
};

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "accent" | "warning";
}) {
  const toneClasses =
    tone === "warning"
      ? "border border-amber-300 bg-amber-50 text-amber-900"
      : "border border-accent/30 bg-accent/10 text-primary";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${toneClasses}`}
    >
      {children}
    </span>
  );
}

function ProgramCard({
  program,
  detailBasePath,
  showSourceNote,
}: {
  program: CatalogueProgram;
  detailBasePath: string;
  showSourceNote: boolean;
}) {
  const labels = fr.catalogue;

  return (
    <Link
      href={`${detailBasePath}/${encodeURIComponent(program.code)}`}
      className="group flex h-full flex-col rounded-2xl border border-primary/10 bg-white p-5 shadow-sm transition-colors hover:border-accent/50 hover:bg-accent/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <div className="flex flex-wrap items-start gap-2">
        {program.isCoConstructed ? (
          <Badge tone="accent">{labels.coConstructed}</Badge>
        ) : null}
        {!program.isActive ? (
          <Badge tone="warning">{labels.inactive}</Badge>
        ) : null}
      </div>

      <h3 className="mt-3 text-lg font-semibold text-primary">
        {program.name}
      </h3>

      {program.departmentName ? (
        <p className="mt-1 text-sm text-slate-600">
          {program.departmentName}
        </p>
      ) : null}

      {program.tracks.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-semibold tracking-wide text-slate-600 uppercase">
            {labels.tracksTitle}
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {program.tracks.map((track) => (
              <li
                key={track.id}
                className="rounded-full border border-primary/10 bg-background px-3 py-1 text-xs font-medium text-slate-700"
              >
                {track.name}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {showSourceNote && program.sourceNote ? (
        <p className="mt-4 text-xs leading-5 text-slate-500">
          <span className="font-semibold text-slate-700">
            {labels.sourceNote} :{" "}
          </span>
          {program.sourceNote}
        </p>
      ) : null}
    </Link>
  );
}

export function ProgramCatalogue({
  groups,
  query,
  searchAction,
  detailBasePath,
  showSourceNote,
}: ProgramCatalogueProps) {
  const labels = fr.catalogue;
  const visibleGroups = groups
    .map((group) => ({
      ...group,
      programs: group.programs.filter((program) =>
        matchesProgramQuery(program, query),
      ),
    }))
    .filter((group) => group.programs.length > 0);
  const resultCount = visibleGroups.reduce(
    (total, group) => total + group.programs.length,
    0,
  );

  return (
    <div className="mt-8">
      <form
        method="get"
        action={searchAction}
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
      >
        <div className="min-w-0 flex-1">
          <label
            htmlFor="catalogue-search"
            className="mb-1.5 block text-sm font-medium text-slate-800"
          >
            {labels.searchLabel}
          </label>
          <input
            id="catalogue-search"
            type="search"
            name="q"
            defaultValue={query}
            maxLength={100}
            placeholder={labels.searchPlaceholder}
            className="h-11 w-full rounded-xl border border-primary/15 bg-white px-3 text-sm text-foreground shadow-sm placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
        </div>
        <button
          type="submit"
          className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {labels.searchSubmit}
        </button>
      </form>

      {query ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className="text-sm text-slate-600" role="status">
            {resultCount === 1
              ? labels.resultsCountOne
              : labels.resultsCountMany.replace(
                  "{count}",
                  String(resultCount),
                )}
          </p>
          <Link
            href={searchAction}
            className="inline-flex items-center rounded-lg text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {labels.clearSearch}
          </Link>
        </div>
      ) : null}

      {visibleGroups.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-primary/10 bg-white px-5 py-6 text-sm leading-6 text-slate-600">
          {query ? labels.noResults : labels.empty}
        </p>
      ) : (
        <div className="mt-8 space-y-10">
          {visibleGroups.map((group) => (
            <section key={group.code} aria-labelledby={`degree-${group.code}`}>
              <div className="flex flex-wrap items-center gap-3">
                <h2
                  id={`degree-${group.code}`}
                  className="text-xl font-semibold tracking-tight text-primary"
                >
                  {group.label}
                </h2>
                <span className="rounded-full border border-primary/10 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                  {group.programs.length}
                </span>
              </div>

              <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {group.programs.map((program) => (
                  <li key={program.id}>
                    <ProgramCard
                      program={program}
                      detailBasePath={detailBasePath}
                      showSourceNote={showSourceNote}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
