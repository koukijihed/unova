import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DocumentManagement } from "@/components/documents/document-management";
import { DocumentUploadForm } from "@/components/documents/document-upload-form";
import { DriveLinkForm } from "@/components/drive/drive-link-form";
import { DriveLinkManagement } from "@/components/drive/drive-link-management";
import { FeedbackProvider } from "@/components/management/feedback";
import { Notice } from "@/components/notice";
import { fr } from "@/content/fr";
import {
  canUploadToCourse,
  getCourseDocuments,
} from "@/lib/documents/data";
import { getCourseDriveLinks } from "@/lib/drive/data";
import { driveKindLabel } from "@/lib/drive/format";
import { openUrl } from "@/lib/drive/links";
import { getVisibleCourse } from "@/lib/management/course-data";
import {
  categoryLabel,
  fileTypeLabel,
  formatBytes,
  formatDate,
} from "@/lib/documents/format";
import {
  DOCUMENT_CATEGORIES,
  isDocumentCategory,
} from "@/lib/documents/types";
import { normalizeForSearch } from "@/lib/documents/validation";

type CourseDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    categorie?: string | string[];
    q?: string | string[];
  }>;
};

function readSearchParam(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { course } = await getVisibleCourse(id);

  return {
    title: course
      ? `${course.name} — ${fr.site.name}`
      : fr.app.courses.metadataTitle,
  };
}

