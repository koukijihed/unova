import { fr } from "@/content/fr";

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="border-b border-primary/10 bg-white/80">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-6 py-5">
          <span
            aria-hidden="true"
            className="flex size-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white"
          >
            U
          </span>
          <span className="text-lg font-semibold tracking-tight text-primary">
            {fr.home.brand}
          </span>
        </div>
      </header>

      <main className="flex flex-1 items-center">
        <section className="mx-auto w-full max-w-5xl px-6 py-20 sm:py-28">
          <p className="mb-6 inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-sm font-medium text-primary">
            {fr.home.institutionLabel}
          </p>

          <h1 className="text-5xl font-bold tracking-tight text-primary sm:text-7xl">
            {fr.home.brand}
          </h1>

          <p className="mt-6 max-w-2xl text-2xl leading-snug font-medium text-foreground sm:text-3xl">
            {fr.home.slogan}
          </p>

          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
            {fr.home.description}
          </p>

          <div
            aria-hidden="true"
            className="mt-10 h-1 w-20 rounded-full bg-accent"
          />
        </section>
      </main>

      <footer className="border-t border-primary/10">
        <div className="mx-auto w-full max-w-5xl px-6 py-6 text-sm text-slate-500">
          {fr.home.footer}
        </div>
      </footer>
    </div>
  );
}
