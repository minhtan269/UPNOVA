// ============================================================
// ACRM Session Manager
// Save, load, and delete past chat sessions using localStorage
// ============================================================

import type { ChatMessage, SessionStats, ResilienceHistoryEntry } from "./store";
import type {
    AdvisorDraftResult,
    AdvisorQAEntry,
    AdvisorSupplementalInput,
} from "./advisor-types";

function getStorageKey(): string {
    if (typeof window === "undefined") return "acrm-saved-sessions";
    const userId = localStorage.getItem("acrm-last-user-id");
    return userId ? `acrm-saved-sessions-${userId}` : "acrm-saved-sessions";
}

export interface SavedSession {
    id: string;
    savedAt: number;
    label: string;
    messages: ChatMessage[];
    sessionStats: SessionStats;
    selectedModelId: string;
    selectedRegion: string;
    carbonBudget: number;
    resilienceHistory: ResilienceHistoryEntry[];
    advisorSupplementalInput?: AdvisorSupplementalInput;
    advisorDraft?: AdvisorDraftResult | null;
    advisorQAHistory?: AdvisorQAEntry[];
}

/** Get all saved sessions, sorted newest first */
export function getSavedSessions(): SavedSession[] {
    try {
        const raw = localStorage.getItem(getStorageKey());
        if (!raw) return [];
        const sessions: SavedSession[] = JSON.parse(raw);
        return sessions.sort((a, b) => b.savedAt - a.savedAt);
    } catch {
        return [];
    }
}

/** Save the current session state. Returns the saved session. */
export function saveCurrentSession(data: {
    messages: ChatMessage[];
    sessionStats: SessionStats;
    selectedModelId: string;
    selectedRegion: string;
    carbonBudget: number;
    resilienceHistory: ResilienceHistoryEntry[];
    advisorSupplementalInput?: AdvisorSupplementalInput;
    advisorDraft?: AdvisorDraftResult | null;
    advisorQAHistory?: AdvisorQAEntry[];
}): SavedSession {
    const sessions = getSavedSessions();
    const now = Date.now();
    const aiCount = data.messages.filter((m) => m.role === "assistant").length;

    const session: SavedSession = {
        id: `session-${now}`,
        savedAt: now,
        label: `${aiCount} msgs - ${data.sessionStats.totalCO2.toFixed(3)}g CO2`,
        ...data,
    };

    sessions.unshift(session);

    // Keep max 20 sessions
    const trimmed = sessions.slice(0, 20);
    localStorage.setItem(getStorageKey(), JSON.stringify(trimmed));

    return session;
}

/** Delete a saved session by ID */
export function deleteSession(id: string): void {
    const sessions = getSavedSessions().filter((s) => s.id !== id);
    localStorage.setItem(getStorageKey(), JSON.stringify(sessions));
}

/** Delete all saved sessions */
export function clearAllSessions(): void {
    localStorage.removeItem(getStorageKey());
}
