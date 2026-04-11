# Session Management Implementation Guide

## Overview
This implementation adds session management capabilities to the ACRM platform, allowing users to create, save, and load chat sessions with persistent storage in browser localStorage.

## Architecture

### State Management (lib/store.ts)
The Zustand store now includes:
- `sessionId: string | null` - Unique identifier for current session
- `sessionLabel: string` - User-friendly session name
- `setSessionId(id: string)` - Action to set session ID
- `setSessionLabel(label: string)` - Action to set session label

### Component: SessionManager (components/SessionManager.tsx)

#### Features
1. **New Session Creation**
   - Users click "New Session" to enter a session name
   - Generates unique session ID (timestamp-based: `session-{Date.now()}`)
   - Updates store state immediately

2. **Save Current Session**
   - Button appears when current session has messages and a label
   - Saves session metadata to localStorage under key `acrm_sessions`
   - Includes: id, label, message count, total CO2, timestamps

3. **Load Saved Sessions**
   - Dropdown displays all saved sessions with metadata
   - Currently loads session metadata (future: restore full message history)
   - Updates current session when clicked

4. **Delete Sessions**
   - Each saved session has delete button (appears on hover)
   - Removes from localStorage

#### User Interface
- Window/clock icon with session name button in header
- Chevron dropdown indicator
- Organized dropdown with:
  - New session creation input
  - Save current session button
  - Saved sessions list with metadata
  - Delete buttons on hover

### Integrations

#### Chat Page (app/chat/page.tsx)
- SessionManager imported as a component
- Placed in header between RegionSelector and dashboard toggle
- Provides easy access to session management while chatting

#### Localization
Added translations for both English and Vietnamese:
- `session.newSession` - "New Session"
- `session.create` - "Create"
- `session.enterLabel` - "Enter session name..."
- `session.saveCurrent` - "Save Current Session"
- `session.noSessions` - "No saved sessions yet"
- `session.cannotSaveEmpty` - "Cannot save an empty session"

## Storage Format

### localStorage Key: `acrm_sessions`
```typescript
interface SavedSession {
  id: string;           // Unique session identifier
  label: string;        // User-defined session name
  messageCount: number; // Number of messages in session
  carbonTotal: number;  // Total CO2 in grams
  createdAt: number;    // Creation timestamp
  lastAccessed: number; // Last access timestamp
}
```

Stored as JSON array: `SavedSession[]`

## Future Enhancements

### Planned Features
1. **Full Session Restoration**
   - Store complete message history with each session
   - Restore messages when loading a session
   - Preserve metrics and model selections

2. **Session Statistics**
   - Average CO2 per message
   - Session duration tracking
   - Model usage breakdown

3. **Export/Import Sessions**
   - Export session as JSON file
   - Import previously exported sessions
   - Share sessions between users

4. **Server-side Persistence** (if backend added)
   - Move from localStorage to database
   - Multi-device session sync
   - Cloud backup

5. **Session Renaming**
   - Edit session name after creation
   - Rename from dropdown

6. **Session Archiving**
   - Archive old sessions
   - Separate archive from active sessions

## Technical Notes

### Browser Compatibility
- Requires localStorage support (all modern browsers)
- Maximum storage: ~5-10MB per domain depending on browser
- No server-side dependency

### Performance Considerations
- Sessions stored in localStorage (synchronous operations)
- Consider pagination if many sessions accumulate
- Session metadata kept minimal to save storage space

### Error Handling
- Try-catch around localStorage parsing
- Graceful fallback if localStorage fails
- User-friendly alerts for validation errors

## File Changes Summary

### Modified Files
1. **lib/store.ts**
   - Added session properties to ACRMState interface
   - Added session action methods
   - Initialize state with sessionId: null, sessionLabel: ""

2. **components/SessionManager.tsx** (NEW)
   - React component managing session UI and logic
   - localStorage integration
   - Translation support

3. **locales/en.json**
   - Added "session" namespace with 6 translation keys

4. **locales/vi.json**
   - Added Vietnamese "session" namespace translations

5. **app/chat/page.tsx**
   - Imported SessionManager component
   - Added to header with visual separator

## Usage Example

```typescript
// In a component using the store:
import { useACRMStore } from "@/lib/store";

function MyComponent() {
  const { sessionId, sessionLabel, setSessionId, setSessionLabel } = useACRMStore();

  // Create new session
  const newId = `session-${Date.now()}`;
  setSessionId(newId);
  setSessionLabel("My Important Analysis");

  // Session now tracked in store and persisted UI
}
```

## Testing Checklist

- [ ] Create new session - should update dropdown button
- [ ] Save current session - should appear in saved sessions list
- [ ] Load saved session - should update button and store
- [ ] Delete session - should remove from list
- [ ] Verify localStorage has correct data
- [ ] Test with empty/invalid session names
- [ ] Test bilingual support (EN/VI)
- [ ] Test on mobile (small screen)
- [ ] Verify no TypeScript errors
- [ ] Test persistence across page refreshes

## Connection to Zustand Store

```typescript
// How SessionManager uses the store
const { 
  sessionId,           // Current session ID
  sessionLabel,        // Current session display name
  messages,            // For getting message count
  sessionStats,        // For getting total CO2
  setSessionId,        // Action to update session ID
  setSessionLabel      // Action to update session label
} = useACRMStore();
```

The component reads these properties reactively and displays them in the UI. When any property changes, the component re-renders automatically thanks to Zustand's reactive hooks.
