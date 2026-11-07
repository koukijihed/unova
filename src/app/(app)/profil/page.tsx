import type { Metadata } from "next";
import { Avatar } from "@/components/avatar";
import { Notice } from "@/components/notice";
import { AvatarManager } from "@/components/profile/avatar-manager";
import { PasswordForm } from "@/components/profile/password-form";
import { ProfileForm } from "@/components/profile/profile-form";
import { fr } from "@/content/fr";
import { getCurrentProfile, getCurrentUser, getProfileNames } from "@/lib/auth/session";
import { getSignedAvatarUrl } from "@/lib/profile/avatar";
import { getCurrentEnrollments, getCurrentRoleLabels } from "@/lib/profile/data";

export const metadata: Metadata = {
  title: fr.profile.metadataTitle,
};

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-primary/10 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold tracking-tight text-primary">
        {title}
      </h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function formatCreatedAt(value: string): string | null {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(date);
}

export default async function ProfilePage() {
  const user = await getCurrentUser();
  const [profile, roles, enrollments] = await Promise.all([
    getCurrentProfile(),
    getCurrentRoleLabels(),
    getCurrentEnrollments(),
  ]);

  const labels = fr.profile;
  const enrollmentLabels = labels.enrollments;
  const profileNames = user ? getProfileNames(profile, user) : null;
  const avatarUrl = await getSignedAvatarUrl(profile?.avatar_path);
  const createdAt = profile?.created_at
    ? formatCreatedAt(profile.created_at)
    : null;

  return (
    <section className="mx-auto w-full max-w-4xl">
      <p className="text-sm font-semibold tracking-wide text-accent uppercase">
        {labels.eyebrow}
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
        {labels.title}
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
        {labels.description}
      </p>

      <div className="mt-8 rounded-2xl border border-primary/10 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-5">
          <Avatar
            name={profileNames?.fullName || undefined}
            src={avatarUrl ?? undefined}
            size="lg"
          />

          <div className="min-w-0">
            <p className="truncate text-xl font-semibold text-primary">
              {profileNames?.fullName || fr.app.userMenu.fallbackName}
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              {roles.length > 0 ? (
                roles.map((role) => (
                  <span
                    key={role.code}
                    className="inline-flex items-center rounded-full border border-primary/15 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700"
                  >
                    {role.label}
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-600">
                  {labels.header.noRoles}
                </span>
              )}
            </div>
          </div>
        </div>

        <dl className="mt-6 grid gap-4 border-t border-primary/10 pt-5 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold tracking-wide text-slate-600 uppercase">
              {labels.header.emailLabel}
            </dt>
            <dd className="mt-1 truncate text-sm font-medium text-primary">
              {user?.email ?? fr.common.notAvailable}
            </dd>
          </div>

          {createdAt ? (
            <div>
              <dt className="text-xs font-semibold tracking-wide text-slate-600 uppercase">
                {labels.header.memberSinceLabel}
              </dt>
              <dd className="mt-1 text-sm font-medium text-primary">
                {createdAt}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>

      <div className="mt-6 space-y-6">
        <SectionCard
          title={enrollmentLabels.title}
          description={enrollmentLabels.description}
        >
          {enrollments.error ? (
            <Notice tone="error">{enrollmentLabels.loadFailed}</Notice>
          ) : enrollments.items.length === 0 ? (
            <p className="text-sm leading-6 text-slate-600">
              {enrollmentLabels.empty}
            </p>
          ) : (
            <ul className="space-y-4">
              {enrollments.items.map((enrollment) => (
                <li
                  key={enrollment.id}
                  className="rounded-2xl border border-primary/10 bg-background p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-base font-semibold text-primary">
                      {enrollment.programName ?? enrollmentLabels.unavailable}
                    </p>
                    <span className="inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-xs font-semibold text-primary">
                      {enrollmentLabels.statuses[enrollment.status]}
                    </span>
                  </div>

                  <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-xs font-semibold tracking-wide text-slate-600 uppercase">
                        {enrollmentLabels.classLabel}
                      </dt>
                      <dd className="mt-0.5 text-slate-800">
                        {enrollment.className ?? enrollmentLabels.unavailable}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold tracking-wide text-slate-600 uppercase">
                        {enrollmentLabels.programLabel}
                      </dt>
                      <dd className="mt-0.5 text-slate-800">
                        {enrollment.programName ??
                          enrollmentLabels.unavailable}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold tracking-wide text-slate-600 uppercase">
                        {enrollmentLabels.yearLabel}
                      </dt>
                      <dd className="mt-0.5 text-slate-800">
                        {enrollment.academicYearLabel ??
                          enrollmentLabels.unavailable}
                      </dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title={labels.personal.title}
          description={labels.personal.description}
        >
          <ProfileForm
            firstName={profile?.first_name?.trim() ?? ""}
            lastName={profile?.last_name?.trim() ?? ""}
            phone={profile?.phone?.trim() ?? ""}
          />
        </SectionCard>

        <SectionCard
          title={labels.avatar.title}
          description={labels.avatar.description}
        >
          <AvatarManager
            avatarUrl={avatarUrl}
            hasAvatar={Boolean(profile?.avatar_path)}
            fullName={profileNames?.fullName ?? ""}
          />
        </SectionCard>

        <SectionCard
          title={labels.password.title}
          description={labels.password.description}
        >
          <PasswordForm />
        </SectionCard>
      </div>
    </section>
  );
}
