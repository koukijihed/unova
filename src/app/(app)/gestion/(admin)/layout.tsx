import { FeedbackProvider } from "@/components/management/feedback";
import { requireAdmin } from "@/lib/auth/session";

export const instant = false;

export default async function AdminManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return <FeedbackProvider>{children}</FeedbackProvider>;
}
