"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, type FormEvent } from "react";
import { ConfirmAction } from "@/components/management/confirm-action";
import { FeedbackProvider } from "@/components/management/feedback";
import { FormError } from "@/components/management/form-error";
import {
  SelectField,
  TextAreaField,
} from "@/components/management/form-fields";
import { fr } from "@/content/fr";
import {
  deleteCommentFormAction,
  editComment,
  postComment,
  setCommentHiddenFormAction,
  setCommentResolvedFormAction,
} from "@/lib/comments/actions";
import { commentBadgeLabel, commentKindLabel, formatCommentDate } from "@/lib/comments/format";
import {
  COMMENT_BODY_MAX,
  type CommentAuthor,
  type CommentContextOption,
  type CommentKind,
  type CommentThread,
  type CourseComment,
} from "@/lib/comments/types";

const LABELS = fr.app.comments;
const MESSAGE = LABELS.message;

export type CommentAuthorView = Pick<
  CommentAuthor,
  "fullName" | "initials" | "avatarUrl"
>;

export type CommentPagination = {
  currentPage: number;
  totalPages: number;
  previousHref: string | null;
  nextHref: string | null;
};

type CourseCommentsProps = {
  courseId: string;
  threads: CommentThread[];
  authors: Record<string, CommentAuthorView>;
  currentUserId: string;
  canModerate: boolean;
  contextOptions: CommentContextOption[];
  fixedContext: CommentContextOption | null;
  heading: string;
  description: string;
  emptyMessage?: string;
  pagination: CommentPagination;
  anchorPrefix?: string;
};

function contextValue(option: CommentContextOption): string {
  return `${option.type}:${option.id}`;
}

function excerpt(value: string): string {
  const trimmed = value.trim();

  return trimmed.length > 80 ? `${trimmed.slice(0, 80)}…` : trimmed;
}

function authorName(
  authors: Record<string, CommentAuthorView>,
  authorId: string,
): string {
  return authors[authorId]?.fullName || LABELS.unknownAuthor;
}

function initials(
  authors: Record<string, CommentAuthorView>,
  authorId: string,
): string {
  return authors[authorId]?.initials || "?";
}

function Avatar({
  authors,
  authorId,
}: {
  authors: Record<string, CommentAuthorView>;
  authorId: string;
}) {
  const author = authors[authorId];

  if (author?.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={author.avatarUrl}
        alt=""
        className="size-10 shrink-0 rounded-full border border-primary/10 object-cover"
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-primary/10 bg-primary/5 text-sm font-semibold text-primary"
    >
      {initials(authors, authorId)}
    </span>
  );
}

function FormSuccess({ message }: { message?: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <p
      role="status"
      className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900"
    >
      {message}
    </p>
  );
}

