"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FormField } from "@/components/form-field";
import {
  SelectField,
  TextAreaField,
} from "@/components/management/form-fields";
import { fr } from "@/content/fr";
import { addDriveLink } from "@/lib/drive/actions";
import { parseDriveUrl } from "@/lib/drive/links";
import {
  DOCUMENT_CATEGORIES,
  type DocumentCategory,
} from "@/lib/documents/types";
import {
  DOCUMENT_DESCRIPTION_MAX,
  DOCUMENT_TITLE_MAX,
  DOCUMENT_TITLE_MIN,
} from "@/lib/documents/validation";

const LABELS = fr.app.driveLinks;
const ERRORS = LABELS.add.errors;

export function DriveLinkForm({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<DocumentCategory>("cours");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    if (busy) {
      return;
    }

    setError(null);
    setSuccess(null);

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

    const parsed = parseDriveUrl(url);

    if (!parsed.ok) {
      setError(ERRORS.invalidUrl);
      return;
    }

    setBusy(true);

    try {
      const result = await addDriveLink({
        courseId,
        url,
        title: trimmedTitle,
        description: description.trim(),
        category,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      form.reset();
      setUrl("");
      setTitle("");
      setDescription("");
      setCategory("cours");
      setSuccess(LABELS.add.success);
      router.refresh();
    } catch {
      setError(ERRORS.generic);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 rounded-2xl border border-primary/10 bg-background p-5">
      <h3 className="text-base font-semibold text-primary">
        {LABELS.add.title}
      </h3>
      <p className="mt-1 text-sm leading-6 text-slate-600">
        {LABELS.add.description}
      </p>

      <form
        onSubmit={handleSubmit}
        noValidate
        aria-busy={busy}
        className="mt-4 space-y-4"
      >
        <fieldset disabled={busy} className="space-y-4">
          <FormField
            id={`drive-url-${courseId}`}
            name="url"
            type="url"
            label={LABELS.add.fields.url}
            placeholder={LABELS.add.urlPlaceholder}
            hint={LABELS.add.help}
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            maxLength={2048}
            autoComplete="off"
            spellCheck={false}
            required
          />

          <FormField
            id={`drive-title-${courseId}`}
            name="title"
            label={LABELS.add.fields.title}
            placeholder={LABELS.add.titlePlaceholder}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={DOCUMENT_TITLE_MAX}
            required
          />

          <TextAreaField
            id={`drive-description-${courseId}`}
            name="description"
            label={LABELS.add.fields.description}
            placeholder={LABELS.add.descriptionPlaceholder}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={DOCUMENT_DESCRIPTION_MAX}
          />

          <SelectField
            id={`drive-category-${courseId}`}
            name="category"
            label={LABELS.add.fields.category}
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as DocumentCategory)
            }
          >
            {DOCUMENT_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {fr.app.documents.categories[value]}
              </option>
            ))}
          </SelectField>
        </fieldset>

        <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          {LABELS.add.warning}
        </p>

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
          disabled={busy}
          aria-disabled={busy}
          className="inline-flex min-h-10 items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60"
        >
          {busy ? LABELS.add.submitting : LABELS.add.submit}
        </button>
      </form>
    </div>
  );
}
