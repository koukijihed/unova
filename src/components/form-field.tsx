import type { InputHTMLAttributes } from "react";

type FormFieldProps = {
  id: string;
  label: string;
} & InputHTMLAttributes<HTMLInputElement>;

export function FormField({ id, label, className = "", ...props }: FormFieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-primary"
      >
        {label}
      </label>
      <input
        id={id}
        {...props}
        className={`mt-2 h-11 w-full rounded-xl border border-primary/15 bg-white px-3 text-sm text-foreground placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600 ${className}`}
      />
    </div>
  );
}
