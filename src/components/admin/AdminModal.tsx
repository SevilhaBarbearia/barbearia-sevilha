"use client";

import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from "react";
import {
  X,
} from "lucide-react";

import styles from "./AdminModal.module.css";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

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
  size?:
    | "md"
    | "lg"
    | "xl";
}) {
  const dialogRef =
    useRef<HTMLElement | null>(
      null,
    );

  const closeRef =
    useRef<HTMLButtonElement | null>(
      null,
    );

  const previousFocus =
    useRef<HTMLElement | null>(
      null,
    );

  const titleId =
    useId();

  const descriptionId =
    useId();

  useEffect(() => {
    if (!open) return;

    previousFocus.current =
      document.activeElement instanceof
      HTMLElement
        ? document.activeElement
        : null;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    const focusTimer =
      window.setTimeout(
        () => {
          closeRef.current?.focus();
        },
        0,
      );

    function onKeyDown(
      event: KeyboardEvent,
    ) {
      if (
        event.key ===
        "Escape"
      ) {
        event.preventDefault();
        onClose();
        return;
      }

      if (
        event.key !== "Tab"
      ) {
        return;
      }

      const dialog =
        dialogRef.current;

      if (!dialog) return;

      const focusable =
        Array.from(
          dialog.querySelectorAll<HTMLElement>(
            focusableSelector,
          ),
        ).filter(
          (element) =>
            element.offsetParent !==
            null,
        );

      if (
        focusable.length === 0
      ) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first =
        focusable[0];

      const last =
        focusable[
          focusable.length - 1
        ];

      if (
        event.shiftKey &&
        document.activeElement ===
          first
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement ===
          last
      ) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener(
      "keydown",
      onKeyDown,
    );

    return () => {
      window.clearTimeout(
        focusTimer,
      );

      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        onKeyDown,
      );

      previousFocus.current?.focus();
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
      className={`fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm ${styles.backdrop}`}
      role="presentation"
      onMouseDown={(
        event,
      ) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby={
          titleId
        }
        aria-describedby={
          description
            ? descriptionId
            : undefined
        }
        className={`w-full ${width} overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#172231] shadow-[0_30px_100px_rgba(0,0,0,0.5)] ${styles.dialog}`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-6">
          <div>
            <h2
              id={titleId}
              className="text-lg font-extrabold text-white sm:text-xl"
            >
              {title}
            </h2>

            {description && (
              <p
                id={
                  descriptionId
                }
                className="mt-1 text-sm leading-6 text-slate-400"
              >
                {description}
              </p>
            )}
          </div>

          <button
            ref={closeRef}
            type="button"
            onClick={
              onClose
            }
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:scale-[1.03] hover:bg-white/10 hover:text-white active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 motion-reduce:transform-none motion-reduce:transition-none"
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
