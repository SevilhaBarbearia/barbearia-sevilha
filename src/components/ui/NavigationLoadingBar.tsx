"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";

function isInternalNavigation(
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

  const href = anchor.getAttribute("href");

  if (
    !href ||
    href.startsWith("#") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
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

    /*
     * Mudança apenas de hash não representa troca de tela.
     */
    if (
      target.pathname ===
        window.location.pathname &&
      target.search ===
        window.location.search
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function NavigationLoadingBar() {
  const pathname = usePathname();

  const [loading, setLoading] =
    useState(false);

  const safetyTimer =
    useRef<ReturnType<
      typeof setTimeout
    > | null>(null);

  useEffect(() => {
    setLoading(false);

    if (safetyTimer.current) {
      clearTimeout(
        safetyTimer.current,
      );

      safetyTimer.current =
        null;
    }
  }, [pathname]);

  useEffect(() => {
    function startLoading(
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
        !isInternalNavigation(
          event,
          anchor,
        )
      ) {
        return;
      }

      setLoading(true);

      if (safetyTimer.current) {
        clearTimeout(
          safetyTimer.current,
        );
      }

      /*
       * Evita um indicador preso caso uma navegação seja cancelada.
       */
      safetyTimer.current =
        setTimeout(() => {
          setLoading(false);
        }, 10000);
    }

    document.addEventListener(
      "click",
      startLoading,
      true,
    );

    return () => {
      document.removeEventListener(
        "click",
        startLoading,
        true,
      );

      if (safetyTimer.current) {
        clearTimeout(
          safetyTimer.current,
        );
      }
    };
  }, []);

  if (!loading) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[250] h-1 overflow-hidden bg-black/5"
      role="status"
      aria-live="polite"
      aria-label="Carregando próxima tela"
    >
      <div className="h-full w-2/3 animate-pulse bg-[#D6A63C] shadow-[0_0_16px_rgba(214,166,60,0.75)] motion-reduce:animate-none" />

      <span className="sr-only">
        Carregando...
      </span>
    </div>
  );
}
