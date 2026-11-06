"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { fr } from "@/content/fr";
import type { ManagementActionState } from "@/lib/management/action-state";

type FeedbackContextValue = {
  showMessage: (message: string) => void;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timeout = window.setTimeout(() => setMessage(null), 6000);

    return () => window.clearTimeout(timeout);
  }, [message]);

  return (
    <FeedbackContext.Provider value={{ showMessage: setMessage }}>
      {children}
      {message ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed right-4 bottom-4 z-50 flex max-w-sm items-start gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900 shadow-lg"
        >
          <p className="flex-1">{message}</p>
          <button
            type="button"
            onClick={() => setMessage(null)}
            aria-label={fr.app.management.admin.common.close}
            className="inline-flex size-6 shrink-0 items-center justify-center rounded-lg text-emerald-900 transition-colors hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      ) : null}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);

  if (!context) {
    throw new Error("FeedbackProvider manquant.");
  }

  return context;
}

export function useFormFeedback(state: ManagementActionState) {
  const { showMessage } = useFeedback();

  useEffect(() => {
    if (state.status === "success" && state.message) {
      showMessage(state.message);
    }
  }, [state, showMessage]);
}
