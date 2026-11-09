import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasManagementRole } from "@/lib/auth/roles";
import {
  getCurrentProfile,
  getCurrentRoles,
  getCurrentUser,
  getProfileNames,
} from "@/lib/auth/session";
import { getSignedAvatarUrl } from "@/lib/profile/avatar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    const headerStore = await headers();
    const pathname = headerStore.get("x-unova-pathname");
    const redirectTo =
      pathname && pathname.startsWith("/") ? pathname : "/tableau-de-bord";

    redirect(`/connexion?redirection=${encodeURIComponent(redirectTo)}`);
  }

  const [profile, roles] = await Promise.all([
    getCurrentProfile(),
    getCurrentRoles(),
  ]);
  const profileNames = getProfileNames(profile, user);
  const avatarUrl = await getSignedAvatarUrl(profile?.avatar_path);

  return (
    <AppShell
      profile={profileNames}
      canManage={hasManagementRole(roles)}
      canTeach={roles?.includes("teacher") ?? false}
      avatarUrl={avatarUrl}
    >
      {children}
    </AppShell>
  );
}
