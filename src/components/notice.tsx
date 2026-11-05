import type { ReactNode } from "react";

type NoticeTone = "info" | "warning" | "success" | "error";

type NoticeProps = {
  tone: NoticeTone;
  children: ReactNode;
};

const TONE_CLASSES: Record<NoticeTone, string> = {
  info: "border-sky-300 bg-sky-50 text-sky-900",
  warning: "border-amber-300 bg-amber-50 text-amber-900",
  success: "border-emerald-300 bg-emerald-50 text-emerald-900",
  error: "border-red-300 bg-red-50 text-red-800",
};

export function Notice({ tone, children }: NoticeProps) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`mt-8 flex gap-3 rounded-2xl border px-5 py-4 text-sm leading-6 ${TONE_CLASSES[tone]}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="mt-0.5 size-5 shrink-0"
      >
        {tone === "success" ? (
          <path
            d="m5 12.5 4.2 4.2L19 7"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : tone === "error" ? (
          <path
            d="M8 8l8 8M16 8l-8 8"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        ) : (
          <>
            <circle
              cx="12"
              cy="12"
              r="8.5"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <path
              d="M12 8v4.5M12 16h.01"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </>
        )}
      </svg>
      <div>{children}</div>
    </div>
  );
}
