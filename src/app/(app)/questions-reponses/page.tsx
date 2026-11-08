import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Notice } from "@/components/notice";
import { fr } from "@/content/fr";
import {
  getCommentAuthorsForCourses,
  getRecentQuestions,
} from "@/lib/comments/data";
import { commentBadgeLabel, formatCommentDate } from "@/lib/comments/format";
import { getDocumentCourseOptions } from "@/lib/documents/data";

export const metadata: Metadata = {
  title: fr.app.questions.metadataTitle,
};

const PAGE_SIZE = 20;

type QuestionFilters = {
  courseId: string;
  state: "ouvertes" | "resolues" | "";
  query: string;
};

function readSearchParam(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

function parsePage(value: string): number {
  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function excerpt(value: string): string {
  const trimmed = value.trim();

  return trimmed.length > 160 ? `${trimmed.slice(0, 160)}…` : trimmed;
}

function buildPageHref(filters: QuestionFilters, page: number): string {
  const params = new URLSearchParams();

  if (filters.courseId) {
    params.set("cours", filters.courseId);
  }

  if (filters.state) {
    params.set("etat", filters.state);
  }

  if (filters.query) {
    params.set("q", filters.query);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const queryString = params.toString();

  return queryString
    ? `/questions-reponses?${queryString}`
    : "/questions-reponses";
}

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    cours?: string | string[];
    etat?: string | string[];
    q?: string | string[];
    page?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const requestedCourseId = readSearchParam(params.cours).trim();
  const stateParam = readSearchParam(params.etat).trim();
  const state: QuestionFilters["state"] =
    stateParam === "ouvertes" || stateParam === "resolues"
      ? stateParam
      : "";
  const query = readSearchParam(params.q).trim().slice(0, 100);
  const requestedPage = parsePage(readSearchParam(params.page));

  const coursesResult = await getDocumentCourseOptions();
  const courseId = coursesResult.courses.some(
    (course) => course.id === requestedCourseId,
  )
    ? requestedCourseId
    : "";
  const filters: QuestionFilters = { courseId, state, query };

  const questionsResult = await getRecentQuestions({
    courseId: courseId || null,
    resolved: state === "ouvertes" ? false : state === "resolues" ? true : null,
    query,
    page: requestedPage,
    pageSize: PAGE_SIZE,
  });

  const totalPages = Math.max(
    1,
    Math.ceil(questionsResult.total / PAGE_SIZE),
  );

  if (
    !questionsResult.error &&
    questionsResult.total > 0 &&
    requestedPage > totalPages
  ) {
    redirect(buildPageHref(filters, totalPages));
  }

  const currentPage = Math.min(requestedPage, totalPages);
  const hasFilters = Boolean(courseId || state || query);
  const labels = fr.app.questions;
  const commentLabels = fr.app.comments;
  const authors = await getCommentAuthorsForCourses(
    questionsResult.questions.map((question) => question.courseId),
  );

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
        action="/questions-reponses"
        className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto] lg:items-end"
      >
        <div>
          <label
            htmlFor="questions-course"
            className="mb-1.5 block text-sm font-medium text-slate-800"
          >
            {labels.filters.courseLabel}
          </label>
          <select
            id="questions-course"
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
            htmlFor="questions-state"
            className="mb-1.5 block text-sm font-medium text-slate-800"
          >
            {labels.filters.stateLabel}
          </label>
          <select
            id="questions-state"
            name="etat"
            defaultValue={state}
            className="h-10 w-full rounded-xl border border-primary/15 bg-white px-3 text-sm text-foreground shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <option value="">{labels.filters.stateAll}</option>
            <option value="ouvertes">{labels.filters.stateOpen}</option>
            <option value="resolues">{labels.filters.stateResolved}</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="questions-search"
            className="mb-1.5 block text-sm font-medium text-slate-800"
          >
            {labels.filters.searchLabel}
          </label>
          <input
            id="questions-search"
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
              href="/questions-reponses"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-primary/20 bg-white px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {labels.filters.clear}
            </Link>
          ) : null}
        </div>
      </form>

      {questionsResult.error ? (
        <Notice tone="error">{labels.list.loadFailed}</Notice>
      ) : questionsResult.total === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-primary/20 bg-white px-5 py-8 text-center text-sm leading-6 text-slate-600">
          {hasFilters ? labels.list.noResults : labels.list.empty}
        </p>
      ) : (
        <>
          <p className="mt-6 text-sm text-slate-600" role="status">
            {questionsResult.total === 1
              ? labels.list.resultsCountOne
              : labels.list.resultsCountMany.replace(
                  "{count}",
                  String(questionsResult.total),
                )}
          </p>

          <ul className="mt-4 space-y-3">
            {questionsResult.questions.map((question) => {
              const author = authors[question.authorId];
              const badge = commentBadgeLabel(question.authorBadge);
              const href = `/cours/${question.courseId}#question-${question.id}`;

              return (
                <li
                  key={question.id}
                  className="rounded-2xl border border-primary/10 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold text-primary">
                          <Link
                            href={href}
                            className="underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                          >
                            {excerpt(question.body)}
                          </Link>
                        </h2>
                        {question.isResolved ? (
                          <span className="inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-900">
                            {labels.list.resolved}
                          </span>
                        ) : null}
                        {question.hidden ? (
                          <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900">
                            {labels.list.hidden}
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        <Link
                          href={`/cours/${question.courseId}`}
                          className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                        >
                          {question.courseName || fr.common.notAvailable}
                        </Link>
                      </p>

                      <p className="mt-1 flex flex-wrap items-center gap-2 text-xs leading-5 text-slate-600">
                        <span>
                          {author?.fullName || commentLabels.unknownAuthor}
                        </span>
                        {badge ? (
                          <span className="inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-xs font-semibold text-primary">
                            {badge}
                          </span>
                        ) : null}
                        <span aria-hidden="true">·</span>
                        <time dateTime={question.createdAt}>
                          {formatCommentDate(question.createdAt)}
                        </time>
                        <span aria-hidden="true">·</span>
                        <span>
                          {question.replyCount === 1
                            ? labels.list.repliesOne
                            : labels.list.repliesMany.replace(
                                "{count}",
                                String(question.replyCount),
                              )}
                        </span>
                      </p>
                    </div>

                    <Link
                      href={href}
                      className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-white px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      {labels.list.openLink}
                    </Link>
                  </div>
                </li>
              );
            })}
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
