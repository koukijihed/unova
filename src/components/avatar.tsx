import { fr } from "@/content/fr";

type AvatarProps = {
  name?: string;
  src?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClasses = {
  sm: "size-8 text-xs",
  md: "size-9 text-sm",
  lg: "size-16 text-xl",
};

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "";
  }

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function Avatar({ name, src, size = "md", className = "" }: AvatarProps) {
  const sizeClass = sizeClasses[size];

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- l'URL proviendra du stockage utilisateur.
      <img
        src={src}
        alt={name ?? fr.app.avatarAlt}
        className={`${sizeClass} shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }

  if (name) {
    return (
      <span
        role="img"
        aria-label={name}
        className={`${sizeClass} inline-flex shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-white ${className}`}
      >
        {getInitials(name)}
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`${sizeClass} inline-flex shrink-0 items-center justify-center rounded-full bg-primary text-white ${className}`}
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-5">
        <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M5 20c0-3.4 3.1-6 7-6s7 2.6 7 6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