function SubmitButton({
  pending,
  label,
  pendingLabel,
}: {
  pending: boolean;
  label: string;
  pendingLabel: string;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60 sm:w-auto"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

function NewMessageForm({
  courseId,
  contextOptions,
  fixedContext,
}: {
  courseId: string;
  contextOptions: CommentContextOption[];
  fixedContext: CommentContextOption | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [kind, setKind] = useState<CommentKind>("question");
  const [body, setBody] = useState("");
  const [context, setContext] = useState(
    fixedContext ? contextValue(fixedContext) : "",
  );
  const formRef = useRef<HTMLFormElement>(null);
  const bodyId = useId();
  const kindId = useId();
  const contextId = useId();

  const documentOptions = contextOptions.filter(
    (option) => option.type === "document",
  );
  const videoOptions = contextOptions.filter(
    (option) => option.type === "video",
  );
  const driveOptions = contextOptions.filter(
    (option) => option.type === "drive",
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) {
      return;
    }

    setError(null);
    setSuccess(null);

    if (body.trim().length < 1) {
      setError(LABELS.errors.bodyRequired);
      return;
    }

    if (body.length > COMMENT_BODY_MAX) {
      setError(LABELS.errors.bodyTooLong);
      return;
    }

    setPending(true);

    try {
      const result = await postComment({
        courseId,
        kind,
        body,
        context: fixedContext ? contextValue(fixedContext) : context,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      formRef.current?.reset();
      setBody("");
      setKind("question");
      setContext(fixedContext ? contextValue(fixedContext) : "");
      setSuccess(LABELS.messages.posted);
      router.refresh();
    } catch {
      setError(LABELS.errors.generic);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-primary/10 bg-background p-5">
      <h3 className="text-base font-semibold text-primary">
        {LABELS.newMessage.title}
      </h3>

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        noValidate
        aria-busy={pending}
        className="mt-4 space-y-4"
      >
        <fieldset disabled={pending} className="space-y-4">
          <SelectField
            id={kindId}
            name="kind"
            label={LABELS.newMessage.kindLabel}
            value={kind}
            onChange={(event) =>
              setKind(event.target.value as CommentKind)
            }
          >
            <option value="question">{LABELS.kinds.question}</option>
            <option value="comment">{LABELS.kinds.comment}</option>
          </SelectField>

          {fixedContext ? (
            <>
              <input
                type="hidden"
                name="context"
                value={contextValue(fixedContext)}
              />
              <p className="text-xs leading-5 text-slate-600">
                {MESSAGE.context
                  .replace("{type}", MESSAGE.contextTypes[fixedContext.type])
                  .replace("{title}", fixedContext.title)}
              </p>
            </>
          ) : (
            <SelectField
              id={contextId}
              name="context"
              label={LABELS.newMessage.contextLabel}
              value={context}
              onChange={(event) => setContext(event.target.value)}
            >
              <option value="">{LABELS.newMessage.contextNone}</option>
              {documentOptions.length > 0 ? (
                <optgroup label={LABELS.newMessage.contextGroups.documents}>
                  {documentOptions.map((option) => (
                    <option key={option.id} value={contextValue(option)}>
                      {option.title}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {videoOptions.length > 0 ? (
                <optgroup label={LABELS.newMessage.contextGroups.videos}>
                  {videoOptions.map((option) => (
                    <option key={option.id} value={contextValue(option)}>
                      {option.title}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {driveOptions.length > 0 ? (
                <optgroup label={LABELS.newMessage.contextGroups.drive}>
                  {driveOptions.map((option) => (
                    <option key={option.id} value={contextValue(option)}>
                      {option.title}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </SelectField>
          )}

          <div>
            <TextAreaField
              id={bodyId}
              name="body"
              label={LABELS.newMessage.bodyLabel}
              placeholder={LABELS.newMessage.bodyPlaceholder}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={COMMENT_BODY_MAX}
              minLength={1}
              required
            />
            <p className="mt-1 text-xs leading-5 text-slate-600">
              {LABELS.newMessage.remaining.replace(
                "{count}",
                String(Math.max(0, COMMENT_BODY_MAX - body.length)),
              )}
            </p>
          </div>
        </fieldset>

        <FormError message={error ?? undefined} />
        <FormSuccess message={success} />

        <SubmitButton
          pending={pending}
          label={LABELS.newMessage.submit}
          pendingLabel={LABELS.newMessage.submitting}
        />
      </form>
    </div>
  );
}

function EditCommentForm({
  commentId,
  body,
  onDone,
}: {
  commentId: string;
  body: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bodyId = useId();
  const [value, setValue] = useState(body);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) {
      return;
    }

    setError(null);

    if (value.trim().length < 1) {
      setError(LABELS.errors.bodyRequired);
      return;
    }

    if (value.length > COMMENT_BODY_MAX) {
      setError(LABELS.errors.bodyTooLong);
      return;
    }

    setPending(true);

    try {
      const result = await editComment({ id: commentId, body: value });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      onDone();
      router.refresh();
    } catch {
      setError(LABELS.errors.generic);
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-busy={pending}
      className="mt-3 space-y-3 rounded-xl border border-primary/10 bg-background p-4"
    >
      <TextAreaField
        id={bodyId}
        name="body"
        label={LABELS.newMessage.bodyLabel}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        maxLength={COMMENT_BODY_MAX}
        minLength={1}
        required
      />

      <FormError message={error ?? undefined} />

      <div className="flex flex-wrap items-center gap-2">
        <SubmitButton
          pending={pending}
          label={MESSAGE.save}
          pendingLabel={MESSAGE.saving}
        />
        <button
          type="button"
          onClick={onDone}
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-primary/20 bg-white px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {MESSAGE.cancel}
        </button>
      </div>
    </form>
  );
}

function ReplyForm({
  courseId,
  parentId,
  onDone,
}: {
  courseId: string;
  parentId: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const bodyId = useId();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) {
      return;
    }

    setError(null);

    if (body.trim().length < 1) {
      setError(LABELS.errors.bodyRequired);
      return;
    }

    if (body.length > COMMENT_BODY_MAX) {
      setError(LABELS.errors.bodyTooLong);
      return;
    }

    setPending(true);

    try {
      const result = await postComment({
        courseId,
        kind: "comment",
        body,
        parentId,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      formRef.current?.reset();
      setBody("");
      onDone();
      router.refresh();
    } catch {
      setError(LABELS.errors.generic);
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      aria-busy={pending}
      className="mt-3 space-y-3 rounded-xl border border-primary/10 bg-background p-4"
    >
      <TextAreaField
        id={bodyId}
        name="body"
        label={LABELS.reply.title}
        placeholder={LABELS.reply.placeholder}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        maxLength={COMMENT_BODY_MAX}
        minLength={1}
        required
      />
      <p className="mt-1 text-xs leading-5 text-slate-600">
        {LABELS.newMessage.remaining.replace(
          "{count}",
          String(Math.max(0, COMMENT_BODY_MAX - body.length)),
        )}
      </p>

      <FormError message={error ?? undefined} />

      <div className="flex flex-wrap items-center gap-2">
        <SubmitButton
          pending={pending}
          label={LABELS.reply.submit}
          pendingLabel={LABELS.reply.submitting}
        />
        <button
          type="button"
          onClick={onDone}
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-primary/20 bg-white px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {LABELS.reply.cancel}
        </button>
      </div>
    </form>
  );
}

function CommentBody({
  comment,
  authors,
}: {
  comment: CourseComment;
  authors: Record<string, CommentAuthorView>;
}) {
  const badge = commentBadgeLabel(comment.authorBadge);

  return (
    <div className="flex items-start gap-3">
      <Avatar authors={authors} authorId={comment.authorId} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-primary">
            {authorName(authors, comment.authorId)}
          </p>
          {badge ? (
            <span className="inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {badge}
            </span>
          ) : null}
          <span className="inline-flex items-center rounded-full border border-primary/15 bg-white px-2 py-0.5 text-xs font-medium text-slate-700">
            {commentKindLabel(comment.kind)}
          </span>
          {comment.isResolved ? (
            <span className="inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-900">
              {MESSAGE.resolved}
            </span>
          ) : null}
          {comment.hidden ? (
            <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-900">
              {MESSAGE.hidden}
            </span>
          ) : null}
        </div>

        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs leading-5 text-slate-600">
          <time dateTime={comment.createdAt}>
            {formatCommentDate(comment.createdAt)}
          </time>
          {comment.editedAt ? (
            <span className="text-slate-500">· {MESSAGE.edited}</span>
          ) : null}
        </p>

        {comment.contextType && comment.contextTitle ? (
          <p className="mt-1 text-xs leading-5 text-slate-600">
            {MESSAGE.context
              .replace("{type}", MESSAGE.contextTypes[comment.contextType])
              .replace("{title}", comment.contextTitle)}
          </p>
        ) : null}

        <p className="mt-2 text-sm leading-6 break-words whitespace-pre-line text-slate-800">
          {comment.body}
        </p>
      </div>
    </div>
  );
}

function CommentActions({
  comment,
  canModerate,
  currentUserId,
  authorFullName,
  onReply,
}: {
  comment: CourseComment;
  canModerate: boolean;
  currentUserId: string;
  authorFullName: string;
  onReply: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const isAuthor = comment.authorId === currentUserId;
  const canResolve =
    comment.kind === "question" &&
    comment.parentId === null &&
    (isAuthor || canModerate);

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-2">
        {comment.parentId === null ? (
          <button
            type="button"
            onClick={onReply}
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-primary/20 bg-white px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {LABELS.reply.action}
          </button>
        ) : null}

        {isAuthor ? (
          <button
            type="button"
            onClick={() => setEditing((value) => !value)}
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-primary/20 bg-white px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {editing ? MESSAGE.cancel : MESSAGE.edit}
          </button>
        ) : null}

        {canResolve ? (
          comment.isResolved ? (
            <ConfirmAction
              action={setCommentResolvedFormAction}
              fields={{ commentId: comment.id, resolved: "false" }}
              triggerLabel={MESSAGE.reopen}
              title={MESSAGE.reopenTitle}
              description={MESSAGE.reopenDescription.replace(
                "{excerpt}",
                excerpt(comment.body),
              )}
              confirmLabel={MESSAGE.reopenConfirm}
              pendingLabel={MESSAGE.processing}
              tone="primary"
            />
          ) : (
            <ConfirmAction
              action={setCommentResolvedFormAction}
              fields={{ commentId: comment.id, resolved: "true" }}
              triggerLabel={MESSAGE.resolve}
              title={MESSAGE.resolveTitle}
              description={MESSAGE.resolveDescription.replace(
                "{excerpt}",
                excerpt(comment.body),
              )}
              confirmLabel={MESSAGE.resolveConfirm}
              pendingLabel={MESSAGE.processing}
              tone="primary"
            />
          )
        ) : null}

        {canModerate ? (
          comment.hidden ? (
            <ConfirmAction
              action={setCommentHiddenFormAction}
              fields={{ commentId: comment.id, hidden: "false" }}
              triggerLabel={MESSAGE.show}
              title={MESSAGE.showTitle}
              description={MESSAGE.showDescription.replace(
                "{name}",
                authorFullName,
              )}
              confirmLabel={MESSAGE.showConfirm}
              pendingLabel={MESSAGE.processing}
              tone="primary"
            />
          ) : (
            <ConfirmAction
              action={setCommentHiddenFormAction}
              fields={{ commentId: comment.id, hidden: "true" }}
              triggerLabel={MESSAGE.hide}
              title={MESSAGE.hideTitle}
              description={MESSAGE.hideDescription.replace(
                "{name}",
                authorFullName,
              )}
              confirmLabel={MESSAGE.hideConfirm}
              pendingLabel={MESSAGE.processing}
              tone="danger"
            />
          )
        ) : null}

        {isAuthor || canModerate ? (
          <ConfirmAction
            action={deleteCommentFormAction}
            fields={{ commentId: comment.id }}
            triggerLabel={MESSAGE.delete}
            title={MESSAGE.deleteTitle}
            description={MESSAGE.deleteDescription.replace(
              "{name}",
              authorFullName,
            )}
            confirmLabel={MESSAGE.deleteConfirm}
            pendingLabel={MESSAGE.deleting}
            tone="danger"
          />
        ) : null}
      </div>

      {editing ? (
        <EditCommentForm
          commentId={comment.id}
          body={comment.body}
          onDone={() => setEditing(false)}
        />
      ) : null}
    </div>
  );
}

function CommentItem({
  comment,
  replies,
  authors,
  courseId,
  currentUserId,
  canModerate,
  anchorPrefix,
}: {
  comment: CourseComment;
  replies: CourseComment[];
  authors: Record<string, CommentAuthorView>;
  courseId: string;
  currentUserId: string;
  canModerate: boolean;
  anchorPrefix?: string;
}) {
  const [replying, setReplying] = useState(false);
  const author = authorName(authors, comment.authorId);
  const anchorId = anchorPrefix ? `${anchorPrefix}${comment.id}` : undefined;

  return (
    <li
      id={anchorId}
      className="scroll-mt-24 rounded-2xl border border-primary/10 bg-white p-4 shadow-sm"
    >
      <CommentBody comment={comment} authors={authors} />

      <CommentActions
        comment={comment}
        canModerate={canModerate}
        currentUserId={currentUserId}
        authorFullName={author}
        onReply={() => setReplying((value) => !value)}
      />

      {replying ? (
        <ReplyForm
          courseId={courseId}
          parentId={comment.id}
          onDone={() => setReplying(false)}
        />
      ) : null}

      {replies.length > 0 ? (
        <ul className="mt-4 space-y-4 border-l-2 border-primary/10 pl-4">
          {replies.map((reply) => (
            <li key={reply.id}>
              <CommentBody comment={reply} authors={authors} />
              <CommentActions
                comment={reply}
                canModerate={canModerate}
                currentUserId={currentUserId}
                authorFullName={authorName(authors, reply.authorId)}
                onReply={() => undefined}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function CourseComments({
  courseId,
  threads,
  authors,
  currentUserId,
  canModerate,
  contextOptions,
  fixedContext,
  heading,
  description,
  emptyMessage,
  pagination,
  anchorPrefix,
}: CourseCommentsProps) {
  return (
    <FeedbackProvider>
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-primary">
          {heading}
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>

        <div className="mt-4">
          <NewMessageForm
            courseId={courseId}
            contextOptions={contextOptions}
            fixedContext={fixedContext}
          />
        </div>

        {threads.length === 0 ? (
          <p className="mt-5 rounded-xl border border-dashed border-primary/20 bg-background px-4 py-6 text-center text-sm leading-6 text-slate-600">
            {emptyMessage ?? LABELS.empty}
          </p>
        ) : (
          <ul className="mt-5 space-y-4">
            {threads.map((thread) => (
              <CommentItem
                key={thread.comment.id}
                comment={thread.comment}
                replies={thread.replies}
                authors={authors}
                courseId={courseId}
                currentUserId={currentUserId}
                canModerate={canModerate}
                anchorPrefix={anchorPrefix}
              />
            ))}
          </ul>
        )}

        {pagination.totalPages > 1 ? (
          <nav
            aria-label={LABELS.pagination.pageInfo
              .replace("{page}", String(pagination.currentPage))
              .replace("{total}", String(pagination.totalPages))}
            className="mt-6 flex flex-wrap items-center justify-between gap-3"
          >
            {pagination.previousHref ? (
              <Link
                href={pagination.previousHref}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-primary/20 bg-white px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {LABELS.pagination.previous}
              </Link>
            ) : (
              <span />
            )}

            <p className="text-sm text-slate-600">
              {LABELS.pagination.pageInfo
                .replace("{page}", String(pagination.currentPage))
                .replace("{total}", String(pagination.totalPages))}
            </p>

            {pagination.nextHref ? (
              <Link
                href={pagination.nextHref}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-primary/20 bg-white px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {LABELS.pagination.next}
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </div>
    </FeedbackProvider>
  );
}
