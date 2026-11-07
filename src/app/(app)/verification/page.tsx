import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { VerificationForm } from "@/components/verification-form";
import { fr } from "@/content/fr";
import {
  getCurrentStudentProfile,
  getCurrentUser,
} from "@/lib/auth/session";

export const metadata: Metadata = {
  title: fr.app.verification.metadataTitle,
};

export default async function VerificationPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/connexion?redirection=%2Fverification");
  }

  const studentProfile = await getCurrentStudentProfile();

  if (studentProfile) {
    redirect("/tableau-de-bord");
  }

  return (
    <section className="mx-auto w-full max-w-4xl">
      <p className="text-sm font-semibold tracking-[0.18em] text-primary uppercase">
        {fr.app.verification.eyebrow}
      </p>

      <h1 className="mt-3 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
        {fr.app.verification.title}
      </h1>

      <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
        {fr.app.verification.description}
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="rounded-2xl border border-primary/10 bg-white p-6 shadow-sm">
          <VerificationForm />
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-primary/10 bg-white p-5">
            <h2 className="text-base font-semibold text-primary">
              {fr.app.verification.whyTitle}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {fr.app.verification.why}
            </p>
          </div>

          <div className="rounded-2xl border border-primary/10 bg-white p-5">
            <h2 className="text-base font-semibold text-primary">
              {fr.app.verification.privacyTitle}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {fr.app.verification.privacy}
            </p>
          </div>

          <div className="rounded-2xl border border-primary/10 bg-white p-5">
            <h2 className="text-base font-semibold text-primary">
              {fr.app.verification.approvalTitle}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {fr.app.verification.approval}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
