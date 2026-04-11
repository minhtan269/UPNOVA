"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { SyncUserSession } from "./SyncUserSession";

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SyncUserSession />
      {children}
    </SessionProvider>
  );
}
