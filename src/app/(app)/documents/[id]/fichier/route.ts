import { NextResponse } from "next/server";
import { fr } from "@/content/fr";
import { getDocumentFile } from "@/lib/documents/data";
import {
  DOCUMENT_BUCKET,
  sanitizeOriginalName,
} from "@/lib/documents/validation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

function textResponse(message: string, status: number) {
  return new NextResponse(message, {
    status,
    headers: {
      ...NO_STORE_HEADERS,
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") === "view" ? "view" : "download";

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const acceptsHtml = request.headers.get("accept")?.includes("text/html");

    if (acceptsHtml) {
      const redirectUrl = new URL("/connexion", url.origin);
      redirectUrl.searchParams.set(
        "redirection",
        `${url.pathname}${url.search}`,
      );

      return NextResponse.redirect(redirectUrl, 302);
    }

    return textResponse(
      fr.app.documents.management.errors.forbidden,
      401,
    );
  }

  const { document, error } = await getDocumentFile(id);

  if (error || !document) {
    return textResponse(fr.app.documents.detail.notFound, 404);
  }

  const downloadName =
    sanitizeOriginalName(document.originalName) || "document";

  const { data, error: signedUrlError } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .createSignedUrl(
      document.storagePath,
      60,
      mode === "download" ? { download: downloadName } : undefined,
    );

  if (signedUrlError || !data) {
    console.error("createSignedUrl failed", {
      statusCode: signedUrlError?.statusCode ?? null,
      message: signedUrlError?.message ?? null,
    });

    return textResponse(fr.app.documents.detail.notFound, 404);
  }

  const response = NextResponse.redirect(data.signedUrl, 302);

  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Content-Type-Options", "nosniff");

  return response;
}
