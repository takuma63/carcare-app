/* ============================================================
   auth-context.tsx  ―  ログイン状態（auth_token）の共有
   ------------------------------------------------------------
   起動時に SecureStore からトークンを読み込み、
   ルートレイアウトの Stack.Protected の判定に使う。
   customer（氏名等）もあわせて永続化する（ホームの挨拶・設定画面の
   プロフィール表示がアプリ再起動後も出るように）。
============================================================ */

import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearToken, getToken, setToken as persistToken } from "./api";
import type { Customer } from "./types";

const CUSTOMER_KEY = "ccc_customer";

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
    Promise.all([getToken(), AsyncStorage.getItem(CUSTOMER_KEY).catch(() => null)]).then(([t, savedCustomer]) => {
      setTokenState(t);
      if (t && savedCustomer) {
        try {
          setCustomer(JSON.parse(savedCustomer) as Customer);
        } catch {
          // 壊れていたら無視（挨拶等が出ないだけで動作に支障はない）
        }
      }
      setIsLoading(false);
    });
  }, []);

  const persistCustomer = (c: Customer | null) => {
    setCustomer(c);
    if (c) AsyncStorage.setItem(CUSTOMER_KEY, JSON.stringify(c)).catch(() => {});
    else AsyncStorage.removeItem(CUSTOMER_KEY).catch(() => {});
  };

  const signIn = async (newToken: string, newCustomer: Customer) => {
    await persistToken(newToken);
    setTokenState(newToken);
    persistCustomer(newCustomer);
  };

  const signOut = async () => {
    await clearToken();
    setTokenState(null);
    persistCustomer(null);
  };

  return (
    <AuthContext.Provider value={{ token, customer, isLoading, signIn, signOut, updateCustomer: persistCustomer }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth は AuthProvider の内側でのみ使用できます");
  return ctx;
}
