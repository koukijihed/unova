import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProgramDetail } from "@/components/catalogue/program-detail";
import { Notice } from "@/components/notice";
import { fr } from "@/content/fr";
import { hasAdminRole } from "@/lib/auth/roles";
import { getCurrentRoles } from "@/lib/auth/session";
import { getProgramByCode } from "@/lib/catalogue/data";

type ProgramDetailPageProps = {
  params: Promise<{ code: string }>;
};

export async function generateMetadata({
  params,
}: ProgramDetailPageProps): Promise<Metadata> {
  const { code } = await params;
  const { program } = await getProgramByCode(code);

  return {
    title: program
      ? `${program.name} — ${fr.site.name}`
      : fr.catalogue.detailMetadataTitle,
    description: fr.catalogue.detailDescription,
  };
}

export default async function FormationDetailPage({
  params,
}: ProgramDetailPageProps) {
  const { code } = await params;
  const [result, roles] = await Promise.all([
    getProgramByCode(code),
    getCurrentRoles(),
  ]);

  if (result.error) {
    return (
      <div className="mx-auto w-full max-w-4xl px-6 py-12 sm:py-16">
        <Notice tone="error">{fr.catalogue.loadFailed}</Notice>
      </div>
    );
  }

  if (!result.program) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12 sm:py-16">
      <ProgramDetail
        program={result.program}
        backHref="/formations"
        backLabel={fr.catalogue.back}
        showSourceNote={hasAdminRole(roles)}
      />
    </div>
  );
}
