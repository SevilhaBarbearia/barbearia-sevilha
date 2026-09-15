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

function isSamePageOnlyHash(
  target: URL,
) {
  return (
    target.pathname ===
      window.location.pathname &&
    target.search ===
      window.location.search
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
    anchor.hasAttribute(
      "download",
    )
  ) {
    return false;
  }

  const rawHref =
    anchor.getAttribute(
      "href",
    );

  if (
    !rawHref ||
    rawHref.startsWith(
      "mailto:",
    ) ||
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

    if (
      rawHref.startsWith("#") ||
      isSamePageOnlyHash(
        target,
      )
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

function readableLinkLabel(
  anchor: HTMLAnchorElement,
) {
  const raw =
    anchor.getAttribute(
      "data-loading-label",
    ) ||
    anchor.getAttribute(
      "aria-label",
    ) ||
    anchor.textContent ||
    "";

  const normalized = raw
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return null;
  }

  return normalized.length > 42
    ? `${normalized.slice(
        0,
        42,
      )}…`
    : normalized;
}

export function AppRouteLoader() {
  const pathname =
    usePathname();

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

  const safetyTimer =
    useRef<ReturnType<
      typeof setTimeout
    > | null>(null);

  const mounted =
    useRef(false);

  function clearSafetyTimer() {
    if (
      safetyTimer.current
    ) {
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
    clearSafetyTimer();

    setMessage(
      customMessage?.trim() ||
        "Preparando a próxima tela...",
    );

    setVisible(true);

    safetyTimer.current =
      setTimeout(() => {
        setVisible(false);
      }, 8000);
  }

  /*
   * Só encerramos o overlay quando a rota realmente mudou.
   * Antes ele também reagia ao próprio setVisible(true), o que podia
   * esconder o loading depois de poucos milissegundos.
   */
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }

    clearSafetyTimer();

    const timer = setTimeout(
      () => {
        setVisible(false);
      },
      260,
    );

    return () =>
      clearTimeout(timer);
  }, [routeKey]);

  useEffect(() => {
    function onClick(
      event: MouseEvent,
    ) {
      const target =
        event.target;

      if (
        !(
          target instanceof
          Element
        )
      ) {
        return;
      }

      const anchor =
        target.closest("a");

      if (
        !(
          anchor instanceof
          HTMLAnchorElement
        ) ||
        !isInternalAnchorClick(
          event,
          anchor,
        )
      ) {
        return;
      }

      const label =
        readableLinkLabel(
          anchor,
        );

      startLoading(
        label
          ? `Abrindo ${label}...`
          : undefined,
      );
    }

    function onPopState() {
      startLoading(
        "Atualizando a navegação...",
      );
    }

    /*
     * Form actions não entram no overlay global.
     * Muitas delas retornam validações sem trocar de rota; nesses casos
     * o próprio formulário mostra o estado de processamento.
     */
    document.addEventListener(
      "click",
      onClick,
      true,
    );

    window.addEventListener(
      "popstate",
      onPopState,
    );

    return () => {
      document.removeEventListener(
        "click",
        onClick,
        true,
      );

      window.removeEventListener(
        "popstate",
        onPopState,
      );

      clearSafetyTimer();
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
        className={
          styles.topBar
        }
      />

      <div
        className={
          styles.card
        }
      >
        <div
          className={
            styles.badge
          }
        >
          Agendamento online
        </div>

        <div
          className={
            styles.center
          }
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
            className={
              styles.title
            }
          >
            Carregando
          </h2>

          <p
            className={
              styles.text
            }
          >
            {message}
          </p>

          <div
            className={
              styles.bars
            }
            aria-hidden="true"
          >
            <span
              className={
                styles.bar
              }
            />
            <span
              className={
                styles.bar
              }
            />
            <span
              className={
                styles.bar
              }
            />
          </div>

          <p
            className={
              styles.helper
            }
          >
            Aguarde só um
            instante.
          </p>
        </div>
      </div>

      <span className="sr-only">
        Carregando...
      </span>
    </div>
  );
}
