import type { ReactNode } from "react";

type AuthAlertProps = {
  tone: "error" | "success";
  children: ReactNode;
};

export function AuthAlert({ tone, children }: AuthAlertProps) {
  const isSuccess = tone === "success";

  return (
    <div
      role={isSuccess ? "status" : "alert"}
      aria-live="polite"
      className={`rounded-xl border px-4 py-3 text-sm leading-6 ${
        isSuccess
          ? "border-emerald-300 bg-emerald-50 text-emerald-900"
          : "border-red-300 bg-red-50 text-red-800"
      }`}
    >
      {children}
    </div>
  );
}