export default async function CourseDetailPage({
  params,
  searchParams,
}: CourseDetailPageProps) {
  const { id } = await params;
  const queryParams = await searchParams;
  const categoryParam = readSearchParam(queryParams.categorie).trim();
  const category = isDocumentCategory(categoryParam) ? categoryParam : null;
  const query = readSearchParam(queryParams.q).trim().slice(0, 100);

  const [
    { course, error },
    canUpload,
    documentsResult,
    driveLinksResult,
  ] = await Promise.all([
    getVisibleCourse(id),
    canUploadToCourse(id),
    getCourseDocuments(id),
    getCourseDriveLinks(id),
  ]);

  const labels = fr.app.courses;
  const detail = labels.detail;
  const documentLabels = fr.app.documents;
  const driveLabels = fr.app.driveLinks;

  if (error) {
    return (
      <section className="mx-auto w-full max-w-4xl">
        <Notice tone="error">{detail.loadFailed}</Notice>
      </section>
    );
  }

  if (!course) {
    notFound();
  }

  const normalizedQuery = normalizeForSearch(query);
  const documents = documentsResult.documents.filter((document) => {
    if (category && document.category !== category) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return normalizeForSearch(document.title).includes(normalizedQuery);
  });
  const hasFilters = Boolean(category || query);
  const comingSoonSections = [
    {
      title: detail.videosTitle,
      description: detail.videosDescription,
    },
    {
      title: detail.questionsTitle,
      description: detail.questionsDescription,
    },
  ];

  return (
    <article className="mx-auto w-full max-w-4xl">
      <Link
        href="/cours"
        className="inline-flex items-center rounded-lg text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {detail.back}
      </Link>

      {!course.isActive ? (
        <span className="mt-6 inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">
          {fr.app.management.courses.badges.inactive}
        </span>
      ) : null}

      <h1 className="mt-4 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
        {course.name}
      </h1>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        {course.classLabel || labels.classUnavailable}
      </p>

      {course.semester ? (
        <p className="mt-1 text-xs font-semibold tracking-wide text-slate-600 uppercase">
          {labels.semesterValue.replace(
            "{semester}",
            String(course.semester),
          )}
        </p>
      ) : null}

      <section className="mt-8 rounded-2xl border border-primary/10 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold tracking-tight text-primary">
          {detail.descriptionLabel}
        </h2>
        <p className="mt-3 text-sm leading-6 whitespace-pre-line text-slate-700">
          {course.description || detail.noDescription}
        </p>
      </section>

      <section className="mt-6 rounded-2xl border border-primary/10 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold tracking-tight text-primary">
          {detail.teachersTitle}
        </h2>

        {course.teachers.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {course.teachers.map((teacher) => (
              <li
                key={teacher.userId}
                className="rounded-full border border-primary/10 bg-background px-3 py-1 text-sm font-medium text-slate-700"
              >
                {teacher.fullName || fr.app.management.admin.common.none}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {labels.noTeachers}
          </p>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-primary/10 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold tracking-tight text-primary">
          {detail.documentsTitle}
        </h2>

        <form
          method="get"
          action={`/cours/${id}`}
          className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
        >
          <div>
            <label
              htmlFor="document-category-filter"
              className="mb-1.5 block text-sm font-medium text-slate-800"
            >
              {documentLabels.filters.categoryLabel}
            </label>
            <select
              id="document-category-filter"
              name="categorie"
              defaultValue={category ?? ""}
              className="h-10 w-full rounded-xl border border-primary/15 bg-white px-3 text-sm text-foreground shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <option value="">{documentLabels.filters.categoryAll}</option>
              {DOCUMENT_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {documentLabels.categories[value]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="document-search"
              className="mb-1.5 block text-sm font-medium text-slate-800"
            >
              {documentLabels.filters.searchLabel}
            </label>
            <input
              id="document-search"
              type="search"
              name="q"
              defaultValue={query}
              maxLength={100}
              placeholder={documentLabels.filters.searchPlaceholder}
              className="h-10 w-full rounded-xl border border-primary/15 bg-white px-3 text-sm text-foreground shadow-sm placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {documentLabels.filters.submit}
            </button>

            {hasFilters ? (
              <Link
                href={`/cours/${id}`}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-primary/20 bg-white px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {documentLabels.filters.clear}
              </Link>
            ) : null}
          </div>
        </form>

        {canUpload ? <DocumentUploadForm courseId={id} /> : null}

        {documentsResult.error ? (
          <Notice tone="error">{documentLabels.list.loadFailed}</Notice>
        ) : documents.length === 0 ? (
          <p className="mt-5 rounded-xl border border-dashed border-primary/20 bg-background px-4 py-6 text-center text-sm leading-6 text-slate-600">
            {hasFilters
              ? documentLabels.list.noResults
              : documentLabels.list.empty}
          </p>
        ) : (
          <FeedbackProvider>
            <ul className="mt-5 space-y-4">
              {documents.map((document) => (
                <li
                  key={document.id}
                  className="rounded-2xl border border-primary/10 bg-background p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-primary">
                          {document.title}
                        </h3>
                        {document.status === "rejected" ? (
                          <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900">
                            {documentLabels.status.rejected}
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-1 flex flex-wrap items-center gap-2 text-xs leading-5 text-slate-600">
                        <span>{categoryLabel(document.category)}</span>
                        <span aria-hidden="true">·</span>
                        <span>{fileTypeLabel(document.mimeType)}</span>
                        <span aria-hidden="true">·</span>
                        <span>{formatBytes(document.sizeBytes)}</span>
                        <span aria-hidden="true">·</span>
                        <span>{formatDate(document.createdAt)}</span>
                      </p>

                      {document.description ? (
                        <p className="mt-2 text-sm leading-6 whitespace-pre-line text-slate-600">
                          {document.description}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/documents/${document.id}`}
                        className="inline-flex min-h-9 items-center justify-center rounded-lg border border-primary/20 bg-white px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      >
                        {documentLabels.actions.view}
                      </Link>
                      <Link
                        href={`/documents/${document.id}/fichier?mode=download`}
                        className="inline-flex min-h-9 items-center justify-center rounded-lg border border-primary/20 bg-white px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      >
                        {documentLabels.actions.download}
                      </Link>
                    </div>
                  </div>

                  {canUpload ? (
                    <DocumentManagement
                      documentId={document.id}
                      title={document.title}
                      description={document.description}
                      category={document.category}
                      status={document.status}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          </FeedbackProvider>
        )}

        <div className="mt-8 border-t border-primary/10 pt-6">
          <h3 className="text-lg font-semibold tracking-tight text-primary">
            {driveLabels.sectionTitle}
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {driveLabels.sectionDescription}
          </p>

          {canUpload ? <DriveLinkForm courseId={id} /> : null}

          {driveLinksResult.error ? (
            <Notice tone="error">{driveLabels.list.loadFailed}</Notice>
          ) : driveLinksResult.links.length === 0 ? (
            <p className="mt-5 rounded-xl border border-dashed border-primary/20 bg-background px-4 py-6 text-center text-sm leading-6 text-slate-600">
              {driveLabels.list.empty}
            </p>
          ) : (
            <FeedbackProvider>
              <ul className="mt-5 space-y-4">
                {driveLinksResult.links.map((link) => (
                  <li
                    key={link.id}
                    className="rounded-2xl border border-primary/10 bg-background p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-base font-semibold text-primary">
                            {link.title}
                          </h4>
                          {link.status === "rejected" ? (
                            <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900">
                              {driveLabels.status.rejected}
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs leading-5 text-slate-600">
                          <span>{driveKindLabel(link.kind)}</span>
                          <span aria-hidden="true">·</span>
                          <span>{categoryLabel(link.category)}</span>
                          <span aria-hidden="true">·</span>
                          <span>{formatDate(link.createdAt)}</span>
                        </p>

                        {link.description ? (
                          <p className="mt-2 text-sm leading-6 whitespace-pre-line text-slate-600">
                            {link.description}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/liens/${link.id}`}
                          className="inline-flex min-h-9 items-center justify-center rounded-lg border border-primary/20 bg-white px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                        >
                          {driveLabels.actions.view}
                        </Link>
                        <a
                          href={openUrl(link.kind, link.driveId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-9 items-center justify-center rounded-lg border border-primary/20 bg-white px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                        >
                          {driveLabels.actions.openDrive}
                        </a>
                      </div>
                    </div>

                    {canUpload ? (
                      <DriveLinkManagement
                        linkId={link.id}
                        title={link.title}
                        description={link.description}
                        category={link.category}
                        status={link.status}
                      />
                    ) : null}
                  </li>
                ))}
              </ul>
            </FeedbackProvider>
          )}
        </div>
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {comingSoonSections.map((section) => (
          <section
            key={section.title}
            className="rounded-2xl border border-primary/10 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h2 className="text-base font-semibold text-primary">
                {section.title}
              </h2>
              <span className="inline-flex shrink-0 items-center rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-xs font-semibold text-primary">
                {fr.common.comingSoon}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {section.description}
            </p>
          </section>
        ))}
      </div>
    </article>
  );
}
