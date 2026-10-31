import { fr } from "@/content/fr";

type BrandLogoProps = {
  variant?: "default" | "inverse";
  showText?: boolean;
  className?: string;
};

export function BrandLogo({
  variant = "default",
  showText = true,
  className = "",
}: BrandLogoProps) {
  const inverse = variant === "inverse";

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* TODO: remplacer ce SVG provisoire par le logo officiel UNOVA. */}
      <svg
        viewBox="0 0 40 40"
        aria-hidden="true"
        className="size-9 shrink-0"
      >
        <rect
          width="40"
          height="40"
          rx="11"
          fill={inverse ? "rgba(255, 255, 255, 0.14)" : "var(--primary)"}
        />
        <path
          d="M12 10.5v11c0 4.2 3.3 7.5 8 7.5s8-3.3 8-7.5v-11"
          fill="none"
          stroke="white"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <circle cx="30.5" cy="10" r="3.5" fill="var(--accent)" />
      </svg>
      {showText ? (
        <span
          className={`text-lg font-semibold tracking-tight ${
            inverse ? "text-white" : "text-primary"
          }`}
        >
          {fr.site.name}
        </span>
      ) : (
        <span className="sr-only">{fr.brand.logoAlt}</span>
      )}
    </span>
  );
}
