import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { FormField } from "@/components/form-field";
import { fr } from "@/content/fr";

export const metadata: Metadata = {
  title: fr.auth.login.metadataTitle,
};

export default function LoginPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12 sm:py-16">
      <AuthCard
        title={fr.auth.login.title}
        description={fr.auth.login.description}
      >
        <form>
          <fieldset disabled className="space-y-5">
            <FormField
              id="login-email"
              label={fr.auth.login.emailLabel}
              type="email"
              autoComplete="email"
              placeholder={fr.auth.login.emailPlaceholder}
              disabled
            />
            <FormField
              id="login-password"
              label={fr.auth.login.passwordLabel}
              type="password"
              autoComplete="current-password"
              placeholder={fr.auth.login.passwordPlaceholder}
              disabled
            />
            <button
              type="submit"
              disabled
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
            >
              {fr.auth.login.submit}
            </button>
          </fieldset>
        </form>

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
