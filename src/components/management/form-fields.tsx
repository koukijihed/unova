import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

type FieldBaseProps = {
  id: string;
  label: string;
  error?: string;
  hint?: string;
};

function describedBy(
  id: string,
  hint?: string,
  error?: string,
): string | undefined {
  const ids = [
    hint ? `${id}-hint` : null,
    error ? `${id}-error` : null,
  ].filter(Boolean);

  return ids.length > 0 ? ids.join(" ") : undefined;
}

function FieldHint({
  id,
  hint,
  className = "",
}: {
  id: string;
  hint?: string;
  className?: string;
}) {
  if (!hint) {
    return null;
  }

  return (
    <p
      id={`${id}-hint`}
      className={`mt-1.5 text-xs leading-5 text-slate-600 ${className}`}
    >
      {hint}
    </p>
  );
}

function FieldError({
  id,
  error,
  className = "",
}: {
  id: string;
  error?: string;
  className?: string;
}) {
  if (!error) {
    return null;
  }

  return (
    <p
      id={`${id}-error`}
      role="alert"
      className={`mt-1.5 text-sm leading-5 text-red-700 ${className}`}
    >
      {error}
    </p>
  );
}

export function SelectField({
  id,
  label,
  error,
  hint,
  children,
  className = "",
  ...props
}: FieldBaseProps &
  SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-primary">
        {label}
      </label>
      <select
        id={id}
        {...props}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={`mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600 ${
          error ? "border-red-400" : "border-primary/15"
        } ${className}`}
      >
        {children}
      </select>
      <FieldHint id={id} hint={hint} />
      <FieldError id={id} error={error} />
    </div>
  );
}

export function TextAreaField({
  id,
  label,
  error,
  hint,
  className = "",
  ...props
}: FieldBaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-primary">
        {label}
      </label>
      <textarea
        id={id}
        {...props}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={`mt-2 min-h-28 w-full rounded-xl border bg-white px-3 py-2 text-sm text-foreground placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600 ${
          error ? "border-red-400" : "border-primary/15"
        } ${className}`}
      />
      <FieldHint id={id} hint={hint} />
      <FieldError id={id} error={error} />
    </div>
  );
}

export function CheckboxField({
  id,
  label,
  error,
  hint,
  className = "",
  ...props
}: FieldBaseProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          {...props}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          className={`mt-0.5 size-4 rounded border-primary/30 text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${className}`}
        />
        <label htmlFor={id} className="text-sm font-medium text-primary">
          {label}
        </label>
      </div>
      <FieldHint id={id} hint={hint} className="ml-7" />
      <FieldError id={id} error={error} className="ml-7" />
    </div>
  );
}
