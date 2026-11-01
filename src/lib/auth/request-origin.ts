import { headers } from "next/headers";

export async function getRequestOrigin(): Promise<string> {
  const headerStore = await headers();
  const origin = headerStore.get("origin");

  if (origin) {
    return origin.replace(/\/$/, "");
  }

  const host =
    headerStore.get("x-forwarded-host") ?? headerStore.get("host");

  if (host) {
    const protocol =
      headerStore.get("x-forwarded-proto") ??
      (host.startsWith("localhost") ? "http" : "https");

    return `${protocol}://${host}`;
  }

  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL;

  return configuredOrigin ? configuredOrigin.replace(/\/$/, "") : "";
}
