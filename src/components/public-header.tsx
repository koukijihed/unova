import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { fr } from "@/content/fr";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-primary/10 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-4">
        <Link
          href="/"
          className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          <BrandLogo />
        </Link>

        <nav
          aria-label={fr.publicNav.ariaLabel}
          className="ml-auto flex items-center gap-1 sm:gap-2"
        >
          <Link
            href="/"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-primary/5 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {fr.publicNav.home}
          </Link>
          <Link
            href="/#formations"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-primary/5 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {fr.publicNav.programs}
          </Link>
          <Link
            href="/connexion"
            className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {fr.publicNav.login}
          </Link>
        </nav>
      </div>
    </header>
  );
}
