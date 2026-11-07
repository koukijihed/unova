"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AuthAlert } from "@/components/auth/auth-alert";
import { Avatar } from "@/components/avatar";
import { SubmitButton } from "@/components/auth/submit-button";
import { fr } from "@/content/fr";
import { initialProfileActionState } from "@/lib/profile/action-state";
import { deleteAvatar, uploadAvatar } from "@/lib/profile/actions";

type AvatarManagerProps = {
  avatarUrl: string | null;
  hasAvatar: boolean;
  fullName: string;
};

function DeleteAvatarButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-red-300 bg-white px-5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60 sm:w-auto"
    >
      {pending ? fr.profile.avatar.deleting : fr.profile.avatar.delete}
    </button>
  );
}

export function AvatarManager({
  avatarUrl,
  hasAvatar,
  fullName,
}: AvatarManagerProps) {
  const [uploadState, uploadAction] = useActionState(
    uploadAvatar,
    initialProfileActionState,
  );
  const [deleteState, deleteAction] = useActionState(
    deleteAvatar,
    initialProfileActionState,
  );
  const labels = fr.profile.avatar;
  const uploadError = uploadState.fieldErrors?.avatar;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <Avatar name={fullName || undefined} src={avatarUrl ?? undefined} size="lg" />
      </div>

      {uploadState.status === "success" && uploadState.message ? (
        <AuthAlert tone="success">{uploadState.message}</AuthAlert>
      ) : null}

      {uploadState.status === "error" && uploadState.message ? (
        <AuthAlert tone="error">{uploadState.message}</AuthAlert>
      ) : null}

      {deleteState.status === "success" && deleteState.message ? (
        <AuthAlert tone="success">{deleteState.message}</AuthAlert>
      ) : null}

      {deleteState.status === "error" && deleteState.message ? (
        <AuthAlert tone="error">{deleteState.message}</AuthAlert>
      ) : null}

      <form action={uploadAction} className="space-y-4">
        <div>
          <label
            htmlFor="profile-avatar"
            className="block text-sm font-medium text-primary"
          >
            {labels.choose}
          </label>
          <input
            id="profile-avatar"
            name="avatar"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            required
            aria-invalid={uploadError ? true : undefined}
            aria-describedby={
              uploadError ? "profile-avatar-error" : undefined
            }
            className="mt-2 block w-full rounded-xl border border-primary/15 bg-white px-3 py-2 text-sm text-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
          {uploadError ? (
            <p
              id="profile-avatar-error"
              role="alert"
              className="mt-1.5 text-sm leading-5 text-red-700"
            >
              {uploadError}
            </p>
          ) : null}
        </div>

        <SubmitButton
          label={labels.submit}
          pendingLabel={labels.submitting}
        />
      </form>

      {hasAvatar ? (
        <form action={deleteAction}>
          <DeleteAvatarButton />
        </form>
      ) : null}
    </div>
  );
}
