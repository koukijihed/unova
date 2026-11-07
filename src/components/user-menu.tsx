"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import { fr } from "@/content/fr";
import { signOut } from "@/lib/auth/actions";
import type { ProfileNames } from "@/lib/types";

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-4">
      <path
        d="m6 9 6 6 6-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function UserMenu({
  profile,
  avatarUrl,
}: {
  profile: ProfileNames;
  avatarUrl: string | null;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const displayName = profile.fullName || fr.app.userMenu.fallbackName;

  useEffect(() => {
    if (!open) {
      return;
    }

    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function handleMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    );

    if (items.length === 0) {
      return;
    }

    const currentIndex = items.indexOf(
      document.activeElement as HTMLElement,
    );

    if (event.key === "ArrowDown") {
      event.preventDefault();
      items[(currentIndex + 1) % items.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      items[(currentIndex - 1 + items.length) % items.length]?.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      items[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      items[items.length - 1]?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={fr.app.userMenu.open}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls="user-account-menu"
        className="flex items-center gap-2 rounded-full border border-transparent p-0.5 pr-1.5 transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <Avatar
          name={profile.fullName || undefined}
          src={avatarUrl ?? undefined}
        />
        <span className="hidden max-w-40 truncate text-sm font-medium text-primary sm:block">
          {displayName}
        </span>
        <span className="text-slate-500">
          <ChevronIcon />
        </span>
      </button>

      {open ? (
        <div
          ref={menuRef}
          id="user-account-menu"
          role="menu"
          aria-label={fr.app.userMenu.label}
          onKeyDown={handleMenuKeyDown}
          className="absolute top-full right-0 z-40 mt-2 w-60 rounded-2xl border border-primary/10 bg-white p-2 shadow-xl shadow-primary/10"
        >
          <div className="flex items-center gap-3 px-3 py-2">
            <Avatar
              name={profile.fullName || undefined}
              src={avatarUrl ?? undefined}
            />
            <p className="truncate text-xs font-semibold tracking-wide text-slate-600 uppercase">
              {displayName}
            </p>
          </div>

          <Link
            href="/profil"
            role="menuitem"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="block rounded-xl px-3 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/5 focus-visible:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {fr.app.userMenu.profile}
          </Link>

          <form action={signOut}>
            <button
              type="submit"
              role="menuitem"
              tabIndex={-1}
              className="mt-1 block w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-700 transition-colors hover:bg-red-50 focus-visible:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {fr.app.userMenu.signOut}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
