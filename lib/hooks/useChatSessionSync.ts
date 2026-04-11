"use client";

import { useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useACRMStore } from "@/lib/store";

const SYNC_INTERVAL = 30000; // Sync every 30 seconds
const SYNC_DEBOUNCE = 5000; // Debounce writes for 5 seconds

export function useChatSessionSync() {
  const { data: session, status } = useSession();
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncRef = useRef<number>(0);
  const store = useACRMStore();

  // Subscribe to store changes
  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.email) {
      return;
    }

    const syncToDatabase = async () => {
      try {
        const now = Date.now();
        if (now - lastSyncRef.current < SYNC_DEBOUNCE) {
          // Debounce multiple rapid changes
          return;
        }

        lastSyncRef.current = now;

        const response = await fetch("/api/chat-session", {
          method: "POST",
          credentials: "include", // CRITICAL: Include session cookies for NextAuth
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: store.sessionId || undefined,
            label: store.sessionLabel || "Untitled Session",
            messages: store.messages,
            sessionStats: store.sessionStats,
            selectedModelId: store.selectedModelId,
            selectedRegion: store.selectedRegion,
            carbonBudget: store.carbonBudget,
            resilienceHistory: store.resilienceHistory,
            ciSource: store.ciSource,
            ciFactorType: store.ciFactorType,
            ciZoneLabel: store.ciZoneLabel,
            ciIsRepresentativeZone: store.ciIsRepresentativeZone,
            greenHours: store.greenHours,
            advisorSupplementalInput: store.advisorSupplementalInput,
            advisorDraft: store.advisorDraft,
            advisorQAHistory: store.advisorQAHistory,
            sessionStartTime: store.sessionStartTime,
          }),
        });

        if (response.ok) {
          const savedSession = await response.json();
          // Update store with saved session ID if new
          if (!store.sessionId) {
            store.setSessionId(savedSession.id);
          }
          console.log("[Sync] Chat session synced to database:", savedSession.id);
        } else {
          console.error("[Sync] Failed to sync chat session:", response.statusText);
        }
      } catch (error) {
        console.error("[Sync] Error syncing chat session:", error);
      }
    };

    // Subscribe to all store changes
    const unsubscribe = useACRMStore.subscribe(() => {
      // Clear existing timeout
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      // Debounce sync
      syncTimeoutRef.current = setTimeout(() => {
        syncToDatabase();
      }, SYNC_DEBOUNCE);
    });

    // Initial sync on mount
    syncToDatabase();

    // Periodic sync as fallback
    const intervalId = setInterval(syncToDatabase, SYNC_INTERVAL);

    return () => {
      unsubscribe();
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      clearInterval(intervalId);
    };
  }, [status, session?.user?.email, store]);
}
