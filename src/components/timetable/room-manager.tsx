"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { FormField } from "@/components/form-field";
import { ConfirmAction } from "@/components/management/confirm-action";
import { useFormFeedback } from "@/components/management/feedback";
import { FormError } from "@/components/management/form-error";
import { ManagementSubmitButton } from "@/components/management/submit-button";
import { fr } from "@/content/fr";
import {
  initialManagementActionState,
  readFormString,
} from "@/lib/management/action-state";
import {
  createRoom,
  setRoomActive,
  updateRoom,
} from "@/lib/timetable/actions";
import type { Room } from "@/lib/timetable/types";

function RoomForm({
  mode,
  room,
  onSuccess,
  onCancel,
}: {
  mode: "create" | "edit";
  room?: Room;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const [state, formAction] = useActionState(
    mode === "create" ? createRoom : updateRoom,
    initialManagementActionState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const labels = fr.app.timetable.rooms;
  useFormFeedback(state);

  useEffect(() => {
    if (state.status !== "success") {
      return;
    }

    if (mode === "create") {
      formRef.current?.reset();
    }

    onSuccess?.();
  }, [state, mode, onSuccess]);

  const nameValue =
    readFormString(state.values?.name) || room?.name || "";
  const capacityValue = state.values
    ? readFormString(state.values.capacity)
    : room?.capacity
      ? String(room.capacity)
      : "";
  const fieldId = `room-${mode}-${room?.id ?? "new"}`;

  return (
    <form ref={formRef} action={formAction} noValidate className="space-y-4">
      {mode === "edit" && room ? (
        <input type="hidden" name="roomId" value={room.id} />
      ) : null}

      <FormError
        message={state.status === "error" ? state.message : undefined}
      />

      <FormField
        id={`${fieldId}-name`}
        name="name"
        label={labels.nameLabel}
        placeholder={labels.namePlaceholder}
        defaultValue={nameValue}
        maxLength={60}
        required
      />

      <FormField
        id={`${fieldId}-capacity`}
        name="capacity"
        type="number"
        label={labels.capacityLabel}
        placeholder={labels.capacityPlaceholder}
        hint={labels.capacityHint}
        defaultValue={capacityValue}
        min={1}
        max={1000}
        step={1}
      />

      <div className="flex flex-wrap items-center gap-3">
        <ManagementSubmitButton
          label={mode === "create" ? labels.createSubmit : labels.save}
          pendingLabel={mode === "create" ? labels.creating : labels.saving}
        />

        {mode === "edit" && onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-primary/20 bg-white px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {labels.cancel}
          </button>
        ) : null}
      </div>
    </form>
  );
}

function RoomItem({ room }: { room: Room }) {
  const labels = fr.app.timetable.rooms;
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li className="rounded-2xl border border-primary/10 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-primary">
          {labels.editTitle}
        </h3>
        <div className="mt-4">
          <RoomForm
            mode="edit"
            room={room}
            onSuccess={() => setEditing(false)}
            onCancel={() => setEditing(false)}
          />
        </div>
      </li>
    );
  }

  return (
    <li className="rounded-2xl border border-primary/10 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-primary">{room.name}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {labels.table.capacity} :{" "}
            {room.capacity ?? labels.noCapacity}
          </p>
          <span
            className={`mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
              room.isActive
                ? "border border-emerald-300 bg-emerald-50 text-emerald-900"
                : "border border-amber-300 bg-amber-50 text-amber-900"
            }`}
          >
            {room.isActive ? labels.active : labels.inactive}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-primary/20 bg-white px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {labels.edit}
          </button>

          <ConfirmAction
            action={setRoomActive}
            fields={{
              roomId: room.id,
              active: room.isActive ? "false" : "true",
            }}
            triggerLabel={
              room.isActive ? labels.deactivate : labels.activate
            }
            title={
              room.isActive
                ? labels.deactivateTitle
                : labels.activateTitle
            }
            description={(
              room.isActive
                ? labels.deactivateDescription
                : labels.activateDescription
            ).replace("{name}", room.name)}
            confirmLabel={
              room.isActive
                ? labels.deactivateConfirm
                : labels.activateConfirm
            }
            tone={room.isActive ? "danger" : "primary"}
          />
        </div>
      </div>
    </li>
  );
}

export function RoomManager({ rooms }: { rooms: Room[] }) {
  const labels = fr.app.timetable.rooms;

  return (
    <div className="mt-8 space-y-8">
      <section className="rounded-2xl border border-primary/10 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-primary">
          {labels.createTitle}
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          {labels.createDescription}
        </p>
        <div className="mt-4">
          <RoomForm mode="create" />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-primary">
          {labels.listTitle}
        </h2>

        {rooms.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-primary/10 bg-white p-5 text-sm leading-6 text-slate-600 shadow-sm">
            {labels.empty}
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {rooms.map((room) => (
              <RoomItem key={room.id} room={room} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
