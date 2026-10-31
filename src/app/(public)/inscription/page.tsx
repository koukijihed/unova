import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { FormField } from "@/components/form-field";
import { fr } from "@/content/fr";

export const metadata: Metadata = {
  title: fr.auth.register.metadataTitle,
};

export default function RegisterPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12 sm:py-16">
      <AuthCard
        title={fr.auth.register.title}
        description={fr.auth.register.description}
      >
        <form>
          <fieldset disabled className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                id="register-first-name"
                label={fr.auth.register.firstNameLabel}
                type="text"
                autoComplete="given-name"
                placeholder={fr.auth.register.firstNamePlaceholder}
                disabled
              />
              <FormField
                id="register-last-name"
                label={fr.auth.register.lastNameLabel}
                type="text"
                autoComplete="family-name"
                placeholder={fr.auth.register.lastNamePlaceholder}
                disabled
              />
            </div>
            <FormField
              id="register-email"
              label={fr.auth.register.emailLabel}
              type="email"
              autoComplete="email"
              placeholder={fr.auth.register.emailPlaceholder}
              disabled
            />
            <FormField
              id="register-password"
              label={fr.auth.register.passwordLabel}
              type="password"
              autoComplete="new-password"
              placeholder={fr.auth.register.passwordPlaceholder}
              disabled
            />
            <button
              type="submit"
              disabled
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
            >
              {fr.auth.register.submit}
            </button>
          </fieldset>
        </form>

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
