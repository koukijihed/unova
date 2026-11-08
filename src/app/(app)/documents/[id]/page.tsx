import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CourseComments } from "@/components/comments/course-comments";
import { Notice } from "@/components/notice";
import { fr } from "@/content/fr";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getCommentAuthorsForCourses,
  getCourseComments,
} from "@/lib/comments/data";
import { canUploadToCourse, getVisibleDocument } from "@/lib/documents/data";
import {
  categoryLabel,
  fileTypeLabel,
  formatBytes,
  formatDate,
} from "@/lib/documents/format";

type DocumentDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ qpage?: string | string[] }>;
};

const COMMENTS_PAGE_SIZE = 20;

function readSearchParam(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

function parsePage(value: string): number {
  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function buildCommentsHref(documentId: string, page: number): string {
  return page > 1
    ? `/documents/${documentId}?qpage=${page}`
    : `/documents/${documentId}`;
}

export async function generateMetadata({
  params,
}: DocumentDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const { document } = await getVisibleDocument(id);

  return {
    title: document
      ? `${document.title} — ${fr.site.name}`
      : fr.app.documents.metadataTitle,
  };
}

function isPdf(mimeType: string): boolean {
  return mimeType === "application/pdf";
}

function isImage(mimeType: string): boolean {
  return mimeType === "image/png" || mimeType === "image/jpeg" || mimeType === "image/webp";
}

export default async function DocumentDetailPage({
  params,
  searchParams,
}: DocumentDetailPageProps) {
  const { id } = await params;
  const queryParams = await searchParams;
  const requestedCommentsPage = parsePage(
    readSearchParam(queryParams.qpage),
  );
  const { document, error } = await getVisibleDocument(id);
  const labels = fr.app.documents;
  const detail = labels.detail;

  if (error) {
    return (
      <section className="mx-auto w-full max-w-4xl">
        <Notice tone="error">{detail.loadFailed}</Notice>
      </section>
    );
  }

  if (!document) {
    notFound();
  }

  const [canModerate, user, commentsResult] = await Promise.all([
    canUploadToCourse(document.courseId),
    getCurrentUser(),
    getCourseComments({
      courseId: document.courseId,
      documentId: document.id,
      page: requestedCommentsPage,
      pageSize: COMMENTS_PAGE_SIZE,
    }),
  ]);
  const authors = await getCommentAuthorsForCourses([document.courseId]);
  const commentsTotalPages = Math.max(
    1,
    Math.ceil(commentsResult.total / COMMENTS_PAGE_SIZE),
  );
  const commentsPage = Math.min(requestedCommentsPage, commentsTotalPages);

  const fileUrl = `/documents/${document.id}/fichier?mode=view`;
  const downloadUrl = `/documents/${document.id}/fichier?mode=download`;

  return (
    <article className="mx-auto w-full max-w-4xl">
      <Link
        href="/documents"
        className="inline-flex items-center rounded-lg text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {detail.back}
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">
              {document.title}
            </h1>
            {document.status === "rejected" ? (
              <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900">
                {labels.status.rejected}
              </span>
            ) : null}
          </div>

          <dl className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm leading-6 text-slate-600">
            <div className="flex items-center gap-1.5">
              <dt className="font-medium text-slate-700">{detail.courseLabel}</dt>
              <dd>
                <Link
                  href={`/cours/${document.courseId}`}
                  className="text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {document.courseName || labels.detail.notFound}
                </Link>
              </dd>
            </div>
            <div className="flex items-center gap-1.5">
              <dt className="font-medium text-slate-700">
                {detail.categoryLabel}
              </dt>
              <dd>{categoryLabel(document.category)}</dd>
            </div>
            <div className="flex items-center gap-1.5">
              <dt className="font-medium text-slate-700">{detail.sizeLabel}</dt>
              <dd>
                {formatBytes(document.sizeBytes)} ·{" "}
                {fileTypeLabel(document.mimeType)}
              </dd>
            </div>
            <div className="flex items-center gap-1.5">
              <dt className="font-medium text-slate-700">{detail.dateLabel}</dt>
              <dd>{formatDate(document.createdAt)}</dd>
            </div>
          </dl>
        </div>

        <Link
          href={downloadUrl}
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {detail.download}
        </Link>
      </div>

      {document.description ? (
        <p className="mt-4 text-sm leading-6 whitespace-pre-line text-slate-700">
          {document.description}
        </p>
      ) : null}

      <section className="mt-8 rounded-2xl border border-primary/10 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold tracking-tight text-primary">
          {detail.previewTitle}
        </h2>

        {isPdf(document.mimeType) ? (
          <div className="mt-4">
            <iframe
              src={fileUrl}
              title={document.title}
              className="h-[70vh] min-h-80 w-full rounded-xl border border-primary/10 bg-slate-50"
            />
            <p className="mt-3 text-sm leading-6 text-slate-600">
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {detail.openInNewTab}
              </a>
            </p>
          </div>
        ) : isImage(document.mimeType) ? (
          <div className="mt-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fileUrl}
              alt={document.title}
              className="mx-auto max-h-[70vh] w-auto max-w-full rounded-xl border border-primary/10 bg-slate-50"
            />
            <p className="mt-3 text-sm leading-6 text-slate-600">
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {detail.openInNewTab}
              </a>
            </p>
          </div>
        ) : (
          <p className="mt-3 rounded-xl border border-dashed border-primary/20 bg-background px-4 py-6 text-center text-sm leading-6 text-slate-600">
            {detail.previewUnavailable}
          </p>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-primary/10 bg-white p-6 shadow-sm">
        {commentsResult.error ? (
          <Notice tone="error">{fr.app.comments.loadFailed}</Notice>
        ) : (
          <CourseComments
            courseId={document.courseId}
            threads={commentsResult.threads}
            authors={authors}
            currentUserId={user?.id ?? ""}
            canModerate={canModerate}
            contextOptions={[]}
            fixedContext={{
              type: "document",
              id: document.id,
              title: document.title,
            }}
            heading={fr.app.comments.sectionTitle}
            description={fr.app.comments.documentSectionDescription}
            pagination={{
              currentPage: commentsPage,
              totalPages: commentsTotalPages,
              previousHref:
                commentsPage > 1
                  ? buildCommentsHref(document.id, commentsPage - 1)
                  : null,
              nextHref:
                commentsPage < commentsTotalPages
                  ? buildCommentsHref(document.id, commentsPage + 1)
                  : null,
            }}
          />
        )}
      </section>
    </article>
  );
}
