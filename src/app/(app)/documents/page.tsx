import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Notice } from "@/components/notice";
import { fr } from "@/content/fr";
import {
  getDocumentCourseOptions,
  getVisibleDocuments,
} from "@/lib/documents/data";
import {
  categoryLabel,
  fileTypeLabel,
  formatBytes,
  formatDate,
} from "@/lib/documents/format";
import {
  DOCUMENT_CATEGORIES,
  isDocumentCategory,
  type DocumentCategory,
} from "@/lib/documents/types";

export const metadata: Metadata = {
  title: fr.app.documents.metadataTitle,
};

const PAGE_SIZE = 20;

type DocumentFilters = {
  courseId: string;
  category: DocumentCategory | null;
  query: string;
};

function readSearchParam(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

function parsePage(value: string): number {
  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function buildPageHref(filters: DocumentFilters, page: number): string {
  const params = new URLSearchParams();

  if (filters.courseId) {
    params.set("cours", filters.courseId);
  }

  if (filters.category) {
    params.set("categorie", filters.category);
  }

  if (filters.query) {
    params.set("q", filters.query);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const queryString = params.toString();

  return queryString ? `/documents?${queryString}` : "/documents";
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    cours?: string | string[];
    categorie?: string | string[];
    q?: string | string[];
    page?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const requestedCourseId = readSearchParam(params.cours).trim();
  const categoryParam = readSearchParam(params.categorie).trim();
  const category = isDocumentCategory(categoryParam) ? categoryParam : null;
  const query = readSearchParam(params.q).trim().slice(0, 100);
  const requestedPage = parsePage(readSearchParam(params.page));

  const coursesResult = await getDocumentCourseOptions();
  const courseId = coursesResult.courses.some(
    (course) => course.id === requestedCourseId,
  )
    ? requestedCourseId
    : "";
  const filters: DocumentFilters = { courseId, category, query };

  const documentsResult = await getVisibleDocuments({
    courseId: courseId || null,
    category,
    query,
    page: requestedPage,
    pageSize: PAGE_SIZE,
  });

  const totalPages = Math.max(
    1,
    Math.ceil(documentsResult.total / PAGE_SIZE),
  );

  if (
    !documentsResult.error &&
    documentsResult.total > 0 &&
    requestedPage > totalPages
  ) {
    redirect(buildPageHref(filters, totalPages));
  }

  const currentPage = Math.min(requestedPage, totalPages);
  const hasFilters = Boolean(courseId || category || query);
  const labels = fr.app.documents;

  return (
    <section className="mx-auto w-full max-w-5xl">
      <p className="text-sm font-semibold tracking-wide text-accent uppercase">
        {labels.eyebrow}
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
        {labels.title}
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
        {labels.description}
      </p>

      <form
        method="get"
        action="/documents"
        className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto] lg:items-end"
      >
        <div>
          <label
            htmlFor="documents-course"
            className="mb-1.5 block text-sm font-medium text-slate-800"
          >
            {labels.filters.courseLabel}
          </label>
          <select
            id="documents-course"
            name="cours"
            defaultValue={courseId}
            className="h-10 w-full rounded-xl border border-primary/15 bg-white px-3 text-sm text-foreground shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <option value="">{labels.filters.courseAll}</option>
            {coursesResult.courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="documents-category"
            className="mb-1.5 block text-sm font-medium text-slate-800"
          >
            {labels.filters.categoryLabel}
          </label>
          <select
            id="documents-category"
            name="categorie"
            defaultValue={category ?? ""}
            className="h-10 w-full rounded-xl border border-primary/15 bg-white px-3 text-sm text-foreground shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <option value="">{labels.filters.categoryAll}</option>
            {DOCUMENT_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {labels.categories[value]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="documents-search"
            className="mb-1.5 block text-sm font-medium text-slate-800"
          >
            {labels.filters.searchLabel}
          </label>
          <input
            id="documents-search"
            type="search"
            name="q"
            defaultValue={query}
            maxLength={100}
            placeholder={labels.filters.searchPlaceholder}
            className="h-10 w-full rounded-xl border border-primary/15 bg-white px-3 text-sm text-foreground shadow-sm placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {labels.filters.submit}
          </button>

          {hasFilters ? (
            <Link
              href="/documents"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-primary/20 bg-white px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {labels.filters.clear}
            </Link>
          ) : null}
        </div>
      </form>

      {documentsResult.error ? (
        <Notice tone="error">{labels.list.loadFailed}</Notice>
      ) : documentsResult.total === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-primary/20 bg-white px-5 py-8 text-center text-sm leading-6 text-slate-600">
          {hasFilters ? labels.list.noResults : labels.list.empty}
        </p>
      ) : (
        <>
          <p className="mt-6 text-sm text-slate-600" role="status">
            {documentsResult.total === 1
              ? labels.list.resultsCountOne
              : labels.list.resultsCountMany.replace(
                  "{count}",
                  String(documentsResult.total),
                )}
          </p>

          <ul className="mt-4 space-y-3">
            {documentsResult.documents.map((document) => (
              <li
                key={document.id}
                className="rounded-2xl border border-primary/10 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-primary">
                        <Link
                          href={`/documents/${document.id}`}
                          className="underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                        >
                          {document.title}
                        </Link>
                      </h2>
                      {document.status === "rejected" ? (
                        <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900">
                          {labels.status.rejected}
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      <Link
                        href={`/cours/${document.courseId}`}
                        className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      >
                        {document.courseName || labels.detail.notFound}
                      </Link>
                    </p>

                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs leading-5 text-slate-600">
                      <span>{categoryLabel(document.category)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{fileTypeLabel(document.mimeType)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatBytes(document.sizeBytes)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatDate(document.createdAt)}</span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/documents/${document.id}`}
                      className="inline-flex min-h-9 items-center justify-center rounded-lg border border-primary/20 bg-white px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      {labels.actions.view}
                    </Link>
                    <Link
                      href={`/documents/${document.id}/fichier?mode=download`}
                      className="inline-flex min-h-9 items-center justify-center rounded-lg border border-primary/20 bg-white px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      {labels.actions.download}
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {totalPages > 1 ? (
            <nav
              aria-label={labels.pagination.pageInfo
                .replace("{page}", String(currentPage))
                .replace("{total}", String(totalPages))}
              className="mt-6 flex flex-wrap items-center justify-between gap-3"
            >
              {currentPage > 1 ? (
                <Link
                  href={buildPageHref(filters, currentPage - 1)}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-primary/20 bg-white px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {labels.pagination.previous}
                </Link>
              ) : (
                <span />
              )}

              <p className="text-sm text-slate-600">
                {labels.pagination.pageInfo
                  .replace("{page}", String(currentPage))
                  .replace("{total}", String(totalPages))}
              </p>

              {currentPage < totalPages ? (
                <Link
                  href={buildPageHref(filters, currentPage + 1)}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-primary/20 bg-white px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {labels.pagination.next}
                </Link>
              ) : (
                <span />
              )}
            </nav>
          ) : null}
        </>
      )}
    </section>
  );
}
