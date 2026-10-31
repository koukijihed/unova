import { fr } from "@/content/fr";

export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[50vh] flex-col items-center justify-center gap-4 bg-background px-6 text-center"
    >
      <span
        aria-hidden="true"
        className="size-10 animate-spin rounded-full border-4 border-primary/15 border-t-accent"
      />
      <p className="text-sm font-medium text-slate-600">{fr.common.loading}</p>
    </div>
  );
}
