/* ============================================================
   auth-context.tsx  ―  ログイン状態（auth_token）の共有
   ------------------------------------------------------------
   起動時に SecureStore からトークンを読み込み、
   ルートレイアウトの Stack.Protected の判定に使う。
============================================================ */

import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { clearToken, getToken, setToken as persistToken } from "./api";
import type { Customer } from "./types";

interface AuthContextValue {
  token: string | null;
  customer: Customer | null;
  isLoading: boolean;
  signIn: (token: string, customer: Customer) => Promise<void>;
  signOut: () => Promise<void>;
  updateCustomer: (customer: Customer) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getToken().then((t) => {
      setTokenState(t);
      setIsLoading(false);
    });
  }, []);

  const signIn = async (newToken: string, newCustomer: Customer) => {
    await persistToken(newToken);
    setTokenState(newToken);
    setCustomer(newCustomer);
  };

  const signOut = async () => {
    await clearToken();
    setTokenState(null);
    setCustomer(null);
  };

  return (
    <AuthContext.Provider value={{ token, customer, isLoading, signIn, signOut, updateCustomer: setCustomer }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth は AuthProvider の内側でのみ使用できます");
  return ctx;
}
