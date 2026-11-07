import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { fr } from "@/content/fr";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: fr.auth.reset.metadataTitle,
};

export default async function ResetPasswordPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/mot-de-passe-oublie?erreur=lien-invalide");
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12 sm:py-16">
      <AuthCard
        title={fr.auth.reset.title}
        description={fr.auth.reset.description}
      >
        <ResetPasswordForm />
      </AuthCard>
    </div>
  );
}
