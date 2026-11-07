import Link from "next/link";
import { notFound } from "next/navigation";
import { ClassForm } from "@/components/management/class-form";
import { ConfirmAction } from "@/components/management/confirm-action";
import { DirectorForm } from "@/components/management/director-form";
import { Notice } from "@/components/notice";
import { TrackForm } from "@/components/management/track-form";
import { fr } from "@/content/fr";
import {
  getAcademicLevels,
  getAcademicYears,
  getProgramClasses,
  getProgramDetail,
  getProgramDirectors,
  getProgramTracks,
  type ProgramClass,
} from "@/lib/management/admin-data";
import {
  deleteClass,
  deleteTrack,
  removeDirector,
} from "@/lib/management/program-actions";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const { program } = await getProgramDetail(id);

  return {
    title: program
      ? `${program.name} — ${fr.app.management.admin.programDetail.metadataTitle}`
      : fr.app.management.admin.programDetail.metadataTitle,
  };
}

function groupByYear(classes: ProgramClass[]) {
  const groups = new Map<
    string,
    { academicYearId: string; academicYearLabel: string; items: ProgramClass[] }
  >();

  for (const item of classes) {
    const existing = groups.get(item.academicYearId);

    if (existing) {
      existing.items.push(item);
    } else {
      groups.set(item.academicYearId, {
        academicYearId: item.academicYearId,
        academicYearLabel: item.academicYearLabel,
        items: [item],
      });
    }
  }

  return Array.from(groups.values());
}

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

