import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { fr } from "@/content/fr";

export const instant = false;

export const metadata: Metadata = {
  title: fr.auth.forgot.metadataTitle,
};

type ForgotPasswordPageProps = {
  searchParams: Promise<{
    erreur?: string;
  }>;
};

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const params = await searchParams;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12 sm:py-16">
      <AuthCard
        title={fr.auth.forgot.title}
        description={fr.auth.forgot.description}
      >
        <ForgotPasswordForm
          initialError={params.erreur ? fr.auth.errors.invalidLink : undefined}
        />

        <p className="mt-6 text-sm text-slate-600">
          <Link
            href="/connexion"
            className="font-medium text-primary underline underline-offset-4 transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {fr.auth.forgot.backToLogin}
          </Link>
        </p>
      </AuthCard>
    </div>
  );
}
