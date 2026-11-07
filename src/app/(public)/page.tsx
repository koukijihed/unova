import Link from "next/link";
import { Notice } from "@/components/notice";
import { fr } from "@/content/fr";
import { getActiveProgramCounts } from "@/lib/catalogue/data";

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-4">
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default async function HomePage() {
  const counts = await getActiveProgramCounts();
  const formationsLabels = fr.home.formations;

  return (
    <>
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.16),transparent_45%)]"
        />

        <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-6 py-16 sm:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-sm font-medium text-primary">
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-accent"
              />
              {fr.home.eyebrow}
            </p>

            <h1 className="mt-6 max-w-2xl text-4xl font-bold tracking-tight text-primary sm:text-6xl">
              {fr.home.slogan}
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              {fr.home.presentation}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/connexion"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {fr.home.primaryCta}
                <ArrowRightIcon />
              </Link>
              <Link
                href="/inscription"
                className="inline-flex items-center rounded-xl border border-primary/15 bg-white px-5 py-3 text-sm font-semibold text-primary transition-colors hover:border-accent/40 hover:bg-accent/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {fr.home.secondaryCta}
              </Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div className="relative overflow-hidden rounded-[2rem] border border-primary/10 bg-primary p-8 text-white shadow-xl shadow-primary/10">
              <div
                aria-hidden="true"
                className="absolute -top-12 -right-12 size-48 rounded-full border border-white/10"
              />
              <div
                aria-hidden="true"
                className="absolute -bottom-16 -left-10 size-48 rounded-full bg-accent/15 blur-2xl"
              />

              <div className="relative">
                <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">
                  {fr.site.institution} · {fr.site.city}
                </p>
                <p className="mt-6 text-4xl font-bold tracking-tight">
                  {fr.site.name}
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  {fr.home.slogan}
                </p>

                <div className="mt-8 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white/10 p-4">
                    <p className="text-sm font-medium text-white">
                      {fr.home.academic.title}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/10 p-4">
                    <p className="text-sm font-medium text-white">
                      {fr.home.management.title}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="formations"
        className="border-t border-primary/10 bg-white py-16 sm:py-20"
      >
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold tracking-[0.18em] text-primary uppercase">
              {formationsLabels.eyebrow}
            </p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-primary sm:text-3xl">
              {formationsLabels.title}
            </h2>
            <p className="mt-3 text-slate-600">
              {formationsLabels.description}
            </p>
          </div>

          {counts.error ? (
            <Notice tone="error">{formationsLabels.loadFailed}</Notice>
          ) : counts.items.length === 0 ? (
            <p className="mt-8 rounded-2xl border border-primary/10 bg-background px-5 py-6 text-sm leading-6 text-slate-600">
              {formationsLabels.empty}
            </p>
          ) : (
            <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {counts.items.map((item) => (
                <li key={item.code}>
                  <Link
                    href="/formations"
                    className="flex h-full flex-col justify-between rounded-2xl border border-primary/10 bg-background p-6 transition-colors hover:border-accent/40 hover:bg-accent/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    <p className="text-base font-semibold text-primary">
                      {item.label}
                    </p>
                    <p className="mt-4 text-sm text-slate-600">
                      {item.count === 1
                        ? formationsLabels.countOne
                        : formationsLabels.countMany.replace(
                            "{count}",
                            String(item.count),
                          )}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-8">
            <Link
              href="/formations"
              className="inline-flex items-center gap-2 rounded-xl border border-primary/15 bg-white px-5 py-3 text-sm font-semibold text-primary transition-colors hover:border-accent/40 hover:bg-accent/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {formationsLabels.cta}
              <ArrowRightIcon />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
