"use client";

import { useRouter } from "next/navigation";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { FormField } from "@/components/form-field";
import { SelectField, TextAreaField } from "@/components/management/form-fields";
import { fr } from "@/content/fr";
import {
  finalizeDocument,
  prepareDocumentUpload,
} from "@/lib/documents/actions";
import {
  DOCUMENT_CATEGORIES,
  type DocumentCategory,
} from "@/lib/documents/types";
import {
  DOCUMENT_BUCKET,
  DOCUMENT_DESCRIPTION_MAX,
  DOCUMENT_TITLE_MAX,
  DOCUMENT_TITLE_MIN,
  MAX_DOCUMENT_BYTES,
  getExtension,
  getMimeTypeForExtension,
  isAllowedMimeType,
} from "@/lib/documents/validation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const LABELS = fr.app.documents;
const ERRORS = LABELS.upload.errors;

const ACCEPTED_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".xls",
  ".xlsx",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
].join(",");

type BusyState = "idle" | "preparing" | "uploading" | "finalizing";

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}

async function hasValidSignature(
  file: File,
  mimeType: string,
): Promise<boolean> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());

  switch (mimeType) {
    case "application/pdf":
      return startsWith(bytes, [0x25, 0x50, 0x44, 0x46]);
    case "image/png":
      return startsWith(bytes, [
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]);
    case "image/jpeg":
      return startsWith(bytes, [0xff, 0xd8, 0xff]);
    case "image/webp":
      return (
        startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
        startsWith(bytes.slice(8), [0x57, 0x45, 0x42, 0x50])
      );
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return startsWith(bytes, [0x50, 0x4b]);
    case "application/msword":
    case "application/vnd.ms-powerpoint":
    case "application/vnd.ms-excel":
      return startsWith(bytes, [
        0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1,
      ]);
    default:
      return false;
  }
}

function resolveMimeType(file: File): string | null {
  if (isAllowedMimeType(file.type)) {
    return file.type;
  }

  return getMimeTypeForExtension(getExtension(file.name));
}

function busyLabel(busy: BusyState): string {
  switch (busy) {
    case "preparing":
      return LABELS.upload.preparing;
    case "uploading":
      return LABELS.upload.uploading;
    case "finalizing":
      return LABELS.upload.finalizing;
    default:
      return LABELS.upload.submit;
  }
}

export function DocumentUploadForm({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<BusyState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<DocumentCategory>("cours");
  const pending = busy !== "idle";

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setError(null);
    setSuccess(null);

    if (selected && !title.trim()) {
      setTitle(selected.name.replace(/\.[^.]+$/, "").slice(0, DOCUMENT_TITLE_MAX));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    if (pending) {
      return;
    }

    setError(null);
    setSuccess(null);

    if (!file) {
      setError(ERRORS.missingFile);
      return;
    }

    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setError(ERRORS.titleRequired);
      return;
    }

    if (trimmedTitle.length < DOCUMENT_TITLE_MIN) {
      setError(ERRORS.titleTooShort);
      return;
    }

    if (trimmedTitle.length > DOCUMENT_TITLE_MAX) {
      setError(ERRORS.titleTooLong);
      return;
    }

    if (description.trim().length > DOCUMENT_DESCRIPTION_MAX) {
      setError(ERRORS.descriptionTooLong);
      return;
    }

    if (file.size > MAX_DOCUMENT_BYTES) {
      setError(ERRORS.tooLarge);
      return;
    }

    const mimeType = resolveMimeType(file);

    if (!mimeType) {
      setError(ERRORS.typeRefused);
      return;
    }

    if (!(await hasValidSignature(file, mimeType))) {
      setError(ERRORS.magicMismatch);
      return;
    }

    setBusy("preparing");

    try {
      const prepared = await prepareDocumentUpload({
        courseId,
        fileName: file.name,
        mimeType,
        size: file.size,
      });

      if (!prepared.ok) {
        setError(prepared.error);
        return;
      }

      setBusy("uploading");

      const supabase = createBrowserSupabaseClient();
      const { error: uploadError } = await supabase.storage
        .from(DOCUMENT_BUCKET)
        .uploadToSignedUrl(prepared.path, prepared.token, file, {
          contentType: mimeType,
        });

      if (uploadError) {
        setError(ERRORS.uploadFailed);
        return;
      }

      setBusy("finalizing");

      const finalized = await finalizeDocument({
        courseId,
        path: prepared.path,
        title: trimmedTitle,
        description: description.trim(),
        category,
        originalName: file.name,
        mimeType,
        size: file.size,
      });

      if (!finalized.ok) {
        setError(finalized.error);
        return;
      }

      form.reset();
      setFile(null);
      setTitle("");
      setDescription("");
      setCategory("cours");
      setSuccess(LABELS.upload.success);
      router.refresh();
    } catch {
      setError(ERRORS.generic);
    } finally {
      setBusy("idle");
    }
  }

  return (
    <div className="mt-5 rounded-2xl border border-primary/10 bg-background p-5">
      <h3 className="text-base font-semibold text-primary">
        {LABELS.upload.title}
      </h3>
      <p className="mt-1 text-sm leading-6 text-slate-600">
        {LABELS.upload.description}
      </p>

      <form
        onSubmit={handleSubmit}
        noValidate
        aria-busy={pending}
        className="mt-4 space-y-4"
      >
        <fieldset disabled={pending} className="space-y-4">
          <FormField
            id={`document-title-${courseId}`}
            name="title"
            label={LABELS.upload.fields.title}
            placeholder={LABELS.upload.fields.titlePlaceholder}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={DOCUMENT_TITLE_MAX}
            required
          />

          <TextAreaField
            id={`document-description-${courseId}`}
            name="description"
            label={LABELS.upload.fields.description}
            placeholder={LABELS.upload.fields.descriptionPlaceholder}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={DOCUMENT_DESCRIPTION_MAX}
          />

          <SelectField
            id={`document-category-${courseId}`}
            name="category"
            label={LABELS.upload.fields.category}
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as DocumentCategory)
            }
          >
            {DOCUMENT_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {LABELS.categories[value]}
              </option>
            ))}
          </SelectField>

          <div>
            <label
              htmlFor={`document-file-${courseId}`}
              className="block text-sm font-medium text-primary"
            >
              {LABELS.upload.fields.file}
            </label>
            <input
              id={`document-file-${courseId}`}
              name="file"
              type="file"
              accept={ACCEPTED_EXTENSIONS}
              onChange={handleFileChange}
              required
              aria-describedby={`document-file-hint-${courseId}`}
              className="mt-2 block w-full rounded-xl border border-primary/15 bg-white px-3 py-2 text-sm text-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
            <p
              id={`document-file-hint-${courseId}`}
              className="mt-1.5 text-xs leading-5 text-slate-600"
            >
              {LABELS.upload.fileHint}
            </p>
          </div>
        </fieldset>

        {error ? (
          <p
            role="alert"
            className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800"
          >
            {error}
          </p>
        ) : null}

        {success ? (
          <p
            role="status"
            className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900"
          >
            {success}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          aria-disabled={pending}
          className="inline-flex min-h-10 items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60"
        >
          {busyLabel(busy)}
        </button>
      </form>
    </div>
  );
}
