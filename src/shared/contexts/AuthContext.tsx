import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useMemo,
} from "react";
import { login as loginRequest, logout as logoutRequest } from "@/services/gearbox";
import type { Role } from "@/types/api";
import { UNAUTHORIZED_EVENT } from "@/lib/api";
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
    const storedUser = localStorage.getItem(AUTH_USER_KEY);

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
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
      throw new Error(
        error instanceof Error
          ? error.message
          : "Erro ao fazer login. Verifique suas credenciais."
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
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, [logout]);

  const isOwner = user?.role === "dono";
  const isAuthenticated = !!user && !!token;

  const value = useMemo(
    () => ({ user, token, login, logout, isOwner, isAuthenticated }),
    [user, token, login, logout, isOwner, isAuthenticated]
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
