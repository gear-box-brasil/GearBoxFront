import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { login as loginRequest, logout as logoutRequest } from '@/services/gearbox';
import type { Role } from '@/types/api';

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

const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_USER_KEY = 'auth_user';

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

  const login = async (email: string, password: string) => {
    try {
      const data = await loginRequest({ email, password });
      const tokenValue = data.token?.value ?? '';

      if (!tokenValue) {
        throw new Error('Token inválido retornado pela API.');
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
        error instanceof Error ? error.message : 'Erro ao fazer login. Verifique suas credenciais.'
      );
    }
  };

  const logout = async () => {
    if (token) {
      try {
        await logoutRequest(token);
      } catch (error) {
        console.warn('Erro ao finalizar sessão na API', error);
      }
    }

    setUser(null);
    setToken(null);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  };

  const isOwner = user?.role === 'dono';
  const isAuthenticated = !!user && !!token;

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isOwner, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
