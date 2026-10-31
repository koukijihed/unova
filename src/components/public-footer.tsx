import { BrandLogo } from "@/components/brand-logo";
import { fr } from "@/content/fr";

export function PublicFooter() {
  return (
    <footer className="border-t border-primary/10 bg-white">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-10 sm:grid-cols-2">
        <div>
          <BrandLogo />
          <p className="mt-4 max-w-sm text-sm leading-6 text-slate-600">
            {fr.footer.tagline}
          </p>
        </div>

        <div className="sm:text-right">
          <p className="text-sm font-semibold text-primary">
            {fr.footer.addressLabel}
          </p>
          <address className="mt-2 text-sm leading-6 text-slate-600 not-italic">
            {fr.footer.address}
          </address>
        </div>
      </div>

      <div className="border-t border-primary/10">
        <div className="mx-auto w-full max-w-6xl px-6 py-4 text-xs text-slate-600">
          {fr.footer.copyright}
        </div>
      </div>
    </footer>
  );
}
