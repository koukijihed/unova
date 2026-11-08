import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Notice } from "@/components/notice";
import { fr } from "@/content/fr";
import { getVisibleDriveLink } from "@/lib/drive/data";
import { driveKindLabel } from "@/lib/drive/format";
import { embedUrl, openUrl } from "@/lib/drive/links";
import { categoryLabel } from "@/lib/documents/format";

type DriveLinkPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: DriveLinkPageProps): Promise<Metadata> {
  const { id } = await params;
  const { link } = await getVisibleDriveLink(id);

  return {
    title: link
      ? `${link.title} — ${fr.site.name}`
      : fr.app.driveLinks.metadataTitle,
  };
}

export default async function DriveLinkPage({ params }: DriveLinkPageProps) {
  const { id } = await params;
  const { link, error } = await getVisibleDriveLink(id);
  const labels = fr.app.driveLinks;
  const detail = labels.detail;

  if (error) {
    return (
      <section className="mx-auto w-full max-w-4xl">
        <Notice tone="error">{detail.loadFailed}</Notice>
      </section>
    );
  }

  if (!link) {
    notFound();
  }

  return (
    <article className="mx-auto w-full max-w-4xl">
      <Link
        href={`/cours/${link.courseId}`}
        className="inline-flex items-center rounded-lg text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {detail.back}
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          {link.title}
        </h1>
        {link.status === "rejected" ? (
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
              href={`/cours/${link.courseId}`}
              className="text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {link.courseName || detail.notFound}
            </Link>
          </dd>
        </div>
        <div className="flex items-center gap-1.5">
          <dt className="font-medium text-slate-700">{detail.kindLabel}</dt>
          <dd>{driveKindLabel(link.kind)}</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <dt className="font-medium text-slate-700">
            {detail.categoryLabel}
          </dt>
          <dd>{categoryLabel(link.category)}</dd>
        </div>
      </dl>

      {link.description ? (
        <p className="mt-4 text-sm leading-6 whitespace-pre-line text-slate-700">
          {link.description}
        </p>
      ) : null}

      <section className="mt-8 rounded-2xl border border-primary/10 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold tracking-tight text-primary">
          {detail.previewTitle}
        </h2>

        <iframe
          src={embedUrl(link.kind, link.driveId)}
          title={detail.iframeTitle.replace("{title}", link.title)}
          sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
          referrerPolicy="no-referrer"
          loading="lazy"
          allow="fullscreen"
          className="mt-4 h-[75vh] min-h-80 w-full rounded-xl border border-primary/10 bg-slate-50"
        />

        <p className="mt-3 text-sm leading-6 text-slate-600">
          {detail.previewUnavailable}
        </p>

        <a
          href={openUrl(link.kind, link.driveId)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {detail.openDrive}
        </a>
      </section>
    </article>
  );
}
