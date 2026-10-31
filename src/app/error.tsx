"use client";

import { fr } from "@/content/fr";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-center text-foreground">
      <p className="text-sm font-semibold tracking-widest text-primary uppercase">
        {fr.site.name}
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
        {fr.errors.title}
      </h1>
      <p className="mt-4 max-w-md text-slate-600">{fr.errors.description}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {fr.common.retry}
      </button>
    </div>
  );
}
