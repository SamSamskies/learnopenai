export type SessionRecord = {
  lastResponseId: string | null;
  vectorStoreId: string | null;
  files: { name: string; fileId: string }[];
};

const sessions = new Map<string, SessionRecord>();

export function getSession(sessionId: string): SessionRecord {
  return (
    sessions.get(sessionId) ?? {
      lastResponseId: null,
      vectorStoreId: null,
      files: [],
    }
  );
}

export function updateSession(
  sessionId: string,
  patch: Partial<SessionRecord>
) {
  const current = getSession(sessionId);
  sessions.set(sessionId, { ...current, ...patch });
}

export function getLastResponseId(sessionId: string): string | null {
  return getSession(sessionId).lastResponseId;
}

export function setLastResponseId(sessionId: string, responseId: string) {
  updateSession(sessionId, { lastResponseId: responseId });
}

export function clearSession(sessionId: string) {
  sessions.delete(sessionId);
}
