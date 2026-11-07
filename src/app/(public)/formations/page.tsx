import type { Metadata } from "next";
import { ProgramCatalogue } from "@/components/catalogue/program-catalogue";
import { Notice } from "@/components/notice";
import { fr } from "@/content/fr";
import { hasAdminRole } from "@/lib/auth/roles";
import { getCurrentRoles } from "@/lib/auth/session";
import { getCataloguePrograms } from "@/lib/catalogue/data";

export const metadata: Metadata = {
  title: fr.catalogue.metadataTitle,
};

type FormationsPageProps = {
  searchParams: Promise<{ q?: string | string[] }>;
};

export default async function FormationsPage({
  searchParams,
}: FormationsPageProps) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const [catalogue, roles] = await Promise.all([
    getCataloguePrograms(),
    getCurrentRoles(),
  ]);
  const labels = fr.catalogue;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12 sm:py-16">
      <p className="text-sm font-semibold tracking-wide text-accent uppercase">
        {labels.eyebrow}
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
        {labels.title}
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
        {labels.description}
      </p>

      {catalogue.error ? (
        <Notice tone="error">{labels.loadFailed}</Notice>
      ) : (
        <ProgramCatalogue
          groups={catalogue.groups}
          query={query}
          searchAction="/formations"
          detailBasePath="/formations"
          showSourceNote={hasAdminRole(roles)}
        />
      )}
    </div>
  );
}
