/*
 * Gear Box – Sistema de Gestão para Oficinas Mecânicas
 * Copyright (C) 2025 Gear Box
 *
 * Este arquivo é parte do Gear Box.
 * O Gear Box é software livre: você pode redistribuí-lo e/ou modificá-lo
 * sob os termos da GNU Affero General Public License, versão 3,
 * conforme publicada pela Free Software Foundation.
 *
 * Este programa é distribuído na esperança de que seja útil,
 * mas SEM QUALQUER GARANTIA; sem mesmo a garantia implícita de
 * COMERCIABILIDADE ou ADEQUAÇÃO A UM DETERMINADO FIM.
 * Consulte a GNU AGPLv3 para mais detalhes.
 *
 * Você deve ter recebido uma cópia da GNU AGPLv3 junto com este programa.
 * Caso contrário, veja <https://www.gnu.org/licenses/>.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useMemo,
} from "react";
import {
  login as loginRequest,
  logout as logoutRequest,
} from "@/services/gearbox";
import type { Role } from "@/types/api";
import { ApiError, UNAUTHORIZED_EVENT } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";

interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isOwner: boolean;
  isAuthenticated: boolean;
}

const AUTH_TOKEN_KEY = "auth_token";
const AUTH_USER_KEY = "auth_user";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(AUTH_USER_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as User;
  } catch (error) {
    console.warn("Não foi possível carregar o usuário armazenado", error);
    return null;
  }
}

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [token, setToken] = useState<string | null>(() => getStoredToken());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === AUTH_TOKEN_KEY ||
        event.key === AUTH_USER_KEY ||
        event.key === null
      ) {
        setUser(getStoredUser());
        setToken(getStoredToken());
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const data = await loginRequest({ email, password });
      const tokenValue = data.token?.value ?? "";

      if (!tokenValue) {
        throw new Error("Token inválido retornado pela API.");
      }

      const userData: User = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.nome,
        role: data.user.tipo,
      };

      setToken(tokenValue);
      setUser(userData);

      localStorage.setItem(AUTH_TOKEN_KEY, tokenValue);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(userData));
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new Error(
        error instanceof Error
          ? error.message
          : "Erro ao fazer login. Verifique suas credenciais.",
      );
    }
  }, []);

  const logout = useCallback(async () => {
    if (token) {
      try {
        await logoutRequest(token);
      } catch (error) {
        console.warn("Erro ao finalizar sessão na API", error);
      }
    }

    setUser(null);
    setToken(null);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    queryClient.clear();
  }, [token]);

  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () =>
      window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, [logout]);

  const isOwner = user?.role === "dono" || user?.role === "demo";
  const isAuthenticated = !!user && !!token;

  const value = useMemo(
    () => ({ user, token, login, logout, isOwner, isAuthenticated }),
    [user, token, login, logout, isOwner, isAuthenticated],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
}
