import { redirect } from "next/navigation";
import { FeedbackProvider } from "@/components/management/feedback";
import { Notice } from "@/components/notice";
import { RoomManager } from "@/components/timetable/room-manager";
import { fr } from "@/content/fr";
import { hasAdminRole } from "@/lib/auth/roles";
import { getCurrentRoles } from "@/lib/auth/session";
import { getRooms } from "@/lib/timetable/data";

export const metadata = {
  title: fr.app.timetable.rooms.metadataTitle,
};

export default async function RoomsPage() {
  const roles = await getCurrentRoles();

  if (!hasAdminRole(roles)) {
    redirect("/tableau-de-bord");
  }

  const labels = fr.app.timetable.rooms;
  const { rooms, error } = await getRooms();

  return (
    <section className="mx-auto w-full max-w-4xl">
      <p className="text-sm font-semibold tracking-[0.18em] text-primary uppercase">
        {labels.eyebrow}
      </p>

      <h1 className="mt-3 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
        {labels.title}
      </h1>

      <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
        {labels.description}
      </p>

      {error ? (
        <Notice tone="error">
          <p>{labels.loadFailed}</p>
        </Notice>
      ) : (
        <FeedbackProvider>
          <RoomManager rooms={rooms} />
        </FeedbackProvider>
      )}
    </section>
  );
}
