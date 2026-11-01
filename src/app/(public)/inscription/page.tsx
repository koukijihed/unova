import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { RegisterForm } from "@/components/auth/register-form";
import { fr } from "@/content/fr";
import { redirectIfAuthenticated } from "@/lib/auth/session";

export const instant = false;

export const metadata: Metadata = {
  title: fr.auth.register.metadataTitle,
};

export default async function RegisterPage() {
  await redirectIfAuthenticated();

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12 sm:py-16">
      <AuthCard
        title={fr.auth.register.title}
        description={fr.auth.register.description}
      >
        <RegisterForm />

        <p className="mt-6 text-sm text-slate-600">
          {fr.auth.register.hasAccount}{" "}
          <Link
            href="/connexion"
            className="font-medium text-primary underline underline-offset-4 transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {fr.auth.register.signIn}
          </Link>
        </p>
      </AuthCard>
    </div>
  );
}
