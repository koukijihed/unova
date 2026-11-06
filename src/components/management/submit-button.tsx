"use client";

import { useFormStatus } from "react-dom";

export function ManagementSubmitButton({
  label,
  pendingLabel,
  tone = "primary",
}: {
  label: string;
  pendingLabel: string;
  tone?: "primary" | "danger";
}) {
  const { pending } = useFormStatus();
  const toneClasses =
    tone === "danger"
      ? "bg-red-700 text-white hover:bg-red-800"
      : "bg-primary text-white hover:bg-primary/90";

  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className={`inline-flex min-h-10 w-full items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60 sm:w-auto ${toneClasses}`}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
