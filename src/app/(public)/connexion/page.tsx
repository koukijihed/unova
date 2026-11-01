import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { fr } from "@/content/fr";
import { safeRedirectPath } from "@/lib/auth/redirects";
import { redirectIfAuthenticated } from "@/lib/auth/session";

export const instant = false;

export const metadata: Metadata = {
  title: fr.auth.login.metadataTitle,
};

type LoginPageProps = {
  searchParams: Promise<{
    redirection?: string;
    erreur?: string;
  }>;
};

function getErrorMessage(code: string | undefined): string | undefined {
  if (!code) {
    return undefined;
  }

  if (code === "session-expiree") {
    return fr.auth.errors.sessionExpired;
  }

  return fr.auth.errors.invalidLink;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  await redirectIfAuthenticated();
  const params = await searchParams;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12 sm:py-16">
      <AuthCard
        title={fr.auth.login.title}
        description={fr.auth.login.description}
      >
        <LoginForm
          redirectTo={safeRedirectPath(params.redirection)}
          initialError={getErrorMessage(params.erreur)}
        />

        <p className="mt-6 text-sm text-slate-600">
          {fr.auth.login.noAccount}{" "}
          <Link
            href="/inscription"
            className="font-medium text-primary underline underline-offset-4 transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {fr.auth.login.createAccount}
          </Link>
        </p>
      </AuthCard>
    </div>
  );
}
