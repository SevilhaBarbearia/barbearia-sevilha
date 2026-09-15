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

import styles from "./AppRouteLoader.module.css";

const MIN_VISIBLE_MS = 250;
const SAFETY_TIMEOUT_MS = 8000;

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
    rawHref.startsWith(
      "tel:",
    )
  ) {
    return false;
  }

  try {
    const target =
      new URL(
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
      rawHref.startsWith(
        "#",
      ) ||
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

export function AppRouteLoader() {
  const pathname =
    usePathname();

  const searchParams =
    useSearchParams();

  const routeKey =
    useMemo(
      () =>
        `${pathname}?${searchParams.toString()}`,
      [
        pathname,
        searchParams,
      ],
    );

  const [
    visible,
    setVisible,
  ] = useState(false);

  const startedAt =
    useRef(0);

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

  function startLoading() {
    clearSafetyTimer();

    startedAt.current =
      Date.now();

    setVisible(true);

    /*
     * Eu mantenho apenas uma proteção de segurança para evitar
     * uma barra presa caso alguma navegação seja interrompida.
     *
     * O loading visual real da página continua sendo responsabilidade
     * dos loading.tsx específicos do tenant e do admin.
     */
    safetyTimer.current =
      setTimeout(
        () => {
          setVisible(
            false,
          );
        },
        SAFETY_TIMEOUT_MS,
      );
  }

  /*
   * A barra superior serve somente como resposta imediata ao clique.
   * Quando a rota efetivamente muda, eu a retiro após um tempo mínimo
   * curto para evitar um "pisca" visual.
   *
   * O conteúdo de carregamento da página vem dos loading.tsx do Next.js.
   */
  useEffect(() => {
    if (
      !mounted.current
    ) {
      mounted.current =
        true;

      return;
    }

    clearSafetyTimer();

    const elapsed =
      Date.now() -
      startedAt.current;

    const remaining =
      Math.max(
        0,
        MIN_VISIBLE_MS -
          elapsed,
      );

    const timer =
      setTimeout(
        () => {
          setVisible(
            false,
          );
        },
        remaining,
      );

    return () =>
      clearTimeout(
        timer,
      );
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
        target.closest(
          "a",
        );

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

      startLoading();
    }

    function onPopState() {
      startLoading();
    }

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
        styles.indicator
      }
      role="status"
      aria-live="polite"
      aria-label="Carregando próxima tela"
    >
      <div
        className={
          styles.track
        }
        aria-hidden="true"
      >
        <span
          className={
            styles.bar
          }
        />
      </div>

      <span className="sr-only">
        Carregando próxima tela...
      </span>
    </div>
  );
}