export default async function ProgramDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { program, error: programError } = await getProgramDetail(id);

  if (programError) {
    return (
      <section className="mx-auto w-full max-w-6xl">
        <Link
          href="/gestion/programmes"
          className="inline-flex items-center rounded-lg text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {fr.app.management.admin.programDetail.backToPrograms}
        </Link>
        <Notice tone="error">
          <p>{fr.app.management.admin.messages.loadFailed}</p>
        </Notice>
      </section>
    );
  }

  if (!program) {
    notFound();
  }

  const [tracksResult, classesResult, directorsResult, yearsResult, levelsResult] =
    await Promise.all([
      getProgramTracks(id),
      getProgramClasses(id),
      getProgramDirectors(id),
      getAcademicYears(),
      getAcademicLevels(),
    ]);

  const labels = fr.app.management.admin.programDetail;
  const messages = fr.app.management.admin.messages;
  const programsLabels = fr.app.management.admin.programs;
  const currentYear =
    yearsResult.items.find((year) => year.isCurrent) ?? yearsResult.items[0];
  const classGroups = groupByYear(classesResult.items);
  const loadFailed =
    tracksResult.error ||
    classesResult.error ||
    directorsResult.error ||
    yearsResult.error ||
    levelsResult.error;

  return (
    <section className="mx-auto w-full max-w-6xl">
      <Link
        href="/gestion/programmes"
        className="inline-flex items-center rounded-lg text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {labels.backToPrograms}
      </Link>

      <p className="mt-6 text-sm font-semibold tracking-[0.18em] text-primary uppercase">
        {labels.eyebrow}
      </p>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs font-semibold tracking-wide text-slate-600">
            {program.code}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            {program.name}
          </h1>
        </div>
        <Badge tone={program.isActive ? "active" : "inactive"}>
          {program.isActive
            ? programsLabels.badges.active
            : programsLabels.badges.inactive}
        </Badge>
      </div>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-primary/10 bg-white p-4 shadow-sm">
          <dt className="text-xs font-semibold tracking-wide text-slate-600 uppercase">
            {labels.degree}
          </dt>
          <dd className="mt-1 text-sm text-slate-800">
            {program.degreeTypeLabel}
          </dd>
        </div>
        <div className="rounded-2xl border border-primary/10 bg-white p-4 shadow-sm">
          <dt className="text-xs font-semibold tracking-wide text-slate-600 uppercase">
            {labels.department}
          </dt>
          <dd className="mt-1 text-sm text-slate-800">
            {program.departmentName ?? labels.noDepartment}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {program.autoAccept ? (
          <Badge tone="info">{programsLabels.badges.autoAccept}</Badge>
        ) : null}
        {program.isCoConstructed ? (
          <Badge tone="info">{programsLabels.badges.coConstructed}</Badge>
        ) : null}
        <Badge tone="info">
          {programsLabels.table.tracks} : {tracksResult.items.length}
        </Badge>
        <Badge tone="info">
          {programsLabels.table.classes} : {classesResult.items.length}
        </Badge>
      </div>

      {program.sourceNote ? (
        <p className="mt-4 text-sm leading-6 text-slate-600">
          {program.sourceNote}
        </p>
      ) : null}

      {loadFailed ? (
        <Notice tone="error">
          <p>{messages.loadFailed}</p>
        </Notice>
      ) : null}

      <section className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight text-primary">
          {labels.tracksTitle}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          {labels.tracksDescription}
        </p>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div>
            {tracksResult.error ? (
              <Notice tone="error">
                <p>{messages.loadFailed}</p>
              </Notice>
            ) : tracksResult.items.length === 0 ? (
              <Notice tone="info">
                <p>{labels.tracksEmpty}</p>
              </Notice>
            ) : (
              <ul className="space-y-2">
                {tracksResult.items.map((track) => (
                  <li
                    key={track.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/10 bg-white p-4 shadow-sm"
                  >
                    <span className="text-sm font-medium text-slate-800">
                      {track.name}
                    </span>
                    <ConfirmAction
                      action={deleteTrack}
                      fields={{ programId: program.id, trackId: track.id }}
                      triggerLabel={labels.deleteTrack}
                      title={labels.deleteTrackTitle}
                      description={labels.deleteTrackDescription.replace(
                        "{name}",
                        track.name,
                      )}
                      confirmLabel={labels.deleteTrackConfirm}
                      tone="danger"
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-primary/10 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-primary">
              {labels.addTrackTitle}
            </h3>
            <div className="mt-4">
              <TrackForm programId={program.id} />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight text-primary">
          {labels.classesTitle}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          {labels.classesDescription}
        </p>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="space-y-5">
            {classesResult.error ? (
              <Notice tone="error">
                <p>{messages.loadFailed}</p>
              </Notice>
            ) : classGroups.length === 0 ? (
              <Notice tone="info">
                <p>{labels.classesEmpty}</p>
              </Notice>
            ) : (
              classGroups.map((group) => (
                <div key={group.academicYearId}>
                  <h3 className="text-sm font-semibold tracking-wide text-slate-700 uppercase">
                    {group.academicYearLabel}
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {group.items.map((item) => (
                      <li
                        key={item.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/10 bg-white p-4 shadow-sm"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-primary">
                            {item.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-600">
                            {item.levelLabel}
                            {item.trackName ? ` · ${item.trackName}` : ""}
                          </p>
                        </div>
                        <ConfirmAction
                          action={deleteClass}
                          fields={{
                            programId: program.id,
                            classId: item.id,
                          }}
                          triggerLabel={labels.deleteClass}
                          title={labels.deleteClassTitle}
                          description={labels.deleteClassDescription.replace(
                            "{name}",
                            item.name,
                          )}
                          confirmLabel={labels.deleteClassConfirm}
                          tone="danger"
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>

          <div className="rounded-2xl border border-primary/10 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-primary">
              {labels.addClassTitle}
            </h3>

            {yearsResult.items.length === 0 ? (
              <Notice tone="info">
                <p>{labels.noYearAvailable}</p>
              </Notice>
            ) : levelsResult.items.length === 0 ? (
              <Notice tone="info">
                <p>{labels.noLevelAvailable}</p>
              </Notice>
            ) : (
              <div className="mt-4">
                <ClassForm
                  programId={program.id}
                  academicYears={yearsResult.items}
                  levels={levelsResult.items}
                  tracks={tracksResult.items}
                  defaultYearId={currentYear?.id ?? ""}
                />
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight text-primary">
          {labels.directorsTitle}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          {labels.directorsDescription}
        </p>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div>
            {directorsResult.error ? (
              <Notice tone="error">
                <p>{messages.loadFailed}</p>
              </Notice>
            ) : directorsResult.items.length === 0 ? (
              <Notice tone="info">
                <p>{labels.directorsEmpty}</p>
              </Notice>
            ) : (
              <ul className="space-y-2">
                {directorsResult.items.map((director) => {
                  const name =
                    `${director.firstName} ${director.lastName}`.trim() ||
                    labels.directorNameFallback;

                  return (
                    <li
                      key={director.userId}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/10 bg-white p-4 shadow-sm"
                    >
                      <span className="text-sm font-medium text-slate-800">
                        {name}
                      </span>
                      <ConfirmAction
                        action={removeDirector}
                        fields={{
                          programId: program.id,
                          userId: director.userId,
                        }}
                        triggerLabel={labels.removeDirector}
                        title={labels.removeDirectorTitle}
                        description={labels.removeDirectorDescription.replace(
                          "{name}",
                          name,
                        )}
                        confirmLabel={labels.removeDirectorConfirm}
                        tone="danger"
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-primary/10 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-primary">
              {labels.addDirectorTitle}
            </h3>
            <div className="mt-4">
              <DirectorForm programId={program.id} />
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}
