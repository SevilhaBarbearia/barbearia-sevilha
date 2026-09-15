"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  usePathname,
  useSearchParams,
} from "next/navigation";
import { Scissors } from "lucide-react";

import styles from "./AppRouteLoader.module.css";

function isSamePageOnlyHash(target: URL) {
  return (
    target.pathname === window.location.pathname &&
    target.search === window.location.search
  );
}

function isInternalAnchorClick(
  event: MouseEvent,
  anchor: HTMLAnchorElement,
) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    anchor.target === "_blank" ||
    anchor.hasAttribute("download")
  ) {
    return false;
  }

  const rawHref =
    anchor.getAttribute("href");

  if (
    !rawHref ||
    rawHref.startsWith("mailto:") ||
    rawHref.startsWith("tel:")
  ) {
    return false;
  }

  try {
    const target = new URL(
      anchor.href,
      window.location.href,
    );

    if (
      target.origin !==
      window.location.origin
    ) {
      return false;
    }

    if (rawHref.startsWith("#")) {
      return false;
    }

    if (isSamePageOnlyHash(target)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

function isInternalFormSubmit(
  form: HTMLFormElement,
) {
  if (
    form.target === "_blank" ||
    form.hasAttribute("download")
  ) {
    return false;
  }

  const action =
    form.getAttribute("action") ||
    window.location.href;

  try {
    const target = new URL(
      action,
      window.location.href,
    );

    return (
      target.origin ===
      window.location.origin
    );
  } catch {
    return false;
  }
}

export function AppRouteLoader() {
  const pathname = usePathname();
  const searchParams =
    useSearchParams();

  const routeKey = useMemo(
    () =>
      `${pathname}?${searchParams.toString()}`,
    [pathname, searchParams],
  );

  const [visible, setVisible] =
    useState(false);

  const [message, setMessage] =
    useState(
      "Preparando a próxima tela...",
    );

  const hideTimer =
    useRef<ReturnType<
      typeof setTimeout
    > | null>(null);

  const safetyTimer =
    useRef<ReturnType<
      typeof setTimeout
    > | null>(null);

  function clearTimers() {
    if (hideTimer.current) {
      clearTimeout(
        hideTimer.current,
      );
      hideTimer.current = null;
    }

    if (safetyTimer.current) {
      clearTimeout(
        safetyTimer.current,
      );
      safetyTimer.current =
        null;
    }
  }

  function startLoading(
    customMessage?: string,
  ) {
    clearTimers();

    setMessage(
      customMessage?.trim() ||
        "Preparando a próxima tela...",
    );

    setVisible(true);

    safetyTimer.current =
      setTimeout(() => {
        setVisible(false);
      }, 10000);
  }

  useEffect(() => {
    if (!visible) {
      return;
    }

    hideTimer.current = setTimeout(
      () => {
        setVisible(false);
      },
      220,
    );

    return () => {
      if (hideTimer.current) {
        clearTimeout(
          hideTimer.current,
        );
        hideTimer.current = null;
      }
    };
  }, [routeKey, visible]);

  useEffect(() => {
    function onClick(
      event: MouseEvent,
    ) {
      const target =
        event.target;

      if (
        !(target instanceof Element)
      ) {
        return;
      }

      const anchor =
        target.closest("a");

      if (
        !(anchor instanceof
          HTMLAnchorElement) ||
        !isInternalAnchorClick(
          event,
          anchor,
        )
      ) {
        return;
      }

      const label =
        anchor.getAttribute(
          "data-loading-label",
        ) || anchor.textContent;

      startLoading(
        label
          ? `Abrindo ${label.trim()}...`
          : undefined,
      );
    }

    function onSubmit(
      event: Event,
    ) {
      const target =
        event.target;

      if (
        !(target instanceof
          HTMLFormElement) ||
        !isInternalFormSubmit(
          target,
        )
      ) {
        return;
      }

      startLoading(
        "Processando sua ação...",
      );
    }

    document.addEventListener(
      "click",
      onClick,
      true,
    );

    document.addEventListener(
      "submit",
      onSubmit,
      true,
    );

    return () => {
      document.removeEventListener(
        "click",
        onClick,
        true,
      );

      document.removeEventListener(
        "submit",
        onSubmit,
        true,
      );

      clearTimers();
    };
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div
      className={
        styles.overlay
      }
      role="status"
      aria-live="polite"
      aria-label="Carregando próxima tela"
    >
      <div
        className={styles.topBar}
      />

      <div
        className={styles.card}
      >
        <div
          className={styles.badge}
        >
          Agendamento online
        </div>

        <div
          className={styles.center}
        >
          <div
            className={
              styles.iconShell
            }
            aria-hidden="true"
          >
            <Scissors
              className={
                styles.icon
              }
              size={34}
            />
          </div>

          <h2
            className={styles.title}
          >
            Carregando
          </h2>

          <p
            className={styles.text}
          >
            {message}
          </p>

          <div
            className={styles.bars}
            aria-hidden="true"
          >
            <span
              className={styles.bar}
            />
            <span
              className={styles.bar}
            />
            <span
              className={styles.bar}
            />
          </div>

          <p
            className={
              styles.helper
            }
          >
            Aguarde só um instante.
          </p>
        </div>
      </div>

      <span className="sr-only">
        Carregando...
      </span>
    </div>
  );
}
