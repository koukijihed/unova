import type { Metadata } from "next";
import Link from "next/link";
import { fr } from "@/content/fr";

export const metadata: Metadata = {
  title: fr.app.academicHub.metadataTitle,
};

type AcademicModule = {
  key: string;
  title: string;
  description: string;
  href?: string;
};

export default function AcademicPage() {
  const labels = fr.app.academicHub;
  const modules: AcademicModule[] = [
    { key: "programs", ...labels.modules.programs, href: "/programmes" },
    { key: "courses", ...labels.modules.courses },
    { key: "documents", ...labels.modules.documents },
    { key: "videos", ...labels.modules.videos },
    { key: "schedules", ...labels.modules.schedules },
    { key: "questions", ...labels.modules.questions },
  ];

  return (
    <section className="mx-auto w-full max-w-5xl">
      <p className="text-sm font-semibold tracking-wide text-accent uppercase">
        {labels.eyebrow}
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
        {labels.title}
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
        {labels.description}
      </p>

      <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((module) => {
          const available = Boolean(module.href);
          const content = (
            <>
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold text-primary">
                  {module.title}
                </h2>
                <span
                  className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                    available
                      ? "border border-emerald-300 bg-emerald-50 text-emerald-900"
                      : "border border-primary/15 bg-slate-100 text-slate-700"
                  }`}
                >
                  {available ? labels.available : labels.comingSoon}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {module.description}
              </p>
            </>
          );

          return (
            <li key={module.key}>
              {module.href ? (
                <Link
                  href={module.href}
                  className="flex h-full flex-col rounded-2xl border border-primary/10 bg-white p-6 shadow-sm transition-colors hover:border-accent/40 hover:bg-accent/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {content}
                </Link>
              ) : (
                <div className="flex h-full flex-col rounded-2xl border border-primary/10 bg-white p-6 shadow-sm">
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
