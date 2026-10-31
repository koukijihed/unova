"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import { BrandLogo } from "@/components/brand-logo";
import { fr } from "@/content/fr";

type SidebarNavProps = {
  pathname: string;
  onNavigate?: () => void;
};

function SidebarNav({ pathname, onNavigate }: SidebarNavProps) {
  return (
    <>
      <nav
        aria-label={fr.app.nav.ariaLabel}
        className="flex-1 overflow-y-auto px-3 py-4"
      >
        <ul className="space-y-1">
          {fr.app.nav.items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                    active
                      ? "bg-white/[0.14] text-white"
                      : "text-slate-300 hover:bg-white/[0.08] hover:text-white",
                  ].join(" ")}
                >
                  <span
                    aria-hidden="true"
                    className={`h-1.5 w-1.5 rounded-full ${
                      active
                        ? "bg-accent"
                        : "bg-slate-500 group-hover:bg-slate-300"
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-white/10 p-4">
        <p className="rounded-xl bg-white/[0.06] px-3 py-2 text-xs leading-5 text-slate-300">
          {fr.app.sidebarNotice}
        </p>
      </div>
    </>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-5">
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-5">
      <path
        d="m6 6 12 12M18 6 6 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-4">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="m16 16 4 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (menuOpen && !dialog.open) {
      dialog.showModal();
      closeButtonRef.current?.focus();
    } else if (!menuOpen && dialog.open) {
      dialog.close();
    }
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setMenuOpen(false);
      }
    };

    desktopQuery.addEventListener("change", closeOnDesktop);

    return () => {
      desktopQuery.removeEventListener("change", closeOnDesktop);
    };
  }, []);

  function handleDialogClick(event: React.MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) {
      setMenuOpen(false);
    }
  }

  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 flex-col bg-primary lg:flex">
        <div className="flex h-16 items-center border-b border-white/10 px-5">
          <Link
            href="/"
            className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            <BrandLogo variant="inverse" />
          </Link>
        </div>
        <SidebarNav pathname={pathname} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-primary/10 bg-white/90 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label={fr.app.openMenu}
            aria-expanded={menuOpen}
            aria-controls="app-navigation-drawer"
            aria-haspopup="dialog"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/10 text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent lg:hidden"
          >
            <MenuIcon />
          </button>

          <div className="relative min-w-0 flex-1 sm:max-w-md">
            <input
              type="search"
              placeholder={fr.app.searchPlaceholder}
              aria-label={fr.app.searchLabel}
              title={fr.app.searchUnavailable}
              disabled
              className="h-10 w-full rounded-xl border border-primary/10 bg-slate-50 pr-3 pl-10 text-sm text-foreground placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-100"
            />
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-500">
              <SearchIcon />
            </span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/profil"
              aria-label={fr.app.profileLink}
              className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <Avatar />
            </Link>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>

      <dialog
        ref={dialogRef}
        id="app-navigation-drawer"
        aria-label={fr.app.nav.ariaLabel}
        onClose={() => setMenuOpen(false)}
        onClick={handleDialogClick}
        className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-[min(20rem,88vw)] max-w-none rounded-none border-0 bg-primary p-0 text-white shadow-2xl backdrop:bg-slate-950/60"
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
            <Link
              href="/"
              onClick={() => setMenuOpen(false)}
              className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            >
              <BrandLogo variant="inverse" />
            </Link>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label={fr.app.closeMenu}
              className="inline-flex size-10 items-center justify-center rounded-xl text-slate-200 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <CloseIcon />
            </button>
          </div>

          <SidebarNav
            pathname={pathname}
            onNavigate={() => setMenuOpen(false)}
          />
        </div>
      </dialog>
    </div>
  );
}
