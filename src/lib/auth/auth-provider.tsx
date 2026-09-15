"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  AuthChangeEvent,
  Session,
  User,
} from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";

const INACTIVITY_TIMEOUT_MS =
  30 * 60 * 1000;

const ACTIVITY_WRITE_THROTTLE_MS =
  15 * 1000;

const ACTIVITY_STORAGE_KEY =
  "barbearia:last-activity:v1";

type AuthContextValue = {
  user: User | null;
  carregando: boolean;
};

const AuthContext =
  createContext<AuthContextValue>(
    {
      user: null,
      carregando: true,
    },
  );

function agora() {
  return Date.now();
}

function lerUltimaAtividade() {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  const value =
    Number(
      window.localStorage.getItem(
        ACTIVITY_STORAGE_KEY,
      ),
    );

  return Number.isFinite(
    value,
  )
    ? value
    : null;
}

function salvarUltimaAtividade(
  value = agora(),
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.localStorage.setItem(
    ACTIVITY_STORAGE_KEY,
    String(value),
  );
}

function limparUltimaAtividade() {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.localStorage.removeItem(
    ACTIVITY_STORAGE_KEY,
  );
}

function expirouPorInatividade() {
  const last =
    lerUltimaAtividade();

  if (!last) {
    return false;
  }

  return (
    agora() - last >=
    INACTIVITY_TIMEOUT_MS
  );
}

function redirecionarDepoisDaExpiracao() {
  const {
    pathname,
    search,
  } = window.location;

  const currentPath =
    `${pathname}${search}`;

  /*
   * Administração usa seu login
   * separado por e-mail/senha.
   */
  if (
    pathname ===
      "/admin" ||
    pathname.startsWith(
      "/admin/",
    )
  ) {
    window.location.replace(
      `/admin/login?erro=sessao-expirada&next=${encodeURIComponent(
        currentPath,
      )}`,
    );

    return;
  }

  const segments =
    pathname
      .split("/")
      .filter(Boolean);

  const slug =
    segments[0];

  const isCustomerArea =
    segments[1] ===
    "cliente";

  /*
   * Área autenticada do cliente volta
   * para o login daquela própria
   * barbearia.
   */
  if (
    slug &&
    isCustomerArea
  ) {
    window.location.replace(
      `/${encodeURIComponent(
        slug,
      )}/login?motivo=sessao-expirada&next=${encodeURIComponent(
        currentPath,
      )}`,
    );

    return;
  }

  /*
   * Se estiver em uma página pública,
   * eu apenas recarrego já sem sessão.
   *
   * O usuário pode continuar navegando
   * sem ser forçado a fazer login.
   */
  window.location.reload();
}

