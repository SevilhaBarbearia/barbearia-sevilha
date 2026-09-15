"use client";

import {
  useEffect,
  type ReactNode,
} from "react";
import {
  X,
} from "lucide-react";

export function AdminModal({
  open,
  title,
  description,
  onClose,
  children,
  size = "lg",
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  size?: "md" | "lg" | "xl";
}) {
  useEffect(() => {
    if (!open) return;

    const previous =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    function onKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener(
      "keydown",
      onKeyDown,
    );

    return () => {
      document.body.style.overflow =
        previous;

      window.removeEventListener(
        "keydown",
        onKeyDown,
      );
    };
  }, [open, onClose]);

  if (!open) return null;

  const width =
    size === "xl"
      ? "max-w-5xl"
      : size === "md"
        ? "max-w-lg"
        : "max-w-2xl";

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full ${width} overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#172231] shadow-[0_30px_100px_rgba(0,0,0,0.5)]`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-extrabold text-white sm:text-xl">
              {title}
            </h2>

            {description && (
              <p className="mt-1 text-sm leading-6 text-slate-400">
                {description}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="max-h-[78vh] overflow-y-auto p-5 sm:p-6">
          {children}
        </div>
      </section>
    </div>
  );
}
