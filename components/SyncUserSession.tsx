"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { useACRMStore } from "@/lib/store";

export function SyncUserSession() {
  const { data: session, status } = useSession();
  const lastSyncStatus = useRef<"loading" | "authenticated" | "unauthenticated">("loading");

  useEffect(() => {
    if (status === "loading") return;

    // Run this logic once when auth status resolves or changes
    if (status !== lastSyncStatus.current) {
        lastSyncStatus.current = status;
        
        const lastUserId = localStorage.getItem("acrm-last-user-id");
        if (status === "authenticated" && session?.user) {
            // A user is logged in
            const currentUserId = (session.user as any).id || session.user.email;
            
            if (lastUserId !== currentUserId) {
                // Different user logged in, change namespace securely
                localStorage.setItem("acrm-last-user-id", currentUserId);
                // Kích hoạt Zustand load lại state từ namespace mới
                useACRMStore.persist.rehydrate();
            }
        } else if (status === "unauthenticated") {
            // User is logged out
            if (lastUserId) {
                // Keep the actual data saved in their namespace! Just remove the active user pointer
                localStorage.removeItem("acrm-last-user-id");
                useACRMStore.persist.rehydrate();
            }
        }
    }
  }, [session, status]);

  return null;
}
