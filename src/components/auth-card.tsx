import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { fr } from "@/content/fr";

type AuthCardProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-3xl border border-primary/10 bg-white shadow-sm lg:grid-cols-[0.9fr_1.1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-8 text-white lg:flex">
        <div
          aria-hidden="true"
          className="absolute -top-16 -right-16 size-64 rounded-full border border-white/10"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-24 -left-16 size-72 rounded-full bg-accent/15 blur-2xl"
        />

        <div className="relative">
          <p className="max-w-sm text-3xl leading-tight font-semibold">
            {fr.home.slogan}
          </p>
          <p className="mt-4 max-w-sm text-sm leading-6 text-slate-300">
            {fr.site.description}
          </p>
        </div>

        <p className="relative text-xs text-slate-400">{fr.footer.tagline}</p>
      </aside>

      <div className="p-6 sm:p-10">
        <div className="mb-6">
          <BrandLogo size="large" priority />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>

        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
