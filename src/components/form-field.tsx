import type { InputHTMLAttributes } from "react";

type FormFieldProps = {
  id: string;
  label: string;
  error?: string;
  hint?: string;
} & InputHTMLAttributes<HTMLInputElement>;

export function FormField({
  id,
  label,
  error,
  hint,
  className = "",
  ...props
}: FormFieldProps) {
  const describedBy =
    [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-primary">
        {label}
      </label>
      <input
        id={id}
        {...props}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm text-foreground placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600 ${
          error ? "border-red-400" : "border-primary/15"
        } ${className}`}
      />
      {hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs leading-5 text-slate-600">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1.5 text-sm leading-5 text-red-700"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