export function AuthProvider({
  children,
}: {
  children:
    React.ReactNode;
}) {
  const [
    user,
    setUser,
  ] =
    useState<User | null>(
      null,
    );

  const [
    carregando,
    setCarregando,
  ] = useState(true);

  const supabase =
    useMemo(
      () =>
        createClient(),
      [],
    );

  const currentUser =
    useRef<User | null>(
      null,
    );

  const signingOut =
    useRef(false);

  const lastActivityWrite =
    useRef(0);

  useEffect(() => {
    let disposed =
      false;

    function atualizarUsuario(
      nextUser:
        | User
        | null,
    ) {
      currentUser.current =
        nextUser;

      if (!disposed) {
        setUser(
          nextUser,
        );

        setCarregando(
          false,
        );
      }
    }

    async function expirarSessao() {
      if (
        !currentUser.current ||
        signingOut.current
      ) {
        return;
      }

      signingOut.current =
        true;

      /*
       * Eu encerro a sessão deste
       * navegador e depois forço uma
       * nova navegação.
       */
      try {
        await supabase.auth.signOut({
          scope: "local",
        });
      } catch {
        /*
         * Mesmo se ocorrer falha de rede,
         * eu removo o estado local e
         * recarrego a aplicação.
         */
      }

      limparUltimaAtividade();

      atualizarUsuario(
        null,
      );

      redirecionarDepoisDaExpiracao();
    }

    function registrarAtividade() {
      if (
        !currentUser.current
      ) {
        return;
      }

      const timestamp =
        agora();

      /*
       * Evito escrever no localStorage
       * dezenas de vezes por segundo.
       */
      if (
        timestamp -
          lastActivityWrite.current <
        ACTIVITY_WRITE_THROTTLE_MS
      ) {
        return;
      }

      lastActivityWrite.current =
        timestamp;

      salvarUltimaAtividade(
        timestamp,
      );
    }

    async function verificarInatividade() {
      if (
        !currentUser.current ||
        signingOut.current
      ) {
        return;
      }

      if (
        expirouPorInatividade()
      ) {
        await expirarSessao();
      }
    }

    async function inicializar() {
      const {
        data,
      } =
        await supabase.auth.getUser();

      if (disposed) {
        return;
      }

      const nextUser =
        data.user ?? null;

      atualizarUsuario(
        nextUser,
      );

      if (!nextUser) {
        limparUltimaAtividade();
        return;
      }

      const last =
        lerUltimaAtividade();

      /*
       * Para usuários que já estavam
       * logados antes desta atualização,
       * eu inicio o relógio agora em vez
       * de expulsá-los imediatamente.
       */
      if (!last) {
        salvarUltimaAtividade();
        return;
      }

      await verificarInatividade();
    }

    void inicializar();

    const {
      data:
        authSubscription,
    } =
      supabase.auth.onAuthStateChange(
        (
          event:
            AuthChangeEvent,
          session:
            | Session
            | null,
        ) => {
          const nextUser =
            session?.user ??
            null;

          atualizarUsuario(
            nextUser,
          );

          if (
            event ===
            "SIGNED_IN"
          ) {
            signingOut.current =
              false;

            salvarUltimaAtividade();
          }

          if (
            event ===
            "SIGNED_OUT"
          ) {
            limparUltimaAtividade();
          }

          /*
           * TOKEN_REFRESHED NÃO conta
           * como atividade humana.
           *
           * Isso é fundamental:
           * o Supabase renova tokens
           * automaticamente e, se eu
           * tratasse isso como atividade,
           * a sessão nunca expiraria.
           */
        },
      );

    const activityEvents:
      Array<
        keyof WindowEventMap
      > = [
        "pointerdown",
        "keydown",
        "touchstart",
        "scroll",
      ];

    for (
      const eventName
      of activityEvents
    ) {
      window.addEventListener(
        eventName,
        registrarAtividade,
        {
          passive: true,
        },
      );
    }

    function onVisibilityChange() {
      if (
        document.visibilityState !==
        "visible"
      ) {
        return;
      }

      /*
       * Quando o usuário retorna à aba,
       * primeiro verifico se já venceu.
       */
      void verificarInatividade().then(
        () => {
          if (
            !expirouPorInatividade()
          ) {
            registrarAtividade();
          }
        },
      );
    }

    function onStorage(
      event: StorageEvent,
    ) {
      /*
       * Mantém múltiplas abas do mesmo
       * navegador sincronizadas.
       */
      if (
        event.key !==
        ACTIVITY_STORAGE_KEY
      ) {
        return;
      }

      void verificarInatividade();
    }

    document.addEventListener(
      "visibilitychange",
      onVisibilityChange,
    );

    window.addEventListener(
      "storage",
      onStorage,
    );

    /*
     * Além dos eventos, faço uma
     * verificação periódica.
     */
    const interval =
      window.setInterval(
        () => {
          void verificarInatividade();
        },
        30 * 1000,
      );

    return () => {
      disposed = true;

      authSubscription.subscription.unsubscribe();

      window.clearInterval(
        interval,
      );

      for (
        const eventName
        of activityEvents
      ) {
        window.removeEventListener(
          eventName,
          registrarAtividade,
        );
      }

      document.removeEventListener(
        "visibilitychange",
        onVisibilityChange,
      );

      window.removeEventListener(
        "storage",
        onStorage,
      );
    };
  }, [supabase]);

  return (
    <AuthContext.Provider
      value={{
        user,
        carregando,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(
    AuthContext,
  );
}