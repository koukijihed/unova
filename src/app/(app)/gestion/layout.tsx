import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { hasManagementRole } from "@/lib/auth/roles";
import { getCurrentRoles, getCurrentUser } from "@/lib/auth/session";

export default async function ManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    const headerStore = await headers();
    const pathname = headerStore.get("x-unova-pathname");
    const redirectTo =
      pathname && pathname.startsWith("/gestion") ? pathname : "/gestion";

    redirect(`/connexion?redirection=${encodeURIComponent(redirectTo)}`);
  }

  const roles = await getCurrentRoles();

  if (!hasManagementRole(roles)) {
    redirect("/tableau-de-bord");
  }

  return <>{children}</>;
}
