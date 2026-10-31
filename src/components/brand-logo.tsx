import Image from "next/image";
import Link from "next/link";
import { fr } from "@/content/fr";

type BrandLogoProps = {
  variant?: "default" | "inverse";
  size?: "header" | "large";
  showText?: boolean;
  className?: string;
  onClick?: () => void;
  priority?: boolean;
};

export function BrandLogo({
  variant = "default",
  size = "header",
  showText = true,
  className = "",
  onClick,
  priority = false,
}: BrandLogoProps) {
  const inverse = variant === "inverse";
  const large = size === "large";

  return (
    <Link
      href="/"
      onClick={onClick}
      aria-label={fr.site.name}
      className={`inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent ${className}`}
    >
      <span
        className={`inline-flex shrink-0 items-center justify-center overflow-hidden ${
          large ? "size-16 rounded-2xl" : "size-10 rounded-xl"
        } ${inverse ? "bg-white" : ""}`}
      >
        <Image
          src="/brand/logo-icon.png"
          alt={fr.brand.logoAlt}
          width={large ? 128 : 80}
          height={large ? 128 : 80}
          sizes={large ? "96px" : "60px"}
          priority={priority}
          className={`${large ? "size-16" : "size-10"} scale-150 object-contain`}
        />
      </span>
      {showText ? (
        <span
          className={`font-sans font-bold tracking-tight ${
            large ? "text-3xl sm:text-4xl" : "text-xl"
          } ${inverse ? "text-white" : "text-primary"}`}
        >
          {fr.site.name}
        </span>
      ) : null}
    </Link>
  );
}
