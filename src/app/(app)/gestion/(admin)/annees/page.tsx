import Link from "next/link";
import { AcademicYearActions } from "@/components/management/academic-year-actions";
import { AcademicYearForm } from "@/components/management/academic-year-form";
import { Notice } from "@/components/notice";
import { fr } from "@/content/fr";
import { getAcademicYears } from "@/lib/management/admin-data";
import { formatDateFr } from "@/lib/management/format";

export const instant = false;

export const metadata = {
  title: fr.app.management.admin.years.metadataTitle,
};

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "current" | "neutral" | "open" | "closed";
}) {
  const toneClasses = {
    current: "bg-primary text-white",
    neutral: "border border-primary/15 bg-slate-100 text-slate-700",
    open: "border border-emerald-300 bg-emerald-50 text-emerald-900",
    closed: "border border-amber-300 bg-amber-50 text-amber-900",
  } as const;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}

export default async function AcademicYearsPage() {
  const { items: years, error } = await getAcademicYears();
  const labels = fr.app.management.admin.years;
  const messages = fr.app.management.admin.messages;

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
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
          {labels.createDescription}
        </p>
        <div className="mt-5">
          <AcademicYearForm />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold tracking-tight text-primary">
          {labels.listTitle}
        </h2>

        {error ? (
          <Notice tone="error">
            <p>{messages.loadFailed}</p>
          </Notice>
        ) : years.length === 0 ? (
          <Notice tone="info">
            <p>{labels.noYears}</p>
          </Notice>
        ) : (
          <>
            <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-primary/10 bg-white shadow-sm md:block">
              <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
                <caption className="sr-only">{labels.table.caption}</caption>
                <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-600 uppercase">
                  <tr>
                    <th scope="col" className="px-4 py-3">
                      {labels.table.label}
                    </th>
                    <th scope="col" className="px-4 py-3">
                      {labels.table.dates}
                    </th>
                    <th scope="col" className="px-4 py-3">
                      {labels.table.status}
                    </th>
                    <th scope="col" className="px-4 py-3">
                      {labels.table.enrollment}
                    </th>
                    <th scope="col" className="px-4 py-3">
                      {labels.table.actions}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/10">
                  {years.map((year) => (
                    <tr key={year.id}>
                      <th
                        scope="row"
                        className="px-4 py-3 font-semibold text-primary"
                      >
                        {year.label}
                      </th>
                      <td className="px-4 py-3 text-slate-700">
                        {formatDateFr(year.startsOn)} —{" "}
                        {formatDateFr(year.endsOn)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={year.isCurrent ? "current" : "neutral"}>
                          {year.isCurrent
                            ? labels.currentBadge
                            : labels.notCurrentBadge}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          tone={year.enrollmentOpen ? "open" : "closed"}
                        >
                          {year.enrollmentOpen
                            ? labels.enrollmentOpen
                            : labels.enrollmentClosed}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <AcademicYearActions
                          yearId={year.id}
                          isCurrent={year.isCurrent}
                          enrollmentOpen={year.enrollmentOpen}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="mt-4 space-y-3 md:hidden">
              {years.map((year) => (
                <li
                  key={year.id}
                  className="rounded-2xl border border-primary/10 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-base font-semibold text-primary">
                      {year.label}
                    </h3>
                    <Badge tone={year.isCurrent ? "current" : "neutral"}>
                      {year.isCurrent
                        ? labels.currentBadge
                        : labels.notCurrentBadge}
                    </Badge>
                  </div>

                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-600">{labels.table.dates}</dt>
                      <dd className="text-right text-slate-800">
                        {formatDateFr(year.startsOn)} —{" "}
                        {formatDateFr(year.endsOn)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-slate-600">
                        {labels.table.enrollment}
                      </dt>
                      <dd>
                        <Badge
                          tone={year.enrollmentOpen ? "open" : "closed"}
                        >
                          {year.enrollmentOpen
                            ? labels.enrollmentOpen
                            : labels.enrollmentClosed}
                        </Badge>
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-4 border-t border-primary/10 pt-3">
                    <AcademicYearActions
                      yearId={year.id}
                      isCurrent={year.isCurrent}
                      enrollmentOpen={year.enrollmentOpen}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </section>
  );
}
