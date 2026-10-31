import { fr } from "@/content/fr";

type PlaceholderPageProps = {
  title: string;
  description: string;
};

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <section className="mx-auto w-full max-w-4xl">
      <span className="inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-sm font-medium text-primary">
        {fr.common.comingSoon}
      </span>

      <h1 className="mt-5 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
        {title}
      </h1>

      <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
        {description}
      </p>

      <div className="mt-10 h-px bg-primary/10" />
    </section>
  );
}
