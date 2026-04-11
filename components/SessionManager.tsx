"use client";

import { useEffect, useState } from "react";
import { useACRMStore } from "@/lib/store";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useSession } from "next-auth/react";

interface SavedSession {
  id: string;
  label: string;
  messageCount: number;
  carbonTotal: number;
  createdAt: number;
  lastAccessed: number;
}

export function SessionManager() {
  const { t } = useTranslation();
  const { status } = useSession();
  const { sessionId, sessionLabel, messages, sessionStats, setSessionId, setSessionLabel } = useACRMStore();
  const [isOpen, setIsOpen] = useState(false);
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);
  const [newSessionLabel, setNewSessionLabel] = useState("");
  const [showNewSessionInput, setShowNewSessionInput] = useState(false);

  // Load saved sessions from database (if authenticated)
  useEffect(() => {
    if (status === "authenticated") {
      // Fetch saved sessions from database
      fetch("/api/chat-session", {
        credentials: "include",
      })
        .then((res) => res.json())
        .then((sessions) => {
          if (Array.isArray(sessions)) {
            const mapped: SavedSession[] = sessions.map((s: any) => ({
              id: s.id,
              label: s.label,
              messageCount: Array.isArray(s.messages) ? s.messages.length : 0,
              carbonTotal: s.sessionStats?.totalCO2 ?? 0,
              createdAt: new Date(s.createdAt).getTime(),
              lastAccessed: new Date(s.updatedAt).getTime(),
            }));
            setSavedSessions(mapped);
          }
        })
        .catch((e) => console.error("Failed to fetch sessions:", e));
    }

    // Auto-create session if none exists
    if (!sessionId) {
      const newId = `session-${Date.now()}`;
      setSessionId(newId);
      setSessionLabel(`Session ${new Date().toLocaleDateString()}`);
    }
  }, [status]);

  // Save session to database
  const saveCurrentSession = async () => {
    if (!sessionLabel.trim() || messages.length === 0) {
      alert(t("session.cannotSaveEmpty") || "Cannot save an empty session");
      return;
    }

    try {
      const response = await fetch("/api/chat-session", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: sessionId || undefined,
          label: sessionLabel,
          messages,
          sessionStats,
        }),
      });

      if (response.ok) {
        const savedSession = await response.json();
        const newSession: SavedSession = {
          id: savedSession.id,
          label: savedSession.label,
          messageCount: messages.length,
          carbonTotal: sessionStats.totalCO2,
          createdAt: new Date(savedSession.createdAt).getTime(),
          lastAccessed: new Date(savedSession.updatedAt).getTime(),
        };

        // Update sessions list
        setSavedSessions((prev) => {
          const filtered = prev.filter((s) => s.id !== newSession.id);
          return [newSession, ...filtered];
        });

        // Update store if new session
        if (!sessionId) {
          setSessionId(savedSession.id);
        }

        setShowNewSessionInput(false);
        setNewSessionLabel("");
      }
    } catch (e) {
      console.error("Failed to save session:", e);
      alert("Failed to save session");
    }
  };

  // Create new session
  const createNewSession = () => {
    const newId = `session-${Date.now()}`;
    setSessionId(newId);
    setSessionLabel(newSessionLabel || `Session ${new Date().toLocaleDateString()}`);
    setNewSessionLabel("");
    setShowNewSessionInput(false);
  };

  // Load session from database
  const loadSession = async (session: SavedSession) => {
    try {
      // Set metadata immediately
      setSessionId(session.id);
      setSessionLabel(session.label);
      
      // TODO: Fetch full session data from API and restore to store
      // const response = await fetch(`/api/chat-session/${session.id}`, {
      //   credentials: "include",
      // });
      // const fullSession = await response.json();
      // Restore messages, stats, etc to store

      setIsOpen(false);
    } catch (e) {
      console.error("Failed to load session:", e);
      alert("Failed to load session");
    }
  };

  // Delete session from database
  const deleteSession = async (id: string) => {
    try {
      const response = await fetch(`/api/chat-session/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        setSavedSessions((prev) => prev.filter((s) => s.id !== id));
      }
    } catch (e) {
      console.error("Failed to delete session:", e);
      alert("Failed to delete session");
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white/90 px-3 py-2 text-sm font-medium text-gray-800 shadow-sm transition-colors hover:bg-gray-50 dark:border-[#2a2d3a] dark:bg-[#1e212c]/80 dark:text-gray-200 dark:hover:bg-[#2a2d3a]"
      >
        <span className="text-base">🕐</span>
        <span>{sessionLabel || "New Session"}</span>
        <span className={`transition-transform ${isOpen ? "rotate-180" : ""}`}>▼</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 max-h-96 overflow-y-auto rounded-lg border border-gray-200 bg-white/95 shadow-lg dark:border-[#2a2d3a] dark:bg-[#1e212c]/95 z-50">
          <div className="border-b border-gray-100 p-3 dark:border-[#2a2d3a]">
            {showNewSessionInput ? (
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={newSessionLabel}
                  onChange={(e) => setNewSessionLabel(e.target.value)}
                  placeholder={t("session.enterLabel") || "Enter session name..."}
                  className="rounded border border-gray-200 px-2 py-1 text-sm dark:border-[#2a2d3a] dark:bg-[#2a2d3a] dark:text-gray-200"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={createNewSession}
                    className="flex-1 rounded bg-[#0FA697] py-1 text-xs font-medium text-white hover:bg-[#0FA697]/90"
                  >
                    {t("session.create") || "Create"}
                  </button>
                  <button
                    onClick={() => {
                      setShowNewSessionInput(false);
                      setNewSessionLabel("");
                    }}
                    className="flex-1 rounded border border-gray-200 py-1 text-xs font-medium dark:border-[#2a2d3a]"
                  >
                    {t("common.cancel") || "Cancel"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowNewSessionInput(true)}
                className="flex w-full items-center justify-center gap-2 rounded py-2 text-sm font-medium text-[#0FA697] hover:bg-gray-50 dark:hover:bg-[#2a2d3a]"
              >
                <span className="text-lg">+</span>
                {t("session.newSession") || "New Session"}
              </button>
            )}
          </div>

          {/* Save current session */}
          {messages.length > 0 && sessionLabel && (
            <div className="border-b border-gray-100 p-3 dark:border-[#2a2d3a]">
              <button
                onClick={saveCurrentSession}
                className="w-full rounded bg-gradient-to-r from-[#0FA697] to-[#0FA697]/80 py-2 text-xs font-medium text-white hover:from-[#0FA697]/90 hover:to-[#0FA697]/70"
              >
                {t("session.saveCurrent") || "Save Current Session"}
              </button>
            </div>
          )}

          {/* Saved sessions list */}
          <div className="p-2">
            {savedSessions.length === 0 ? (
              <p className="py-4 text-center text-xs text-gray-500 dark:text-gray-400">
                {t("session.noSessions") || "No saved sessions yet"}
              </p>
            ) : (
              <ul className="space-y-1">
                {savedSessions.map((session) => (
                  <li key={session.id} className="group">
                    <button
                      onClick={() => loadSession(session)}
                      className="w-full rounded p-2 text-left text-xs hover:bg-gray-50 dark:hover:bg-[#2a2d3a] transition-colors"
                    >
                      <div className="font-medium text-gray-800 dark:text-gray-200 truncate">
                        {session.label}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {session.messageCount} messages • {session.carbonTotal.toFixed(2)}g CO₂
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        {formatDate(session.lastAccessed)}
                      </div>
                    </button>
                    <button
                      onClick={() => deleteSession(session.id)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-950"
                    >
                      🗑
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SessionManager;
